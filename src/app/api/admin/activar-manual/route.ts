import { ADMIN_EMAIL } from "@/lib/admin"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"
import type { PeriodicidadSuscripcion } from "@/lib/types"

interface BodyActivarManual {
  tarjetaId?: string
  planId?: string
  periodicidad?: PeriodicidadSuscripcion
  precioFinal?: number
  fechaPago?: string
  nota?: string
}

function calcularFechaRenovacion(fechaPago: Date, periodicidad: PeriodicidadSuscripcion) {
  const fecha = new Date(fechaPago)
  if (periodicidad === "anual") fecha.setFullYear(fecha.getFullYear() + 1)
  else fecha.setMonth(fecha.getMonth() + 1)
  return fecha.toISOString()
}

// Alta manual de una suscripción (pago por transferencia gestionado por el
// cliente, sin pasar por Stripe) — equivalente a lo que haría el webhook de
// Stripe (estado 'autorizada', tarjetas.plan_id sincronizado), pero
// disparado por el admin. Mismo patrón de reutilizar la fila 'pendiente' ya
// existente (si la hay) que ya usa /api/stripe/checkout en el retry de
// checkout, para no chocar contra el índice único
// suscripciones_una_activa_por_tarjeta.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || userData.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: "No tienes permiso para hacer esto." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as BodyActivarManual | null
  const { tarjetaId, planId, periodicidad, precioFinal, fechaPago, nota } = body ?? {}

  if (!tarjetaId || !planId || !periodicidad || !fechaPago) {
    return Response.json({ error: "Faltan datos obligatorios." }, { status: 400 })
  }
  if (typeof precioFinal !== "number" || !Number.isFinite(precioFinal) || precioFinal < 0) {
    return Response.json({ error: "El costo tiene que ser un número mayor o igual a 0." }, { status: 400 })
  }
  const fecha = new Date(fechaPago)
  if (Number.isNaN(fecha.getTime())) {
    return Response.json({ error: "La fecha de pago no es válida." }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 500 }
    )
  }

  const { data: plan, error: planError } = await admin
    .from("planes")
    .select("id, precio_mensual, precio_anual")
    .eq("id", planId)
    .maybeSingle()

  if (planError || !plan) {
    return Response.json({ error: "El plan seleccionado no existe." }, { status: 400 })
  }

  const { data: tarjeta, error: tarjetaError } = await admin
    .from("tarjetas")
    .select("id")
    .eq("id", tarjetaId)
    .maybeSingle()

  if (tarjetaError || !tarjeta) {
    return Response.json({ error: "La tarjeta no existe." }, { status: 400 })
  }

  const { data: existente, error: existenteError } = await admin
    .from("suscripciones")
    .select("id, estado")
    .eq("tarjeta_id", tarjetaId)
    .in("estado", ["pendiente", "autorizada", "pausada"])
    .maybeSingle()

  if (existenteError) {
    return Response.json({ error: "No pudimos revisar la suscripción existente." }, { status: 500 })
  }

  if (existente && existente.estado !== "pendiente") {
    return Response.json(
      {
        error:
          "Esta tarjeta ya tiene una suscripción activa. Cancélala primero si quieres reemplazarla.",
      },
      { status: 409 }
    )
  }

  const precioBase = periodicidad === "anual" ? plan.precio_anual : plan.precio_mensual
  const descuentoAplicado =
    precioBase > 0 ? Math.max(0, Math.min(100, Math.round((1 - precioFinal / precioBase) * 100))) : 0

  const campos = {
    tarjeta_id: tarjetaId,
    plan_id: planId,
    proveedor: "manual" as const,
    estado: "autorizada" as const,
    periodicidad,
    precio_base: precioBase,
    precio_final: precioFinal,
    descuento_aplicado: descuentoAplicado,
    fecha_inicio: fecha.toISOString(),
    fecha_renovacion: calcularFechaRenovacion(fecha, periodicidad),
    registrado_por: userData.user.email,
    nota_manual: nota?.trim() || null,
    // Un alta manual reemplaza cualquier rastro de un intento previo por
    // otro proveedor (mismo criterio que el retry-checkout de Stripe).
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_checkout_session_id: null,
    preapproval_id: null,
    preapproval_plan_id: null,
    cupon_codigo: null,
  }

  const { error: guardarError } = existente
    ? await admin.from("suscripciones").update(campos).eq("id", existente.id)
    : await admin.from("suscripciones").insert(campos)

  if (guardarError) {
    return Response.json(
      { error: "No pudimos guardar la suscripción manual." },
      { status: 500 }
    )
  }

  const { error: tarjetaUpdateError } = await admin
    .from("tarjetas")
    .update({ plan_id: planId })
    .eq("id", tarjetaId)

  if (tarjetaUpdateError) {
    return Response.json(
      { error: "La suscripción se guardó pero no pudimos actualizar el plan de la tarjeta." },
      { status: 500 }
    )
  }

  return Response.json({ ok: true })
}
