import "server-only"

import crypto from "crypto"

import { ActualizacionPagoError, actualizarEstadoPagoTarjeta } from "@/lib/confirmar-pago"

// Configurar en el panel de Mercado Pago junto con la URL del webhook para
// que las notificaciones se puedan validar por firma. Si todavía no está
// configurado, se procesan las notificaciones sin validar (ver firmaValida).
const WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET

function log(nivel: "info" | "warn" | "error", mensaje: string, detalle?: unknown) {
  const linea = `[mercadopago-webhook] ${mensaje}`
  const args = detalle !== undefined ? [linea, JSON.stringify(detalle)] : [linea]
  if (nivel === "info") console.log(...args)
  else if (nivel === "warn") console.warn(...args)
  else console.error(...args)
}

/**
 * Valida la firma HMAC-SHA256 que Mercado Pago envía en `x-signature`
 * (esquema documentado en su guía de webhooks: manifest "id:..;request-id:..;ts:..;").
 * Sin MERCADO_PAGO_WEBHOOK_SECRET configurado se deja pasar sin validar, para
 * no bloquear el webhook antes de tener el secreto disponible.
 */
function firmaValida(request: Request, dataId: string): boolean {
  if (!WEBHOOK_SECRET) return true

  const xSignature = request.headers.get("x-signature")
  const xRequestId = request.headers.get("x-request-id")
  if (!xSignature || !xRequestId) return false

  const partes = new Map(
    xSignature.split(",").map((par) => {
      const [clave, valor] = par.split("=").map((p) => p?.trim())
      return [clave, valor] as const
    })
  )
  const ts = partes.get("ts")
  const v1 = partes.get("v1")
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const firmaEsperada = crypto.createHmac("sha256", WEBHOOK_SECRET).update(manifest).digest("hex")

  try {
    const bufferRecibido = Buffer.from(v1, "hex")
    const bufferEsperado = Buffer.from(firmaEsperada, "hex")
    if (bufferRecibido.length !== bufferEsperado.length) return false
    return crypto.timingSafeEqual(bufferRecibido, bufferEsperado)
  } catch {
    return false
  }
}

interface NotificacionMercadoPago {
  type?: string
  topic?: string
  data?: { id?: string | number }
}

function extraerNotificacion(body: unknown, url: URL) {
  const b = (body ?? {}) as NotificacionMercadoPago
  const tipo = b.type ?? b.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic")
  const dataId =
    b.data?.id != null
      ? String(b.data.id)
      : (url.searchParams.get("data.id") ?? url.searchParams.get("id"))
  return { tipo: tipo ?? null, dataId: dataId ?? null }
}

export async function POST(request: Request) {
  const url = new URL(request.url)

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  const { tipo, dataId } = extraerNotificacion(body, url)

  if (tipo !== "payment" || !dataId) {
    log("info", "Notificación ignorada (no es de tipo payment o no trae id)", { tipo, dataId })
    return Response.json({ received: true }, { status: 200 })
  }

  if (!firmaValida(request, dataId)) {
    log("error", "Firma inválida, se rechaza la notificación", { dataId })
    return Response.json({ error: "Firma inválida" }, { status: 401 })
  }

  try {
    const resultado = await actualizarEstadoPagoTarjeta(dataId)
    log("info", "Pago procesado correctamente", { dataId, ...resultado })
    return Response.json({ received: true }, { status: 200 })
  } catch (error) {
    // Devolvemos 5xx a propósito: Mercado Pago reintenta automáticamente las
    // notificaciones que no responden 2xx, así que una caída momentánea de
    // Supabase se resuelve sola en un próximo reintento en vez de perder el pago.
    log("error", "Error al actualizar el pago, Mercado Pago reintentará", {
      dataId,
      estadoConocido: error instanceof ActualizacionPagoError ? error.estadoPago : null,
      mensaje: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: "Error temporal, se reintentará" }, { status: 500 })
  }
}

export async function GET() {
  // Mercado Pago prueba la URL del webhook con un GET al guardarla en el panel.
  return Response.json({ ok: true })
}
