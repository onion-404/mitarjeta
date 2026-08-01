"use client"

import { Menu } from "@base-ui/react/menu"
import { Check, ChevronDown } from "lucide-react"

import { CandadoPlan } from "@/components/tarjeta/candado-plan"
import {
  ESTILOS_TIPOGRAFIA,
  estaBloqueada,
  type PlanFeaturesPersonalizacion,
} from "@/lib/personalizacion"
import { cn } from "@/lib/utils"
import type { EstiloTipografia } from "@/lib/types"

interface SelectorTipografiaProps {
  value: EstiloTipografia
  onChange: (id: EstiloTipografia) => void
  /** Valor ya guardado en DB (no el draft) — mismo criterio que el resto de
   *  lib/personalizacion.ts: nunca bloquea lo que la tarjeta ya tenía. */
  valorGuardado: EstiloTipografia
  features: PlanFeaturesPersonalizacion
}

// Dropdown de fuente estilo Linktree (pedido explícito, ver CLAUDE.md): el
// trigger y cada ítem del menú se renderizan EN esa misma tipografía, no
// solo con el nombre — mismo "Aa" de vista previa que ya usaban los swatches
// de grilla. El click siempre selecciona (el candado es solo un badge
// visual, igual que OpcionPersonalizacion) — el bloqueo real es al guardar.
export function SelectorTipografia({
  value,
  onChange,
  valorGuardado,
  features,
}: SelectorTipografiaProps) {
  const actual = ESTILOS_TIPOGRAFIA.find((e) => e.id === value) ?? ESTILOS_TIPOGRAFIA[0]

  return (
    <Menu.Root>
      <Menu.Trigger className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-left text-sm outline-none transition-colors duration-200 ease-out hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50">
        <span
          style={{ fontFamily: actual.fuente }}
          className="flex items-center gap-2 truncate"
        >
          <span className="text-base font-semibold">Aa</span>
          {actual.etiqueta}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6} className="z-50 outline-none">
          <Menu.Popup className="max-h-80 w-[min(20rem,90vw)] overflow-y-auto rounded-2xl border border-border bg-background p-1.5 shadow-2xl outline-none transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {ESTILOS_TIPOGRAFIA.map((estilo) => {
              const bloqueada = estaBloqueada(estilo.tier, estilo.id, valorGuardado, features)
              return (
                <Menu.Item
                  key={estilo.id}
                  onClick={() => onChange(estilo.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-highlighted:bg-muted",
                    value === estilo.id && "bg-muted"
                  )}
                >
                  <span
                    style={{ fontFamily: estilo.fuente }}
                    className="flex items-center gap-2 truncate"
                  >
                    <span className="text-base font-semibold">Aa</span>
                    {estilo.etiqueta}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {bloqueada && <CandadoPlan plan={bloqueada.plan} />}
                    {value === estilo.id && <Check className="size-3.5 text-foreground" />}
                  </span>
                </Menu.Item>
              )
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
