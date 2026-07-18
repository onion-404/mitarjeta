"use client"

import type { Session } from "@supabase/supabase-js"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { ADMIN_EMAIL } from "@/lib/admin"
import {
  actualizarConfiguracion,
  actualizarCupon,
  crearCupon,
  getConfiguracionActiva,
  getCupones,
} from "@/lib/configuracion"
import { supabase } from "@/lib/supabase"
import { nombrePrincipalDeTarjeta } from "@/lib/tarjetas"
import type { Cupon, EstadoPago, Tarjeta } from "@/lib/types"
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
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al inicio
      </Link>

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
