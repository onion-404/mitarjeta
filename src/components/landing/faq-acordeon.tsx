"use client"

import { Accordion } from "@base-ui/react/accordion"
import { Plus } from "lucide-react"

interface PreguntaFrecuente {
  pregunta: string
  respuesta: string
}

// Copy verificado contra el producto real antes de publicarlo (mismo
// criterio que lib/planes-copy.ts, ver CLAUDE.md) — a diferencia de una
// versión anterior de este copy, evita 2 afirmaciones que no son reales
// todavía: "conectar tu propio dominio" (no existe) y "conectar tus propios
// métodos de pago" (el cobro de citas usa la pasarela integrada de Linkard,
// el dueño no conecta una cuenta propia).
const PREGUNTAS: PreguntaFrecuente[] = [
  {
    pregunta: "¿Necesito saber de programación o diseño?",
    respuesta:
      "Para nada. Linkard está diseñado para que cualquier persona pueda configurarlo en minutos, sin tocar una sola línea de código.",
  },
  {
    pregunta: "¿Cómo me pagan mis clientes?",
    respuesta:
      "Cuando activas cobro para tus citas o servicios, tu cliente paga con tarjeta directo desde tu Linkard, a través de nuestra pasarela integrada — sin que tengas que configurar ni conectar nada de tu lado.",
  },
  {
    pregunta: "¿Cómo funciona el agendamiento de citas?",
    respuesta:
      "Tú defines tus días y horas disponibles. Tu cliente entra a tu link, elige un horario libre, llena sus datos (y paga si así lo configuraste) y ambos reciben la confirmación.",
  },
  {
    pregunta: "¿Puedo cambiar mi link más adelante?",
    respuesta:
      "Sí. Tu Linkard vive en linkard.mx/tu-nombre — un link corto y fácil de compartir, que puedes editar más adelante desde tu panel si lo necesitas.",
  },
]

export function FaqAcordeon() {
  return (
    <Accordion.Root className="flex w-full flex-col gap-3">
      {PREGUNTAS.map(({ pregunta, respuesta }) => (
        <Accordion.Item
          key={pregunta}
          value={pregunta}
          className="rounded-2xl border border-white/10 bg-white/5 px-6 backdrop-blur-xl"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold text-white">
              {pregunta}
              <Plus className="size-4 shrink-0 text-white/50 transition-transform duration-200 ease-out group-data-panel-open:rotate-45" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="h-[var(--accordion-panel-height)] overflow-hidden text-sm text-white/60 transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
            <p className="pb-5">{respuesta}</p>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
