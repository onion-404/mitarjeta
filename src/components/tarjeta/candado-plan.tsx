import { Zap } from "lucide-react"

import { cn } from "@/lib/utils"

interface CandadoPlanProps {
  plan: "connect" | "growth"
  className?: string
}

const ETIQUETA: Record<CandadoPlanProps["plan"], string> = {
  connect: "Connect",
  growth: "Growth",
}

// Ámbar para "Connect", violeta para "Growth" — distingue visualmente los 2
// niveles de upsell en vez de un candado genérico igual para todo. A
// propósito NO atenúa ni deshabilita lo que envuelve: la opción sigue
// completamente clickeable y se ve con toda su fidelidad visual (se puede
// probar en vivo, ver CLAUDE.md) — el badge es la única señal de bloqueo.
const CLASE_PLAN: Record<CandadoPlanProps["plan"], string> = {
  connect: "bg-amber-500 text-white",
  growth: "bg-violet-600 text-white",
}

export function CandadoPlan({ plan, className }: CandadoPlanProps) {
  return (
    <span
      className={cn(
        "pointer-events-none inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap shadow-sm",
        CLASE_PLAN[plan],
        className
      )}
    >
      <Zap className="size-2.5" />
      {ETIQUETA[plan]}
    </span>
  )
}
