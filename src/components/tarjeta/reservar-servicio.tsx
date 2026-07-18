"use client"

import { Dialog } from "@base-ui/react/dialog"
import { AlertTriangle, Check, Clock, Loader2, X } from "lucide-react"
import * as React from "react"

import { formatDuracion } from "@/components/tarjeta/tarjeta-card"
import { Button } from "@/components/ui/button"
import { formatearFechaHoraLocal, formatearHoraLocal } from "@/lib/fecha"
import type { ServicioAgendable } from "@/lib/types"

interface ReservarServicioProps {
  tarjetaId: string
  zonaHoraria: string
  servicio: ServicioAgendable
}

interface Slot {
  inicio: string
  fin: string
}

type Paso =
  | { tipo: "horario" }
  | { tipo: "datos"; slot: Slot }
  | { tipo: "confirmado"; fechaHoraInicio: string }
  | { tipo: "conflicto" }
  | { tipo: "error"; mensaje: string; slot: Slot }

const inputClase =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function ReservarServicio({ tarjetaId, zonaHoraria, servicio }: ReservarServicioProps) {
  const [open, setOpen] = React.useState(false)
  const [paso, setPaso] = React.useState<Paso>({ tipo: "horario" })
  const [fecha, setFecha] = React.useState(hoyISO)
  const [slots, setSlots] = React.useState<Slot[] | null>(null)
  const [errorSlots, setErrorSlots] = React.useState(false)
  const [nombre, setNombre] = React.useState("")
  const [contacto, setContacto] = React.useState("")
  const [enviando, setEnviando] = React.useState(false)
  const [redirigiendo, setRedirigiendo] = React.useState(false)

  React.useEffect(() => {
    if (!open || paso.tipo !== "horario") return
    let cancelado = false

    async function cargar() {
      setSlots(null)
      setErrorSlots(false)
      const params = new URLSearchParams({
        tarjeta_id: tarjetaId,
        servicio_id: servicio.id,
        desde: fecha,
        hasta: fecha,
      })
      const res = await fetch(`/api/citas/disponibilidad?${params}`)
      const body = await res.json().catch(() => null)
      if (cancelado) return
      if (!res.ok || !Array.isArray(body?.slots)) {
        setErrorSlots(true)
        setSlots([])
        return
      }
      setSlots(body.slots)
    }
    cargar()

    return () => {
      cancelado = true
    }
  }, [open, paso.tipo, fecha, tarjetaId, servicio.id])

  function reset() {
    setPaso({ tipo: "horario" })
    setFecha(hoyISO())
    setSlots(null)
    setErrorSlots(false)
    setNombre("")
    setContacto("")
    setEnviando(false)
    setRedirigiendo(false)
  }

  function handleOpenChange(siguiente: boolean) {
    setOpen(siguiente)
    if (!siguiente) reset()
  }

  function volverAHorarios() {
    setPaso({ tipo: "horario" })
  }

  async function handleConfirmar(slot: Slot) {
    setEnviando(true)
    const res = await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tarjeta_id: tarjetaId,
        servicio_id: servicio.id,
        cliente_nombre: nombre.trim(),
        cliente_contacto: contacto.trim(),
        fecha_hora_inicio: slot.inicio,
      }),
    })
    const body = await res.json().catch(() => null)

    if (res.status === 409) {
      setEnviando(false)
      setPaso({ tipo: "conflicto" })
      return
    }
    if (!res.ok) {
      setEnviando(false)
      setPaso({
        tipo: "error",
        mensaje: body?.error ?? "No pudimos agendar tu cita. Intentá de nuevo.",
        slot,
      })
      return
    }
    if (body.requierePago && body.initPoint) {
      setRedirigiendo(true)
      window.location.href = body.initPoint
      return
    }

    setEnviando(false)
    setPaso({ tipo: "confirmado", fechaHoraInicio: slot.inicio })
  }

  function handleSubmitDatos(event: React.FormEvent, slot: Slot) {
    event.preventDefault()
    if (!nombre.trim() || !contacto.trim()) return
    void handleConfirmar(slot)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger className="flex w-full items-center justify-between gap-3 rounded-xl border border-[rgba(0,0,0,0.05)] p-3 text-left transition-colors hover:bg-[rgba(0,0,0,0.02)] dark:border-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.04)]">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#18181b] dark:text-[#fafafa]">
            {servicio.nombre}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
            <Clock className="size-3" /> {formatDuracion(servicio.duracion_minutos)}
            {" · "}
            {servicio.requiere_pago_inmediato ? "Pago al agendar" : "Pago contra entrega"}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-[#18181b] dark:text-[#fafafa]">
          ${servicio.precio}
        </span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-2xl transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Close
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </Dialog.Close>

          <Dialog.Title className="text-lg font-semibold text-foreground">
            {servicio.nombre}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {formatDuracion(servicio.duracion_minutos)} · ${servicio.precio} ·{" "}
            {servicio.requiere_pago_inmediato ? "pago al agendar" : "pago contra entrega"}
          </Dialog.Description>

          <div className="mt-5">
            {paso.tipo === "horario" && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">Elegí una fecha</span>
                  <input
                    type="date"
                    min={hoyISO()}
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className={inputClase}
                  />
                </label>

                {slots === null ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : errorSlots ? (
                  <p className="py-4 text-center text-sm text-destructive">
                    No pudimos cargar los horarios. Probá de nuevo.
                  </p>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.inicio}
                        type="button"
                        onClick={() => setPaso({ tipo: "datos", slot })}
                        className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:border-ring hover:bg-muted"
                      >
                        {formatearHoraLocal(slot.inicio, zonaHoraria)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No hay horarios disponibles para esta fecha. Probá con otra.
                  </p>
                )}
              </div>
            )}

            {paso.tipo === "datos" && (
              <form onSubmit={(e) => handleSubmitDatos(e, paso.slot)} className="flex flex-col gap-3">
                <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-foreground">
                  {formatearFechaHoraLocal(paso.slot.inicio, zonaHoraria)}
                </p>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">Tu nombre</span>
                  <input
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={inputClase}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-foreground">Teléfono o email</span>
                  <input
                    required
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Para confirmarte la cita"
                    className={inputClase}
                  />
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={volverAHorarios}
                    disabled={enviando || redirigiendo}
                  >
                    Volver
                  </Button>
                  <Button type="submit" size="sm" disabled={enviando || redirigiendo} className="flex-1">
                    {enviando || redirigiendo ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Confirmar"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {paso.tipo === "confirmado" && (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="size-5" />
                </span>
                <p className="font-medium text-foreground">¡Tu cita quedó agendada!</p>
                <p className="text-sm text-muted-foreground">
                  {formatearFechaHoraLocal(paso.fechaHoraInicio, zonaHoraria)}
                </p>
                <Button size="sm" className="mt-2" onClick={() => handleOpenChange(false)}>
                  Cerrar
                </Button>
              </div>
            )}

            {paso.tipo === "conflicto" && (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <AlertTriangle className="size-5" />
                </span>
                <p className="font-medium text-foreground">Ese horario ya no está disponible</p>
                <p className="text-sm text-muted-foreground">
                  Alguien más lo tomó justo antes. Elegí otro horario.
                </p>
                <Button size="sm" className="mt-2" onClick={volverAHorarios}>
                  Elegir otro horario
                </Button>
              </div>
            )}

            {paso.tipo === "error" && (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                  <X className="size-5" />
                </span>
                <p className="font-medium text-foreground">{paso.mensaje}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={volverAHorarios}>
                    Elegir otro horario
                  </Button>
                  <Button size="sm" onClick={() => setPaso({ tipo: "datos", slot: paso.slot })}>
                    Reintentar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
