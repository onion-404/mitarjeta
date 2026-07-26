"use client"

import { Clock, CreditCard, Gauge, Layers, Loader2, TrendingDown } from "lucide-react"
import * as React from "react"

import {
  calcularChurn,
  getConteoSuscripcionesPendientes,
  getSuscripcionesAutorizadas,
  getSuscripcionesHistorial,
} from "@/lib/admin-metricas"
import { supabase } from "@/lib/supabase"
import type { Tarjeta } from "@/lib/types"
import { cn } from "@/lib/utils"

const formatoMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
})

// "Resumen" — antes esta página tenía todo (stats + gráficos de plan +
// precios/cupones + listado de ventas), ahora es solo el vistazo rápido de
// arriba. El resto se movió a sus tabs propios (Tarjetas, Suscripciones,
// Cupones y Precios, Configuración) dentro del mismo PanelShell.
export default function AdminDashboardPage() {
  const [tarjetas, setTarjetas] = React.useState<Tarjeta[] | null>(null)
  const [mrrTotal, setMrrTotal] = React.useState<number | null>(null)
  const [churn, setChurn] = React.useState<ReturnType<typeof calcularChurn> | null>(null)
  const [suscripcionesPendientes, setSuscripcionesPendientes] = React.useState<number | null>(
    null
  )

  React.useEffect(() => {
    supabase
      .from("tarjetas")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTarjetas((data ?? []) as Tarjeta[]))

    getSuscripcionesAutorizadas().then((subs) => {
      let total = 0
      for (const s of subs) {
        total += s.periodicidad === "anual" ? s.precio_final / 12 : s.precio_final
      }
      setMrrTotal(total)
    })

    getSuscripcionesHistorial().then((historial) => {
      const hasta = new Date()
      const desde = new Date(hasta)
      desde.setUTCDate(desde.getUTCDate() - 30)
      setChurn(calcularChurn(historial, desde, hasta))
    })

    getConteoSuscripcionesPendientes().then(setSuscripcionesPendientes)
  }, [])

  if (tarjetas === null || mrrTotal === null || !churn || suscripcionesPendientes === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // "Con plan activo" y "tasa de conversión" reemplazan a los viejos
  // Ventas totales/Pagos aprobados/Pagos pendientes (estado_pago/
  // precio_pagado, huérfanos desde que el flujo de Stripe dejó de
  // escribirlos — ver CLAUDE.md) por las señales reales y vigentes del
  // modelo de suscripciones: cuántas tarjetas monetizan hoy, qué porcentaje
  // del total convierte, y cuántos checkouts quedaron a medias.
  const conPlan = tarjetas.filter((t) => t.plan_id).length
  const tasaConversion = tarjetas.length > 0 ? (conPlan / tarjetas.length) * 100 : 0

  const stats = [
    {
      etiqueta: "Tarjetas con plan activo",
      valor: String(conPlan),
      icono: CreditCard,
      acento: "from-emerald-500 to-teal-500",
    },
    {
      etiqueta: "Tarjetas creadas",
      valor: String(tarjetas.length),
      icono: Layers,
      acento: "from-indigo-500 to-violet-500",
    },
    {
      etiqueta: "Tasa de conversión",
      valor: `${tasaConversion.toFixed(1)}%`,
      icono: Gauge,
      acento: "from-blue-500 to-cyan-500",
    },
    {
      etiqueta: "Suscripciones pendientes",
      valor: String(suscripcionesPendientes),
      icono: Clock,
      acento: "from-amber-500 to-orange-500",
    },
    {
      etiqueta: "MRR total",
      valor: formatoMXN.format(mrrTotal),
      icono: CreditCard,
      acento: "from-emerald-500 to-teal-500",
    },
    {
      etiqueta: "Churn (30 días)",
      valor: churn.churnPct === null ? "Sin datos" : `${churn.churnPct.toFixed(1)}%`,
      icono: TrendingDown,
      acento: "from-red-500 to-rose-500",
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Resumen</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Vistazo rápido de tarjetas, planes y suscripciones.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.etiqueta}
            className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl",
                stat.acento
              )}
            />
            <span
              className={cn(
                "relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br text-white",
                stat.acento
              )}
            >
              <stat.icono className="size-4" />
            </span>
            <p className="relative mt-3 text-2xl font-semibold text-foreground">{stat.valor}</p>
            <p className="relative text-xs text-muted-foreground">{stat.etiqueta}</p>
            {stat.etiqueta === "Churn (30 días)" && churn.autorizadasAlInicio > 0 && (
              <p className="relative mt-0.5 text-[11px] text-muted-foreground/80">
                {churn.canceladasEnPeriodo} de {churn.autorizadasAlInicio} canceló
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
