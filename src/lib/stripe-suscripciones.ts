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
  planNombreDisplay: string
  precioFinal: number
  periodicidad: PeriodicidadSuscripcion
}

interface CheckoutSessionCreada {
  checkoutSessionId: string
  checkoutUrl: string
}

/**
 * Crea una Checkout Session (mode: "subscription", hosteada por Stripe) para
 * el cobro recurrente del plan de una tarjeta. Reemplaza al preapproval "sin
 * plan asociado" de Mercado Pago — Checkout Pro de Mercado Pago (citas,
 * cobro manual) sigue intacto, ver CLAUDE.md.
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
 * No creamos el Customer de antemano (a diferencia de una primera versión de
 * esto): el email ya lo pide el propio Checkout hosteado de Stripe, pedirlo
 * también en nuestro formulario era redundante y confuso — Stripe crea el
 * Customer solo al completar el checkout, con el email que la persona
 * ingresa ahí. `stripe_customer_id` en `suscripciones` se completa después,
 * vía el webhook (`checkout.session.completed`), no acá.
 *
 * `locale: "es-419"` (español latinoamericano, NO "es" a secas — ese es
 * español de España): confirmado contra la referencia oficial de la API
 * (api/checkout/sessions/create) que son dos valores de locale distintos.
 * Sin esto Stripe autodetecta el locale del navegador, y con locale
 * "es"/España el checkout mostraba los montos en formato europeo
 * ("14,90" con coma decimal) en vez del formato mexicano ("14.90").
 */
export async function crearCheckoutSession({
  suscripcionId,
  tarjetaId,
  planNombreDisplay,
  precioFinal,
  periodicidad,
}: CrearCheckoutSessionParams): Promise<CheckoutSessionCreada | null> {
  const stripe = getStripe()
  if (!stripe) return null

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "es-419",
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
    return { checkoutSessionId: session.id, checkoutUrl: session.url }
  } catch (error) {
    logErrorStripe("Error al crear la Checkout Session de Stripe:", error)
    return null
  }
}
