import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import type { Plan } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PreciosDestacadosProps {
  planes: Plan[]
}

// Mismos datos y misma fuente de verdad que /planes (getPlanesActivos, sin
// nada hardcodeado por plan) — solo cambia el tratamiento visual acá
// (oscuro, cards con blur, plan recomendado con badge) para la dirección
// "premium" del home. El plan "recomendado" es el de orden intermedio, no
// un slug fijo — mismo criterio que ya usa ComparativaPlanes.
export function PreciosDestacados({ planes }: PreciosDestacadosProps) {
  const indiceRecomendado = planes.length >= 3 ? Math.floor(planes.length / 2) : -1

  return (
    <section id="precios" className="relative overflow-hidden border-t border-white/10 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-[40rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-5xl px-6">
        <div className="text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance text-white sm:text-4xl">
            Un plan para cada etapa de tu negocio
          </h2>
          <p className="mt-3 text-white/60">
            Cada tarjeta tiene su propio plan y su propia suscripción — elegí el que se
            ajuste a vos hoy.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {planes.map((plan, index) => {
            const recomendado = index === indiceRecomendado
            const ahorroPct =
              plan.precio_mensual > 0
                ? Math.round((1 - plan.precio_anual / (plan.precio_mensual * 12)) * 100)
                : 0

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col gap-4 rounded-3xl border p-8 backdrop-blur-xl transition-all duration-200 ease-out",
                  recomendado
                    ? "border-violet-400/50 bg-white/10 shadow-[0_0_60px_-15px_rgba(168,85,247,0.5)]"
                    : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
                )}
              >
                {recomendado && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    <Sparkles className="size-3" /> Recomendado
                  </span>
                )}

                <h3 className="text-lg font-semibold text-white">{plan.nombre_display}</h3>

                <div className="flex items-baseline gap-1">
                  <span className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-white">
                    ${plan.precio_mensual.toLocaleString("es-MX")}
                  </span>
                  <span className="text-sm text-white/50">MXN/mes</span>
                </div>
                {ahorroPct > 0 && (
                  <span className="text-xs font-medium text-emerald-400">
                    Ahorrás {ahorroPct}% pagando anual
                  </span>
                )}

                <Link
                  href={`/crear?plan=${encodeURIComponent(plan.slug)}&ciclo=mensual`}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-2 w-full justify-center",
                    recomendado
                      ? "bg-white text-violet-700 hover:bg-white/90"
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  Elegir {plan.nombre_display} <ArrowRight className="size-4" />
                </Link>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-sm text-white/50">
          <Link href="/planes" className="underline underline-offset-4 hover:text-white">
            Ver la comparación completa de planes
          </Link>
        </p>
      </div>
    </section>
  )
}
