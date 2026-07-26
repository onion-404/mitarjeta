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

/**
 * Extrae el id del PaymentIntent que pagó una factura — camino confirmado
 * contra los tipos reales de `stripe` v22.3.2 instalados en este proyecto
 * (InvoicePayments.d.ts): `invoice.payments.data[].payment.payment_intent`,
 * NO `invoice.payment_intent` (ese campo top-level ya no existe en esta
 * versión de API, mismo tipo de drift ya documentado en CLAUDE.md para
 * `current_period_end`/`invoice.subscription`). Solo poblado para invoices
 * finalizadas desde el 15 de marzo de 2019 — siempre cierto para nosotros.
 *
 * `invoice.payments` NO viene poblado por default — ni siquiera en el
 * objeto completo que trae el payload del webhook — hace falta pedirlo
 * con `expand: ["payments"]` en un retrieve aparte (confirmado en la
 * verificación en vivo: sin este expand, `invoice.payments` llega
 * `undefined`). Por eso esta función re-consulta el invoice por su cuenta
 * en vez de confiar en el objeto que ya tiene `registrarCobroDeCupon`.
 */
async function obtenerPaymentIntentId(stripe: Stripe, invoiceId: string): Promise<string | null> {
  const invoiceConPagos = await stripe.invoices.retrieve(invoiceId, { expand: ["payments"] })
  const pago = invoiceConPagos.payments?.data[0]?.payment
  const paymentIntent = pago?.payment_intent
  if (!paymentIntent) return null
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id
}

/**
 * Fee real de Stripe para ESTE cobro puntual — nunca un % estimado.
 * `balance_transaction.fee` puede no estar listo todavía en el instante
 * exacto en que se confirma el pago (Stripe: "the balance_transaction
 * field... could be null immediately after confirmation" con captura
 * async) — se reintenta unas pocas veces con una espera corta antes de
 * resignarse a dejarlo en null (se autocorregiría en la próxima
 * renovación si esto pasara, no hay backfill retroactivo separado: no
 * existe un campo confiable de Charge/PaymentIntent que apunte de vuelta
 * al Invoice en esta versión de API, confirmado revisando los tipos reales
 * — Charge no tiene `invoice`, PaymentIntent tampoco).
 */
async function intentarObtenerFeeReal(
  stripe: Stripe,
  invoice: Stripe.Invoice
): Promise<{ comisionStripe: number | null; montoNeto: number | null }> {
  const precioFinal = invoice.amount_paid / 100
  const paymentIntentId = await obtenerPaymentIntentId(stripe, invoice.id as string)
  if (!paymentIntentId) return { comisionStripe: null, montoNeto: null }

  for (let intento = 0; intento < 3; intento++) {
    if (intento > 0) await new Promise((resolve) => setTimeout(resolve, 1500))

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    })
    const charge = typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null
    const balanceTransaction =
      charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null

    if (balanceTransaction) {
      const comisionStripe = balanceTransaction.fee / 100
      return { comisionStripe, montoNeto: precioFinal - comisionStripe }
    }
  }

  return { comisionStripe: null, montoNeto: null }
}

/**
 * `invoice.paid`: registra CADA cobro atribuido a un cupón — no solo la
 * venta inicial, también cada renovación (decisión de negocio confirmada:
 * la comisión de afiliados es recurrente sobre cada cobro, ver CLAUDE.md).
 * Reemplaza a la vieja `registrarUsoDeCupon()`, que solo corría una vez
 * por suscripción desde `procesarSuscripcionStripe` — `invoice.paid` ya
 * dispara igual en el primer cobro (confirmado con el log real de
 * `stripe listen` de la verificación de Parte B), así que este único
 * handler cubre ambos casos sin duplicar lógica.
 *
 * Idempotencia: `stripe_invoice_id` tiene un unique constraint en
 * `cupon_usos` (un constraint normal, no un índice parcial — Postgres ya
 * trata cada NULL como distinto de cualquier otro NULL, así que las filas
 * legacy sin `stripe_invoice_id` no chocan entre sí; ver migración
 * 20260727010000, corrigió un primer intento con índice parcial que no
 * funcionaba como target de ON CONFLICT desde supabase-js) — el `upsert`
 * con `ignoreDuplicates` hace que un reintento de webhook de Stripe para
 * el mismo invoice no duplique la fila, sin necesitar una tabla de dedup
 * aparte.
 */
export async function registrarCobroDeCupon(invoice: Stripe.Invoice): Promise<void> {
  const stripe = getStripe()
  if (!stripe) return

  const subscriptionDetails = invoice.parent?.subscription_details
  const subscriptionRef = subscriptionDetails?.subscription
  const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id
  if (!subscriptionId) return

  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin no disponible: falta SUPABASE_SERVICE_ROLE_KEY.")
  }

  let { data: suscripcion } = await admin
    .from("suscripciones")
    .select("id, tarjeta_id, precio_base, cupon_codigo")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()

  // Los webhooks de Stripe no garantizan orden: `invoice.paid` puede llegar
  // antes de que `checkout.session.completed` (vincularCheckoutSession)
  // termine de escribir `stripe_subscription_id` — confirmado en la
  // verificación en vivo, no una hipótesis (el primer intento real de este
  // handler no encontró la suscripción por esa razón exacta). Mismo
  // fallback que ya usa procesarSuscripcionStripe: caer al
  // `suscripcion_id` que viaja en los metadata de la suscripción — acá ya
  // llega snapshotteado en el propio invoice
  // (`subscription_details.metadata`, poblado desde el 29 de junio de
  // 2023), sin necesitar una llamada extra a la API de Stripe.
  if (!suscripcion) {
    const suscripcionIdMeta = subscriptionDetails?.metadata?.suscripcion_id
    if (!suscripcionIdMeta) return

    const { data: porMetadata } = await admin
      .from("suscripciones")
      .select("id, tarjeta_id, precio_base, cupon_codigo")
      .eq("id", suscripcionIdMeta)
      .maybeSingle()
    suscripcion = porMetadata
  }

  if (!suscripcion?.cupon_codigo) return // no hay afiliado/cupón que atribuir a este cobro

  const precioFinal = invoice.amount_paid / 100
  const montoDescontado = suscripcion.precio_base - precioFinal
  const { comisionStripe, montoNeto } = await intentarObtenerFeeReal(stripe, invoice)

  const { data: cupon } = await admin
    .from("cupones")
    .select("id, afiliado_id, afiliado_nombre")
    .eq("codigo", suscripcion.cupon_codigo)
    .maybeSingle()

  const { error: errorUso } = await admin.from("cupon_usos").upsert(
    {
      cupon_id: cupon?.id ?? null,
      afiliado_id: cupon?.afiliado_id ?? null,
      tarjeta_id: suscripcion.tarjeta_id,
      suscripcion_id: suscripcion.id,
      stripe_invoice_id: invoice.id,
      codigo: suscripcion.cupon_codigo,
      afiliado_nombre: cupon?.afiliado_nombre ?? null,
      monto_descontado: montoDescontado,
      precio_final: precioFinal,
      comision_stripe: comisionStripe,
      monto_neto: montoNeto,
    },
    { onConflict: "stripe_invoice_id", ignoreDuplicates: true }
  )

  if (errorUso) {
    // No se relanza: el pago ya está confirmado (esto corre independiente
    // de la sincronización de plan_id/estado, que ya pasó por su propio
    // camino en procesarSuscripcionStripe) — perder el registro de
    // auditoría del cupón no debe hacer fallar la confirmación del pago.
    console.error(
      `[confirmar-suscripcion-stripe] No se pudo registrar el cobro del cupón (invoice=${invoice.id}, suscripcion_id=${suscripcion.id}):`,
      errorUso
    )
  }
}
