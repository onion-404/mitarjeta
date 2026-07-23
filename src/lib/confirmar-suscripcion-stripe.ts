import "server-only"

import type Stripe from "stripe"

import { getStripe } from "@/lib/stripe"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { EstadoSuscripcion } from "@/lib/types"

// Archivo separado a propósito de confirmar-suscripcion.ts (Mercado Pago) —
// mismo criterio que ya aplica el proyecto entre lib/mercadopago.ts y
// lib/mercadopago-suscripciones.ts (ver CLAUDE.md): cero acoplamiento entre
// proveedores de pago, aunque la lógica de idempotencia/sincronización se
// repita. La única diferencia real con la versión de Mercado Pago es de
// dónde sale el estado "fuente de la verdad": acá siempre se re-consulta el
// Subscription completo contra la API de Stripe (mismo patrón que
// obtenerPreapproval en la versión de Mercado Pago), nunca se confía
// ciegamente en el payload del evento de webhook.
function mapearEstadoSuscripcion(status: Stripe.Subscription.Status): EstadoSuscripcion | null {
  switch (status) {
    case "active":
    case "trialing":
      return "autorizada"
    case "past_due":
    case "paused":
      return "pausada"
    case "canceled":
      return "cancelada"
    case "unpaid":
    case "incomplete_expired":
      return "vencida"
    case "incomplete":
      return "pendiente"
    default:
      return null
  }
}

const ESTADOS_TERMINALES: EstadoSuscripcion[] = ["cancelada", "vencida"]

/**
 * `checkout.session.completed`: vincula el `stripe_subscription_id` y
 * `stripe_customer_id` reales a la fila que ya insertamos en 'pendiente' al
 * crear la Checkout Session. No toca `estado` acá — recién creada la
 * suscripción puede seguir en `incomplete` (ej. esperando 3DS), el estado
 * real lo define `procesarSuscripcionStripe()` con el evento de
 * subscription que llega inmediatamente después.
 */
export async function vincularCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const suscripcionId = session.client_reference_id
  if (!suscripcionId) {
    console.error(
      `[confirmar-suscripcion-stripe] checkout.session.completed sin client_reference_id: ${session.id}`
    )
    return
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin no disponible: falta SUPABASE_SERVICE_ROLE_KEY.")
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null)
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null)

  const { error } = await admin
    .from("suscripciones")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
    })
    .eq("id", suscripcionId)

  if (error) {
    throw new Error(`No se pudo vincular la Checkout Session de Stripe: ${error.message}`)
  }
}

/**
 * `customer.subscription.created/updated/deleted` e `invoice.payment_failed`
 * (re-chequeo defensivo): re-consulta el Subscription real contra la API de
 * Stripe y actualiza `suscripciones.estado`. Mantiene `tarjetas.plan_id`
 * sincronizado en las dos direcciones — mismo comportamiento fail-closed que
 * ya usa la versión de Mercado Pago (ver CLAUDE.md): sin `autorizada` real,
 * `plan_id` vuelve a `null`, no hay plan gratuito al que "bajar".
 *
 * Busca la fila primero por `stripe_subscription_id` (ya vinculada); si
 * todavía no llegó `checkout.session.completed` (los webhooks no garantizan
 * orden), cae a buscar por el `suscripcion_id` que ya viaja en los metadata
 * del Subscription desde que se creó la Checkout Session, y la vincula ahí
 * mismo.
 */
export async function procesarSuscripcionStripe(stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripe()
  if (!stripe) return

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const nuevoEstado = mapearEstadoSuscripcion(subscription.status)
  if (!nuevoEstado) return

  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin no disponible: falta SUPABASE_SERVICE_ROLE_KEY.")
  }

  const { data: porSubscriptionId, error: errorLectura1 } = await admin
    .from("suscripciones")
    .select("id, tarjeta_id, plan_id, estado")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle()

  if (errorLectura1) {
    throw new Error(`No se pudo leer la suscripción en Supabase: ${errorLectura1.message}`)
  }

  let suscripcion = porSubscriptionId

  if (!suscripcion) {
    const suscripcionIdMeta = subscription.metadata?.suscripcion_id
    if (!suscripcionIdMeta) {
      console.error(
        `[confirmar-suscripcion-stripe] Notificación para un subscription desconocido: ${stripeSubscriptionId}`
      )
      return
    }

    const { data: porMetadata, error: errorLectura2 } = await admin
      .from("suscripciones")
      .select("id, tarjeta_id, plan_id, estado")
      .eq("id", suscripcionIdMeta)
      .maybeSingle()

    if (errorLectura2) {
      throw new Error(`No se pudo leer la suscripción en Supabase: ${errorLectura2.message}`)
    }
    if (!porMetadata) {
      console.error(
        `[confirmar-suscripcion-stripe] Notificación para una suscripción desconocida: ${stripeSubscriptionId} (metadata suscripcion_id=${suscripcionIdMeta})`
      )
      return
    }

    suscripcion = porMetadata
    const { error: errorVinculo } = await admin
      .from("suscripciones")
      .update({ stripe_subscription_id: stripeSubscriptionId })
      .eq("id", suscripcion.id)
    if (errorVinculo) {
      throw new Error(`No se pudo vincular stripe_subscription_id: ${errorVinculo.message}`)
    }
  }

  // Idempotencia (Stripe puede reenviar la misma notificación) + protección
  // contra notificaciones fuera de orden.
  if (suscripcion.estado === nuevoEstado) return
  if (ESTADOS_TERMINALES.includes(suscripcion.estado as EstadoSuscripcion)) return

  const { error: errorUpdate } = await admin
    .from("suscripciones")
    .update({
      estado: nuevoEstado,
      fecha_renovacion: subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", suscripcion.id)

  if (errorUpdate) {
    throw new Error(`No se pudo actualizar la suscripción en Supabase: ${errorUpdate.message}`)
  }

  const { error: errorTarjeta } = await admin
    .from("tarjetas")
    .update({ plan_id: nuevoEstado === "autorizada" ? suscripcion.plan_id : null })
    .eq("id", suscripcion.tarjeta_id)

  if (errorTarjeta) {
    throw new Error(`No se pudo actualizar el plan de la tarjeta: ${errorTarjeta.message}`)
  }
}
