"use client"

import { Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PeriodicidadSuscripcion, Plan } from "@/lib/types"

interface ComparativaPlanesProps {
  planes: Plan[]
}

function renderBooleano(valor: unknown) {
  return valor ? (
    <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <X className="size-4 shrink-0 text-muted-foreground/40" />
  )
}

// Las claves de `features` son el schema (estable, no cambia por plan); las
// etiquetas viven acá porque son texto de presentación, no datos. El VALOR de
// cada una para cada plan sale siempre de `plan.features` real (nada
// hardcodeado por plan) — cambiar precios/features en la DB no toca este archivo.
const FEATURES: { clave: string; etiqueta: string; render: (valor: unknown) => React.ReactNode }[] = [
  {
    clave: "servicios_agendables_max",
    etiqueta: "Servicios agendables",
    render: (v) => (typeof v === "number" ? (v >= 999 ? "Ilimitados" : `Hasta ${v}`) : "—"),
  },
  { clave: "personalizacion_libre", etiqueta: "Personalización libre de colores", render: renderBooleano },
  { clave: "temas_preestablecidos", etiqueta: "Temas prediseñados", render: renderBooleano },
  { clave: "metricas_desglose", etiqueta: "Métricas con desglose", render: renderBooleano },
  { clave: "metricas_rango_custom", etiqueta: "Métricas por rango de fechas", render: renderBooleano },
  { clave: "metricas_exportacion", etiqueta: "Exportar métricas", render: renderBooleano },
  { clave: "recordatorios_automaticos", etiqueta: "Recordatorios automáticos", render: renderBooleano },
  { clave: "marca_plataforma_oculta", etiqueta: "Sin marca de miTarjeta", render: renderBooleano },
  {
    clave: "comision_venta_pct",
    etiqueta: "Comisión por venta",
    render: (v) => (typeof v === "number" ? `${v}%` : "—"),
  },
]

export function ComparativaPlanes({ planes }: ComparativaPlanesProps) {
  const router = useRouter()
  const [ciclo, setCiclo] = React.useState<PeriodicidadSuscripcion>("anual")

  // El plan "recomendado" es el de orden intermedio (ya vienen ordenados por
  // `orden`), no un slug hardcodeado — se adapta solo si el catálogo cambia.
  const indiceRecomendado = planes.length >= 3 ? Math.floor(planes.length / 2) : -1

  function continuar(slug: string) {
    router.push(`/crear?plan=${encodeURIComponent(slug)}&ciclo=${ciclo}`)
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

      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {planes.map((plan, index) => {
          const recomendado = index === indiceRecomendado
          const precio = ciclo === "anual" ? plan.precio_anual : plan.precio_mensual
          const ahorroPct =
            ciclo === "anual" && plan.precio_mensual > 0
              ? Math.round((1 - plan.precio_anual / (plan.precio_mensual * 12)) * 100)
              : 0

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col gap-5 rounded-3xl border p-8 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl",
                recomendado
                  ? "border-foreground bg-white dark:bg-zinc-900"
                  : "border-black/5 bg-white/70 dark:border-white/10 dark:bg-zinc-900/50"
              )}
            >
              {recomendado && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs font-semibold whitespace-nowrap text-background">
                  Recomendado
                </span>
              )}

              <h3 className="text-lg font-semibold text-foreground">{plan.nombre_display}</h3>

              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    ${precio.toLocaleString("es-MX")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{ciclo === "anual" ? "año" : "mes"}
                  </span>
                </div>
                {ahorroPct > 0 && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Ahorrás {ahorroPct}% vs. mensual
                  </span>
                )}
              </div>

              <ul className="flex flex-col gap-2.5 text-sm">
                {FEATURES.map((feature) => (
                  <li key={feature.clave} className="flex items-center gap-2">
                    {feature.render((plan.features as Record<string, unknown> | null)?.[feature.clave])}
                    <span className="text-foreground">{feature.etiqueta}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                size="lg"
                variant={recomendado ? "default" : "outline"}
                className="mt-2 w-full"
                onClick={() => continuar(plan.slug)}
              >
                Continuar
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
