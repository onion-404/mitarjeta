import "server-only"

import { verificarPago } from "@/lib/mercadopago"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { EstadoPago } from "@/lib/types"

interface ResultadoConfirmacion {
  /** Estado real del pago según Mercado Pago (approved, pending, rejected, etc). */
  estadoPago: string | null
  /** Slug de la tarjeta afectada, si se pudo identificar y actualizar (solo tipo "tarjeta"). */
  slug: string | null
  /** A qué correspondía external_reference, para que la página de retorno sepa qué texto mostrar. */
  tipo: "tarjeta" | "cita" | "cobro_manual" | null
  /** Id de la cita afectada (solo tipo "cita"); la página la usa para traer datos de despliegue. */
  citaId: string | null
}

const SIN_REFERENCIA: ResultadoConfirmacion = {
  estadoPago: null,
  slug: null,
  tipo: null,
  citaId: null,
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

// Una cita rechazada libera el horario (a diferencia de una tarjeta
// rechazada, que conserva su fila): 'cancelada' es el único estado no
// terminal-de-pago que existe_solapamiento_cita() ya excluye del bloqueo.
function mapearEstadoCita(estadoMp: string | undefined): "pagada" | "cancelada" | null {
  if (estadoMp === "approved") return "pagada"
  if (estadoMp === "rejected") return "cancelada"
  return null
}

type PagoVerificado = NonNullable<Awaited<ReturnType<typeof verificarPago>>>

/**
 * `external_reference` viene como `"tarjeta:<id>"`, `"cita:<id>"` o
 * `"cobro_manual:<id>"` (ver lib/mercadopago.ts). Sin prefijo se asume
 * `tarjeta` por compatibilidad con preferencias creadas antes de introducir
 * el prefijo.
 */
function parseReferenciaExterna(externalReference: string): {
  tipo: "tarjeta" | "cita" | "cobro_manual"
  id: string
} {
  const separador = externalReference.indexOf(":")
  if (separador === -1) return { tipo: "tarjeta", id: externalReference }

  const prefijo = externalReference.slice(0, separador)
  const id = externalReference.slice(separador + 1)
  if (prefijo === "cita") return { tipo: "cita", id }
  if (prefijo === "cobro_manual") return { tipo: "cobro_manual", id }
  if (prefijo === "tarjeta") return { tipo: "tarjeta", id }
  return { tipo: "tarjeta", id: externalReference }
}

async function obtenerComisionVentaPct(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  tarjetaId: string
): Promise<number | null> {
  const { data: tarjeta } = await admin
    .from("tarjetas")
    .select("plan_id")
    .eq("id", tarjetaId)
    .maybeSingle()

  if (!tarjeta?.plan_id) return null

  const { data: plan } = await admin
    .from("planes")
    .select("features")
    .eq("id", tarjeta.plan_id)
    .maybeSingle()

  const pct = plan?.features?.comision_venta_pct
  return typeof pct === "number" ? pct : null
}

/**
 * Confirma el pago de una cita: la pasa a 'pagada'/'cancelada' y, si se
 * aprobó, calcula comisión de Mercado Pago y de plataforma. Si la tarjeta
 * todavía no tiene un plan asignado (suscripciones aún no implementado, ver
 * CLAUDE.md) la cita igual se marca 'pagada' pero comision_plataforma y
 * monto_neto_proveedor quedan en null: mejor dejarlo pendiente de ajuste
 * manual en la liquidación que inventar una tasa.
 */
async function confirmarPagoCita(citaId: string, pago: PagoVerificado): Promise<void> {
  const nuevoEstado = mapearEstadoCita(pago.status)
  if (!nuevoEstado) return

  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new ActualizacionPagoError(
      "Supabase admin no disponible: falta SUPABASE_SERVICE_ROLE_KEY.",
      pago.status ?? null
    )
  }

  const { data: cita, error: errorLectura } = await admin
    .from("citas")
    .select("id, tarjeta_id, monto_bruto, estado")
    .eq("id", citaId)
    .maybeSingle()

  if (errorLectura) {
    throw new ActualizacionPagoError(
      `No se pudo leer la cita en Supabase: ${errorLectura.message}`,
      pago.status ?? null
    )
  }
  if (!cita) {
    console.error(`[confirmar-pago] Pago recibido para una cita inexistente: ${citaId}`)
    return
  }

  // Idempotencia: Mercado Pago puede reenviar la misma notificación.
  if (cita.estado === "pagada" || cita.estado === "cancelada") return

  let comisionMercadopago: number | null = null
  if (Array.isArray(pago.fee_details)) {
    const total = pago.fee_details
      .filter((f) => f.type === "mercadopago_fee")
      .reduce((suma, f) => suma + (f.amount ?? 0), 0)
    if (total > 0) comisionMercadopago = total
  }

  let comisionPlataforma: number | null = null
  let montoNetoProveedor: number | null = null

  if (nuevoEstado === "pagada") {
    const comisionPct = await obtenerComisionVentaPct(admin, cita.tarjeta_id)
    if (comisionPct !== null) {
      comisionPlataforma = Number((cita.monto_bruto * (comisionPct / 100)).toFixed(2))
      montoNetoProveedor = Number(
        (cita.monto_bruto - (comisionMercadopago ?? 0) - comisionPlataforma).toFixed(2)
      )
    } else {
      console.error(
        `[confirmar-pago] Tarjeta ${cita.tarjeta_id} sin plan asignado: no se pudo calcular ` +
          `comision_plataforma para la cita ${citaId}, requiere ajuste manual antes de liquidar.`
      )
    }
  }

  const { error: errorUpdate } = await admin
    .from("citas")
    .update({
      estado: nuevoEstado,
      comision_mercadopago: comisionMercadopago,
      comision_plataforma: comisionPlataforma,
      monto_neto_proveedor: montoNetoProveedor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", citaId)

  if (errorUpdate) {
    throw new ActualizacionPagoError(
      `No se pudo actualizar la cita en Supabase: ${errorUpdate.message}`,
      pago.status ?? null
    )
  }
}

/**
 * Verifica un pago de Mercado Pago contra su API y, según a qué corresponda
 * external_reference, aprueba/rechaza la tarjeta o confirma/cancela la cita
 * asociada, usando el cliente de service role. Usada tanto por el webhook
 * server-to-server (/api/mercadopago/webhook) como por las páginas de
 * retorno /pago/* (que usan `tipo`/`citaId` del resultado para saber qué
 * texto mostrar y, si aplica, traer los datos de la cita para desplegarlos).
 *
 * Lanza `ActualizacionPagoError` si el pago se verificó pero la escritura en
 * Supabase falló, para que el llamador decida si reintentar.
 */
export async function actualizarEstadoPagoTarjeta(
  paymentId: string
): Promise<ResultadoConfirmacion> {
  const pago = await verificarPago(paymentId)
  if (!pago) return SIN_REFERENCIA
  if (!pago.external_reference) return { ...SIN_REFERENCIA, estadoPago: pago.status ?? null }

  const referencia = parseReferenciaExterna(pago.external_reference)

  if (referencia.tipo === "cita") {
    await confirmarPagoCita(referencia.id, pago)
    return { estadoPago: pago.status ?? null, slug: null, tipo: "cita", citaId: referencia.id }
  }

  // Cobro manual: no existe fila en DB que referenciar (ver
  // /api/admin/cobro-manual), así que no hay nada que actualizar — solo se
  // informa el estado real para que la página de retorno muestre el texto
  // correcto. Sin este corte, "cobro_manual:<uuid>" caería al branch de
  // "tarjeta" de abajo e intentaría un UPDATE contra un id que no existe en
  // `tarjetas`, fallando con "single()" y haciendo que Mercado Pago reintente
  // el webhook para siempre.
  if (referencia.tipo === "cobro_manual") {
    return { estadoPago: pago.status ?? null, slug: null, tipo: "cobro_manual", citaId: null }
  }

  const nuevoEstado = mapearEstado(pago.status)
  if (!nuevoEstado) {
    return { estadoPago: pago.status ?? null, slug: null, tipo: "tarjeta", citaId: null }
  }

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
    .eq("id", referencia.id)
    .select("slug")
    .single()

  if (error) {
    throw new ActualizacionPagoError(
      `No se pudo actualizar la tarjeta en Supabase: ${error.message}`,
      pago.status ?? null
    )
  }

  return { estadoPago: pago.status ?? null, slug: data?.slug ?? null, tipo: "tarjeta", citaId: null }
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
  if (!paymentId) return SIN_REFERENCIA

  try {
    return await actualizarEstadoPagoTarjeta(paymentId)
  } catch (error) {
    const estadoPago = error instanceof ActualizacionPagoError ? error.estadoPago : null
    return { ...SIN_REFERENCIA, estadoPago }
  }
}
