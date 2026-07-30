"use client"

import { AlertTriangle, ArrowLeft, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { use } from "react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { getPlanesActivos, getPlanPorId } from "@/lib/planes"
import { supabase } from "@/lib/supabase"
import {
  getSuscripcionesDeUsuario,
  getTarjetaPorId,
  nombrePrincipalDeTarjeta,
  type SuscripcionResumen,
} from "@/lib/tarjetas"
import type { PeriodicidadSuscripcion, Plan, Tarjeta } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AdminTarjetaDetallePageProps {
  params: Promise<{ id: string }>
}

const inputClase =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const labelClase = "text-xs font-medium text-muted-foreground"

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminTarjetaDetallePage({ params }: AdminTarjetaDetallePageProps) {
  const { id } = use(params)

  const [tarjeta, setTarjeta] = React.useState<Tarjeta | null | undefined>(undefined)
  const [planActivo, setPlanActivo] = React.useState<Plan | null>(null)
  const [suscripcion, setSuscripcion] = React.useState<SuscripcionResumen | null>(null)
  const [planesActivos, setPlanesActivos] = React.useState<Plan[]>([])
  const [emailDueno, setEmailDueno] = React.useState<string | null | undefined>(undefined)

  const [mensaje, setMensaje] = React.useState<{ tipo: "error" | "exito"; texto: string } | null>(
    null
  )

  // --- Activar plan manualmente ---
  const [planIdManual, setPlanIdManual] = React.useState("")
  const [periodicidadManual, setPeriodicidadManual] =
    React.useState<PeriodicidadSuscripcion>("mensual")
  const [costoManual, setCostoManual] = React.useState("")
  const [fechaPagoManual, setFechaPagoManual] = React.useState(hoyISO())
  const [notaManual, setNotaManual] = React.useState("")
  const [activando, setActivando] = React.useState(false)

  // --- Reasignar a otra cuenta ---
  const [emailReasignar, setEmailReasignar] = React.useState("")
  const [reasignando, setReasignando] = React.useState(false)

  const cargar = React.useCallback(async () => {
    const [t, planes] = await Promise.all([getTarjetaPorId(id), getPlanesActivos()])
    setTarjeta(t)
    setPlanesActivos(planes)
    if (t?.plan_id) getPlanPorId(t.plan_id).then(setPlanActivo)
    const suscripciones = await getSuscripcionesDeUsuario([id])
    setSuscripcion(suscripciones[id] ?? null)

    if (t?.user_id) {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (accessToken) {
        const res = await fetch(`/api/admin/usuario-por-id?userId=${t.user_id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const data = (await res.json()) as { email?: string }
        setEmailDueno(res.ok ? (data.email ?? null) : null)
      }
    } else {
      setEmailDueno(null)
    }
  }, [id])

  React.useEffect(() => {
    // Diferido: cargar() hace varios setState — llamarla síncrono dentro
    // del efecto dispara la regla react-hooks/set-state-in-effect (mismo
    // patrón ya usado en el resto del proyecto).
    window.setTimeout(() => cargar(), 0)
  }, [cargar])

  async function handleActivarManual(event: React.FormEvent) {
    event.preventDefault()
    setMensaje(null)

    const costo = Number(costoManual)
    if (!planIdManual) {
      setMensaje({ tipo: "error", texto: "Elegí un plan." })
      return
    }
    if (!costoManual || !Number.isFinite(costo) || costo < 0) {
      setMensaje({ tipo: "error", texto: "El costo tiene que ser un número mayor o igual a 0." })
      return
    }
    if (!fechaPagoManual) {
      setMensaje({ tipo: "error", texto: "Elegí la fecha de pago." })
      return
    }

    setActivando(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    const res = await fetch("/api/admin/activar-manual", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        tarjetaId: id,
        planId: planIdManual,
        periodicidad: periodicidadManual,
        precioFinal: costo,
        fechaPago: fechaPagoManual,
        nota: notaManual,
      }),
    })
    const data = (await res.json()) as { error?: string }
    setActivando(false)

    if (!res.ok) {
      setMensaje({ tipo: "error", texto: data.error ?? "No pudimos activar el plan." })
      return
    }
    setMensaje({ tipo: "exito", texto: "Plan activado correctamente." })
    setNotaManual("")
    await cargar()
  }

  async function handleReasignar(event: React.FormEvent) {
    event.preventDefault()
    setMensaje(null)

    if (!emailReasignar.trim()) {
      setMensaje({ tipo: "error", texto: "Ingresá el email de la cuenta destino." })
      return
    }
    if (
      !window.confirm(
        `¿Reasignar esta tarjeta a ${emailReasignar.trim()}? El dueño actual dejará de tener acceso.`
      )
    ) {
      return
    }

    setReasignando(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    const res = await fetch("/api/admin/reasignar-tarjeta", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ tarjetaId: id, email: emailReasignar.trim() }),
    })
    const data = (await res.json()) as { error?: string; email?: string }
    setReasignando(false)

    if (!res.ok) {
      setMensaje({ tipo: "error", texto: data.error ?? "No pudimos reasignar la tarjeta." })
      return
    }
    setMensaje({ tipo: "exito", texto: `Tarjeta reasignada a ${data.email}.` })
    setEmailReasignar("")
    await cargar()
  }

  if (tarjeta === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tarjeta) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">No encontramos esa tarjeta.</p>
        <Link href="/admin/tarjetas" className="text-sm underline underline-offset-2">
          Volver al listado
        </Link>
      </div>
    )
  }

  const tieneSuscripcionActivaNoPendiente =
    suscripcion && suscripcion.estado !== "pendiente" && suscripcion.estado !== "cancelada" && suscripcion.estado !== "vencida"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/tarjetas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver al listado
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {nombrePrincipalDeTarjeta(tarjeta)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href={`/${tarjeta.slug}`} target="_blank" className="underline underline-offset-2">
            /{tarjeta.slug}
          </Link>
          {" · "}
          {tarjeta.tipo === "empresarial" ? "Empresarial" : "Personal"}
          {" · "}
          Plan actual: <strong className="text-foreground">{planActivo?.nombre_display ?? "Sin plan"}</strong>
        </p>
      </div>

      {mensaje && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border p-3 text-sm",
            mensaje.tipo === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          )}
        >
          {mensaje.tipo === "error" ? (
            <AlertTriangle className="size-4 shrink-0" />
          ) : (
            <Check className="size-4 shrink-0" />
          )}
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-foreground">Activar plan manualmente</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Para ventas que el cliente gestiona personalmente (ej. pago por transferencia), sin
            pasar por Stripe.
          </p>

          {tieneSuscripcionActivaNoPendiente ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              Esta tarjeta ya tiene una suscripción {suscripcion?.estado} (
              {suscripcion?.proveedor}). Cancelala primero si querés reemplazarla por una manual.
            </p>
          ) : (
            <form onSubmit={handleActivarManual} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClase}>Plan</span>
                <select
                  value={planIdManual}
                  onChange={(e) => setPlanIdManual(e.target.value)}
                  className={inputClase}
                >
                  <option value="">Elegí un plan</option>
                  {planesActivos.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre_display}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClase}>Periodicidad</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["mensual", "anual"] as const).map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setPeriodicidadManual(opcion)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 text-sm transition-colors duration-200 ease-out",
                        periodicidadManual === opcion
                          ? "border-foreground bg-background"
                          : "border-border bg-background/50 hover:bg-background"
                      )}
                    >
                      {opcion === "mensual" ? "Mensual" : "Anual"}
                    </button>
                  ))}
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClase}>Costo (MXN)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={costoManual}
                  onChange={(e) => setCostoManual(e.target.value)}
                  placeholder="Ej. 800"
                  className={inputClase}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClase}>Fecha de pago</span>
                <input
                  type="date"
                  value={fechaPagoManual}
                  onChange={(e) => setFechaPagoManual(e.target.value)}
                  className={inputClase}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClase}>Nota (opcional)</span>
                <textarea
                  value={notaManual}
                  onChange={(e) => setNotaManual(e.target.value)}
                  placeholder="Ej. transferencia BBVA, referencia 123456"
                  rows={2}
                  className={inputClase}
                />
              </label>

              <Button type="submit" disabled={activando} className="mt-1 self-start">
                {activando ? <Loader2 className="size-4 animate-spin" /> : null}
                Activar plan
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-foreground">Reasignar a otra cuenta</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Dueño actual:{" "}
            <strong className="text-foreground">
              {emailDueno === undefined ? "Cargando..." : (emailDueno ?? "sin cuenta asignada")}
            </strong>
          </p>

          <form onSubmit={handleReasignar} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelClase}>Email de la cuenta destino</span>
              <input
                type="email"
                value={emailReasignar}
                onChange={(e) => setEmailReasignar(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className={inputClase}
              />
            </label>
            <Button type="submit" variant="outline" disabled={reasignando} className="self-start">
              {reasignando ? <Loader2 className="size-4 animate-spin" /> : null}
              Reasignar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
