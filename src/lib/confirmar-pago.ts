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
 * Verifica un pago de Mercado Pago contra su API y, si corresponde, aprueba
 * o rechaza la tarjeta asociada (por external_reference) usando el cliente
 * de service role. Pensado para llamarse desde las páginas de retorno
 * /pago/exito, /pago/pendiente y /pago/error.
 */
export async function confirmarPagoDesdeRedirect(
  paymentId: string | undefined
): Promise<ResultadoConfirmacion> {
  if (!paymentId) return { estadoPago: null, slug: null }

  const pago = await verificarPago(paymentId)
  if (!pago) return { estadoPago: null, slug: null }
  if (!pago.external_reference) return { estadoPago: pago.status ?? null, slug: null }

  const nuevoEstado: EstadoPago | null =
    pago.status === "approved"
      ? "aprobado"
      : pago.status === "rejected"
        ? "rechazado"
        : null

  let slug: string | null = null
  if (nuevoEstado) {
    const admin = getSupabaseAdmin()
    if (admin) {
      const { data } = await admin
        .from("tarjetas")
        .update({ estado_pago: nuevoEstado, metodo_pago: "mercado_pago" })
        .eq("id", pago.external_reference)
        .select("slug")
        .single()
      slug = data?.slug ?? null
    }
  }

  return { estadoPago: pago.status ?? null, slug }
}
