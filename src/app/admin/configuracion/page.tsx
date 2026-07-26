"use client"

import { Loader2 } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { actualizarConfiguracion, getConfiguracionActiva } from "@/lib/configuracion"
import { actualizarPlan, getPlanesActivos } from "@/lib/planes"
import type { Plan } from "@/lib/types"
import { cn } from "@/lib/utils"

const inputClase =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface PreciosInput {
  mensual: string
  anual: string
}

// "Configuración" — CRUD real de precios vigentes (planes.precio_mensual/
// anual, pedido explícito del cliente, sin UI hasta ahora) + editor de
// descuento_tarjeta_adicional_pct (columna real usada en
// /api/stripe/checkout, tampoco tenía UI). Reemplaza la vieja tarjeta
// "Precios y promoción" del dashboard, que editaba configuracion.
// precio_regular/precio_lanzamiento/promocion_* — huérfano desde que el
// home dejó de usar ese modelo de pago único (ver CLAUDE.md).
export default function AdminConfiguracionPage() {
  const [planes, setPlanes] = React.useState<Plan[] | null>(null)
  const [preciosInput, setPreciosInput] = React.useState<Record<string, PreciosInput>>({})
  const [guardandoPlanId, setGuardandoPlanId] = React.useState<string | null>(null)
  const [guardadoPlanId, setGuardadoPlanId] = React.useState<string | null>(null)

  const [descuentoInput, setDescuentoInput] = React.useState("")
  const [guardandoDescuento, setGuardandoDescuento] = React.useState(false)
  const [descuentoGuardadoOk, setDescuentoGuardadoOk] = React.useState(false)

  React.useEffect(() => {
    getPlanesActivos().then((data) => {
      setPlanes(data)
      const inputs: Record<string, PreciosInput> = {}
      for (const p of data) {
        inputs[p.id] = { mensual: String(p.precio_mensual), anual: String(p.precio_anual) }
      }
      setPreciosInput(inputs)
    })
    getConfiguracionActiva().then((config) =>
      setDescuentoInput(String(config.descuento_tarjeta_adicional_pct))
    )
  }, [])

  async function handleGuardarPlan(plan: Plan) {
    const input = preciosInput[plan.id]
    if (!input) return
    setGuardandoPlanId(plan.id)
    setGuardadoPlanId(null)
    const cambios = { precio_mensual: Number(input.mensual), precio_anual: Number(input.anual) }
    const { error } = await actualizarPlan(plan.id, cambios)
    setGuardandoPlanId(null)
    if (!error) {
      setGuardadoPlanId(plan.id)
      setPlanes(
        (prev) => prev?.map((p) => (p.id === plan.id ? { ...p, ...cambios } : p)) ?? null
      )
    }
  }

  async function handleGuardarDescuento(event: React.FormEvent) {
    event.preventDefault()
    setGuardandoDescuento(true)
    setDescuentoGuardadoOk(false)
    const { error } = await actualizarConfiguracion({
      descuento_tarjeta_adicional_pct: Number(descuentoInput),
    })
    setGuardandoDescuento(false)
    if (!error) setDescuentoGuardadoOk(true)
  }

  if (planes === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Precios vigentes de los planes y descuento por tarjeta adicional.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-foreground">Precios de planes</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Un cambio acá solo afecta a suscripciones nuevas — las ya activas conservan el
          precio con el que se crearon.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {planes.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-end gap-3 border-b border-border/40 pb-4 last:border-0 last:pb-0"
            >
              <p className="min-w-28 text-sm font-medium text-foreground">
                {plan.nombre_display}
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground">Mensual (MXN)</span>
                <input
                  type="number"
                  min={0}
                  value={preciosInput[plan.id]?.mensual ?? ""}
                  onChange={(e) =>
                    setPreciosInput((prev) => ({
                      ...prev,
                      [plan.id]: { ...prev[plan.id], mensual: e.target.value },
                    }))
                  }
                  className={cn(inputClase, "w-32")}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground">Anual (MXN)</span>
                <input
                  type="number"
                  min={0}
                  value={preciosInput[plan.id]?.anual ?? ""}
                  onChange={(e) =>
                    setPreciosInput((prev) => ({
                      ...prev,
                      [plan.id]: { ...prev[plan.id], anual: e.target.value },
                    }))
                  }
                  className={cn(inputClase, "w-32")}
                />
              </label>
              <Button
                type="button"
                size="sm"
                disabled={guardandoPlanId === plan.id}
                onClick={() => handleGuardarPlan(plan)}
              >
                {guardandoPlanId === plan.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Guardar"
                )}
              </Button>
              {guardadoPlanId === plan.id && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  Guardado.
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-foreground">
          Descuento por tarjeta adicional
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Aplica cuando un usuario suscribe una tarjeta que no es la primera de su cuenta.
        </p>
        <form onSubmit={handleGuardarDescuento} className="mt-4 flex items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs text-muted-foreground">Porcentaje (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={descuentoInput}
              onChange={(e) => setDescuentoInput(e.target.value)}
              className={cn(inputClase, "w-24")}
            />
          </label>
          <Button type="submit" size="sm" disabled={guardandoDescuento}>
            {guardandoDescuento ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
          </Button>
          {descuentoGuardadoOk && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Guardado.</span>
          )}
        </form>
      </div>
    </div>
  )
}
