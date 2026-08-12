"use client"

import { Bold, Italic } from "lucide-react"
import * as React from "react"

import { envolverSeleccion } from "@/lib/texto-enriquecido"
import { cn } from "@/lib/utils"

interface EditorTextoEnriquecidoProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  placeholder?: string
  rows?: number
  /** Se aplica al <textarea> — el caller pasa `inputClase` (u otra clase de
   *  input existente) para que se vea igual al resto de los campos. */
  className?: string
}

/** Textarea + 2 botones (Negrita/Cursiva) que envuelven la selección con
 *  los marcadores de negrita/cursiva — "texto enriquecido" sin
 *  contentEditable ni HTML real (ver lib/texto-enriquecido.tsx para el
 *  porqué). `document.execCommand` no hace falta: es manipulación directa
 *  de `selectionStart/End`, funciona igual en cualquier navegador moderno. */
export function EditorTextoEnriquecido({
  value,
  onChange,
  onFocus,
  placeholder,
  rows = 3,
  className,
}: EditorTextoEnriquecidoProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null)

  function aplicarMarcador(marcador: string) {
    const textarea = ref.current
    if (!textarea) return
    const resultado = envolverSeleccion(value, textarea.selectionStart, textarea.selectionEnd, marcador)
    onChange(resultado.valor)
    // Restaurar foco + selección después del re-render (el valor del
    // textarea todavía no se actualizó de forma síncrona acá).
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(resultado.inicio, resultado.fin)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => aplicarMarcador("**")}
          title="Negrita"
          aria-label="Negrita"
          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bold className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => aplicarMarcador("*")}
          title="Cursiva"
          aria-label="Cursiva"
          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Italic className="size-3.5" />
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        rows={rows}
        className={cn(className, "resize-none")}
      />
    </div>
  )
}
