import { supabase } from "@/lib/supabase"

// Debe coincidir con el check constraint de eventos_metricas.tipo_evento
// (ver src/lib/eventos.ts, la versión server-only de esta misma lista).
export type TipoEventoMetrica =
  | "vista_tarjeta"
  | "click_enlace"
  | "click_agendar"
  | "agenda_completada"
  | "click_producto"
  | "compra_completada"

export interface TotalesPorEvento {
  vista_tarjeta: number
  click_enlace: number
  click_agendar: number
  agenda_completada: number
  click_producto: number
  compra_completada: number
}

function totalesVacios(): TotalesPorEvento {
  return {
    vista_tarjeta: 0,
    click_enlace: 0,
    click_agendar: 0,
    agenda_completada: 0,
    click_producto: 0,
    compra_completada: 0,
  }
}

// Fechas en formato "YYYY-MM-DD" (mismo formato que la columna `fecha` de
// metricas_diarias, que a su vez bucketea por día UTC — ver el trigger de
// rollup en la migración de eventos_metricas). No se hace conversión de zona
// horaria acá a propósito: coincide con cómo se escribió el dato.
export async function getTotalesPorPeriodo(
  tarjetaId: string,
  desde: string,
  hasta: string
): Promise<TotalesPorEvento> {
  const { data } = await supabase
    .from("metricas_diarias")
    .select("tipo_evento, cantidad")
    .eq("tarjeta_id", tarjetaId)
    .gte("fecha", desde)
    .lte("fecha", hasta)

  const totales = totalesVacios()
  for (const fila of data ?? []) {
    if (fila.tipo_evento in totales) {
      totales[fila.tipo_evento as TipoEventoMetrica] += fila.cantidad
    }
  }
  return totales
}

// Misma agregación que getTotalesPorPeriodo, pero sumada entre varias
// tarjetas (`tarjeta_id in (...)`) — para la vista agregada de
// /mi-cuenta/estadisticas. RLS ya lo permite sin cambios: cada fila sigue
// individualmente satisfaciendo `tarjetas.user_id = auth.uid()`, el filtro
// de qué tarjetas pertenecen al usuario lo resuelve el caller (mismas
// tarjetaIds que ya trajo getTarjetasDeUsuario).
export async function getTotalesPorPeriodoUsuario(
  tarjetaIds: string[],
  desde: string,
  hasta: string
): Promise<TotalesPorEvento> {
  if (tarjetaIds.length === 0) return totalesVacios()

  const { data } = await supabase
    .from("metricas_diarias")
    .select("tipo_evento, cantidad")
    .in("tarjeta_id", tarjetaIds)
    .gte("fecha", desde)
    .lte("fecha", hasta)

  const totales = totalesVacios()
  for (const fila of data ?? []) {
    if (fila.tipo_evento in totales) {
      totales[fila.tipo_evento as TipoEventoMetrica] += fila.cantidad
    }
  }
  return totales
}

export interface PuntoSerieDiaria {
  fecha: string
  vista_tarjeta: number
  click_enlace: number
  click_agendar: number
  agenda_completada: number
  click_producto: number
}

// Serie día a día para el gráfico de tendencia — disponible para todos los
// planes (son totales por tipo_evento, no desglose por link/servicio/
// producto individual, así que no depende de `metricas_desglose`).
export async function getSerieDiaria(
  tarjetaId: string,
  desde: string,
  hasta: string
): Promise<PuntoSerieDiaria[]> {
  const { data } = await supabase
    .from("metricas_diarias")
    .select("fecha, tipo_evento, cantidad")
    .eq("tarjeta_id", tarjetaId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })

  const porFecha = new Map<string, PuntoSerieDiaria>()
  for (const fila of data ?? []) {
    if (fila.tipo_evento === "compra_completada") continue
    let punto = porFecha.get(fila.fecha)
    if (!punto) {
      punto = {
        fecha: fila.fecha,
        vista_tarjeta: 0,
        click_enlace: 0,
        click_agendar: 0,
        agenda_completada: 0,
        click_producto: 0,
      }
      porFecha.set(fila.fecha, punto)
    }
    punto[fila.tipo_evento as keyof Omit<PuntoSerieDiaria, "fecha">] += fila.cantidad
  }

  return Array.from(porFecha.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Serie sumada entre varias tarjetas — mismo criterio que
// getTotalesPorPeriodoUsuario.
export async function getSerieDiariaUsuario(
  tarjetaIds: string[],
  desde: string,
  hasta: string
): Promise<PuntoSerieDiaria[]> {
  if (tarjetaIds.length === 0) return []

  const { data } = await supabase
    .from("metricas_diarias")
    .select("fecha, tipo_evento, cantidad")
    .in("tarjeta_id", tarjetaIds)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })

  const porFecha = new Map<string, PuntoSerieDiaria>()
  for (const fila of data ?? []) {
    if (fila.tipo_evento === "compra_completada") continue
    let punto = porFecha.get(fila.fecha)
    if (!punto) {
      punto = {
        fecha: fila.fecha,
        vista_tarjeta: 0,
        click_enlace: 0,
        click_agendar: 0,
        agenda_completada: 0,
        click_producto: 0,
      }
      porFecha.set(fila.fecha, punto)
    }
    punto[fila.tipo_evento as keyof Omit<PuntoSerieDiaria, "fecha">] += fila.cantidad
  }

  return Array.from(porFecha.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export interface EventoDetalle {
  tipo_evento: TipoEventoMetrica
  metadata: Record<string, unknown>
  visitante_hash: string | null
  created_at: string
}

// Filas crudas de eventos_metricas — solo para planes con `metricas_desglose`
// (Growth): desglose por enlace/servicio/producto, único vs. recurrente, y
// export CSV, todo se deriva de esto en el componente.
export async function getEventosDetalle(
  tarjetaId: string,
  desde: string,
  hasta: string
): Promise<EventoDetalle[]> {
  const { data } = await supabase
    .from("eventos_metricas")
    .select("tipo_evento, metadata, visitante_hash, created_at")
    .eq("tarjeta_id", tarjetaId)
    .gte("created_at", `${desde}T00:00:00.000Z`)
    .lte("created_at", `${hasta}T23:59:59.999Z`)
    .order("created_at", { ascending: true })

  return (data ?? []) as EventoDetalle[]
}

// Desglose sumado entre varias tarjetas — el caller filtra `tarjetaIds` a
// solo las que individualmente califican para `metricas_desglose` (ver
// /mi-cuenta/estadisticas): a diferencia de los totales, el desglose no
// tiene sentido agregarlo desde tarjetas de un plan que no lo habilita.
export async function getEventosDetalleUsuario(
  tarjetaIds: string[],
  desde: string,
  hasta: string
): Promise<EventoDetalle[]> {
  if (tarjetaIds.length === 0) return []

  const { data } = await supabase
    .from("eventos_metricas")
    .select("tipo_evento, metadata, visitante_hash, created_at")
    .in("tarjeta_id", tarjetaIds)
    .gte("created_at", `${desde}T00:00:00.000Z`)
    .lte("created_at", `${hasta}T23:59:59.999Z`)
    .order("created_at", { ascending: true })

  return (data ?? []) as EventoDetalle[]
}
