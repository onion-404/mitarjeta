import "server-only"

import { obtenerPreapproval } from "@/lib/mercadopago-suscripciones"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { EstadoSuscripcion } from "@/lib/types"

function mapearEstadoSuscripcion(status: string | undefined): EstadoSuscripcion | null {
  switch (status) {
    case "authorized":
      return "autorizada"
    case "paused":
      return "pausada"
    // La documentación de Mercado Pago usa indistintamente "cancelled" y
    // "canceled" según la página; se aceptan ambas grafías por las dudas.
    case "cancelled":
    case "canceled":
      return "cancelada"
    case "pending":
      return "pendiente"
    default:
      return null
  }
}

// Una vez cancelada (o vencida, estado propio que Mercado Pago no emite) la
// suscripción no debe "revivir" por una notificación fuera de orden.
const ESTADOS_TERMINALES: EstadoSuscripcion[] = ["cancelada", "vencida"]

/**
 * Confirma el estado de una suscripción (preapproval) contra la API de
 * Mercado Pago y actualiza `suscripciones.estado`. También mantiene
 * `tarjetas.plan_id` (caché denormalizado) sincronizado en las DOS
 * direcciones: lo asigna al quedar 'autorizada', y lo vuelve a `null` en
 * cualquier otro estado (pausada, cancelada, vencida, o incluso pendiente si
 * por algo ya tenía un valor) — no hay plan gratuito al que "bajar", así que
 * `null` es lo único que refleja "sin plan confirmado ahora mismo". Con esto
 * el caché es confiable en ambas direcciones y el código que lee `plan_id`
 * para gating (comisión de citas, límite de servicios agendables) no
 * necesita consultar `suscripciones` por separado.
 *
 * Lanza si el preapproval se verificó pero la escritura en Supabase falló,
 * para que el llamador (webhook) le pida a Mercado Pago que reintente.
 */
export async function actualizarEstadoSuscripcion(preapprovalId: string): Promise<void> {
  const preapproval = await obtenerPreapproval(preapprovalId)
  if (!preapproval) return

  const nuevoEstado = mapearEstadoSuscripcion(preapproval.status)
  if (!nuevoEstado) return

  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin no disponible: falta SUPABASE_SERVICE_ROLE_KEY.")
  }

  const { data: suscripcion, error: errorLectura } = await admin
    .from("suscripciones")
    .select("id, tarjeta_id, plan_id, estado")
    .eq("preapproval_id", preapprovalId)
    .maybeSingle()

  if (errorLectura) {
    throw new Error(`No se pudo leer la suscripción en Supabase: ${errorLectura.message}`)
  }
  if (!suscripcion) {
    console.error(
      `[confirmar-suscripcion] Notificación para un preapproval desconocido: ${preapprovalId}`
    )
    return
  }

  // Idempotencia (Mercado Pago puede reenviar la misma notificación) +
  // protección contra notificaciones fuera de orden.
  if (suscripcion.estado === nuevoEstado) return
  if (ESTADOS_TERMINALES.includes(suscripcion.estado as EstadoSuscripcion)) return

  const { error: errorUpdate } = await admin
    .from("suscripciones")
    .update({
      estado: nuevoEstado,
      fecha_renovacion: preapproval.next_payment_date ?? null,
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
