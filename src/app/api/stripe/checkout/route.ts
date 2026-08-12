import { crearCheckoutSession } from "@/lib/stripe-suscripciones"
import { excedeLimite, obtenerIpCliente } from "@/lib/rate-limit"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { PeriodicidadSuscripcion } from "@/lib/types"

const LIMITE_SUSCRIPCIONES = { maximo: 10, ventanaMs: 60_000 }

interface BodyCrearSuscripcion {
  tarjetaId?: string
  planId?: string
  periodicidad?: PeriodicidadSuscripcion
  cuponCodigo?: string
}

// Monto mínimo de cargo que Stripe acepta para MXN: $10.00 MXN (confirmado
// contra la tabla oficial "Importe mínimo del cargo por moneda" en
// docs.stripe.com/currencies — cambia por moneda, no es un número genérico).
// Sin este chequeo, un cupón agresivo o el descuento de tarjeta adicional
// pueden dejar precioFinal por debajo de eso y Stripe rechaza la Checkout
// Session con un error críptico del lado del cliente — mismo tipo de bug
// real que ya encontramos con Mercado Pago. precioFinal === 0 (cupón de
// 100%) queda afuera a propósito: Stripe sí admite cargos de suscripción en
// $0 (para cupones/pruebas gratis), el mínimo solo aplica a montos no-cero.
const MONTO_MINIMO_MXN = 10

// Reemplaza a /api/suscripciones (Mercado Pago preapproval) para el cobro
// recurrente del plan de la tarjeta — Checkout Pro de Mercado Pago (citas,
// cobro manual, lib/mercadopago.ts) sigue sin cambios, ver CLAUDE.md.
// /api/suscripciones NO se borró (queda como código muerto, mismo criterio
// que ya se usó con /api/checkout): TarjetaForm ya no lo llama.
//
// Lógica de descuento (tarjeta adicional + cupón) duplicada a propósito de
// /api/suscripciones en vez de extraída a un helper compartido — mismo
// criterio de "cero acoplamiento entre proveedores" que el proyecto ya
// aplica entre archivos de Mercado Pago (ver CLAUDE.md), para no tener que
// tocar el flujo de Mercado Pago —ya probado— al construir este.
export async function POST(request: Request) {
  if (excedeLimite(`stripe-checkout:${obtenerIpCliente(request)}`, LIMITE_SUSCRIPCIONES)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Espera un momento e intenta de nuevo." },
      { status: 429 }
    )
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user?.email) {
    return Response.json({ error: "Sesión inválida o vencida." }, { status: 401 })
  }
  const userId = userData.user.id

  const body = (await request.json().catch(() => null)) as BodyCrearSuscripcion | null
  const { tarjetaId, planId, periodicidad, cuponCodigo } = body ?? {}

  if (!tarjetaId || !planId || (periodicidad !== "mensual" && periodicidad !== "anual")) {
    return Response.json({ error: "Datos de suscripción inválidos." }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json({ error: "El servicio no está disponible." }, { status: 500 })
  }

  const { data: tarjeta, error: tarjetaError } = await admin
    .from("tarjetas")
    .select("id, user_id, created_at")
    .eq("id", tarjetaId)
    .maybeSingle()

  if (!tarjeta || tarjeta.user_id !== userId) {
    if (tarjetaError) {
      console.error(
        `[/api/stripe/checkout] error consultando tarjeta (tarjetaId=${tarjetaId}):`,
        tarjetaError
      )
    } else if (!tarjeta) {
      console.error(`[/api/stripe/checkout] tarjeta no encontrada: tarjetaId=${tarjetaId}`)
    } else {
      console.error(
        `[/api/stripe/checkout] user_id no coincide: tarjeta.user_id=${tarjeta.user_id} userId=${userId} tarjetaId=${tarjetaId}`
      )
    }
    return Response.json(
      { error: "No encontramos esa tarjeta o no tienes permiso para suscribirla." },
      { status: 403 }
    )
  }

  const { data: plan } = await admin
    .from("planes")
    .select("id, nombre_display, precio_mensual, precio_anual")
    .eq("id", planId)
    .maybeSingle()

  if (!plan) {
    return Response.json({ error: "Ese plan no existe." }, { status: 400 })
  }

  const { count: tarjetasAnterioresOIgual } = await admin
    .from("tarjetas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("created_at", tarjeta.created_at)

  const esAdicional = (tarjetasAnterioresOIgual ?? 1) > 1

  const { data: configuracion } = await admin
    .from("configuracion")
    .select("descuento_tarjeta_adicional_pct")
    .eq("id", 1)
    .maybeSingle()

  const descuentoAdicionalPct = esAdicional
    ? (configuracion?.descuento_tarjeta_adicional_pct ?? 0)
    : 0

  // fn_cupon_es_valido() (misma función que usa el preview del cliente en
  // lib/cupones.ts) es la única fuente de verdad de "¿este código sirve
  // hoy?" — activo, no vencido, no alcanzó su límite de usos real (contra
  // filas de cupon_usos, no un contador cacheado). Esta es la validación
  // AUTORITATIVA: el preview del cliente puede haber quedado desactualizado
  // (alguien más agotó el cupón entre que se mostró el preview y este
  // submit), así que se re-valida acá antes de aceptar el descuento.
  let cuponValidado: { codigo: string; porcentaje_descuento: number } | null = null
  if (cuponCodigo?.trim()) {
    const codigoNormalizado = cuponCodigo.trim().toUpperCase()
    const { data: esValido } = await admin.rpc("fn_cupon_es_valido", {
      p_codigo: codigoNormalizado,
    })
    if (esValido) {
      const { data: cupon } = await admin
        .from("cupones")
        .select("codigo, porcentaje_descuento")
        .eq("codigo", codigoNormalizado)
        .eq("activo", true)
        .maybeSingle()
      cuponValidado = cupon ?? null
    }
  }

  const descuentoAplicado = Math.max(descuentoAdicionalPct, cuponValidado?.porcentaje_descuento ?? 0)

  const precioBase = periodicidad === "anual" ? plan.precio_anual : plan.precio_mensual
  const precioFinal = Math.round(precioBase * (1 - descuentoAplicado / 100) * 100) / 100

  if (precioFinal > 0 && precioFinal < MONTO_MINIMO_MXN) {
    return Response.json(
      {
        error: `El descuento deja el precio en $${precioFinal.toLocaleString("es-MX")} MXN, por debajo del mínimo de $${MONTO_MINIMO_MXN} MXN que acepta Stripe. Prueba con un cupón de menor porcentaje.`,
      },
      { status: 400 }
    )
  }

  const datosSuscripcion = {
    tarjeta_id: tarjetaId,
    plan_id: planId,
    proveedor: "stripe",
    periodicidad,
    es_adicional: esAdicional,
    descuento_aplicado: descuentoAplicado,
    precio_base: precioBase,
    precio_final: precioFinal,
    cupon_codigo: cuponValidado?.codigo ?? null,
  }

  // Si ya existe una fila 'pendiente' para esta tarjeta (creó la Checkout
  // Session, pero canceló o abandonó el pago en Stripe la vez anterior), la
  // reutilizamos en vez de insertar una nueva: un INSERT acá chocaría contra
  // suscripciones_una_activa_por_tarjeta (una suscripción viva por tarjeta)
  // con un 409 que hace parecer que hay una suscripción real bloqueando,
  // cuando en realidad es el propio intento abandonado de la persona. Se
  // recalculan los montos/cupón por si cambiaron entre intentos, y se
  // limpian las referencias a la Checkout Session vieja (quedó abandonada/
  // va a expirar sola) para no arrastrarlas a la sesión nueva. 'autorizada'
  // y 'pausada' (los otros dos estados que cubre el índice único) NO se
  // tocan acá a propósito — esos sí son una suscripción real, no un intento
  // abandonado, y deben seguir bloqueando con el 409 de siempre.
  const { data: pendienteExistente } = await admin
    .from("suscripciones")
    .select("id")
    .eq("tarjeta_id", tarjetaId)
    .eq("estado", "pendiente")
    .maybeSingle()

  let suscripcion: { id: string } | null = null
  let errorGuardado: { code?: string } | null = null

  if (pendienteExistente) {
    const { data, error } = await admin
      .from("suscripciones")
      .update({
        ...datosSuscripcion,
        stripe_checkout_session_id: null,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pendienteExistente.id)
      .select("id")
      .single()
    suscripcion = data
    errorGuardado = error
  } else {
    const { data, error } = await admin
      .from("suscripciones")
      .insert(datosSuscripcion)
      .select("id")
      .single()
    suscripcion = data
    errorGuardado = error
  }

  if (errorGuardado || !suscripcion) {
    if (errorGuardado?.code === "23505") {
      return Response.json(
        { error: "Esta tarjeta ya tiene una suscripción en curso." },
        { status: 409 }
      )
    }
    return Response.json(
      { error: "No pudimos crear la suscripción. Prueba de nuevo." },
      { status: 500 }
    )
  }

  const checkoutSession = await crearCheckoutSession({
    suscripcionId: suscripcion.id,
    tarjetaId,
    planNombreDisplay: plan.nombre_display,
    precioFinal,
    periodicidad,
  })

  if (!checkoutSession) {
    // Best-effort: no dejamos una suscripción "pendiente" huérfana sin
    // Checkout Session asociada (el índice único bloquearía cualquier
    // reintento futuro para esta tarjeta si la dejáramos) — mismo criterio
    // que ya usa /api/suscripciones con Mercado Pago.
    await admin.from("suscripciones").delete().eq("id", suscripcion.id)
    return Response.json(
      { error: "No pudimos iniciar la suscripción con Stripe." },
      { status: 502 }
    )
  }

  // stripe_customer_id se completa vía webhook (checkout.session.completed):
  // ya no creamos el Customer nosotros de antemano, Stripe lo crea al vuelo
  // con el email que la propia persona ingresa en su checkout hosteado.
  await admin
    .from("suscripciones")
    .update({ stripe_checkout_session_id: checkoutSession.checkoutSessionId })
    .eq("id", suscripcion.id)

  return Response.json({ checkoutUrl: checkoutSession.checkoutUrl })
}
