"use client"

import { Popover } from "@base-ui/react/popover"
import { Search } from "lucide-react"
import * as React from "react"

import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"
import { PLATAFORMAS } from "@/lib/redes"
import type { PlataformaRed } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SelectorPlataformaRedProps {
  value: PlataformaRed
  onChange: (plataforma: PlataformaRed) => void
  /** Pasa a través del trigger — mismo criterio que ColorPicker/scrollPreviewTo. */
  onFocus?: () => void
}

/** Reemplaza el `<select>` nativo de plataforma (2026-09-04, pedido
 *  explícito: "si son muchas puedes agregar una barra de búsqueda dentro
 *  del mismo modal") — con 16 redes + "Personalizado" un `<select>` nativo
 *  se vuelve incómodo de escanear. Mismo patrón Popover que ColorPicker:
 *  trigger con el ícono/nombre actual, popup con buscador + lista
 *  filtrada. La búsqueda se resetea cada vez que se abre. */
export function SelectorPlataformaRed({ value, onChange, onFocus }: SelectorPlataformaRedProps) {
  const [open, setOpen] = React.useState(false)
  const [busqueda, setBusqueda] = React.useState("")
  const actual = PLATAFORMAS.find((p) => p.id === value) ?? PLATAFORMAS[0]
  const IconoActual = SOCIAL_ICONS[actual.id]

  const filtradas = PLATAFORMAS.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  )

  function manejarCambioAbierto(siguiente: boolean) {
    if (siguiente) setBusqueda("")
    setOpen(siguiente)
  }

  return (
    <Popover.Root open={open} onOpenChange={manejarCambioAbierto}>
      <Popover.Trigger
        type="button"
        onFocus={onFocus}
        className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-white/70 px-3 py-2 text-left text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/60"
      >
        <IconoActual className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{actual.nombre}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-50">
          <Popover.Popup className="flex w-64 origin-[var(--transform-origin)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl outline-none transition-[transform,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar red social..."
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1.5">
              {filtradas.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">Sin resultados.</p>
              )}
              {filtradas.map((p) => {
                const Icono = SOCIAL_ICONS[p.id]
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p.id)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                      p.id === value
                        ? "bg-muted font-medium text-foreground"
                        : "text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icono className="size-4 shrink-0" />
                    {p.nombre}
                  </button>
                )
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
