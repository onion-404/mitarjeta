"use client"

import { CreditCard, Layers, Loader2, TrendingDown } from "lucide-react"
import * as React from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import {
  calcularChurn,
  getSuscripcionesAutorizadas,
  getSuscripcionesHistorial,
} from "@/lib/admin-metricas"
import { getSuscripcionesConDetalle, type SuscripcionConDetalle } from "@/lib/admin-suscripciones"
import { getPlanesActivos } from "@/lib/planes"
import type { EstadoSuscripcion, Plan, ProveedorSuscripcion } from "@/lib/types"
import { cn } from "@/lib/utils"

const formatoMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
})

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const ESTADO_ETIQUETA: Record<EstadoSuscripcion, string> = {
  pendiente: "Pendiente",
  autorizada: "Autorizada",
  pausada: "Pausada",
  cancelada: "Cancelada",
  vencida: "Vencida",
}

const ESTADO_CLASE: Record<EstadoSuscripcion, string> = {
  autorizada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  pausada: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  vencida: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
}

const PROVEEDOR_ETIQUETA: Record<ProveedorSuscripcion, string> = {
  stripe: "Stripe",
  mercadopago: "Mercado Pago",
}

function nombreTarjeta(suscripcion: SuscripcionConDetalle) {
  const datos = suscripcion.tarjetas?.datos_contacto
  return datos?.nombreEmpresa || datos?.nombre || "Sin nombre"
}

// "Suscripciones" — antes no existía ningún listado fila-por-fila, solo
// agregados (MRR/distribución) en el dashboard viejo. Complementa (no
// reemplaza) admin-metricas.ts.
export default function AdminSuscripcionesPage() {
  const [suscripciones, setSuscripciones] = React.useState<SuscripcionConDetalle[] | null>(
    null
  )
  const [planes, setPlanes] = React.useState<Plan[] | null>(null)
  const [mrrPorPlanId, setMrrPorPlanId] = React.useState<Map<string, number> | null>(null)
  const [churn, setChurn] = React.useState<ReturnType<typeof calcularChurn> | null>(null)

  React.useEffect(() => {
    getSuscripcionesConDetalle().then(setSuscripciones)
    getPlanesActivos().then(setPlanes)

    getSuscripcionesAutorizadas().then((subs) => {
      const mapa = new Map<string, number>()
      for (const s of subs) {
        const mrr = s.periodicidad === "anual" ? s.precio_final / 12 : s.precio_final
        mapa.set(s.plan_id, (mapa.get(s.plan_id) ?? 0) + mrr)
      }
      setMrrPorPlanId(mapa)
    })

    getSuscripcionesHistorial().then((historial) => {
      const hasta = new Date()
      const desde = new Date(hasta)
      desde.setUTCDate(desde.getUTCDate() - 30)
      setChurn(calcularChurn(historial, desde, hasta))
    })
  }, [])

  if (suscripciones === null || planes === null || !mrrPorPlanId || !churn) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const mrrPorPlan = planes.map((p) => ({
    nombre: p.nombre_display,
    mrr: Math.round((mrrPorPlanId.get(p.id) ?? 0) * 100) / 100,
  }))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Suscripciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las suscripciones, de cualquier tarjeta y usuario.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-20 blur-2xl"
          />
          <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <CreditCard className="size-4" />
          </span>
          <p className="relative mt-3 text-2xl font-semibold text-foreground">
            {formatoMXN.format(mrrPorPlan.reduce((acc, p) => acc + p.mrr, 0))}
          </p>
          <p className="relative text-xs text-muted-foreground">MRR total</p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-red-500 to-rose-500 opacity-20 blur-2xl"
          />
          <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-white">
            <TrendingDown className="size-4" />
          </span>
          <p className="relative mt-3 text-2xl font-semibold text-foreground">
            {churn.churnPct === null ? "Sin datos" : `${churn.churnPct.toFixed(1)}%`}
          </p>
          <p className="relative text-xs text-muted-foreground">Churn (30 días)</p>
          {churn.autorizadasAlInicio > 0 && (
            <p className="relative mt-0.5 text-[11px] text-muted-foreground/80">
              {churn.canceladasEnPeriodo} de {churn.autorizadasAlInicio} canceló
            </p>
          )}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 opacity-20 blur-2xl"
          />
          <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
            <Layers className="size-4" />
          </span>
          <p className="relative mt-3 text-2xl font-semibold text-foreground">
            {suscripciones.length}
          </p>
          <p className="relative text-xs text-muted-foreground">Suscripciones totales</p>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-foreground">MRR por plan</h2>
        <div className="mt-3 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mrrPorPlan} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="nombre"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(valor) => formatoMXN.format(Number(valor))}
              />
              <Tooltip
                formatter={(valor) => formatoMXN.format(Number(valor))}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="mrr" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Listado</h2>
        <div className="mt-4 overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          {suscripciones.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Todavía no hay suscripciones.
            </p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Tarjeta</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium">Precio final</th>
                  <th className="px-4 py-3 font-medium">Cupón</th>
                  <th className="px-4 py-3 font-medium">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {suscripciones.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <p className="truncate font-medium text-foreground">{nombreTarjeta(s)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        /{s.tarjetas?.slug ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.planes?.nombre_display ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          ESTADO_CLASE[s.estado]
                        )}
                      >
                        {ESTADO_ETIQUETA[s.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {PROVEEDOR_ETIQUETA[s.proveedor]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatoMXN.format(s.precio_final)} / {s.periodicidad}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.cupon_codigo || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatoFecha.format(new Date(s.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
