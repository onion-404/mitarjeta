"use client"

import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { buttonVariants } from "@/components/ui/button"
import { COPY_PLAN } from "@/lib/planes-copy"
import type { PeriodicidadSuscripcion, Plan, PlanSlug } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PreciosDestacadosProps {
  planes: Plan[]
}

// Mismos datos y misma fuente de verdad que /planes (getPlanesActivos, sin
// nada hardcodeado por plan salvo el copy de marketing, ver
// lib/planes-copy.ts) — solo cambia el tratamiento visual acá (oscuro, cards
// con blur) para la dirección "premium" del home. Desde la migración de 2
// planes (2026-08-11) ya no hay un plan "recomendado" — Connect y Growth
// apuntan a audiencias distintas, no a niveles de un mismo escalón.
//
// Toggle mensual/anual (2026-08-11, mismo patrón que ComparativaPlanes en
// /planes): en mensual se muestra el precio de siempre sin más; en anual se
// muestran los 3 números que pidió el cliente en vez de solo un "%" —
// equivalente por mes, total facturado una vez al año, y el monto ahorrado
// en pesos — porque un monto concreto se lee más rápido que tener que
// calcularlo mentalmente a partir de un porcentaje.
export function PreciosDestacados({ planes }: PreciosDestacadosProps) {
  const [ciclo, setCiclo] = React.useState<PeriodicidadSuscripcion>("mensual")

  return (
    <section id="precios" className="relative overflow-hidden border-t border-white/10 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-[40rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-3xl px-6">
        <div className="text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance text-white sm:text-4xl">
            Un plan para cada tipo de negocio
          </h2>
          <p className="mt-3 text-white/60">
            Cada Linkard tiene su propio plan y su propia suscripción — elige el que se
            ajuste a ti hoy.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur">
            {(["mensual", "anual"] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setCiclo(opcion)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ease-out",
                  ciclo === opcion
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-white/60 hover:text-white"
                )}
              >
                {opcion === "mensual" ? "Mensual" : "Anual"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {planes.map((plan) => {
            const copy = COPY_PLAN[plan.slug as PlanSlug]
            const precioMensualEquivalente = Math.round(plan.precio_anual / 12)
            // Monto ahorrado en pesos (no el %) — más claro de un vistazo.
            const ahorroMonto = Math.round(plan.precio_mensual * 12 - plan.precio_anual)

            return (
              <div
                key={plan.id}
                className="relative flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-200 ease-out hover:bg-white/[0.07]"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white">{plan.nombre_display}</h3>
                  {copy && <p className="mt-1.5 text-sm text-white/60">{copy.tagline}</p>}
                </div>

                {ciclo === "mensual" ? (
                  <div className="flex items-baseline gap-1">
                    <span className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-white">
                      ${plan.precio_mensual.toLocaleString("es-MX")}
                    </span>
                    <span className="text-sm text-white/50">MXN/mes</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1">
                      <span className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-white">
                        ${precioMensualEquivalente.toLocaleString("es-MX")}
                      </span>
                      <span className="text-sm text-white/50">MXN/mes</span>
                    </div>
                    <span className="text-xs text-white/50">
                      Facturado ${plan.precio_anual.toLocaleString("es-MX")} una vez al año
                    </span>
                    {ahorroMonto > 0 && (
                      <span className="text-xs font-medium text-emerald-400">
                        Ahorras ${ahorroMonto.toLocaleString("es-MX")} al año pagando anual
                      </span>
                    )}
                  </div>
                )}

                <Link
                  href={`/crear?plan=${encodeURIComponent(plan.slug)}&ciclo=${ciclo}`}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-1 w-full justify-center bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  Elegir {plan.nombre_display} <ArrowRight className="size-4" />
                </Link>

                {copy && (
                  <ul className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-4 text-sm">
                    {copy.incluye.map((item) => (
                      <li key={item.titulo} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        <span className="text-white/80">
                          {item.titulo}
                          {item.detalle && (
                            <span className="text-white/50"> ({item.detalle})</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
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
