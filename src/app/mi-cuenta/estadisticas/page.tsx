"use client"

import type { Session } from "@supabase/supabase-js"
import { CalendarCheck, Eye, Loader2, MousePointerClick, ShoppingBag, Users } from "lucide-react"
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

import {
  getEventosDetalleUsuario,
  getSerieDiariaUsuario,
  getTotalesPorPeriodoUsuario,
  type EventoDetalle,
  type PuntoSerieDiaria,
  type TotalesPorEvento,
} from "@/lib/metricas"
import { getPlanesActivos } from "@/lib/planes"
import { getTarjetasDeUsuario } from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { Plan, TarjetaConPlan } from "@/lib/types"
import { cn } from "@/lib/utils"

type PeriodoId = "hoy" | "semana" | "mes"

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

function calcularRango(periodo: PeriodoId): { desde: string; hasta: string } {
  const hoy = new Date()
  const hasta = toISODate(hoy)
  const diasAtras = periodo === "hoy" ? 0 : periodo === "semana" ? 6 : 29
  const desdeFecha = new Date(hoy)
  desdeFecha.setUTCDate(desdeFecha.getUTCDate() - diasAtras)
  return { desde: toISODate(desdeFecha), hasta }
}

// Mismo relleno de días sin eventos que estadisticas-tarjeta.tsx —
// metricas_diarias no guarda ceros, sin esto la línea de tendencia daría
// una impresión falsa de continuidad entre los pocos días con datos.
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
  obtenerClaveYEtiqueta: (
    metadata: Record<string, unknown>
  ) => { clave: string; etiqueta: string } | null
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

// "Estadísticas" — vista agregada de TODAS las tarjetas del usuario, nueva
// (antes solo existía por tarjeta, dentro de /editar/[id]). Los totales y
// la tendencia se suman sin importar el plan de cada tarjeta; el desglose
// (top enlaces/servicios/productos, únicos/recurrentes) solo se agrega con
// datos de las tarjetas que individualmente califican para
// `metricas_desglose` — se aclara en la UI si hay tarjetas mixtas.
export default function MiCuentaEstadisticasPage() {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [tarjetas, setTarjetas] = React.useState<TarjetaConPlan[] | null>(null)
  const [planes, setPlanes] = React.useState<Plan[] | null>(null)
  const [periodo, setPeriodo] = React.useState<PeriodoId>("semana")
  const [totales, setTotales] = React.useState<TotalesPorEvento | null>(null)
  const [serie, setSerie] = React.useState<PuntoSerieDiaria[]>([])
  const [eventosDesglose, setEventosDesglose] = React.useState<EventoDetalle[]>([])
  const [cargandoDatos, setCargandoDatos] = React.useState(true)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!session) return
    getTarjetasDeUsuario(session.user.id).then(setTarjetas)
    getPlanesActivos().then(setPlanes)
  }, [session])

  const planesPorId = React.useMemo(
    () => new Map((planes ?? []).map((p) => [p.id, p])),
    [planes]
  )

  const todasLasTarjetaIds = React.useMemo(() => (tarjetas ?? []).map((t) => t.id), [tarjetas])

  const tarjetasConDesglose = React.useMemo(
    () =>
      (tarjetas ?? []).filter(
        (t) => t.plan_id && Boolean(planesPorId.get(t.plan_id)?.features?.metricas_desglose)
      ),
    [tarjetas, planesPorId]
  )
  const tarjetaIdsConDesglose = React.useMemo(
    () => tarjetasConDesglose.map((t) => t.id),
    [tarjetasConDesglose]
  )

  const { desde, hasta } = React.useMemo(() => calcularRango(periodo), [periodo])

  React.useEffect(() => {
    if (!tarjetas) return
    let cancelado = false
    async function cargarDatos() {
      setCargandoDatos(true)
      const [totalesActuales, serieDiaria, detalle] = await Promise.all([
        getTotalesPorPeriodoUsuario(todasLasTarjetaIds, desde, hasta),
        getSerieDiariaUsuario(todasLasTarjetaIds, desde, hasta),
        getEventosDetalleUsuario(tarjetaIdsConDesglose, desde, hasta),
      ])
      if (cancelado) return
      setTotales(totalesActuales)
      setSerie(serieDiaria)
      setEventosDesglose(detalle)
      setCargandoDatos(false)
    }
    cargarDatos()
    return () => {
      cancelado = true
    }
  }, [tarjetas, todasLasTarjetaIds, tarjetaIdsConDesglose, desde, hasta])

  const serieCompleta = React.useMemo(
    () => rellenarSerie(serie, desde, hasta),
    [serie, desde, hasta]
  )

  const topEnlaces = React.useMemo(
    () =>
      topN(
        agruparPorClave(eventosDesglose, "click_enlace", (metadata) => {
          const tipoEnlace = String(metadata.tipo_enlace ?? "")
          if (tipoEnlace === "red_social") {
            const red = String(metadata.red ?? "red social")
            return { clave: `red:${red}`, etiqueta: red.charAt(0).toUpperCase() + red.slice(1) }
          }
          const etiqueta = ETIQUETA_ENLACE[tipoEnlace] ?? tipoEnlace
          return { clave: tipoEnlace, etiqueta }
        })
      ),
    [eventosDesglose]
  )

  const topServicios = React.useMemo(
    () =>
      topN(
        agruparPorClave(eventosDesglose, "agenda_completada", (metadata) => {
          const nombre = metadata.servicio_nombre
          if (typeof nombre !== "string" || !nombre.trim()) return null
          return { clave: nombre, etiqueta: nombre }
        })
      ),
    [eventosDesglose]
  )

  const topProductos = React.useMemo(
    () =>
      topN(
        agruparPorClave(eventosDesglose, "click_producto", (metadata) => {
          const titulo = metadata.producto_titulo
          if (typeof titulo !== "string" || !titulo.trim()) return null
          return { clave: titulo, etiqueta: titulo }
        })
      ),
    [eventosDesglose]
  )

  const visitantes = React.useMemo(() => {
    const diasPorHash = new Map<string, Set<string>>()
    for (const evento of eventosDesglose) {
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
  }, [eventosDesglose])

  if (session === undefined || tarjetas === null || planes === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (tarjetas.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Estadísticas</h1>
        <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Todavía no tenés ninguna tarjeta para mostrar estadísticas.
        </p>
      </div>
    )
  }

  const tiles = [
    { etiqueta: "Vistas", valor: totales?.vista_tarjeta ?? 0, icono: Eye, acento: "from-indigo-500 to-violet-500" },
    { etiqueta: "Clicks en enlaces", valor: totales?.click_enlace ?? 0, icono: MousePointerClick, acento: "from-blue-500 to-cyan-500" },
    { etiqueta: "Agendamientos", valor: totales?.agenda_completada ?? 0, icono: CalendarCheck, acento: "from-emerald-500 to-teal-500" },
    { etiqueta: "Clicks a productos", valor: totales?.click_producto ?? 0, icono: ShoppingBag, acento: "from-amber-500 to-orange-500" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Estadísticas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista agregada de tus {tarjetas.length} tarjeta{tarjetas.length === 1 ? "" : "s"}.
        </p>
      </div>

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
      </div>

      {cargandoDatos ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => (
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
                <span
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-white",
                    tile.acento
                  )}
                >
                  <tile.icono className="size-4" />
                </span>
                <p className="relative mt-2.5 text-2xl font-semibold text-foreground">
                  {tile.valor}
                </p>
                <p className="relative text-xs text-muted-foreground">{tile.etiqueta}</p>
              </div>
            ))}
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
                  <Line type="monotone" dataKey="vista_tarjeta" name="Vistas" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="click_enlace" name="Clicks" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="agenda_completada" name="Agendamientos" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="click_producto" name="Clicks a productos" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {tarjetaIdsConDesglose.length > 0 ? (
            <>
              {tarjetaIdsConDesglose.length < tarjetas.length && (
                <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                  Desglose disponible para {tarjetaIdsConDesglose.length} de tus{" "}
                  {tarjetas.length} tarjetas — las que están en un plan con esa función.
                  Las demás solo suman en los totales de arriba.
                </p>
              )}
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
              Ninguna de tus tarjetas está en un plan con desglose (Alcance o Poder)
              todavía. Pasate a uno de esos planes para ver enlaces más clickeados,
              servicios más agendados, productos con más interés y visitantes únicos vs.
              recurrentes.
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
            <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
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
