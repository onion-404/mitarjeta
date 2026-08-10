"use client"

import { Popover } from "@base-ui/react/popover"
import * as React from "react"

import { cn } from "@/lib/utils"

const HEX_COMPLETO = /^#[0-9a-fA-F]{6}$/

function normalizarHex(valor: string): string | null {
  const limpio = valor.trim().startsWith("#") ? valor.trim() : `#${valor.trim()}`
  return HEX_COMPLETO.test(limpio) ? limpio.toLowerCase() : null
}

function hexARgb(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return { r: 0, g: 0, b: 0 }
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

function rgbAHex(r: number, g: number, b: number) {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n) || 0))
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`
}

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  /** Colores ya elegidos en otras partes de esta misma tarjeta — permite
   *  reutilizarlos con un click en vez de volver a buscar/tipear el mismo
   *  hex (pedido explícito del cliente: "reutilizar colores personalizados
   *  en otros elementos"). */
  recientes?: string[]
  className?: string
  /** Pasa a través del trigger — algunos callers lo usan para hacer scroll
   *  a la vista previa cuando el campo recibe foco (ver scrollPreviewTo en
   *  tarjeta-form.tsx). */
  onFocus?: () => void
}

/** Selector de color unificado — reemplaza los `<input type="color">`
 *  sueltos de todo el editor (2026-08-10, feedback del cliente: "la
 *  experiencia con los selectores de color es muy mala"). Un swatch que
 *  abre un popover con 3 formas de elegir color: la rueda nativa del
 *  navegador, hex a mano, y RGB a mano — más una fila de "Tus colores" con
 *  los que ya están en uso en la tarjeta. No reemplaza el patrón de
 *  "activo"/"Quitar" que ya usan varios campos (colorFondoActivo, etc.) —
 *  ese wrapper sigue viviendo en el caller, este componente solo resuelve
 *  el "¿qué color?".
 */
export function ColorPicker({ value, onChange, recientes, className, onFocus }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hexInput, setHexInput] = React.useState(value)
  const rgb = hexARgb(value)

  // El campo de hex se resincroniza con el valor real al ABRIR el popover
  // (no con un efecto — evita el cascading render de sincronizar estado
  // dentro de un useEffect) — así no queda mostrando un hex a medio
  // escribir de la vez anterior.
  function manejarCambioAbierto(siguiente: boolean) {
    if (siguiente) setHexInput(value)
    setOpen(siguiente)
  }

  function confirmarHex(valor: string) {
    const hex = normalizarHex(valor)
    if (hex) onChange(hex)
    else setHexInput(value) // inválido: vuelve a mostrar el último color válido
  }

  function actualizarCanal(canal: "r" | "g" | "b", valor: number) {
    const siguiente = { ...rgb, [canal]: valor }
    onChange(rgbAHex(siguiente.r, siguiente.g, siguiente.b))
  }

  return (
    <Popover.Root open={open} onOpenChange={manejarCambioAbierto}>
      <Popover.Trigger
        type="button"
        aria-label="Elegir color"
        onFocus={onFocus}
        style={{ backgroundColor: value }}
        className={cn(
          "size-8 shrink-0 cursor-pointer rounded-lg border border-border shadow-sm",
          className
        )}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-60 origin-[var(--transform-origin)] rounded-2xl border border-border bg-background p-3 shadow-xl outline-none transition-[transform,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Rueda de color"
                className="size-9 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0"
              />
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Hex</span>
                <input
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  onBlur={() => confirmarHex(hexInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmarHex(hexInput)
                  }}
                  className="w-full rounded-lg border border-border bg-white/70 px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/60"
                />
              </label>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(["r", "g", "b"] as const).map((canal) => (
                <label key={canal} className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-muted-foreground">{canal}</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb[canal]}
                    onChange={(e) => actualizarCanal(canal, Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-white/70 px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/60"
                  />
                </label>
              ))}
            </div>

            {recientes && recientes.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-2.5">
                <span className="text-[10px] text-muted-foreground">Tus colores</span>
                <div className="flex flex-wrap gap-1.5">
                  {recientes.map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      aria-label={color}
                      onClick={() => onChange(color)}
                      style={{ backgroundColor: color }}
                      className={cn(
                        "size-6 rounded-md border-2 transition-colors duration-150 ease-out",
                        value.toLowerCase() === color.toLowerCase()
                          ? "border-foreground"
                          : "border-border/60 hover:border-foreground/50"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
