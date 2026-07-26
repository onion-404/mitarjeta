import { crearPortalSession } from "@/lib/stripe-suscripciones"
import { excedeLimite, obtenerIpCliente } from "@/lib/rate-limit"
import { APP_URL } from "@/lib/site-url"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const LIMITE_PORTAL = { maximo: 10, ventanaMs: 60_000 }

interface BodyPortal {
  tarjetaId?: string
}

// Genera una Customer Portal Session de Stripe para UNA tarjeta puntual —
// ver crearPortalSession en lib/stripe-suscripciones.ts sobre por qué es
// por tarjeta y no por cuenta. Mismo patrón de auth que
// /api/stripe/checkout (Bearer token + verificación de ownership contra la
// tabla `tarjetas`, con el cliente admin para no depender de RLS acá).
export async function POST(request: Request) {
  if (excedeLimite(`stripe-portal:${obtenerIpCliente(request)}`, LIMITE_PORTAL)) {
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
  if (userErr || !userData.user) {
    return Response.json({ error: "Sesión inválida o vencida." }, { status: 401 })
  }
  const userId = userData.user.id

  const body = (await request.json().catch(() => null)) as BodyPortal | null
  const { tarjetaId } = body ?? {}
  if (!tarjetaId) {
    return Response.json({ error: "Falta el id de la tarjeta." }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json({ error: "El servicio no está disponible." }, { status: 500 })
  }

  const { data: tarjeta } = await admin
    .from("tarjetas")
    .select("id, user_id")
    .eq("id", tarjetaId)
    .maybeSingle()

  if (!tarjeta || tarjeta.user_id !== userId) {
    return Response.json(
      { error: "No encontramos esa tarjeta o no tenés permiso sobre ella." },
      { status: 403 }
    )
  }

  // La suscripción de Stripe más reciente de esta tarjeta con Customer ya
  // asignado (se completa vía webhook checkout.session.completed, ver
  // CLAUDE.md) — puede no existir todavía si el checkout nunca se completó.
  const { data: suscripcion } = await admin
    .from("suscripciones")
    .select("stripe_customer_id")
    .eq("tarjeta_id", tarjetaId)
    .eq("proveedor", "stripe")
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!suscripcion?.stripe_customer_id) {
    return Response.json(
      { error: "Esta tarjeta todavía no tiene un pago confirmado con Stripe." },
      { status: 404 }
    )
  }

  const portalUrl = await crearPortalSession({
    customerId: suscripcion.stripe_customer_id,
    returnUrl: `${APP_URL}/mi-cuenta/suscripcion`,
  })

  if (!portalUrl) {
    return Response.json(
      { error: "No pudimos abrir el portal de pago. Probá de nuevo en un momento." },
      { status: 502 }
    )
  }

  return Response.json({ portalUrl })
}
