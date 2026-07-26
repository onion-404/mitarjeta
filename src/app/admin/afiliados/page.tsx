"use client"

import { ChevronDown, Loader2, Plus } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  actualizarAfiliado,
  crearAfiliado,
  getAfiliadosConResumen,
  getPagosAfiliado,
  registrarPagoAfiliado,
  type AfiliadoConResumen,
} from "@/lib/afiliados"
import type { AfiliadoPago } from "@/lib/types"
import { cn } from "@/lib/utils"

const inputClase =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const formatoMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

interface FormularioAlta {
  nombre: string
  email: string
  porcentaje: string
}

function altaVacia(): FormularioAlta {
  return { nombre: "", email: "", porcentaje: "10" }
}

interface FormularioPago {
  monto: string
  fecha: string
  nota: string
}

function pagoVacio(): FormularioPago {
  return { monto: "", fecha: new Date().toISOString().slice(0, 10), nota: "" }
}

// "Afiliados": listado con rendimiento agregado (getAfiliadosConResumen), alta
// manual, y detalle expandible por afiliado (edición de datos + historial de
// pagos + botón "Registrar pago"). Mismo lenguaje visual que /admin/cupones.
export default function AdminAfiliadosPage() {
  const [afiliados, setAfiliados] = React.useState<AfiliadoConResumen[] | null>(null)

  const [altaForm, setAltaForm] = React.useState<FormularioAlta>(altaVacia())
  const [creando, setCreando] = React.useState(false)
  const [errorCreacion, setErrorCreacion] = React.useState<string | null>(null)

  const [expandidoId, setExpandidoId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState<{ nombre: string; porcentaje: string; activo: boolean } | null>(
    null
  )
  const [guardandoId, setGuardandoId] = React.useState<string | null>(null)

  const [pagosPorAfiliado, setPagosPorAfiliado] = React.useState<Record<string, AfiliadoPago[]>>({})
  const [pagoForm, setPagoForm] = React.useState<FormularioPago>(pagoVacio())
  const [registrandoPago, setRegistrandoPago] = React.useState(false)

  function recargar() {
    getAfiliadosConResumen().then(setAfiliados)
  }

  React.useEffect(() => {
    recargar()
  }, [])

  async function handleCrear(event: React.FormEvent) {
    event.preventDefault()
    if (!altaForm.nombre.trim() || !altaForm.email.trim()) return
    setCreando(true)
    setErrorCreacion(null)
    const { error } = await crearAfiliado({
      nombre: altaForm.nombre,
      email: altaForm.email,
      porcentajeComision: Number(altaForm.porcentaje),
    })
    setCreando(false)
    if (error) {
      setErrorCreacion(
        (error as { code?: string }).code === "23505"
          ? "Ya existe un afiliado con ese email."
          : "No pudimos dar de alta al afiliado."
      )
      return
    }
    setAltaForm(altaVacia())
    recargar()
  }

  async function toggleExpandido(afiliado: AfiliadoConResumen) {
    if (expandidoId === afiliado.id) {
      setExpandidoId(null)
      setEditForm(null)
      return
    }
    setExpandidoId(afiliado.id)
    setEditForm({
      nombre: afiliado.nombre,
      porcentaje: String(afiliado.porcentaje_comision),
      activo: afiliado.activo,
    })
    setPagoForm(pagoVacio())
    if (!pagosPorAfiliado[afiliado.id]) {
      const pagos = await getPagosAfiliado(afiliado.id)
      setPagosPorAfiliado((prev) => ({ ...prev, [afiliado.id]: pagos }))
    }
  }

  async function handleGuardar(afiliado: AfiliadoConResumen) {
    if (!editForm) return
    setGuardandoId(afiliado.id)
    const { error } = await actualizarAfiliado(afiliado.id, {
      nombre: editForm.nombre.trim(),
      porcentaje_comision: Number(editForm.porcentaje),
      activo: editForm.activo,
    })
    setGuardandoId(null)
    if (!error) recargar()
  }

  async function handleRegistrarPago(afiliado: AfiliadoConResumen) {
    if (!pagoForm.monto || !pagoForm.fecha) return
    setRegistrandoPago(true)
    const { error } = await registrarPagoAfiliado({
      afiliadoId: afiliado.id,
      afiliadoNombre: afiliado.nombre,
      monto: Number(pagoForm.monto),
      fecha: pagoForm.fecha,
      nota: pagoForm.nota,
    })
    setRegistrandoPago(false)
    if (!error) {
      setPagoForm(pagoVacio())
      const pagos = await getPagosAfiliado(afiliado.id)
      setPagosPorAfiliado((prev) => ({ ...prev, [afiliado.id]: pagos }))
      recargar()
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Afiliados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comisión recurrente sobre cada cobro (venta inicial y renovaciones) de sus cupones.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-foreground">Nuevo afiliado</h2>
        <form onSubmit={handleCrear} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Nombre</span>
              <input
                value={altaForm.nombre}
                onChange={(e) => setAltaForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre del afiliado"
                className={inputClase}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Email (login de Google)</span>
              <input
                type="email"
                value={altaForm.email}
                onChange={(e) => setAltaForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="afiliado@gmail.com"
                className={inputClase}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-muted-foreground">% comisión</span>
              <input
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={altaForm.porcentaje}
                onChange={(e) => setAltaForm((f) => ({ ...f, porcentaje: e.target.value }))}
                className={inputClase}
              />
            </label>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={creando || !altaForm.nombre.trim() || !altaForm.email.trim()}
            className="self-start"
          >
            {creando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Dar de alta
          </Button>
          {errorCreacion && <p className="text-xs text-destructive">{errorCreacion}</p>}
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {afiliados === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : afiliados.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Todavía no diste de alta ningún afiliado.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {afiliados.map((afiliado) => {
              const expandido = expandidoId === afiliado.id
              const r = afiliado.rendimiento
              return (
                <div key={afiliado.id}>
                  <button
                    type="button"
                    onClick={() => toggleExpandido(afiliado)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {afiliado.nombre}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {afiliado.porcentaje_comision}%
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {afiliado.email} · {r.cantidadCobros} cobros ·{" "}
                        {formatoMXN.format(r.ventasNetas)} netas ·{" "}
                        {formatoMXN.format(r.saldoPendiente)} pendiente
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          afiliado.activo
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        )}
                      >
                        {afiliado.activo ? "Activo" : "Inactivo"}
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
                    <div className="flex flex-col gap-4 border-t border-border/40 bg-muted/20 px-4 py-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                          <span className="text-xs text-muted-foreground">Nombre</span>
                          <input
                            value={editForm.nombre}
                            onChange={(e) =>
                              setEditForm((f) => f && { ...f, nombre: e.target.value })
                            }
                            className={inputClase}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm">
                          <span className="text-xs text-muted-foreground">% comisión</span>
                          <input
                            type="number"
                            min={0.01}
                            max={100}
                            step={0.01}
                            value={editForm.porcentaje}
                            onChange={(e) =>
                              setEditForm((f) => f && { ...f, porcentaje: e.target.value })
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

                      <Button
                        type="button"
                        size="sm"
                        disabled={guardandoId === afiliado.id}
                        onClick={() => handleGuardar(afiliado)}
                        className="self-start"
                      >
                        {guardandoId === afiliado.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Guardar cambios"
                        )}
                      </Button>

                      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-background/50 p-3 text-sm sm:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Ventas brutas</p>
                          <p className="font-medium text-foreground">{formatoMXN.format(r.ventasBrutas)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ventas netas</p>
                          <p className="font-medium text-foreground">{formatoMXN.format(r.ventasNetas)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Comisión generada</p>
                          <p className="font-medium text-foreground">
                            {formatoMXN.format(r.comisionGenerada)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                          <p className="font-medium text-foreground">
                            {formatoMXN.format(r.saldoPendiente)}
                          </p>
                        </div>
                        <div className="col-span-2 sm:col-span-4">
                          <p className="text-xs text-muted-foreground">Códigos</p>
                          <p className="text-foreground">
                            {r.codigosVigentes.join(", ") || "—"}
                            {r.codigosHistoricos.length > 0
                              ? ` (eliminados: ${r.codigosHistoricos.join(", ")})`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground">
                          Historial de pagos
                        </h3>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {(pagosPorAfiliado[afiliado.id] ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
                          ) : (
                            pagosPorAfiliado[afiliado.id].map((pago) => (
                              <div
                                key={pago.id}
                                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-sm"
                              >
                                <span>
                                  {formatoMXN.format(pago.monto)}
                                  {pago.nota ? (
                                    <span className="text-muted-foreground"> · {pago.nota}</span>
                                  ) : null}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatoFecha.format(new Date(`${pago.fecha}T00:00:00`))}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                        <h3 className="text-xs font-semibold text-muted-foreground">
                          Registrar pago
                        </h3>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <input
                            type="number"
                            min={0.01}
                            step={0.01}
                            placeholder="Monto"
                            value={pagoForm.monto}
                            onChange={(e) => setPagoForm((f) => ({ ...f, monto: e.target.value }))}
                            className={inputClase}
                          />
                          <input
                            type="date"
                            value={pagoForm.fecha}
                            onChange={(e) => setPagoForm((f) => ({ ...f, fecha: e.target.value }))}
                            className={inputClase}
                          />
                          <input
                            placeholder="Nota (opcional)"
                            value={pagoForm.nota}
                            onChange={(e) => setPagoForm((f) => ({ ...f, nota: e.target.value }))}
                            className={cn(inputClase, "sm:col-span-2")}
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={registrandoPago || !pagoForm.monto || !pagoForm.fecha}
                          onClick={() => handleRegistrarPago(afiliado)}
                          className="mt-2"
                        >
                          {registrandoPago ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Registrar pago"
                          )}
                        </Button>
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
  )
}
