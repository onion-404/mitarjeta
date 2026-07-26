"use client"

import { ChevronDown, Loader2, Plus, Trash2 } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { getAfiliados } from "@/lib/afiliados"
import {
  actualizarCupon,
  crearCupon,
  eliminarCupon,
  getCupones,
  getCuponesConRendimiento,
  type RendimientoCupon,
} from "@/lib/cupones"
import type { Afiliado, Cupon } from "@/lib/types"
import { cn } from "@/lib/utils"

const inputClase =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

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

type EstadoDerivado = "vigente" | "inactivo" | "vencido" | "agotado"

const ESTADO_ETIQUETA: Record<EstadoDerivado, string> = {
  vigente: "Vigente",
  inactivo: "Inactivo",
  vencido: "Vencido",
  agotado: "Agotado",
}

const ESTADO_CLASE: Record<EstadoDerivado, string> = {
  vigente: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  inactivo: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  vencido: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  agotado: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
}

function estadoDerivado(cupon: Cupon, usosTotal: number): EstadoDerivado {
  if (!cupon.activo) return "inactivo"
  if (cupon.fecha_vencimiento && new Date(cupon.fecha_vencimiento) <= new Date()) return "vencido"
  if (cupon.limite_usos !== null && usosTotal >= cupon.limite_usos) return "agotado"
  return "vigente"
}

// <input type="date"> da "YYYY-MM-DD" — se guarda como fin de ese día (hora
// local del navegador) para que el cupón siga sirviendo durante todo el día
// elegido, no que expire a las 00:00.
function finDelDiaISO(fechaYYYYMMDD: string): string {
  return new Date(`${fechaYYYYMMDD}T23:59:59`).toISOString()
}

// A propósito NO usa iso.slice(0, 10): ese string ya está en UTC, y
// finDelDiaISO() arriba construye el timestamp a partir de la hora LOCAL
// del navegador — en un huso horario detrás de UTC (ej. México), 23:59:59
// local del día elegido cae después de medianoche UTC, así que slice(0,10)
// mostraba el día siguiente al que realmente se eligió. Usar los getters
// locales de Date (no getUTC*) revierte exactamente la misma conversión.
function paraInputDate(iso: string): string {
  const fecha = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`
}

interface FormularioCupon {
  porcentaje: string
  afiliadoId: string // "" = ninguno
  vencimiento: string
  limite: string
  activo: boolean
}

function formularioVacio(): FormularioCupon {
  return { porcentaje: "100", afiliadoId: "", vencimiento: "", limite: "", activo: true }
}

function formularioDesdeCupon(cupon: Cupon): FormularioCupon {
  return {
    porcentaje: String(cupon.porcentaje_descuento),
    afiliadoId: cupon.afiliado_id ?? "",
    vencimiento: cupon.fecha_vencimiento ? paraInputDate(cupon.fecha_vencimiento) : "",
    limite: cupon.limite_usos !== null ? String(cupon.limite_usos) : "",
    activo: cupon.activo,
  }
}

// "Cupones y Precios" — hoy solo cupones (los precios reales viven en
// /admin/configuracion, ver CLAUDE.md). Sistema completo: crear/editar/
// eliminar con confirmación si tiene historial, campos de afiliado/
// vencimiento/límite de usos, y vista de rendimiento por código (usos,
// ingresos, tarjetas activas atribuibles) — Parte B del rediseño.
export default function AdminCuponesPage() {
  const [cupones, setCupones] = React.useState<Cupon[] | null>(null)
  const [rendimiento, setRendimiento] = React.useState<RendimientoCupon[] | null>(null)
  const [afiliados, setAfiliados] = React.useState<Afiliado[]>([])

  const [nuevoCodigo, setNuevoCodigo] = React.useState("")
  const [nuevoForm, setNuevoForm] = React.useState<FormularioCupon>(formularioVacio())
  const [creando, setCreando] = React.useState(false)
  const [errorCreacion, setErrorCreacion] = React.useState<string | null>(null)

  const [expandidoId, setExpandidoId] = React.useState<number | null>(null)
  const [editForm, setEditForm] = React.useState<FormularioCupon | null>(null)
  const [guardandoId, setGuardandoId] = React.useState<number | null>(null)
  const [eliminandoId, setEliminandoId] = React.useState<number | null>(null)

  function recargar() {
    getCupones().then(setCupones)
    getCuponesConRendimiento().then(setRendimiento)
  }

  React.useEffect(() => {
    recargar()
    getAfiliados().then((data) => setAfiliados(data.filter((a) => a.activo)))
  }, [])

  const afiliadosPorId = React.useMemo(() => new Map(afiliados.map((a) => [a.id, a])), [afiliados])

  const rendimientoPorCodigo = React.useMemo(
    () => new Map((rendimiento ?? []).map((r) => [r.codigo, r])),
    [rendimiento]
  )

  const soloHistoricos = React.useMemo(
    () => (rendimiento ?? []).filter((r) => !r.cuponVigente),
    [rendimiento]
  )

  async function handleCrear(event: React.FormEvent) {
    event.preventDefault()
    if (!nuevoCodigo.trim()) return
    setCreando(true)
    setErrorCreacion(null)
    const { error } = await crearCupon({
      codigo: nuevoCodigo,
      porcentajeDescuento: Number(nuevoForm.porcentaje),
      afiliadoId: nuevoForm.afiliadoId || null,
      afiliadoNombre: afiliadosPorId.get(nuevoForm.afiliadoId)?.nombre ?? null,
      fechaVencimiento: nuevoForm.vencimiento ? finDelDiaISO(nuevoForm.vencimiento) : null,
      limiteUsos: nuevoForm.limite ? Number(nuevoForm.limite) : null,
    })
    setCreando(false)
    if (error) {
      setErrorCreacion(
        (error as { code?: string }).code === "23505"
          ? "Ese código ya existe."
          : "No pudimos crear el cupón."
      )
      return
    }
    setNuevoCodigo("")
    setNuevoForm(formularioVacio())
    recargar()
  }

  function toggleExpandido(cupon: Cupon) {
    if (expandidoId === cupon.id) {
      setExpandidoId(null)
      setEditForm(null)
      return
    }
    setExpandidoId(cupon.id)
    setEditForm(formularioDesdeCupon(cupon))
  }

  async function handleGuardar(cupon: Cupon) {
    if (!editForm) return
    setGuardandoId(cupon.id)
    const { error } = await actualizarCupon(cupon.id, {
      porcentaje_descuento: Number(editForm.porcentaje),
      afiliado_id: editForm.afiliadoId || null,
      afiliado_nombre: afiliadosPorId.get(editForm.afiliadoId)?.nombre ?? null,
      fecha_vencimiento: editForm.vencimiento ? finDelDiaISO(editForm.vencimiento) : null,
      limite_usos: editForm.limite ? Number(editForm.limite) : null,
      activo: editForm.activo,
    })
    setGuardandoId(null)
    if (!error) {
      setExpandidoId(null)
      setEditForm(null)
      recargar()
    }
  }

  async function handleEliminar(cupon: Cupon) {
    const usos = rendimientoPorCodigo.get(cupon.codigo)?.usosTotal ?? 0
    const mensaje =
      usos > 0
        ? `Este cupón tiene ${usos} uso${usos === 1 ? "" : "s"} registrado${usos === 1 ? "" : "s"}. Se va a borrar el cupón, pero el historial de uso y las métricas del afiliado se conservan. ¿Continuar?`
        : `¿Eliminar el cupón "${cupon.codigo}"? Esta acción no se puede deshacer.`
    if (!window.confirm(mensaje)) return

    setEliminandoId(cupon.id)
    const { error } = await eliminarCupon(cupon.id)
    setEliminandoId(null)
    if (!error) {
      setExpandidoId(null)
      setEditForm(null)
      recargar()
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Cupones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Códigos de descuento para nuevas suscripciones, con seguimiento de afiliados.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-foreground">Nuevo cupón</h2>
        <form onSubmit={handleCrear} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Código</span>
              <input
                value={nuevoCodigo}
                onChange={(e) => setNuevoCodigo(e.target.value)}
                placeholder="LANZAMIENTO100"
                className={inputClase}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-muted-foreground">% descuento</span>
              <input
                type="number"
                min={1}
                max={100}
                value={nuevoForm.porcentaje}
                onChange={(e) => setNuevoForm((f) => ({ ...f, porcentaje: e.target.value }))}
                className={inputClase}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-muted-foreground">Límite de usos</span>
              <input
                type="number"
                min={1}
                placeholder="Sin límite"
                value={nuevoForm.limite}
                onChange={(e) => setNuevoForm((f) => ({ ...f, limite: e.target.value }))}
                className={inputClase}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                Afiliado <span className="font-normal">(opcional)</span>
              </span>
              <select
                value={nuevoForm.afiliadoId}
                onChange={(e) => setNuevoForm((f) => ({ ...f, afiliadoId: e.target.value }))}
                className={inputClase}
              >
                <option value="">Ninguno</option>
                {afiliados.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                Vencimiento <span className="font-normal">(opcional)</span>
              </span>
              <input
                type="date"
                value={nuevoForm.vencimiento}
                onChange={(e) => setNuevoForm((f) => ({ ...f, vencimiento: e.target.value }))}
                className={inputClase}
              />
            </label>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={creando || !nuevoCodigo.trim()}
            className="self-start"
          >
            {creando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Crear cupón
          </Button>
          {errorCreacion && <p className="text-xs text-destructive">{errorCreacion}</p>}
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {cupones === null || rendimiento === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : cupones.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Todavía no creaste ningún cupón.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {cupones.map((cupon) => {
              const r = rendimientoPorCodigo.get(cupon.codigo)
              const usosTotal = r?.usosTotal ?? 0
              const estado = estadoDerivado(cupon, usosTotal)
              const expandido = expandidoId === cupon.id

              return (
                <div key={cupon.id}>
                  <button
                    type="button"
                    onClick={() => toggleExpandido(cupon)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {cupon.codigo}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {cupon.porcentaje_descuento}%
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {usosTotal} uso{usosTotal === 1 ? "" : "s"} ·{" "}
                        {formatoMXN.format(r?.ingresosGenerados ?? 0)} generados ·{" "}
                        {r?.tarjetasActivas ?? 0} activa{r?.tarjetasActivas === 1 ? "" : "s"}
                        {cupon.afiliado_nombre ? ` · ${cupon.afiliado_nombre}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          ESTADO_CLASE[estado]
                        )}
                      >
                        {ESTADO_ETIQUETA[estado]}
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform",
                          expandido && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {expandido && editForm && (
                    <div className="flex flex-col gap-3 border-t border-border/40 bg-muted/20 px-4 py-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <label className="flex flex-col gap-1.5 text-sm">
                          <span className="text-xs text-muted-foreground">% descuento</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={editForm.porcentaje}
                            onChange={(e) =>
                              setEditForm((f) => f && { ...f, porcentaje: e.target.value })
                            }
                            className={inputClase}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm">
                          <span className="text-xs text-muted-foreground">Límite de usos</span>
                          <input
                            type="number"
                            min={1}
                            placeholder="Sin límite"
                            value={editForm.limite}
                            onChange={(e) =>
                              setEditForm((f) => f && { ...f, limite: e.target.value })
                            }
                            className={inputClase}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                          <span className="text-xs text-muted-foreground">Afiliado</span>
                          <select
                            value={editForm.afiliadoId}
                            onChange={(e) =>
                              setEditForm((f) => f && { ...f, afiliadoId: e.target.value })
                            }
                            className={inputClase}
                          >
                            <option value="">Ninguno</option>
                            {afiliados.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nombre}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                          <span className="text-xs text-muted-foreground">Vencimiento</span>
                          <input
                            type="date"
                            value={editForm.vencimiento}
                            onChange={(e) =>
                              setEditForm((f) => f && { ...f, vencimiento: e.target.value })
                            }
                            className={inputClase}
                          />
                        </label>
                        <label className="flex items-center gap-2 self-end text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={editForm.activo}
                            onChange={(e) =>
                              setEditForm((f) => f && { ...f, activo: e.target.checked })
                            }
                            className="size-4 rounded border-border"
                          />
                          Activo
                        </label>
                      </div>

                      {cupon.fecha_vencimiento && (
                        <p className="text-xs text-muted-foreground">
                          Vencimiento actual: {formatoFecha.format(new Date(cupon.fecha_vencimiento))}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={guardandoId === cupon.id}
                          onClick={() => handleGuardar(cupon)}
                        >
                          {guardandoId === cupon.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Guardar cambios"
                          )}
                        </Button>
                        <button
                          type="button"
                          disabled={eliminandoId === cupon.id}
                          onClick={() => handleEliminar(cupon)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {eliminandoId === cupon.id ? (
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

      {soloHistoricos.length > 0 && (
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-foreground">Cupones eliminados con historial</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ya no existen, pero su historial de uso y rendimiento de afiliado se conserva.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {soloHistoricos.map((r) => (
              <div
                key={r.codigo}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {r.codigo}
                    {r.afiliadoNombre ? (
                      <span className="font-normal text-muted-foreground"> · {r.afiliadoNombre}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.usosTotal} uso{r.usosTotal === 1 ? "" : "s"} ·{" "}
                    {formatoMXN.format(r.ingresosGenerados)} generados · {r.tarjetasActivas} activa
                    {r.tarjetasActivas === 1 ? "" : "s"}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", ESTADO_CLASE.inactivo)}>
                  Eliminado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
