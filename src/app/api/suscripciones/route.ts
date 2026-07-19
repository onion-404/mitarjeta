import { crearPreapproval } from "@/lib/mercadopago-suscripciones"
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

// Suscripciones (preapproval) es exclusivo del cobro recurrente del plan de
// una tarjeta — NO confundir con /api/checkout (Checkout Pro, pagos únicos).
// A diferencia de /api/checkout y /api/citas (flujos de invitado/público),
// esta acción es exclusiva del dueño autenticado de la tarjeta: requiere el
// access token de su sesión de Supabase en el header Authorization.
export async function POST(request: Request) {
  if (excedeLimite(`suscripciones:${obtenerIpCliente(request)}`, LIMITE_SUSCRIPCIONES)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Esperá un momento y volvé a intentar." },
      { status: 429 }
    )
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return Response.json({ error: "Iniciá sesión para continuar." }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user?.email) {
    return Response.json({ error: "Sesión inválida o vencida." }, { status: 401 })
  }
  const userId = userData.user.id
  const payerEmail = userData.user.email

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
    // Antes esto era silencioso: si la consulta fallaba (ej. credenciales de
    // service role mal configuradas), caía acá igual que un "no encontrado"
    // legítimo, indistinguible en los logs. Dejamos explícito cuál de los
    // tres casos fue, sin cambiar la respuesta 403 en sí.
    if (tarjetaError) {
      console.error(
        `[/api/suscripciones] error consultando tarjeta (tarjetaId=${tarjetaId}):`,
        tarjetaError
      )
    } else if (!tarjeta) {
      console.error(`[/api/suscripciones] tarjeta no encontrada: tarjetaId=${tarjetaId}`)
    } else {
      console.error(
        `[/api/suscripciones] user_id no coincide: tarjeta.user_id=${tarjeta.user_id} userId=${userId} tarjetaId=${tarjetaId}`
      )
    }
    return Response.json(
      { error: "No encontramos esa tarjeta o no tenés permiso para suscribirla." },
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

  // Posición real de ESTA tarjeta entre las del usuario (no
  // posicion_tarjeta_para_usuario(): esa función cuenta "+1" pensando en una
  // tarjeta nueva a punto de crearse, no en el ranking de una ya existente).
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

  let cuponValidado: { codigo: string; porcentaje_descuento: number } | null = null
  if (cuponCodigo?.trim()) {
    const { data: cupon } = await admin
      .from("cupones")
      .select("codigo, porcentaje_descuento")
      .eq("codigo", cuponCodigo.trim().toUpperCase())
      .eq("activo", true)
      .maybeSingle()
    cuponValidado = cupon ?? null
  }

  // Regla de combinación: el mayor de los dos descuentos, no se suman. Una
  // suscripción es recurrente (se repite cada ciclo de cobro), así que
  // acumular descuentos indefinidamente no es lo mismo que en una compra
  // única — "no acumulable con otras promociones" es la política más segura.
  const descuentoAplicado = Math.max(descuentoAdicionalPct, cuponValidado?.porcentaje_descuento ?? 0)

  const precioBase = periodicidad === "anual" ? plan.precio_anual : plan.precio_mensual
  const precioFinal = Math.round(precioBase * (1 - descuentoAplicado / 100) * 100) / 100

  const { data: suscripcion, error: errorInsert } = await admin
    .from("suscripciones")
    .insert({
      tarjeta_id: tarjetaId,
      plan_id: planId,
      periodicidad,
      es_adicional: esAdicional,
      descuento_aplicado: descuentoAplicado,
      precio_base: precioBase,
      precio_final: precioFinal,
      cupon_codigo: cuponValidado?.codigo ?? null,
    })
    .select("id")
    .single()

  if (errorInsert || !suscripcion) {
    if (errorInsert?.code === "23505") {
      return Response.json(
        { error: "Esta tarjeta ya tiene una suscripción en curso." },
        { status: 409 }
      )
    }
    return Response.json(
      { error: "No pudimos crear la suscripción. Probá de nuevo." },
      { status: 500 }
    )
  }

  const preapproval = await crearPreapproval({
    suscripcionId: suscripcion.id,
    tarjetaId,
    payerEmail,
    reason: `Plan ${plan.nombre_display} (${periodicidad}) - Linkard`,
    precio: precioFinal,
    periodicidad,
  })

  if (!preapproval) {
    // Best-effort: no dejamos una suscripción "pendiente" huérfana sin
    // preapproval asociado (el índice único bloquearía cualquier reintento
    // futuro para esta tarjeta si la dejáramos).
    await admin.from("suscripciones").delete().eq("id", suscripcion.id)
    return Response.json(
      { error: "No pudimos iniciar la suscripción con Mercado Pago." },
      { status: 502 }
    )
  }

  await admin
    .from("suscripciones")
    .update({ preapproval_id: preapproval.preapprovalId })
    .eq("id", suscripcion.id)

  return Response.json({ initPoint: preapproval.initPoint })
}
