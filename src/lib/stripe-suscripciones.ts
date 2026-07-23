import "server-only"

import { getStripe } from "@/lib/stripe"
import { APP_URL } from "@/lib/site-url"
import type { PeriodicidadSuscripcion } from "@/lib/types"

function logErrorStripe(contexto: string, error: unknown) {
  console.error(contexto, error instanceof Error ? error.message : error)
}

interface CrearCheckoutSessionParams {
  suscripcionId: string
  tarjetaId: string
  payerEmail: string
  planNombreDisplay: string
  precioFinal: number
  periodicidad: PeriodicidadSuscripcion
}

interface CheckoutSessionCreada {
  checkoutSessionId: string
  checkoutUrl: string
  customerId: string
}

/**
 * Crea un Customer + Checkout Session (mode: "subscription", hosteada por
 * Stripe) para el cobro recurrente del plan de una tarjeta. Reemplaza al
 * preapproval "sin plan asociado" de Mercado Pago — Checkout Pro de Mercado
 * Pago (citas, cobro manual) sigue intacto, ver CLAUDE.md.
 *
 * Precio con `price_data` inline (no un Price pre-creado en el dashboard de
 * Stripe): `planes.precio_mensual/anual` en Supabase ya es la fuente de
 * verdad de precios (todavía "placeholder", ver CLAUDE.md) y el descuento
 * final (cupón + tarjeta adicional) ya viene calculado por el llamador — así
 * un cambio de precio en `planes` no exige sincronizar nada en Stripe. El
 * Price que Stripe crea a partir de este `price_data` queda fijo para todas
 * las renovaciones futuras de ESTA suscripción puntual, que es justo la
 * semántica que ya usa Mercado Pago hoy (el descuento aplica para siempre a
 * esa suscripción, no se recalcula por ciclo).
 *
 * Un Customer nuevo por checkout (no reusado entre tarjetas del mismo
 * usuario): el plan vive en la tarjeta, no en el usuario (ver CLAUDE.md), y
 * no hay hoy una tabla de "usuario" donde persistir un customer_id
 * compartido. Se crea con el email ya confirmado por la persona en nuestro
 * formulario — eso hace que Stripe lo pre-llene y lo deje NO editable en su
 * checkout (a propósito: mismo campo que ya construimos para el bug de
 * mismatch de email de Mercado Pago).
 */
export async function crearCheckoutSession({
  suscripcionId,
  tarjetaId,
  payerEmail,
  planNombreDisplay,
  precioFinal,
  periodicidad,
}: CrearCheckoutSessionParams): Promise<CheckoutSessionCreada | null> {
  const stripe = getStripe()
  if (!stripe) return null

  try {
    const customer = await stripe.customers.create({
      email: payerEmail,
      metadata: { tarjeta_id: tarjetaId, suscripcion_id: suscripcionId },
    })

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      client_reference_id: suscripcionId,
      line_items: [
        {
          price_data: {
            currency: "mxn",
            unit_amount: Math.round(precioFinal * 100),
            recurring: { interval: periodicidad === "anual" ? "year" : "month" },
            product_data: {
              name: `Plan ${planNombreDisplay} (${periodicidad}) - Linkard`,
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { suscripcion_id: suscripcionId, tarjeta_id: tarjetaId },
      },
      success_url: `${APP_URL}/editar/${tarjetaId}?stripe=exito`,
      cancel_url: `${APP_URL}/editar/${tarjetaId}?stripe=cancelado`,
    })

    if (!session.url) return null
    return { checkoutSessionId: session.id, checkoutUrl: session.url, customerId: customer.id }
  } catch (error) {
    logErrorStripe("Error al crear la Checkout Session de Stripe:", error)
    return null
  }
}
