import "server-only"

import { MercadoPagoConfig, PreApproval } from "mercadopago"

import type { PeriodicidadSuscripcion } from "@/lib/types"

// Archivo separado a propósito de lib/mercadopago.ts (Checkout Pro): son dos
// productos de Mercado Pago distintos, con APIs y ciclos de vida propios que
// no deben mezclarse (ver CLAUDE.md). Comparten únicamente el access token,
// por eso getConfig() está duplicado acá en vez de importarlo del otro
// archivo — dos líneas de duplicación son más baratas que acoplar ambos.
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

function logErrorMp(contexto: string, error: unknown) {
  const detalle = error instanceof Error ? { ...error, message: error.message } : error
  console.error(contexto, JSON.stringify(detalle))
}

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

function getConfig() {
  if (!accessToken) return null
  return new MercadoPagoConfig({ accessToken })
}

interface CrearPreapprovalParams {
  suscripcionId: string
  tarjetaId: string
  payerEmail: string
  reason: string
  precio: number
  periodicidad: PeriodicidadSuscripcion
}

interface PreapprovalCreada {
  preapprovalId: string
  initPoint: string
}

/**
 * Crea una suscripción (preapproval) "sin plan asociado": los términos
 * (monto, frecuencia) van directo en la suscripción, sin `preapproval_plan_id`
 * ni `card_token_id`. Devuelve un `init_point` para redirigir al usuario a
 * autorizarla en Mercado Pago — mismo patrón de redirect que Checkout Pro.
 *
 * A propósito NO se usa la modalidad "con plan asociado": esa exige crear la
 * suscripción ya con `card_token_id` (tarjeta tokenizada vía Checkout Bricks
 * en el frontend) y status "authorized" de entrada, sin ningún redirect —
 * una integración de captura de tarjeta propia que este proyecto no tiene ni
 * necesita hoy.
 */
export async function crearPreapproval({
  suscripcionId,
  tarjetaId,
  payerEmail,
  reason,
  precio,
  periodicidad,
}: CrearPreapprovalParams): Promise<PreapprovalCreada | null> {
  const config = getConfig()
  if (!config) return null

  try {
    const preapproval = await new PreApproval(config).create({
      body: {
        reason,
        external_reference: suscripcionId,
        payer_email: payerEmail,
        auto_recurring: {
          frequency: periodicidad === "anual" ? 12 : 1,
          frequency_type: "months",
          transaction_amount: precio,
          currency_id: "MXN",
        },
        // Sin página de confirmación dedicada todavía (fuera del alcance de
        // esta tarea): vuelve al editor de la tarjeta.
        back_url: `${APP_URL}/editar/${tarjetaId}`,
        status: "pending",
      },
    })

    if (!preapproval.id || !preapproval.init_point) return null
    return { preapprovalId: preapproval.id, initPoint: preapproval.init_point }
  } catch (error) {
    logErrorMp("Error al crear la suscripción (preapproval) de Mercado Pago:", error)
    return null
  }
}

/** Consulta el estado actual de una suscripción directo contra la API de Mercado Pago. */
export async function obtenerPreapproval(preapprovalId: string) {
  const config = getConfig()
  if (!config) return null

  try {
    return await new PreApproval(config).get({ id: preapprovalId })
  } catch (error) {
    logErrorMp("Error al consultar la suscripción (preapproval) de Mercado Pago:", error)
    return null
  }
}
