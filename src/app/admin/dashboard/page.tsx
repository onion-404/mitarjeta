"use client"

import type { Session } from "@supabase/supabase-js"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  Layers,
  Loader2,
  Pencil,
  Plus,
  TrendingDown,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

import { Button, buttonVariants } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import {
  calcularChurn,
  getSuscripcionesAutorizadas,
  getSuscripcionesHistorial,
  getTarjetaIdsConAgendaActiva,
  type SuscripcionAutorizada,
} from "@/lib/admin-metricas"
import { ADMIN_EMAIL } from "@/lib/admin"
import {
  actualizarConfiguracion,
  actualizarCupon,
  crearCupon,
  getConfiguracionActiva,
  getCupones,
} from "@/lib/configuracion"
import { getPlanesActivos } from "@/lib/planes"
import { supabase } from "@/lib/supabase"
import { nombrePrincipalDeTarjeta } from "@/lib/tarjetas"
import type { Cupon, EstadoPago, Plan, Tarjeta } from "@/lib/types"
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

const ESTADO_ETIQUETA: Record<EstadoPago, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
}

const ESTADO_CLASE: Record<EstadoPago, string> = {
  aprobado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  rechazado: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
}

const inputClase =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function paraDatetimeLocal(iso: string) {
  const fecha = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [tarjetas, setTarjetas] = React.useState<Tarjeta[] | null>(null)
  const [actualizandoId, setActualizandoId] = React.useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = React.useState<string | null>(null)
  const [expandidoId, setExpandidoId] = React.useState<string | null>(null)

  const [precioRegularInput, setPrecioRegularInput] = React.useState("")
  const [precioLanzamientoInput, setPrecioLanzamientoInput] = React.useState("")
  const [promocionActivaInput, setPromocionActivaInput] = React.useState(true)
  const [promocionFinInput, setPromocionFinInput] = React.useState("")
  const [guardandoConfig, setGuardandoConfig] = React.useState(false)
  const [configGuardadoOk, setConfigGuardadoOk] = React.useState(false)

  const [cupones, setCupones] = React.useState<Cupon[] | null>(null)
  const [nuevoCuponCodigo, setNuevoCuponCodigo] = React.useState("")
  const [nuevoCuponPorcentaje, setNuevoCuponPorcentaje] = React.useState("100")
  const [creandoCupon, setCreandoCupon] = React.useState(false)
  const [cuponFormError, setCuponFormError] = React.useState<string | null>(null)

  const [planes, setPlanes] = React.useState<Plan[] | null>(null)
  const [suscripcionesAutorizadas, setSuscripcionesAutorizadas] = React.useState<
    SuscripcionAutorizada[] | null
  >(null)
  const [tarjetaIdsConAgenda, setTarjetaIdsConAgenda] = React.useState<Set<string> | null>(
    null
  )
  const [churn, setChurn] = React.useState<ReturnType<typeof calcularChurn> | null>(null)

  const esAdmin = session?.user.email === ADMIN_EMAIL

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (session === undefined) return
    if (!esAdmin) {
      router.replace("/")
      return
    }
    supabase
      .from("tarjetas")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTarjetas((data ?? []) as Tarjeta[]))

    getConfiguracionActiva().then((config) => {
      setPrecioRegularInput(String(config.precio_regular))
      setPrecioLanzamientoInput(String(config.precio_lanzamiento))
      setPromocionActivaInput(config.promocion_activa)
      setPromocionFinInput(paraDatetimeLocal(config.promocion_fin))
    })

    getCupones().then(setCupones)

    getPlanesActivos().then(setPlanes)
    getSuscripcionesAutorizadas().then(setSuscripcionesAutorizadas)
    getTarjetaIdsConAgendaActiva().then(setTarjetaIdsConAgenda)
    getSuscripcionesHistorial().then((historial) => {
      const hasta = new Date()
      const desde = new Date(hasta)
      desde.setUTCDate(desde.getUTCDate() - 30)
      setChurn(calcularChurn(historial, desde, hasta))
    })
  }, [session, esAdmin, router])

  async function cambiarEstado(tarjeta: Tarjeta, nuevoEstado: EstadoPago) {
    setActualizandoId(tarjeta.id)
    const { error } = await supabase
      .from("tarjetas")
      .update({ estado_pago: nuevoEstado })
      .eq("id", tarjeta.id)
    setActualizandoId(null)
    if (!error) {
      setTarjetas(
        (prev) =>
          prev?.map((t) =>
            t.id === tarjeta.id ? { ...t, estado_pago: nuevoEstado } : t
          ) ?? null
      )
    }
  }

  async function handleEliminar(tarjeta: Tarjeta) {
    const confirmado = window.confirm(
      `¿Estás seguro de eliminar "${nombrePrincipalDeTarjeta(tarjeta)}"? Esta acción no se puede deshacer.`
    )
    if (!confirmado) return

    setEliminandoId(tarjeta.id)
    const { error } = await supabase.from("tarjetas").delete().eq("id", tarjeta.id)
    setEliminandoId(null)
    if (!error) {
      setTarjetas((prev) => prev?.filter((t) => t.id !== tarjeta.id) ?? null)
    }
  }

  async function handleGuardarConfig(event: React.FormEvent) {
    event.preventDefault()
    setGuardandoConfig(true)
    setConfigGuardadoOk(false)
    const { error } = await actualizarConfiguracion({
      precio_regular: Number(precioRegularInput),
      precio_lanzamiento: Number(precioLanzamientoInput),
      promocion_activa: promocionActivaInput,
      promocion_fin: new Date(promocionFinInput).toISOString(),
    })
    setGuardandoConfig(false)
    if (!error) setConfigGuardadoOk(true)
  }

  async function handleCrearCupon(event: React.FormEvent) {
    event.preventDefault()
    if (!nuevoCuponCodigo.trim()) return
    setCreandoCupon(true)
    setCuponFormError(null)
    const { error } = await crearCupon(nuevoCuponCodigo, Number(nuevoCuponPorcentaje))
    setCreandoCupon(false)
    if (error) {
      setCuponFormError(
        error.code === "23505" ? "Ese código ya existe." : "No pudimos crear el cupón."
      )
      return
    }
    setNuevoCuponCodigo("")
    setNuevoCuponPorcentaje("100")
    getCupones().then(setCupones)
  }

  async function toggleCuponActivo(cupon: Cupon) {
    await actualizarCupon(cupon.id, { activo: !cupon.activo })
    setCupones(
      (prev) => prev?.map((c) => (c.id === cupon.id ? { ...c, activo: !c.activo } : c)) ?? null
    )
  }

  if (session === undefined || !esAdmin || tarjetas === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const aprobadas = tarjetas.filter((t) => t.estado_pago === "aprobado")
  const pendientes = tarjetas.filter((t) => t.estado_pago === "pendiente")
  const totalVentas = aprobadas.reduce((acc, t) => acc + (t.precio_pagado ?? 0), 0)
  const recientes = tarjetas.slice(0, 20)

  // MRR: normaliza anual a su equivalente mensual (/12) para poder sumarlo
  // con suscripciones mensuales — mismo criterio que "MRR" siempre implica
  // en SaaS, sin importar el ciclo real de facturación de cada una.
  const planesConDatos = planes ?? []
  const mrrPorPlanId = new Map<string, number>()
  let mrrTotal = 0
  for (const s of suscripcionesAutorizadas ?? []) {
    const mrr = s.periodicidad === "anual" ? s.precio_final / 12 : s.precio_final
    mrrTotal += mrr
    mrrPorPlanId.set(s.plan_id, (mrrPorPlanId.get(s.plan_id) ?? 0) + mrr)
  }

  // Distribución de tarjetas por plan — incluye "Sin plan" (nunca pagó, o se
  // le pausó/canceló la suscripción) para dar el panorama completo, no solo
  // las monetizadas.
  const tarjetasPorPlanId = new Map<string, number>()
  let tarjetasSinPlan = 0
  for (const t of tarjetas) {
    if (!t.plan_id) {
      tarjetasSinPlan += 1
      continue
    }
    tarjetasPorPlanId.set(t.plan_id, (tarjetasPorPlanId.get(t.plan_id) ?? 0) + 1)
  }

  // Uso de agenda por plan — solo tiene sentido para tarjetas CON plan (sin
  // plan, la agenda ya está bloqueada por completo, ver CLAUDE.md).
  const conAgendaPorPlanId = new Map<string, number>()
  const sinAgendaPorPlanId = new Map<string, number>()
  if (tarjetaIdsConAgenda) {
    for (const t of tarjetas) {
      if (!t.plan_id) continue
      const mapa = tarjetaIdsConAgenda.has(t.id) ? conAgendaPorPlanId : sinAgendaPorPlanId
      mapa.set(t.plan_id, (mapa.get(t.plan_id) ?? 0) + 1)
    }
  }

  const distribucionPlanes = [
    ...planesConDatos.map((p) => ({
      nombre: p.nombre_display,
      tarjetas: tarjetasPorPlanId.get(p.id) ?? 0,
    })),
    ...(tarjetasSinPlan > 0 ? [{ nombre: "Sin plan", tarjetas: tarjetasSinPlan }] : []),
  ]
  const totalDistribucion = distribucionPlanes.reduce((acc, d) => acc + d.tarjetas, 0)

  const mrrPorPlan = planesConDatos.map((p) => ({
    nombre: p.nombre_display,
    mrr: Math.round((mrrPorPlanId.get(p.id) ?? 0) * 100) / 100,
  }))

  const usoAgendaPorPlan = planesConDatos.map((p) => ({
    nombre: p.nombre_display,
    "Con agenda activa": conAgendaPorPlanId.get(p.id) ?? 0,
    "Solo perfil": sinAgendaPorPlanId.get(p.id) ?? 0,
  }))

  const cargandoMetricasPlan =
    planes === null || suscripcionesAutorizadas === null || tarjetaIdsConAgenda === null || !churn

  const PALETA_DISTRIBUCION = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ]

  const stats = [
    {
      etiqueta: "Ventas totales",
      valor: formatoMXN.format(totalVentas),
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
      etiqueta: "Pagos aprobados",
      valor: String(aprobadas.length),
      icono: CheckCircle2,
      acento: "from-blue-500 to-cyan-500",
    },
    {
      etiqueta: "Pagos pendientes",
      valor: String(pendientes.length),
      icono: Clock,
      acento: "from-amber-500 to-orange-500",
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-3">
        <Logo size="sm" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver al inicio
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Panel de administración</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de ventas y estado de las tarjetas digitales.
          </p>
        </div>
        <Link href="/admin/cobro-manual" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <CreditCard className="size-3.5" /> Cobro manual
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            <p className="relative mt-3 text-2xl font-semibold text-foreground">
              {stat.valor}
            </p>
            <p className="relative text-xs text-muted-foreground">{stat.etiqueta}</p>
          </div>
        ))}
      </div>

      {/* Suscripciones y planes */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Suscripciones y planes</h2>
        {cargandoMetricasPlan ? (
          <div className="mt-4 flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-20 blur-2xl"
                />
                <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <CreditCard className="size-4" />
                </span>
                <p className="relative mt-3 text-2xl font-semibold text-foreground">
                  {formatoMXN.format(mrrTotal)}
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
                  {churn?.churnPct === null
                    ? "Sin datos"
                    : `${churn?.churnPct.toFixed(1)}%`}
                </p>
                <p className="relative text-xs text-muted-foreground">Churn (30 días)</p>
                {churn && churn.autorizadasAlInicio > 0 && (
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
                  {tarjetas.length - tarjetasSinPlan}
                </p>
                <p className="relative text-xs text-muted-foreground">Tarjetas con plan activo</p>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 opacity-20 blur-2xl"
                />
                <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <CalendarClock className="size-4" />
                </span>
                <p className="relative mt-3 text-2xl font-semibold text-foreground">
                  {tarjetasSinPlan}
                </p>
                <p className="relative text-xs text-muted-foreground">Tarjetas sin plan</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
                <h3 className="text-sm font-semibold text-foreground">
                  Distribución de tarjetas por plan
                </h3>
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
                <h3 className="text-sm font-semibold text-foreground">MRR por plan</h3>
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
            </div>

            <div className="mt-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <h3 className="text-sm font-semibold text-foreground">
                Uso de agenda por plan (tarjetas con plan activo)
              </h3>
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
          </>
        )}
      </div>

      {/* Configuración de precios y cupones */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-foreground">Precios y promoción</h2>
          <form onSubmit={handleGuardarConfig} className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Precio regular (MXN)</span>
                <input
                  type="number"
                  min={0}
                  value={precioRegularInput}
                  onChange={(e) => setPrecioRegularInput(e.target.value)}
                  className={inputClase}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Precio de lanzamiento (MXN)
                </span>
                <input
                  type="number"
                  min={0}
                  value={precioLanzamientoInput}
                  onChange={(e) => setPrecioLanzamientoInput(e.target.value)}
                  className={inputClase}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Fin de la promoción</span>
              <input
                type="datetime-local"
                value={promocionFinInput}
                onChange={(e) => setPromocionFinInput(e.target.value)}
                className={inputClase}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={promocionActivaInput}
                onChange={(e) => setPromocionActivaInput(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Promoción de lanzamiento activa
            </label>

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={guardandoConfig} className="self-start">
                {guardandoConfig ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Guardar cambios"
                )}
              </Button>
              {configGuardadoOk && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Configuración actualizada.
                </p>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-foreground">Códigos de descuento</h2>
          <form onSubmit={handleCrearCupon} className="mt-4 flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Código</span>
              <input
                value={nuevoCuponCodigo}
                onChange={(e) => setNuevoCuponCodigo(e.target.value)}
                placeholder="LANZAMIENTO100"
                className={inputClase}
              />
            </label>
            <label className="flex w-20 flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">%</span>
              <input
                type="number"
                min={1}
                max={100}
                value={nuevoCuponPorcentaje}
                onChange={(e) => setNuevoCuponPorcentaje(e.target.value)}
                className={inputClase}
              />
            </label>
            <Button
              type="submit"
              size="sm"
              disabled={creandoCupon || !nuevoCuponCodigo.trim()}
            >
              {creandoCupon ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </Button>
          </form>
          {cuponFormError && (
            <p className="mt-2 text-xs text-destructive">{cuponFormError}</p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {cupones === null ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : cupones.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Todavía no creaste ningún cupón.
              </p>
            ) : (
              cupones.map((cupon) => (
                <div
                  key={cupon.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{cupon.codigo}</p>
                    <p className="text-xs text-muted-foreground">
                      {cupon.porcentaje_descuento}% de descuento
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCuponActivo(cupon)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      cupon.activo
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    )}
                  >
                    {cupon.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ventas recientes */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Ventas recientes</h2>
        <div className="mt-4 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          {recientes.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Todavía no hay tarjetas creadas.
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {recientes.map((tarjeta) => {
                const expandido = expandidoId === tarjeta.id
                return (
                  <div key={tarjeta.id}>
                    <button
                      type="button"
                      onClick={() => setExpandidoId(expandido ? null : tarjeta.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {nombrePrincipalDeTarjeta(tarjeta)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          /{tarjeta.slug} · {formatoFecha.format(new Date(tarjeta.created_at))}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium",
                            ESTADO_CLASE[tarjeta.estado_pago]
                          )}
                        >
                          {ESTADO_ETIQUETA[tarjeta.estado_pago]}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            expandido && "rotate-180"
                          )}
                        />
                      </div>
                    </button>

                    {expandido && (
                      <div className="flex flex-col gap-3 border-t border-border/40 bg-muted/20 px-4 py-4">
                        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                          <div>
                            <p className="font-medium text-foreground">Tipo</p>
                            <p className="capitalize text-muted-foreground">{tarjeta.tipo}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Precio pagado</p>
                            <p className="text-muted-foreground">
                              {tarjeta.precio_pagado
                                ? formatoMXN.format(tarjeta.precio_pagado)
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Cupón</p>
                            <p className="text-muted-foreground">
                              {tarjeta.cupon_codigo || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Método de pago</p>
                            <p className="capitalize text-muted-foreground">
                              {tarjeta.metodo_pago ?? "—"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={actualizandoId === tarjeta.id}
                            onClick={() =>
                              cambiarEstado(
                                tarjeta,
                                tarjeta.estado_pago === "aprobado" ? "pendiente" : "aprobado"
                              )
                            }
                            className={cn(
                              "inline-flex min-w-24 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50",
                              ESTADO_CLASE[tarjeta.estado_pago]
                            )}
                          >
                            {actualizandoId === tarjeta.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              ESTADO_ETIQUETA[tarjeta.estado_pago]
                            )}
                          </button>

                          <a
                            href={`/${tarjeta.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <ExternalLink className="size-3.5" /> Ver tarjeta pública
                          </a>

                          <Link
                            href={`/editar/${tarjeta.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <Pencil className="size-3.5" /> Editar datos de soporte
                          </Link>

                          <button
                            type="button"
                            disabled={eliminandoId === tarjeta.id}
                            onClick={() => handleEliminar(tarjeta)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {eliminandoId === tarjeta.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
