import { supabase } from "@/lib/supabase"

export interface SuscripcionAutorizada {
  precio_final: number
  periodicidad: "mensual" | "anual"
  plan_id: string
}

// Cliente plain (no service role): la policy `suscripciones_admin_todo` ya
// le da al admin acceso completo vía su propio JWT, mismo patrón que el
// fetch de `tarjetas` que ya hace esta página.
export async function getSuscripcionesAutorizadas(): Promise<SuscripcionAutorizada[]> {
  const { data } = await supabase
    .from("suscripciones")
    .select("precio_final, periodicidad, plan_id")
    .eq("estado", "autorizada")

  return (data ?? []) as SuscripcionAutorizada[]
}

// Cuántas suscripciones quedaron a medias (Checkout Session creada, nunca
// confirmada por el webhook) — para el tile "Suscripciones pendientes" del
// Resumen admin, la señal de "algo necesita atención" real y vigente que
// reemplaza al viejo "Pagos pendientes" (estado_pago, huérfano del modelo
// de pago único). Solo el conteo (head:true + count:"exact"), no las filas.
export async function getConteoSuscripcionesPendientes(): Promise<number> {
  const { count } = await supabase
    .from("suscripciones")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente")

  return count ?? 0
}

// Set de tarjeta_id con al menos un servicio agendable activo — para "uso de
// features por plan" (agenda activa vs. solo perfil). No filtra por plan acá
// a propósito: cruzar con `tarjetas.plan_id` es responsabilidad del caller.
export async function getTarjetaIdsConAgendaActiva(): Promise<Set<string>> {
  const { data } = await supabase
    .from("servicios_agendables")
    .select("tarjeta_id")
    .eq("activo", true)

  return new Set((data ?? []).map((fila) => fila.tarjeta_id as string))
}

export interface HistorialSuscripcion {
  suscripcion_id: string
  estado_nuevo: string
  created_at: string
}

// Trae el historial completo — la tabla es chica hoy (producto en etapa
// temprana, tabla creada 2026-07-25) y no justifica paginar todavía; mismo
// criterio de "simplicidad ante todo" que ya usa el resto de este archivo
// (`tarjetas.select("*")` sin límite).
export async function getSuscripcionesHistorial(): Promise<HistorialSuscripcion[]> {
  const { data } = await supabase
    .from("suscripciones_historial")
    .select("suscripcion_id, estado_nuevo, created_at")
    .order("created_at", { ascending: true })

  return (data ?? []) as HistorialSuscripcion[]
}

export interface ResultadoChurn {
  autorizadasAlInicio: number
  canceladasEnPeriodo: number
  churnPct: number | null
}

const ESTADOS_TERMINALES = new Set(["cancelada", "vencida"])

/**
 * Churn = de las suscripciones que estaban 'autorizada' al INICIO del
 * período (`desde`), cuántas transicionaron a un estado terminal
 * (cancelada/vencida) durante el período. No alcanza con mirar el `estado`
 * actual de `suscripciones` (last-write-wins, no dice nada del pasado) —
 * por eso se reconstruye desde `suscripciones_historial`, fila por fila.
 *
 * Limitación aceptada y documentada en CLAUDE.md: `suscripciones_historial`
 * arrancó el 2026-07-25 con un backfill que ancla el estado de cada
 * suscripción A ESE MOMENTO, no una reconstrucción real de transiciones
 * anteriores — un `desde` previo a esa fecha da resultados incompletos
 * para lo que pasó antes del backfill (no hay forma de recuperar eso).
 */
export function calcularChurn(
  historial: HistorialSuscripcion[],
  desde: Date,
  hasta: Date
): ResultadoChurn {
  const porSuscripcion = new Map<string, HistorialSuscripcion[]>()
  for (const fila of historial) {
    const filas = porSuscripcion.get(fila.suscripcion_id)
    if (filas) filas.push(fila)
    else porSuscripcion.set(fila.suscripcion_id, [fila])
  }

  let autorizadasAlInicio = 0
  let canceladasEnPeriodo = 0

  for (const filas of porSuscripcion.values()) {
    // `historial` ya viene ordenado por created_at ascendente (ver
    // getSuscripcionesHistorial), así que cada grupo conserva ese orden.
    let estadoAlInicio: string | null = null
    let transicionoATerminal = false
    for (const fila of filas) {
      const fecha = new Date(fila.created_at)
      if (fecha <= desde) {
        estadoAlInicio = fila.estado_nuevo
      } else if (fecha <= hasta && ESTADOS_TERMINALES.has(fila.estado_nuevo)) {
        transicionoATerminal = true
      }
    }
    if (estadoAlInicio === "autorizada") {
      autorizadasAlInicio += 1
      if (transicionoATerminal) canceladasEnPeriodo += 1
    }
  }

  const churnPct =
    autorizadasAlInicio > 0 ? (canceladasEnPeriodo / autorizadasAlInicio) * 100 : null

  return { autorizadasAlInicio, canceladasEnPeriodo, churnPct }
}
