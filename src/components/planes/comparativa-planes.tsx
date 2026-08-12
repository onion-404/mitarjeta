"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { COPY_PLAN, type CopyPlan } from "@/lib/planes-copy"
import { cn } from "@/lib/utils"
import type { PeriodicidadSuscripcion, Plan, PlanSlug } from "@/lib/types"

interface ComparativaPlanesProps {
  planes: Plan[]
  /** Viaja desde /planes?cupon=... (botón "Obtener mi descuento" del home) —
   *  se reenvía tal cual a /crear para que TarjetaForm lo pre-llene. */
  cuponCodigo?: string
}

export function ComparativaPlanes({ planes, cuponCodigo }: ComparativaPlanesProps) {
  const router = useRouter()
  const [ciclo, setCiclo] = React.useState<PeriodicidadSuscripcion>("anual")

  function continuar(slug: string) {
    const cupon = cuponCodigo ? `&cupon=${encodeURIComponent(cuponCodigo)}` : ""
    router.push(`/crear?plan=${encodeURIComponent(slug)}&ciclo=${ciclo}${cupon}`)
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="inline-flex w-fit rounded-full border border-border bg-white/70 p-1 shadow-sm backdrop-blur dark:bg-zinc-900/50">
        {(["mensual", "anual"] as const).map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => setCiclo(opcion)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ease-out",
              ciclo === opcion
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opcion === "mensual" ? "Mensual" : "Anual"}
          </button>
        ))}
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
        {planes.map((plan) => {
          // Mismos 3 números que el teaser del home (PreciosDestacados) en
          // vez de mostrar directo el total anual con un "%" de ahorro —
          // equivalente por mes, total facturado una vez al año, y el
          // monto ahorrado en pesos (pedido explícito del cliente: un
          // monto concreto se lee más rápido que calcularlo a partir de
          // un porcentaje).
          const precioMensualEquivalente = Math.round(plan.precio_anual / 12)
          const ahorroMonto = Math.round(plan.precio_mensual * 12 - plan.precio_anual)
          const copy: CopyPlan | undefined = COPY_PLAN[plan.slug as PlanSlug]

          return (
            <div
              key={plan.id}
              className="relative flex flex-col gap-5 rounded-3xl border border-black/5 bg-white/70 p-8 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50"
            >
              <div>
                <h3 className="text-lg font-semibold text-foreground">{plan.nombre_display}</h3>
                {copy && <p className="mt-1.5 text-sm text-muted-foreground">{copy.propuesta}</p>}
              </div>

              {ciclo === "mensual" ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    ${plan.precio_mensual.toLocaleString("es-MX")}
                  </span>
                  <span className="text-sm text-muted-foreground">MXN/mes</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      ${precioMensualEquivalente.toLocaleString("es-MX")}
                    </span>
                    <span className="text-sm text-muted-foreground">MXN/mes</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Facturado ${plan.precio_anual.toLocaleString("es-MX")} una vez al año
                  </span>
                  {ahorroMonto > 0 && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Ahorras ${ahorroMonto.toLocaleString("es-MX")} al año pagando anual
                    </span>
                  )}
                </div>
              )}

              <Button type="button" size="lg" className="w-full" onClick={() => continuar(plan.slug)}>
                Continuar
              </Button>

              {copy && (
                <ul className="flex flex-col gap-2.5 border-t border-border/60 pt-4 text-sm">
                  {copy.incluye.map((item) => (
                    <li key={item.titulo} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-foreground">
                        {item.titulo}
                        {item.detalle && (
                          <span className="text-muted-foreground"> ({item.detalle})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {copy && (
                <div className="flex flex-col gap-1.5 border-t border-border/60 pt-4">
                  <span className="text-xs font-semibold text-foreground">Ideal para</span>
                  <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    {copy.idealPara.map((linea) => (
                      <li key={linea} className="flex gap-2">
                        <span aria-hidden className="text-foreground">
                          •
                        </span>
                        {linea}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
