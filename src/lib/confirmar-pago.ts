import "server-only"

import { verificarPago } from "@/lib/mercadopago"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { EstadoPago } from "@/lib/types"

interface ResultadoConfirmacion {
  /** Estado real del pago según Mercado Pago (approved, pending, rejected, etc). */
  estadoPago: string | null
  /** Slug de la tarjeta afectada, si se pudo identificar y actualizar. */
  slug: string | null
}

/**
 * Se lanza cuando el pago ya se verificó contra Mercado Pago pero no se pudo
 * reflejar en Supabase (por ejemplo, una caída momentánea del servicio).
 * Conserva el estado ya conocido para que quien la capture decida qué hacer
 * (el webhook la usa para pedirle a Mercado Pago que reintente la notificación).
 */
export class ActualizacionPagoError extends Error {
  constructor(
    message: string,
    public estadoPago: string | null
  ) {
    super(message)
    this.name = "ActualizacionPagoError"
  }
}

function mapearEstado(estadoMp: string | undefined): EstadoPago | null {
  if (estadoMp === "approved") return "aprobado"
  if (estadoMp === "rejected") return "rechazado"
  return null
}

/**
 * Verifica un pago de Mercado Pago contra su API y, si corresponde, aprueba
 * o rechaza la tarjeta asociada (por external_reference) usando el cliente
 * de service role. Usada tanto por el webhook server-to-server
 * (/api/mercadopago/webhook) como por las páginas de retorno /pago/*.
 *
 * Lanza `ActualizacionPagoError` si el pago se verificó pero la escritura en
 * Supabase falló, para que el llamador decida si reintentar.
 */
export async function actualizarEstadoPagoTarjeta(
  paymentId: string
): Promise<ResultadoConfirmacion> {
  const pago = await verificarPago(paymentId)
  if (!pago) return { estadoPago: null, slug: null }
  if (!pago.external_reference) return { estadoPago: pago.status ?? null, slug: null }

  const nuevoEstado = mapearEstado(pago.status)
  if (!nuevoEstado) return { estadoPago: pago.status ?? null, slug: null }

  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new ActualizacionPagoError(
      "Supabase admin no disponible: falta SUPABASE_SERVICE_ROLE_KEY.",
      pago.status ?? null
    )
  }

  const { data, error } = await admin
    .from("tarjetas")
    .update({ estado_pago: nuevoEstado, metodo_pago: "mercado_pago" })
    .eq("id", pago.external_reference)
    .select("slug")
    .single()

  if (error) {
    throw new ActualizacionPagoError(
      `No se pudo actualizar la tarjeta en Supabase: ${error.message}`,
      pago.status ?? null
    )
  }

  return { estadoPago: pago.status ?? null, slug: data?.slug ?? null }
}

/**
 * Variante tolerante a fallos pensada para llamarse desde las páginas de
 * retorno /pago/exito, /pago/pendiente y /pago/error: si Supabase falla
 * momentáneamente no rompe la página, porque el webhook server-to-server
 * terminará confirmando el pago de todos modos.
 */
export async function confirmarPagoDesdeRedirect(
  paymentId: string | undefined
): Promise<ResultadoConfirmacion> {
  if (!paymentId) return { estadoPago: null, slug: null }

  try {
    return await actualizarEstadoPagoTarjeta(paymentId)
  } catch (error) {
    const estadoPago = error instanceof ActualizacionPagoError ? error.estadoPago : null
    return { estadoPago, slug: null }
  }
}
