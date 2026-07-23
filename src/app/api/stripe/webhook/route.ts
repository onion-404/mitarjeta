import type Stripe from "stripe"

import { procesarSuscripcionStripe, vincularCheckoutSession } from "@/lib/confirmar-suscripcion-stripe"
import { getStripe } from "@/lib/stripe"

// Reemplaza (para el cobro recurrente) al webhook de Mercado Pago —
// /api/mercadopago/webhook sigue intacto, sigue siendo el que procesa
// Checkout Pro (citas, cobro manual), ver CLAUDE.md.
export async function POST(request: Request) {
  const stripe = getStripe()
  if (!stripe) {
    return Response.json({ error: "El servicio no está disponible." }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    console.error("[/api/stripe/webhook] falta stripe-signature o STRIPE_WEBHOOK_SECRET")
    return Response.json({ error: "Configuración incompleta." }, { status: 500 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error(
      "[/api/stripe/webhook] firma inválida:",
      error instanceof Error ? error.message : error
    )
    return Response.json({ error: "Firma inválida." }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await vincularCheckoutSession(event.data.object)
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await procesarSuscripcionStripe(event.data.object.id)
        break
      }
      case "invoice.payment_failed": {
        // Re-chequeo defensivo: en la práctica customer.subscription.updated
        // ya refleja el paso a `past_due`, esto es una red de seguridad por
        // si ese evento llega tarde o se pierde.
        const invoice = event.data.object
        const subscriptionDetails = invoice.parent?.subscription_details?.subscription
        const subscriptionId =
          typeof subscriptionDetails === "string" ? subscriptionDetails : subscriptionDetails?.id
        if (subscriptionId) {
          await procesarSuscripcionStripe(subscriptionId)
        }
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error(`[/api/stripe/webhook] error procesando ${event.type}:`, error)
    return Response.json({ error: "Error interno." }, { status: 500 })
  }

  return Response.json({ received: true })
}
