import "server-only"

import Stripe from "stripe"

const secretKey = process.env.STRIPE_SECRET_KEY

/**
 * Reemplaza a Suscripciones de Mercado Pago (preapproval): Checkout Pro de
 * Mercado Pago sigue vivo sin cambios para citas y cobro manual (ver
 * CLAUDE.md) — esto es exclusivo del cobro recurrente del plan de la
 * tarjeta. Devuelve `null` si STRIPE_SECRET_KEY todavía no fue configurada,
 * mismo patrón que getSupabaseAdmin().
 */
export function getStripe() {
  if (!secretKey) return null
  return new Stripe(secretKey)
}
