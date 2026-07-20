import "server-only"

import { MercadoPagoConfig, PreApproval } from "mercadopago"

import { APP_URL } from "@/lib/site-url"
import type { PeriodicidadSuscripcion } from "@/lib/types"

// Archivo separado a propósito de lib/mercadopago.ts (Checkout Pro): son dos
// productos de Mercado Pago distintos, con APIs y ciclos de vida propios que
// no deben mezclarse (ver CLAUDE.md), y además viven en DOS APLICACIONES
// separadas dentro del dashboard de Mercado Pago — "mitarjeta" (Checkout Pro,
// pagos únicos, token en MERCADO_PAGO_ACCESS_TOKEN, usado por
// lib/mercadopago.ts) y "mitarjeta-suscripciones" (Suscripciones/preapproval,
// token en MERCADO_PAGO_ACCESS_TOKEN_SUSCRIPCIONES, usado acá). NO comparten
// token: la app "mitarjeta" a secas devolvía 500 al crear un preapproval, la
// cuenta/app de Suscripciones necesitaba habilitarse aparte. getConfig() está
// duplicado en vez de importarlo del otro archivo porque ahora ni siquiera
// comparten credencial — cero acoplamiento entre los dos módulos. La única
// excepción intencional es APP_URL (lib/site-url.ts): ambos apuntan al mismo
// dominio público, así que ahí sí conviene una sola fuente de verdad en vez
// de duplicar la constante.
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN_SUSCRIPCIONES

function logErrorMp(contexto: string, error: unknown) {
  const detalle = error instanceof Error ? { ...error, message: error.message } : error
  console.error(contexto, JSON.stringify(detalle))
}

// La API de preapproval de Mercado Pago devuelve 500 genérico (sin detalle)
// cuando payer_email tiene "+tag" (ej. usuario+tag@gmail.com), aunque sea una
// dirección válida según RFC. Confirmado en pruebas reales contra producción:
// el mismo correo sin el "+tag" funciona (201), con "+tag" falla siempre
// (500). Se normaliza acá, en el borde de la integración con Mercado Pago,
// para no perder suscripciones reales de usuarios que usan esa convención.
function normalizarPayerEmail(email: string) {
  return email.replace(/\+[^@]*@/, "@")
}

// LIMITACIÓN CONOCIDA: si la persona intenta autorizar el preapproval en
// Mercado Pago logueada con una cuenta de MP cuyo email no coincide con
// `payer_email`, MP rechaza el intento con "Tu e-mail no coincide con el de
// la suscripción" — pero ese rechazo ocurre enteramente dentro del checkout
// hosteado por MP, ANTES de que el preapproval cambie de estado. No hay
// transición de estado (se queda en "pending"), así que no dispara el
// webhook `subscription_preapproval` (confirmar-suscripcion.ts solo mapea
// authorized/paused/cancelled/pending — no existe un estado "rejected" para
// esto), y `back_url` tampoco recibe un query param de error que podamos
// leer: MP simplemente no redirige de vuelta si la persona ni siquiera pudo
// completar la autorización. No tenemos ninguna señal server-side de este
// caso puntual — solo se puede mitigar del lado del formulario (pedirle a
// la persona que confirme el email antes de crear la suscripción, ver
// TarjetaForm), no detectar ni notificar después de que ya ocurrió.

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
        payer_email: normalizarPayerEmail(payerEmail),
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
