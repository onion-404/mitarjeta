import "server-only"

import { MercadoPagoConfig, Payment, Preference } from "mercadopago"

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

function logErrorMp(contexto: string, error: unknown) {
  const detalle = error instanceof Error ? { ...error, message: error.message } : error
  console.error(contexto, JSON.stringify(detalle))
}

// URL pública y fija de la app: Mercado Pago exige back_urls.success absolutas
// y válidas para poder usar auto_return, así que no se derivan del request
// (poco confiable detrás de proxies) sino de esta constante configurable.
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

// Mercado Pago rechaza auto_return si back_urls.success no es una URL pública
// (https). En local (http://localhost) simplemente se omite: el back_url
// sigue funcionando, solo que el regreso no es automático.
const permiteAutoReturn = APP_URL.startsWith("https://")

function getConfig() {
  if (!accessToken) return null
  return new MercadoPagoConfig({ accessToken })
}

interface CrearPreferenciaParams {
  tarjetaId: string
  titulo: string
  precio: number
}

export async function crearPreferenciaPago({
  tarjetaId,
  titulo,
  precio,
}: CrearPreferenciaParams) {
  const config = getConfig()
  if (!config) return null

  try {
    const preferencia = await new Preference(config).create({
      body: {
        items: [
          {
            id: tarjetaId,
            title: titulo,
            quantity: 1,
            unit_price: precio,
            currency_id: "MXN",
          },
        ],
        external_reference: tarjetaId,
        back_urls: {
          success: `${APP_URL}/pago/exito`,
          pending: `${APP_URL}/pago/pendiente`,
          failure: `${APP_URL}/pago/error`,
        },
        ...(permiteAutoReturn ? { auto_return: "approved" as const } : {}),
      },
    })
    return preferencia.init_point ?? null
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
