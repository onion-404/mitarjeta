import "server-only"

import { getSupabaseAdmin } from "@/lib/supabase-admin"

// Granularidad de los huecos generados dentro de cada ventana disponible.
// No tiene por qué coincidir con duracion_minutos del servicio.
const PASO_MINUTOS = 15

// Mismo default que tarjetas.zona_horaria (ver migración
// 20260718090000_add_plan_default_y_zona_horaria.sql): fallback defensivo
// si por lo que sea no se pudo leer la fila de la tarjeta.
const ZONA_HORARIA_DEFAULT = "America/Mexico_City"

export interface SlotDisponible {
  inicio: string
  fin: string
}

interface Ventana {
  inicio: number
  fin: number
}

interface FilaSemanal {
  dia_semana: number
  hora_inicio: string
  hora_fin: string
}

interface FilaExcepcion {
  fecha: string
  tipo: "bloqueo" | "apertura_extra"
  hora_inicio: string | null
  hora_fin: string | null
}

// disponibilidad_semanal.hora_inicio/hora_fin y disponibilidad_excepciones.fecha
// están en la hora LOCAL del dueño de la tarjeta (tarjetas.zona_horaria, IANA:
// "America/Mexico_City", "Europe/Madrid", etc.), no en UTC. Todo lo que sigue
// convierte explícitamente entre esa hora local y los timestamptz (UTC) que
// vienen de `citas`, usando el Intl.DateTimeFormat nativo de JS — el proyecto
// no trae ninguna librería de fechas (ver package.json) y esto alcanza sin
// agregar una dependencia nueva.

function parseHora(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function formatHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function diaSemanaDeFecha(fecha: string): number {
  // `fecha` es un YYYY-MM-DD "puro" (calendario local, ya resuelto), así que
  // interpretarlo como medianoche UTC solo para sacar el día de la semana es
  // válido y no depende de ninguna zona horaria.
  return new Date(`${fecha}T00:00:00Z`).getUTCDay()
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Descompone un instante UTC en fecha y minutos-del-día en una zona IANA dada. */
function partesLocales(instante: Date, zonaHoraria: string): { fecha: string; minutos: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zonaHoraria,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  const p = Object.fromEntries(dtf.formatToParts(instante).map((x) => [x.type, x.value])) as Record<
    string,
    string
  >
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    minutos: Number(p.hour) * 60 + Number(p.minute),
  }
}

/**
 * Offset (en minutos, este de UTC positivo) de una zona IANA en el momento
 * `instante`. Se calcula formateando ese instante en la zona de destino y
 * comparando contra el mismo instante leído como si fuera UTC — el truco
 * estándar para sacar un offset con Intl sin librería de fechas.
 */
function offsetMinutos(instante: Date, zonaHoraria: string): number {
  const { fecha, minutos } = partesLocales(instante, zonaHoraria)
  const comoUtc = Date.UTC(
    Number(fecha.slice(0, 4)),
    Number(fecha.slice(5, 7)) - 1,
    Number(fecha.slice(8, 10)),
    Math.floor(minutos / 60),
    minutos % 60
  )
  return (comoUtc - instante.getTime()) / 60_000
}

/**
 * Convierte una fecha+hora LOCAL (zona IANA de la tarjeta) a un instante UTC.
 * Aproximación de una sola corrección (estándar para este caso de uso): se
 * asume primero que la hora local es UTC, se mide el offset real de la zona
 * en ese instante aproximado, y se corrige. Puede errar solo en el minuto
 * exacto de un cambio de horario de verano, que no es un caso relevante acá.
 */
function horaLocalAUtc(fecha: string, minutosDelDia: number, zonaHoraria: string): Date {
  const aproximado = new Date(`${fecha}T${formatHora(minutosDelDia)}:00.000Z`)
  const offset = offsetMinutos(aproximado, zonaHoraria)
  return new Date(aproximado.getTime() - offset * 60_000)
}

async function obtenerZonaHoraria(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  tarjetaId: string
): Promise<string> {
  const { data } = await admin
    .from("tarjetas")
    .select("zona_horaria")
    .eq("id", tarjetaId)
    .maybeSingle()

  return data?.zona_horaria || ZONA_HORARIA_DEFAULT
}

function restarIntervalo(ventanas: Ventana[], resta: Ventana): Ventana[] {
  const resultado: Ventana[] = []
  for (const v of ventanas) {
    if (resta.fin <= v.inicio || resta.inicio >= v.fin) {
      resultado.push(v)
      continue
    }
    if (resta.inicio > v.inicio) {
      resultado.push({ inicio: v.inicio, fin: Math.min(resta.inicio, v.fin) })
    }
    if (resta.fin < v.fin) {
      resultado.push({ inicio: Math.max(resta.fin, v.inicio), fin: v.fin })
    }
  }
  return resultado.filter((v) => v.fin > v.inicio)
}

/**
 * Combina el horario recurrente de un día con sus excepciones puntuales.
 * Un bloqueo de día completo (ambas horas null) vacía todas las ventanas;
 * un bloqueo parcial resta ese rango; una apertura_extra suma un rango nuevo.
 * Todo en minutos-del-día LOCALES (zona horaria de la tarjeta).
 */
function construirVentanasDelDia(
  semanalDelDia: FilaSemanal[],
  excepcionesDelDia: FilaExcepcion[]
): Ventana[] {
  const bloqueoCompleto = excepcionesDelDia.some(
    (e) => e.tipo === "bloqueo" && e.hora_inicio === null && e.hora_fin === null
  )
  if (bloqueoCompleto) return []

  let ventanas: Ventana[] = semanalDelDia.map((s) => ({
    inicio: parseHora(s.hora_inicio),
    fin: parseHora(s.hora_fin),
  }))

  for (const e of excepcionesDelDia) {
    if (e.tipo === "bloqueo" && e.hora_inicio && e.hora_fin) {
      ventanas = restarIntervalo(ventanas, {
        inicio: parseHora(e.hora_inicio),
        fin: parseHora(e.hora_fin),
      })
    }
  }
  for (const e of excepcionesDelDia) {
    if (e.tipo === "apertura_extra" && e.hora_inicio && e.hora_fin) {
      ventanas.push({ inicio: parseHora(e.hora_inicio), fin: parseHora(e.hora_fin) })
    }
  }

  return ventanas.sort((a, b) => a.inicio - b.inicio)
}

interface ServicioAgenda {
  tarjeta_id: string
  duracion_minutos: number
  activo: boolean
}

interface CitaOcupada {
  fecha_hora_inicio: string
  fecha_hora_fin: string
}

interface ObtenerSlotsParams {
  tarjetaId: string
  servicioId: string
  desde: string
  hasta: string
}

/**
 * Calcula los horarios libres de un servicio en un rango de fechas LOCALES
 * (zona horaria de la tarjeta), combinando disponibilidad_semanal +
 * disponibilidad_excepciones y descontando citas ya 'confirmada'/'pagada'.
 * Usa el cliente de service role a propósito: el público solo tiene policy
 * de select sobre servicios/disponibilidad, no sobre `citas`, así que leer
 * `citas` con el cliente anon devolvería siempre "sin ocupar" y el cálculo
 * de huecos libres quedaría mal (mostraría horarios ya tomados como libres).
 */
export async function obtenerSlotsDisponibles({
  tarjetaId,
  servicioId,
  desde,
  hasta,
}: ObtenerSlotsParams): Promise<SlotDisponible[] | null> {
  const admin = getSupabaseAdmin()
  if (!admin) return null

  const { data: servicioData } = await admin
    .from("servicios_agendables")
    .select("tarjeta_id, duracion_minutos, activo")
    .eq("id", servicioId)
    .eq("tarjeta_id", tarjetaId)
    .maybeSingle()

  const servicio = servicioData as ServicioAgenda | null
  if (!servicio || !servicio.activo) return []

  const zonaHoraria = await obtenerZonaHoraria(admin, tarjetaId)

  // Margen de un día a cada lado al filtrar `citas`: alcanza para cubrir
  // cualquier offset IANA real (entre UTC-12 y UTC+14) sin tener que hacer
  // la conversión exacta acá; la precisión real se resuelve abajo comparando
  // instantes (Date) ya convertidos.
  const [{ data: semanal }, { data: excepciones }, { data: citasOcupadas }] = await Promise.all([
    admin
      .from("disponibilidad_semanal")
      .select("dia_semana, hora_inicio, hora_fin")
      .eq("tarjeta_id", tarjetaId),
    admin
      .from("disponibilidad_excepciones")
      .select("fecha, tipo, hora_inicio, hora_fin")
      .eq("tarjeta_id", tarjetaId)
      .gte("fecha", desde)
      .lte("fecha", hasta),
    admin
      .from("citas")
      .select("fecha_hora_inicio, fecha_hora_fin")
      .eq("tarjeta_id", tarjetaId)
      .in("estado", ["confirmada", "pagada"])
      .lt("fecha_hora_inicio", `${sumarDias(hasta, 1)}T00:00:00Z`)
      .gt("fecha_hora_fin", `${sumarDias(desde, -1)}T00:00:00Z`),
  ])

  const semanalRows = (semanal ?? []) as FilaSemanal[]
  const excepcionesRows = (excepciones ?? []) as FilaExcepcion[]
  const ocupadas = ((citasOcupadas ?? []) as CitaOcupada[]).map((c) => ({
    inicio: new Date(c.fecha_hora_inicio),
    fin: new Date(c.fecha_hora_fin),
  }))

  const slots: SlotDisponible[] = []
  const duracion = servicio.duracion_minutos
  const ahora = Date.now()

  for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
    const diaSemana = diaSemanaDeFecha(fecha)
    const ventanas = construirVentanasDelDia(
      semanalRows.filter((s) => s.dia_semana === diaSemana),
      excepcionesRows.filter((e) => e.fecha === fecha)
    )

    for (const v of ventanas) {
      for (let inicio = v.inicio; inicio + duracion <= v.fin; inicio += PASO_MINUTOS) {
        const inicioDate = horaLocalAUtc(fecha, inicio, zonaHoraria)
        // Un slot que ya pasó (relevante sobre todo para "hoy") no es un
        // horario real disponible: /api/citas lo rechazaría igual, pero con
        // un error genérico de "fecha inválida" que no le dice al visitante
        // por qué. Se descarta acá para que la lista que ve nunca incluya
        // horarios que ya no puede tomar.
        if (inicioDate.getTime() <= ahora) continue
        const finDate = horaLocalAUtc(fecha, inicio + duracion, zonaHoraria)
        const ocupado = ocupadas.some((o) => inicioDate < o.fin && finDate > o.inicio)
        if (!ocupado) {
          slots.push({ inicio: inicioDate.toISOString(), fin: finDate.toISOString() })
        }
      }
    }
  }

  return slots
}

/**
 * Revalida, server-side, que una franja puntual (instantes UTC) sigue
 * dentro del horario publicado (semanal + excepciones, en hora LOCAL de la
 * tarjeta) — no confía en lo que el cliente vio antes en
 * /api/citas/disponibilidad. NO revisa solapamiento con otras citas: para
 * eso está la función SQL existe_solapamiento_cita, pensada para llamarse
 * aparte justo antes del insert.
 */
export async function estaDentroDeDisponibilidad(
  tarjetaId: string,
  fechaHoraInicio: Date,
  fechaHoraFin: Date
): Promise<boolean> {
  const admin = getSupabaseAdmin()
  if (!admin) return false

  const zonaHoraria = await obtenerZonaHoraria(admin, tarjetaId)
  const inicioLocal = partesLocales(fechaHoraInicio, zonaHoraria)
  const finLocal = partesLocales(fechaHoraFin, zonaHoraria)

  // No soporta franjas que cruzan medianoche local (ningún horario base lo hace).
  if (finLocal.fecha !== inicioLocal.fecha) return false

  const diaSemana = diaSemanaDeFecha(inicioLocal.fecha)
  const [{ data: semanal }, { data: excepciones }] = await Promise.all([
    admin
      .from("disponibilidad_semanal")
      .select("dia_semana, hora_inicio, hora_fin")
      .eq("tarjeta_id", tarjetaId)
      .eq("dia_semana", diaSemana),
    admin
      .from("disponibilidad_excepciones")
      .select("fecha, tipo, hora_inicio, hora_fin")
      .eq("tarjeta_id", tarjetaId)
      .eq("fecha", inicioLocal.fecha),
  ])

  const ventanas = construirVentanasDelDia(
    (semanal ?? []) as FilaSemanal[],
    (excepciones ?? []) as FilaExcepcion[]
  )

  return ventanas.some((v) => v.inicio <= inicioLocal.minutos && finLocal.minutos <= v.fin)
}
