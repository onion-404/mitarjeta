import "server-only"

import { MercadoPagoConfig, Payment, Preference } from "mercadopago"

import { APP_URL } from "@/lib/site-url"

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

function logErrorMp(contexto: string, error: unknown) {
  const detalle = error instanceof Error ? { ...error, message: error.message } : error
  console.error(contexto, JSON.stringify(detalle))
}

// Mercado Pago rechaza auto_return si back_urls.success no es una URL pública
// (https). En local (http://localhost) simplemente se omite: el back_url
// sigue funcionando, solo que el regreso no es automático.
const permiteAutoReturn = APP_URL.startsWith("https://")

function getConfig() {
  if (!accessToken) return null
  return new MercadoPagoConfig({ accessToken })
}

// "tarjeta" = pago único de la tarjeta de presentación. "cita" = pago
// opcional e inmediato de una cita agendada. "cobro_manual" = cobro puntual
// generado a mano desde el admin (sin fila propia en DB: ver
// lib/confirmar-pago.ts, que para este tipo no escribe nada, solo deja pasar
// la confirmación). Los tres son Checkout Pro (pagos únicos); esto NO tiene
// relación con la API de Suscripciones (preapproval).
type TipoReferenciaPago = "tarjeta" | "cita" | "cobro_manual"

interface CrearPreferenciaParams {
  referenciaId: string
  tipo: TipoReferenciaPago
  titulo: string
  precio: number
  /** Pre-llena el email del pagador en Checkout Pro (opcional). */
  payerEmail?: string
}

interface PreferenciaCreada {
  initPoint: string
  preferenceId: string
}

export async function crearPreferenciaPago({
  referenciaId,
  tipo,
  titulo,
  precio,
  payerEmail,
}: CrearPreferenciaParams): Promise<PreferenciaCreada | null> {
  const config = getConfig()
  if (!config) return null

  try {
    const preferencia = await new Preference(config).create({
      body: {
        items: [
          {
            id: referenciaId,
            title: titulo,
            quantity: 1,
            unit_price: precio,
            currency_id: "MXN",
          },
        ],
        // Prefijo para que el webhook sepa qué tabla actualizar al confirmar
        // el pago (ver parseReferenciaExterna en lib/confirmar-pago.ts).
        external_reference: `${tipo}:${referenciaId}`,
        back_urls: {
          success: `${APP_URL}/pago/exito`,
          pending: `${APP_URL}/pago/pendiente`,
          failure: `${APP_URL}/pago/error`,
        },
        ...(permiteAutoReturn ? { auto_return: "approved" as const } : {}),
        ...(payerEmail ? { payer: { email: payerEmail } } : {}),
        // Cuotas: no hace falta ningún parámetro para habilitarlas. Sin
        // `payment_methods.installments` (tope máximo) Mercado Pago ya
        // ofrece en el checkout todas las cuotas que el banco/tarjeta del
        // pagador soporte, "sin intereses" incluidas si la cuenta tiene esa
        // promoción habilitada — eso se configura del lado de Mercado Pago
        // (acuerdos con bancos), no vía la API de preferencias. Confirmado
        // contra los tipos del SDK (`PaymentMethods.installments` es un
        // techo opcional, no algo requerido para que aparezcan cuotas).
      },
    })
    if (!preferencia.init_point || !preferencia.id) return null
    return { initPoint: preferencia.init_point, preferenceId: preferencia.id }
  } catch (error) {
    logErrorMp("Error al crear la preferencia de Mercado Pago:", error)
    return null
  }
}

export async function verificarPago(paymentId: string) {
  const config = getConfig()
  if (!config) return null

  try {
    return await new Payment(config).get({ id: paymentId })
  } catch (error) {
    logErrorMp("Error al verificar el pago de Mercado Pago:", error)
    return null
  }
}
