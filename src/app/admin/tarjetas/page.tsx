"use client"

import { Loader2 } from "lucide-react"
import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { FiltroTarjetas } from "@/components/panel/filtro-tarjetas"
import { getTarjetaIdsConAgendaActiva } from "@/lib/admin-metricas"
import { getTodasLasTarjetasConDetalle } from "@/lib/admin-tarjetas"
import { getPlanesActivos } from "@/lib/planes"
import type { Plan, TarjetaConPlan } from "@/lib/types"

const PALETA_DISTRIBUCION = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
]

// "Tarjetas" — reemplaza el listado plano "Ventas recientes" del dashboard
// viejo por un listado global filtrable (FiltroTarjetas, con el selector de
// plan visible porque acá conviven tarjetas de todos los usuarios), más los
// dos gráficos de "tarjetas por plan" que antes vivían en el dashboard.
export default function AdminTarjetasPage() {
  const [tarjetas, setTarjetas] = React.useState<TarjetaConPlan[] | null>(null)
  const [planes, setPlanes] = React.useState<Plan[] | null>(null)
  const [tarjetaIdsConAgenda, setTarjetaIdsConAgenda] = React.useState<Set<string> | null>(
    null
  )

  React.useEffect(() => {
    getTodasLasTarjetasConDetalle().then(setTarjetas)
    getPlanesActivos().then(setPlanes)
    getTarjetaIdsConAgendaActiva().then(setTarjetaIdsConAgenda)
  }, [])

  if (tarjetas === null || planes === null || tarjetaIdsConAgenda === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const tarjetasPorPlanId = new Map<string, number>()
  let tarjetasSinPlan = 0
  for (const t of tarjetas) {
    if (!t.plan_id) {
      tarjetasSinPlan += 1
      continue
    }
    tarjetasPorPlanId.set(t.plan_id, (tarjetasPorPlanId.get(t.plan_id) ?? 0) + 1)
  }

  const conAgendaPorPlanId = new Map<string, number>()
  const sinAgendaPorPlanId = new Map<string, number>()
  for (const t of tarjetas) {
    if (!t.plan_id) continue
    const mapa = tarjetaIdsConAgenda.has(t.id) ? conAgendaPorPlanId : sinAgendaPorPlanId
    mapa.set(t.plan_id, (mapa.get(t.plan_id) ?? 0) + 1)
  }

  const distribucionPlanes = [
    ...planes.map((p) => ({
      nombre: p.nombre_display,
      tarjetas: tarjetasPorPlanId.get(p.id) ?? 0,
    })),
    ...(tarjetasSinPlan > 0 ? [{ nombre: "Sin plan", tarjetas: tarjetasSinPlan }] : []),
  ]
  const totalDistribucion = distribucionPlanes.reduce((acc, d) => acc + d.tarjetas, 0)

  const usoAgendaPorPlan = planes.map((p) => ({
    nombre: p.nombre_display,
    "Con agenda activa": conAgendaPorPlanId.get(p.id) ?? 0,
    "Solo perfil": sinAgendaPorPlanId.get(p.id) ?? 0,
  }))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tarjetas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las tarjetas creadas, de cualquier usuario.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-foreground">
            Distribución de tarjetas por plan
          </h2>
          {totalDistribucion === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Todavía no hay tarjetas.</p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribucionPlanes}
                      dataKey="tarjetas"
                      nameKey="nombre"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {distribucionPlanes.map((entrada, index) => (
                        <Cell
                          key={entrada.nombre}
                          fill={PALETA_DISTRIBUCION[index % PALETA_DISTRIBUCION.length]}
                        />
                      ))}
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
                {distribucionPlanes.map((entrada, index) => (
                  <span key={entrada.nombre} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        background: PALETA_DISTRIBUCION[index % PALETA_DISTRIBUCION.length],
                      }}
                    />
                    {entrada.nombre}:{" "}
                    <strong className="text-foreground">{entrada.tarjetas}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-foreground">
            Uso de agenda por plan (tarjetas con plan activo)
          </h2>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usoAgendaPorPlan} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
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
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Con agenda activa" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Solo perfil" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Listado</h2>
        <div className="mt-4">
          <FiltroTarjetas tarjetas={tarjetas} mostrarFiltroPlan hrefBase="/admin/tarjetas" />
        </div>
      </div>
    </div>
  )
}
