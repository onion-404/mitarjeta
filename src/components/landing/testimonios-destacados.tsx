import { Quote, Star } from "lucide-react"

import { inicialesDeNombre } from "@/lib/testimonios"
import type { Testimonio } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TestimoniosDestacadosProps {
  testimonios: Testimonio[]
}

// Mismo trío de acentos que el abanico del hero (Aurora/Atardecer/Cítrico) —
// rota entre testimonios en vez de introducir un color nuevo para esta
// sección.
const ACENTOS = [
  { anillo: "ring-indigo-400/40", icono: "text-indigo-400" },
  { anillo: "ring-orange-400/40", icono: "text-orange-400" },
  { anillo: "ring-lime-500/40", icono: "text-lime-500" },
]

export function TestimoniosDestacados({ testimonios }: TestimoniosDestacadosProps) {
  return (
    <section className="border-t border-border/60 py-20">
      <div className="mx-auto w-full max-w-5xl px-6">
        <h2 className="text-center font-[family-name:var(--font-creativa)] text-3xl font-bold text-balance text-foreground sm:text-4xl">
          Negocios y creadores que ya lo usan
        </h2>

        <div
          className={cn(
            "mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2",
            testimonios.length >= 3 && "lg:grid-cols-3",
            testimonios.length < 3 && "sm:mx-auto sm:max-w-3xl"
          )}
        >
          {testimonios.map((t, index) => {
            const acento = ACENTOS[index % ACENTOS.length]
            return (
              <figure
                key={t.id}
                className="flex flex-col gap-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900"
              >
                <Quote className={cn("size-7", acento.icono)} aria-hidden />

                <blockquote className="flex-1 text-sm text-balance text-foreground">
                  “{t.cita}”
                </blockquote>

                {t.calificacion !== null && (
                  <div className="flex items-center gap-0.5" aria-label={`${t.calificacion} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "size-3.5",
                          n <= t.calificacion!
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/25"
                        )}
                      />
                    ))}
                  </div>
                )}

                <figcaption className="mt-auto flex items-center gap-3 border-t border-border/40 pt-4">
                  {t.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL de Cloudinary
                    <img
                      src={t.avatar_url}
                      alt=""
                      className={cn("size-11 rounded-full object-cover ring-2", acento.anillo)}
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-2",
                        acento.anillo
                      )}
                    >
                      {inicialesDeNombre(t.nombre)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{t.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.rol_o_negocio}</p>
                  </div>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
