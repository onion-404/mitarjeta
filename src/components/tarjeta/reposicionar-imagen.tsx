"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Move } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"

interface Posicion {
  x: number
  y: number
}

interface ReposicionarImagenProps {
  abierto: boolean
  imagenUrl: string
  valorInicial: Posicion
  /** Alto (px) de la caja de preview — el ancho toma el disponible del
   *  modal. Para el banner, usar la misma proporción que el banner real
   *  (ancho completo × 192px) para que el ajuste sea 1:1 con lo que se ve
   *  después; para la imagen de fondo de toda la tarjeta no hay un alto
   *  real único (depende del contenido), se usa uno representativo. */
  alto: number
  onCancelar: () => void
  onConfirmar: (posicion: Posicion) => void
}

function clamp(valor: number, min: number, max: number) {
  return Math.min(Math.max(valor, min), max)
}

// Arrastre 1:1 con el cursor (no una aproximación por delta-de-caja): se mide
// el tamaño real que el navegador le da a la imagen bajo object-fit:cover
// (naturalWidth/Height del archivo vs. el tamaño real de la caja) para saber
// cuánto "sobra" de imagen en cada eje, y cada pixel de arrastre se traduce
// directo a ese sobrante — mismo cálculo que usa `object-position`
// internamente, así el resultado final coincide exactamente con lo que se
// vio mientras se arrastraba.
export function ReposicionarImagen({
  abierto,
  imagenUrl,
  valorInicial,
  alto,
  onCancelar,
  onConfirmar,
}: ReposicionarImagenProps) {
  const [posicion, setPosicion] = React.useState<Posicion>(valorInicial)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const naturalSizeRef = React.useRef({ w: 0, h: 0 })
  const dragRef = React.useRef<{
    activo: boolean
    pointerId: number
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
    overflowX: number
    overflowY: number
  } | null>(null)

  React.useEffect(() => {
    if (!abierto) return
    // Diferido: setState síncrono dentro de un efecto dispara renders en
    // cascada (regla react-hooks/set-state-in-effect). Solo al abrir:
    // reinicia el draft al valor guardado, sin pisarlo en cada render
    // mientras el diálogo sigue abierto.
    window.setTimeout(() => setPosicion(valorInicial), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  function handleImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    naturalSizeRef.current = {
      w: event.currentTarget.naturalWidth,
      h: event.currentTarget.naturalHeight,
    }
  }

  function calcularOverflow() {
    const caja = containerRef.current?.getBoundingClientRect()
    const { w: naturalW, h: naturalH } = naturalSizeRef.current
    if (!caja || !naturalW || !naturalH) return { overflowX: 0, overflowY: 0 }
    const escala = Math.max(caja.width / naturalW, caja.height / naturalH)
    return {
      overflowX: Math.max(naturalW * escala - caja.width, 0),
      overflowY: Math.max(naturalH * escala - caja.height, 0),
    }
  }

  function offsetDesdePorcentaje(pct: number, overflow: number) {
    return -overflow * (pct / 100)
  }

  function porcentajeDesdeOffset(offset: number, overflow: number) {
    if (overflow <= 0) return 50
    return clamp((-offset / overflow) * 100, 0, 100)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLImageElement>) {
    const { overflowX, overflowY } = calcularOverflow()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      activo: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offsetDesdePorcentaje(posicion.x, overflowX),
      startOffsetY: offsetDesdePorcentaje(posicion.y, overflowY),
      overflowX,
      overflowY,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current
    if (!drag?.activo) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    const nuevoOffsetX = clamp(drag.startOffsetX + dx, -drag.overflowX, 0)
    const nuevoOffsetY = clamp(drag.startOffsetY + dy, -drag.overflowY, 0)
    setPosicion({
      x: porcentajeDesdeOffset(nuevoOffsetX, drag.overflowX),
      y: porcentajeDesdeOffset(nuevoOffsetY, drag.overflowY),
    })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLImageElement>) {
    if (dragRef.current) dragRef.current.activo = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={(open) => !open && onCancelar()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-6 shadow-2xl transition-all duration-300 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Title className="text-base font-semibold text-foreground">
            Reposicionar imagen
          </Dialog.Title>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Move className="size-3.5 shrink-0" /> Arrastrá la imagen para ajustar qué parte se ve.
          </p>
          <div
            ref={containerRef}
            className="relative mt-4 w-full touch-none overflow-hidden rounded-xl border border-border bg-muted"
            style={{ height: alto }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- arrastre directo con pointer events, next/image no expone eso */}
            <img
              src={imagenUrl}
              alt=""
              onLoad={handleImageLoad}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-0 size-full cursor-grab touch-none object-cover select-none active:cursor-grabbing"
              style={{ objectPosition: `${posicion.x}% ${posicion.y}%` }}
              draggable={false}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1" onClick={() => onConfirmar(posicion)}>
              Listo
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
