"use client"

import { Pencil } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { nombrePrincipalDeTarjeta } from "@/lib/tarjetas"
import { cn } from "@/lib/utils"
import type { TarjetaConPlan, TarjetaTipo } from "@/lib/types"

// Array constante, no pestañas — agregar un tipo de tarjeta nuevo a futuro
// es agregar una entrada acá, cero cambios estructurales en este componente
// ni en el shell.
const TARJETA_TIPO_OPTIONS: { value: TarjetaTipo | "todos"; label: string }[] = [
  { value: "todos", label: "Todos los tipos" },
  { value: "personal", label: "Personal" },
  { value: "empresarial", label: "Empresarial" },
]

type FiltroEstado = "todos" | "con-plan" | "sin-plan"

const ESTADO_OPTIONS: { value: FiltroEstado; label: string }[] = [
  { value: "todos", label: "Cualquier estado" },
  { value: "con-plan", label: "Con plan activo" },
  { value: "sin-plan", label: "Sin plan" },
]

const selectClase =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface FiltroTarjetasProps {
  tarjetas: TarjetaConPlan[]
  /** Filtro de plan específico (Presencia/Alcance/Poder) — solo tiene
   *  sentido en el admin, donde hay tarjetas de todos los planes a la vez.
   *  En /mi-cuenta/tarjetas queda oculto (un usuario ve pocas tarjetas, no
   *  necesita ese nivel de filtro). */
  mostrarFiltroPlan?: boolean
  /** A dónde enlaza cada fila (+ "/{tarjeta.id}") — /editar en Mi Cuenta
   *  (el dueño edita su propia tarjeta), /admin/tarjetas en el panel admin
   *  (vista de detalle con acciones administrativas: activar plan
   *  manualmente, reasignar dueño — el admin no pasa por el editor normal
   *  de la tarjeta). */
  hrefBase?: string
}

export function FiltroTarjetas({
  tarjetas,
  mostrarFiltroPlan = false,
  hrefBase = "/editar",
}: FiltroTarjetasProps) {
  const [tipo, setTipo] = React.useState<TarjetaTipo | "todos">("todos")
  const [estado, setEstado] = React.useState<FiltroEstado>("todos")
  const [planSlug, setPlanSlug] = React.useState<string>("todos")

  const planesDisponibles = React.useMemo(() => {
    const vistos = new Map<string, string>()
    for (const t of tarjetas) {
      if (t.planes) vistos.set(t.planes.slug, t.planes.nombre_display)
    }
    return Array.from(vistos, ([slug, nombre]) => ({ slug, nombre }))
  }, [tarjetas])

  const filtradas = tarjetas.filter((t) => {
    if (tipo !== "todos" && t.tipo !== tipo) return false
    if (estado === "con-plan" && !t.plan_id) return false
    if (estado === "sin-plan" && t.plan_id) return false
    if (mostrarFiltroPlan && planSlug !== "todos" && t.planes?.slug !== planSlug) return false
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TarjetaTipo | "todos")}
          className={selectClase}
        >
          {TARJETA_TIPO_OPTIONS.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as FiltroEstado)}
          className={selectClase}
        >
          {ESTADO_OPTIONS.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>

        {mostrarFiltroPlan && (
          <select
            value={planSlug}
            onChange={(e) => setPlanSlug(e.target.value)}
            className={selectClase}
          >
            <option value="todos">Todos los planes</option>
            {planesDisponibles.map((plan) => (
              <option key={plan.slug} value={plan.slug}>
                {plan.nombre}
              </option>
            ))}
          </select>
        )}

        <span className="text-xs text-muted-foreground">
          {filtradas.length} de {tarjetas.length}
        </span>
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Ninguna tarjeta coincide con estos filtros.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtradas.map((tarjeta) => (
            <Link
              key={tarjeta.id}
              href={`${hrefBase}/${tarjeta.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur transition-colors hover:bg-muted dark:bg-zinc-900/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {nombrePrincipalDeTarjeta(tarjeta)}
                </p>
                <p className="truncate text-xs text-muted-foreground">/{tarjeta.slug}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                  {tarjeta.tipo}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    tarjeta.planes
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {tarjeta.planes?.nombre_display ?? "Sin plan"}
                </span>
                <Pencil className="size-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
