"use client"

import { Tabs } from "@base-ui/react/tabs"
import { Gavel, HeartPulse, Scissors, UtensilsCrossed } from "lucide-react"

import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import type { DatosContacto, Giro, IdentidadVisual, TarjetaTipo } from "@/lib/types"
import { cn } from "@/lib/utils"

import { TARJETA_ANTOJITOS, TARJETA_CREADORA, TARJETA_ESTUDIO, TARJETA_TERAPEUTA } from "./tarjetas-demo"

interface TarjetaDemo {
  tipo: TarjetaTipo
  slug: string
  datosContacto: DatosContacto
  identidadVisual: IdentidadVisual
}

interface Nicho {
  id: string
  etiqueta: string
  icono: typeof HeartPulse
  giro: Giro
  // Mockup de ejemplo (ver tarjetas-demo.ts) usado SOLO mientras no hay
  // todavía ninguna Linkard real de ese giro — se reemplaza automáticamente
  // apenas exista una (ver ShowcaseNichosProps.tarjetasReales), sin tocar
  // este archivo.
  fallback: TarjetaDemo
  // Copy descriptivo del beneficio — sin atribuirlo a un nombre propio como
  // si fuera una cita/testimonio real (evita que se lea como reseña
  // fabricada cuando cae al mockup de ejemplo).
  beneficio: string
}

const NICHOS: Nicho[] = [
  {
    id: "salud",
    etiqueta: "Salud y Bienestar",
    icono: HeartPulse,
    giro: "salud_bienestar",
    fallback: TARJETA_TERAPEUTA,
    beneficio:
      "Tus pacientes agendan y confirman su cita solos, con recordatorio automático por WhatsApp — cero llamadas de ida y vuelta.",
  },
  {
    id: "belleza",
    etiqueta: "Belleza y Estética",
    icono: Scissors,
    giro: "belleza_estetica",
    fallback: TARJETA_ESTUDIO,
    beneficio:
      "Tu agenda se llena sola: cada quien elige su horario disponible y tú solo te preparas para atender.",
  },
  {
    id: "legal",
    etiqueta: "Legal y Consultoría",
    icono: Gavel,
    giro: "legal_consultoria",
    fallback: TARJETA_CREADORA,
    beneficio:
      "Portafolio, redes y contacto directo en un solo link que proyecta autoridad — nada de linktrees genéricos.",
  },
  {
    id: "gastronomia",
    etiqueta: "Gastronomía",
    icono: UtensilsCrossed,
    giro: "gastronomia",
    fallback: TARJETA_ANTOJITOS,
    beneficio:
      "Tu menú siempre actualizado y a un toque de WhatsApp — sin mandar fotos sueltas ni PDFs viejos.",
  },
]

interface ShowcaseNichosProps {
  // Una Linkard real por giro, cuando existe (ver getTarjetaEjemploPorGiro,
  // lib/tarjetas.ts) — resuelto server-side en page.tsx y pasado acá ya
  // convertido a la forma plana que espera <TarjetaCard>. Sin entrada para
  // un giro dado, ese tab cae a su `fallback` de ejemplo.
  tarjetasReales: Partial<Record<Giro, TarjetaDemo>>
}

export function ShowcaseNichos({ tarjetasReales }: ShowcaseNichosProps) {
  return (
    <Tabs.Root defaultValue={NICHOS[0].id} className="flex flex-col items-center">
      <Tabs.List className="flex w-full max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
        {NICHOS.map(({ id, etiqueta, icono: Icono }) => (
          <Tabs.Tab
            key={id}
            value={id}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap text-white/60 transition-colors duration-200 ease-out",
              "data-active:bg-gradient-to-r data-active:from-violet-500 data-active:to-fuchsia-500 data-active:text-white"
            )}
          >
            <Icono className="size-4" />
            {etiqueta}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {NICHOS.map(({ id, giro, fallback, beneficio }) => {
        const tarjeta = tarjetasReales[giro] ?? fallback
        return (
          <Tabs.Panel key={id} value={id} className="w-full">
            <div className="mt-12 grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
              {/* Mockup de smartphone — marco propio en CSS, sin librería
                  nueva, conteniendo la <TarjetaCard> REAL (o, si ese giro
                  todavía no tiene ninguna Linkard real, un mockup de
                  ejemplo — nunca una captura de pantalla estática). */}
              <div className="mx-auto">
                <div className="relative h-[560px] w-[280px] rounded-[2.75rem] border-[6px] border-zinc-800 bg-zinc-950 shadow-2xl shadow-violet-950/40">
                  <div
                    aria-hidden
                    className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-800"
                  />
                  <div className="absolute inset-0 overflow-hidden rounded-[2.25rem]">
                    <div className="origin-top scale-[0.82]">
                      <TarjetaCard {...tarjeta} className="w-[280px] shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-auto max-w-sm text-center sm:text-left">
                <p className="text-lg text-balance text-white/80">{beneficio}</p>
              </div>
            </div>
          </Tabs.Panel>
        )
      })}
    </Tabs.Root>
  )
}
