import { ADMIN_EMAIL } from "@/lib/admin"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"

interface BodyCancelarSuscripcion {
  suscripcionId?: string
}

// Cancela una suscripción MANUAL y libera la tarjeta (plan_id → null) para
// que pueda volver a activarse — por Stripe (el dueño real paga con su
// propia tarjeta) o con otra alta manual. Caso real que motivó esto: una
// tarjeta armada por el admin con alta manual (el cliente iba a transferir),
// reasignada después al dueño real, que prefirió pagar en línea — sin
// cancelar la manual primero, /api/stripe/checkout choca con el índice
// único suscripciones_una_activa_por_tarjeta (409 "ya tiene una suscripción
// en curso").
//
// Deliberadamente restringido a `proveedor: "manual"` — cancelar acá una
// suscripción real de Stripe/Mercado Pago solo tocaría nuestra fila sin
// avisarle al proveedor real (seguiría cobrando igual del lado de Stripe);
// esas se cancelan desde su propio panel/API, no con este botón.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || userData.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: "No tienes permiso para hacer esto." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as BodyCancelarSuscripcion | null
  const { suscripcionId } = body ?? {}
  if (!suscripcionId) {
    return Response.json({ error: "Falta el id de la suscripción." }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 500 }
    )
  }

  const { data: suscripcion, error: suscripcionError } = await admin
    .from("suscripciones")
    .select("id, tarjeta_id, proveedor, estado")
    .eq("id", suscripcionId)
    .maybeSingle()

  if (suscripcionError || !suscripcion) {
    return Response.json({ error: "No encontramos esa suscripción." }, { status: 400 })
  }
  if (suscripcion.proveedor !== "manual") {
    return Response.json(
      {
        error: `Esta suscripción es de ${suscripcion.proveedor} — cancélala desde ahí, no se puede desde acá.`,
      },
      { status: 400 }
    )
  }
  if (suscripcion.estado === "cancelada" || suscripcion.estado === "vencida") {
    return Response.json({ error: "Esa suscripción ya está cancelada." }, { status: 400 })
  }

  const { error: cancelarError } = await admin
    .from("suscripciones")
    .update({ estado: "cancelada" })
    .eq("id", suscripcion.id)

  if (cancelarError) {
    return Response.json({ error: "No pudimos cancelar la suscripción." }, { status: 500 })
  }

  // Mismo criterio fail-closed que ya aplica el webhook de Stripe en
  // cualquier estado que no sea 'autorizada'/'trialing' — para una
  // suscripción manual no hay webhook que sincronice esto solo, así que
  // este endpoint es quien tiene que hacerlo.
  const { error: tarjetaError } = await admin
    .from("tarjetas")
    .update({ plan_id: null })
    .eq("id", suscripcion.tarjeta_id)

  if (tarjetaError) {
    return Response.json(
      { error: "La suscripción se canceló pero no pudimos actualizar el plan de la tarjeta." },
      { status: 500 }
    )
  }

  return Response.json({ ok: true })
}
