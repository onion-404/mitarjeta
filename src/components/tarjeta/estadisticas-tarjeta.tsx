"use client"

import {
  CalendarCheck,
  Download,
  Eye,
  Loader2,
  MousePointerClick,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import { getPlanPorId } from "@/lib/planes"
import {
  getEventosDetalle,
  getSerieDiaria,
  getTotalesPorPeriodo,
  type EventoDetalle,
  type PuntoSerieDiaria,
  type TotalesPorEvento,
} from "@/lib/metricas"
import { cn } from "@/lib/utils"
import type { Plan } from "@/lib/types"

interface EstadisticasTarjetaProps {
  tarjetaId: string
  planId: string | null
}

type PeriodoId = "hoy" | "semana" | "mes" | "custom"

const PERIODOS: { id: PeriodoId; etiqueta: string }[] = [
  { id: "hoy", etiqueta: "Hoy" },
  { id: "semana", etiqueta: "7 días" },
  { id: "mes", etiqueta: "30 días" },
]

const ETIQUETA_ENLACE: Record<string, string> = {
  tel: "Llamar",
  whatsapp: "WhatsApp",
  email: "Email",
  sitio_web: "Sitio web",
  ubicacion: "Cómo llegar",
}

function toISODate(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

function calcularRango(
  periodo: PeriodoId,
  customDesde: string,
  customHasta: string
): { desde: string; hasta: string } {
  if (periodo === "custom") {
    return { desde: customDesde, hasta: customHasta }
  }
  const hoy = new Date()
  const hasta = toISODate(hoy)
  const diasAtras = periodo === "hoy" ? 0 : periodo === "semana" ? 6 : 29
  const desdeFecha = new Date(hoy)
  desdeFecha.setUTCDate(desdeFecha.getUTCDate() - diasAtras)
  return { desde: toISODate(desdeFecha), hasta }
}

// Mismo largo de período, inmediatamente anterior al rango actual — para la
// comparativa ("vs. período anterior") de cada tile.
function calcularRangoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const d1 = new Date(`${desde}T00:00:00.000Z`)
  const d2 = new Date(`${hasta}T00:00:00.000Z`)
  const dias = Math.round((d2.getTime() - d1.getTime()) / 86_400_000) + 1
  const anteriorHasta = new Date(d1)
  anteriorHasta.setUTCDate(anteriorHasta.getUTCDate() - 1)
  const anteriorDesde = new Date(anteriorHasta)
  anteriorDesde.setUTCDate(anteriorDesde.getUTCDate() - (dias - 1))
  return { desde: toISODate(anteriorDesde), hasta: toISODate(anteriorHasta) }
}

// getSerieDiaria solo trae filas para los días que SÍ tuvieron algún evento
// (metricas_diarias no guarda ceros) — sin este relleno, un rango de 30 días
// con actividad solo en 2 días distintos se graficaría como una línea recta
// entre esos 2 puntos, dando la impresión falsa de una tendencia continua.
// Se completa acá (capa de presentación) con cero explícito para cada día
// sin datos, para que el eje X y la línea representen el rango real elegido.
function rellenarSerie(
  serie: PuntoSerieDiaria[],
  desde: string,
  hasta: string
): PuntoSerieDiaria[] {
  const porFecha = new Map(serie.map((punto) => [punto.fecha, punto]))
  const resultado: PuntoSerieDiaria[] = []
  const cursor = new Date(`${desde}T00:00:00.000Z`)
  const fin = new Date(`${hasta}T00:00:00.000Z`)
  while (cursor.getTime() <= fin.getTime()) {
    const fecha = toISODate(cursor)
    resultado.push(
      porFecha.get(fecha) ?? {
        fecha,
        vista_tarjeta: 0,
        click_enlace: 0,
        click_agendar: 0,
        agenda_completada: 0,
        click_producto: 0,
      }
    )
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return resultado
}

function formatearFechaCorta(fechaISO: string): string {
  const [, mes, dia] = fechaISO.split("-")
  return `${dia}/${mes}`
}

interface Delta {
  texto: string
  positivo: boolean
}

function calcularDelta(actual: number, anterior: number): Delta | null {
  if (actual === 0 && anterior === 0) return null
  if (anterior === 0) return { texto: "Nuevo", positivo: actual > 0 }
  const pct = Math.round(((actual - anterior) / anterior) * 100)
  return { texto: `${pct > 0 ? "+" : ""}${pct}%`, positivo: pct >= 0 }
}

interface FilaConteo {
  clave: string
  etiqueta: string
  cantidad: number
}

function topN(filas: FilaConteo[], n = 5): FilaConteo[] {
  return [...filas].sort((a, b) => b.cantidad - a.cantidad).slice(0, n)
}

function agruparPorClave(
  eventos: EventoDetalle[],
  tipo: EventoDetalle["tipo_evento"],
  obtenerClaveYEtiqueta: (metadata: Record<string, unknown>) => { clave: string; etiqueta: string } | null
): FilaConteo[] {
  const conteo = new Map<string, FilaConteo>()
  for (const evento of eventos) {
    if (evento.tipo_evento !== tipo) continue
    const resultado = obtenerClaveYEtiqueta(evento.metadata)
    if (!resultado) continue
    const existente = conteo.get(resultado.clave)
    if (existente) existente.cantidad += 1
    else conteo.set(resultado.clave, { ...resultado, cantidad: 1 })
  }
  return Array.from(conteo.values())
}

function exportarCsv(tarjetaId: string, eventos: EventoDetalle[]) {
  const encabezado = "tipo_evento,fecha,metadata\n"
  const filas = eventos
    .map((e) => `${e.tipo_evento},${e.created_at},"${JSON.stringify(e.metadata).replace(/"/g, '""')}"`)
    .join("\n")
  const blob = new Blob([encabezado + filas], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = `estadisticas-${tarjetaId.slice(0, 8)}.csv`
  enlace.click()
  URL.revokeObjectURL(url)
}

export function EstadisticasTarjeta({ tarjetaId, planId }: EstadisticasTarjetaProps) {
  const [plan, setPlan] = React.useState<Plan | null>(null)
  const [cargandoPlan, setCargandoPlan] = React.useState(true)
  const [periodo, setPeriodo] = React.useState<PeriodoId>("semana")
  const [customDesde, setCustomDesde] = React.useState(() => toISODate(new Date()))
  const [customHasta, setCustomHasta] = React.useState(() => toISODate(new Date()))
  const [totales, setTotales] = React.useState<TotalesPorEvento | null>(null)
  const [totalesAnterior, setTotalesAnterior] = React.useState<TotalesPorEvento | null>(null)
  const [serie, setSerie] = React.useState<PuntoSerieDiaria[]>([])
  const [eventosDetalle, setEventosDetalle] = React.useState<EventoDetalle[]>([])
  const [cargandoDatos, setCargandoDatos] = React.useState(true)

  React.useEffect(() => {
    let cancelado = false
    async function cargarPlan() {
      if (!planId) {
        if (!cancelado) {
          setPlan(null)
          setCargandoPlan(false)
        }
        return
      }
      const data = await getPlanPorId(planId)
      if (!cancelado) {
        setPlan(data)
        setCargandoPlan(false)
      }
    }
    cargarPlan()
    return () => {
      cancelado = true
    }
  }, [planId])

  // Desde la migración de 2 planes (2026-08-11): Connect no incluye
  // estadísticas en absoluto (ni los tiles básicos), Growth las incluye
  // completas — `metricas_activas` es el gate de entrada a toda la sección;
  // los 3 flags de abajo solo importan una vez que ya se pasó ese gate.
  const tieneMetricas = Boolean(plan?.features?.metricas_activas)
  const tieneDesglose = Boolean(plan?.features?.metricas_desglose)
  const tieneRangoCustom = Boolean(plan?.features?.metricas_rango_custom)
  const tieneExportacion = Boolean(plan?.features?.metricas_exportacion)

  const { desde, hasta } = React.useMemo(
    () => calcularRango(periodo, customDesde, customHasta),
    [periodo, customDesde, customHasta]
  )

  React.useEffect(() => {
    let cancelado = false
    async function cargarDatos() {
      if (!planId || !tieneMetricas) {
        if (!cancelado) setCargandoDatos(false)
        return
      }
      setCargandoDatos(true)
      const anterior = calcularRangoAnterior(desde, hasta)
      const [totalesActuales, totalesPrevios, serieDiaria] = await Promise.all([
        getTotalesPorPeriodo(tarjetaId, desde, hasta),
        getTotalesPorPeriodo(tarjetaId, anterior.desde, anterior.hasta),
        getSerieDiaria(tarjetaId, desde, hasta),
      ])
      const detalle = tieneDesglose ? await getEventosDetalle(tarjetaId, desde, hasta) : []
      if (cancelado) return
      setTotales(totalesActuales)
      setTotalesAnterior(totalesPrevios)
      setSerie(serieDiaria)
      setEventosDetalle(detalle)
      setCargandoDatos(false)
    }
    cargarDatos()
    return () => {
      cancelado = true
    }
  }, [tarjetaId, planId, desde, hasta, tieneMetricas, tieneDesglose])

  const serieCompleta = React.useMemo(
    () => rellenarSerie(serie, desde, hasta),
    [serie, desde, hasta]
  )

  const topEnlaces = React.useMemo(
    () =>
      topN(
        agruparPorClave(eventosDetalle, "click_enlace", (metadata) => {
          const tipoEnlace = String(metadata.tipo_enlace ?? "")
          if (tipoEnlace === "red_social") {
            const red = String(metadata.red ?? "red social")
            return { clave: `red:${red}`, etiqueta: red.charAt(0).toUpperCase() + red.slice(1) }
          }
          const etiqueta = ETIQUETA_ENLACE[tipoEnlace] ?? tipoEnlace
          return { clave: tipoEnlace, etiqueta }
        })
      ),
    [eventosDetalle]
  )

  const topServicios = React.useMemo(
    () =>
      topN(
        agruparPorClave(eventosDetalle, "agenda_completada", (metadata) => {
          const nombre = metadata.servicio_nombre
          if (typeof nombre !== "string" || !nombre.trim()) return null
          return { clave: nombre, etiqueta: nombre }
        })
      ),
    [eventosDetalle]
  )

  const topProductos = React.useMemo(
    () =>
      topN(
        agruparPorClave(eventosDetalle, "click_producto", (metadata) => {
          const titulo = metadata.producto_titulo
          if (typeof titulo !== "string" || !titulo.trim()) return null
          return { clave: titulo, etiqueta: titulo }
        })
      ),
    [eventosDetalle]
  )

  const visitantes = React.useMemo(() => {
    const diasPorHash = new Map<string, Set<string>>()
    for (const evento of eventosDetalle) {
      if (!evento.visitante_hash) continue
      const fecha = evento.created_at.slice(0, 10)
      const set = diasPorHash.get(evento.visitante_hash) ?? new Set<string>()
      set.add(fecha)
      diasPorHash.set(evento.visitante_hash, set)
    }
    const unicos = diasPorHash.size
    let recurrentes = 0
    for (const dias of diasPorHash.values()) {
      if (dias.size > 1) recurrentes += 1
    }
    return { unicos, recurrentes, nuevos: unicos - recurrentes }
  }, [eventosDetalle])

  if (cargandoPlan) {
    return <p className="px-1 text-sm text-muted-foreground">Cargando estadísticas...</p>
  }

  // Sin plan_id no hay suscripción autorizada: mismo criterio que Agenda, es
  // una función paga que se bloquea entera en vez de mostrar datos vacíos.
  if (!planId) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Necesitas un plan activo para ver las estadísticas de tu tarjeta. Suscríbete a un
        plan para habilitarlas.
      </p>
    )
  }

  // Con plan pero sin metricas_activas (plan Connect): a diferencia de
  // Agenda, esto no es "sin plan" — el plan existe y funciona, solo no
  // incluye estadísticas. Mismo criterio de bloquear la sección entera, sin
  // mostrar ni los tiles básicos (decisión explícita: Growth es el único
  // plan con estadísticas, Connect no tiene ninguna).
  if (!tieneMetricas) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Tu plan actual no incluye estadísticas. Pasate al plan Growth para ver vistas,
        clicks, agendamientos, productos con más interés y más.
      </p>
    )
  }

  const conversionAgendar =
    totales && totales.vista_tarjeta > 0
      ? Math.round((totales.agenda_completada / totales.vista_tarjeta) * 100)
      : 0
  const conversionProducto =
    totales && totales.vista_tarjeta > 0
      ? Math.round((totales.click_producto / totales.vista_tarjeta) * 100)
      : 0

  const tiles = [
    {
      etiqueta: "Vistas",
      valor: totales?.vista_tarjeta ?? 0,
      anterior: totalesAnterior?.vista_tarjeta ?? 0,
      icono: Eye,
      acento: "from-indigo-500 to-violet-500",
    },
    {
      etiqueta: "Clicks en enlaces",
      valor: totales?.click_enlace ?? 0,
      anterior: totalesAnterior?.click_enlace ?? 0,
      icono: MousePointerClick,
      acento: "from-blue-500 to-cyan-500",
    },
    {
      etiqueta: "Agendamientos",
      subtitulo: totales && totales.vista_tarjeta > 0 ? `${conversionAgendar}% de las vistas` : undefined,
      valor: totales?.agenda_completada ?? 0,
      anterior: totalesAnterior?.agenda_completada ?? 0,
      icono: CalendarCheck,
      acento: "from-emerald-500 to-teal-500",
    },
    {
      etiqueta: "Clicks a productos",
      subtitulo: totales && totales.vista_tarjeta > 0 ? `${conversionProducto}% de las vistas` : undefined,
      valor: totales?.click_producto ?? 0,
      anterior: totalesAnterior?.click_producto ?? 0,
      icono: ShoppingBag,
      acento: "from-amber-500 to-orange-500",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex w-fit rounded-full border border-border bg-white/70 p-1 shadow-sm backdrop-blur dark:bg-zinc-900/50">
          {PERIODOS.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => setPeriodo(opcion.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ease-out",
                periodo === opcion.id
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opcion.etiqueta}
            </button>
          ))}
          {tieneRangoCustom && (
            <button
              type="button"
              onClick={() => setPeriodo("custom")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ease-out",
                periodo === "custom"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Rango personalizado
            </button>
          )}
        </div>

        {tieneExportacion && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportarCsv(tarjetaId, eventosDetalle)}
            disabled={cargandoDatos || eventosDetalle.length === 0}
          >
            <Download className="size-3.5" /> Exportar CSV
          </Button>
        )}
      </div>

      {periodo === "custom" && tieneRangoCustom && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            Desde
            <input
              type="date"
              value={customDesde}
              max={customHasta}
              onChange={(e) => setCustomDesde(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            Hasta
            <input
              type="date"
              value={customHasta}
              min={customDesde}
              max={toISODate(new Date())}
              onChange={(e) => setCustomHasta(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </div>
      )}

      {cargandoDatos ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => {
              const delta = calcularDelta(tile.valor, tile.anterior)
              return (
                <div
                  key={tile.etiqueta}
                  className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
                >
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-gradient-to-br opacity-20 blur-2xl",
                      tile.acento
                    )}
                  />
                  <div className="relative flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-white",
                        tile.acento
                      )}
                    >
                      <tile.icono className="size-4" />
                    </span>
                    {delta && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-medium",
                          delta.positivo
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {delta.positivo ? (
                          <TrendingUp className="size-3" />
                        ) : (
                          <TrendingDown className="size-3" />
                        )}
                        {delta.texto}
                      </span>
                    )}
                  </div>
                  <p className="relative mt-2.5 text-2xl font-semibold text-foreground">
                    {tile.valor}
                  </p>
                  <p className="relative text-xs text-muted-foreground">{tile.etiqueta}</p>
                  {tile.subtitulo && (
                    <p className="relative mt-0.5 text-[11px] text-muted-foreground/80">
                      {tile.subtitulo}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-foreground">Actividad en el período</h3>
            <div className="mt-3 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serieCompleta} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={formatearFechaCorta}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    labelFormatter={(value) => formatearFechaCorta(String(value))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="vista_tarjeta"
                    name="Vistas"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="click_enlace"
                    name="Clicks"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="click_agendar"
                    name="Click Agendar"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="agenda_completada"
                    name="Agendamientos"
                    stroke="var(--chart-4)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="click_producto"
                    name="Clicks a productos"
                    stroke="var(--chart-5)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {tieneDesglose ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <BloqueTopN titulo="Enlaces más clickeados" filas={topEnlaces} />
              <BloqueTopN titulo="Servicios más agendados" filas={topServicios} />
              <BloqueTopN titulo="Productos con más interés" filas={topProductos} />

              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Users className="size-4 text-muted-foreground" /> Visitantes únicos vs.
                  recurrentes
                </h3>
                {visitantes.unicos === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Todavía no hay visitantes identificables en este período.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <div className="h-28 w-28 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { nombre: "Nuevos", valor: visitantes.nuevos },
                              { nombre: "Recurrentes", valor: visitantes.recurrentes },
                            ]}
                            dataKey="valor"
                            nameKey="nombre"
                            innerRadius={30}
                            outerRadius={48}
                            paddingAngle={2}
                            stroke="var(--card)"
                            strokeWidth={2}
                          >
                            <Cell fill="var(--chart-1)" />
                            <Cell fill="var(--chart-3)" />
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid var(--border)",
                              background: "var(--popover)",
                              color: "var(--popover-foreground)",
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
                        Nuevos: <strong className="text-foreground">{visitantes.nuevos}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ background: "var(--chart-3)" }} />
                        Recurrentes:{" "}
                        <strong className="text-foreground">{visitantes.recurrentes}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {visitantes.unicos} visitante{visitantes.unicos === 1 ? "" : "s"} único
                        {visitantes.unicos === 1 ? "" : "s"} en total
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // En la práctica inalcanzable hoy (metricas_desglose siempre
            // acompaña a metricas_activas en Growth, el único plan que pasa
            // el gate de arriba) — se deja como fallback defensivo si algún
            // día un plan separa ambos flags.
            <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
              Tu plan no incluye el desglose por enlace, servicios más agendados, productos
              con más interés y visitantes únicos vs. recurrentes.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function BloqueTopN({ titulo, filas }: { titulo: string; filas: FilaConteo[] }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
      {filas.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sin datos en este período.</p>
      ) : (
        <div className="mt-3 h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filas}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                type="category"
                dataKey="etiqueta"
                width={110}
                tick={{ fontSize: 12, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="cantidad" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
