"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Move, ZoomIn } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { useAltoBaldosaRepetida } from "@/components/tarjeta/fondo-imagen-repetido"
import {
  ESCALA_MAX,
  ESCALA_MIN,
  offsetYBaldosaRepetida,
  porcentajeYDesdeOffsetBaldosa,
  yEfectivaRepetida,
} from "@/lib/imagen-posicion"
import type { PosicionImagen } from "@/lib/types"

type Posicion = PosicionImagen

interface ReposicionarImagenProps {
  abierto: boolean
  imagenUrl: string
  valorInicial: Posicion
  /** Alto (px) de la caja de preview — el ancho toma el disponible del
   *  modal. Para el banner, usar la misma proporción que el banner real
   *  (ancho completo × altura real elegida) para que el ajuste sea 1:1 con
   *  lo que se ve después; para la imagen de fondo de toda la tarjeta no
   *  hay un alto real único (depende del contenido), se usa uno
   *  representativo. */
  alto: number
  /** true = la imagen se muestra en modo "Repetir fondo" (ver
   *  IdentidadVisual.fondoImagenRepetir) — cambia tanto la vista previa
   *  (tileada de verdad, no un recorte tipo cover) como la matemática de
   *  arrastre: el eje X sigue acotado (el ancho de la baldosa vs. el
   *  contenedor), pero el eje Y ya no tiene límite real — el patrón se
   *  repite infinito, así que arrastrar "gira" el patrón en vez de
   *  trabarse en un extremo. Default false = comportamiento de siempre
   *  (object-fit:cover con arrastre acotado en los 2 ejes). */
  repetir?: boolean
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
// vio mientras se arrastraba. En modo `repetir` el eje Y usa una matemática
// distinta (ver `porcentajeYDesdeOffsetBaldosa` en lib/imagen-posicion.ts) —
// acá no hay "cover", el patrón se repite infinito.
export function ReposicionarImagen({
  abierto,
  imagenUrl,
  valorInicial,
  alto,
  repetir = false,
  onCancelar,
  onConfirmar,
}: ReposicionarImagenProps) {
  const [posicion, setPosicion] = React.useState<Posicion>(valorInicial)
  const escala = posicion.escala ?? ESCALA_MIN
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
    // Modo cover: overflow real del eje Y (offset acotado a [-overflowY, 0]).
    // Modo repetir: alto de una baldosa (offset sin acotar, se normaliza con
    // módulo) — mismo campo, distinto significado según `repetir`.
    overflowY: number
  } | null>(null)

  // Solo se mide/usa en modo `repetir` (ver useAltoBaldosaRepetida) — en
  // modo cover queda en 0 sin costo real (el hook no encuentra contenedor
  // con imagen de fondo para medir).
  const altoBaldosa = useAltoBaldosaRepetida(containerRef, repetir ? imagenUrl : "", escala)

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

  // El "sobrante" de imagen para el arrastre se calcula contra la escala
  // BASE de object-fit:cover únicamente (sin el zoom extra del slider) —
  // el zoom se aplica después como un `transform: scale()` puramente
  // visual sobre esa misma caja (ver estiloImagenPosicionada), así que el
  // sobrante real en píxeles de pantalla queda multiplicado por `escala`;
  // se compensa dividiendo el delta del cursor por `escala` en
  // handlePointerMove para que el arrastre se sienta 1:1 con el cursor
  // también con zoom aplicado. Solo aplica en modo cover (sin repetir).
  function calcularOverflowCover() {
    const caja = containerRef.current?.getBoundingClientRect()
    const { w: naturalW, h: naturalH } = naturalSizeRef.current
    if (!caja || !naturalW || !naturalH) return { overflowX: 0, overflowY: 0 }
    const escalaBase = Math.max(caja.width / naturalW, caja.height / naturalH)
    return {
      overflowX: Math.max(naturalW * escalaBase - caja.width, 0),
      overflowY: Math.max(naturalH * escalaBase - caja.height, 0),
    }
  }

  // Modo repetir: el ancho de la baldosa es `contenedor * escala` (mismo
  // criterio que `background-size: X% auto` en el render real) — el
  // "sobrante" horizontal es la diferencia contra el contenedor. El alto no
  // tiene overflow real (se repite infinito), se maneja aparte con
  // `altoBaldosa` + módulo.
  function calcularOverflowXRepetido() {
    const anchoContenedor = containerRef.current?.getBoundingClientRect().width ?? 0
    return Math.max(anchoContenedor * (escala - 1), 0)
  }

  function offsetDesdePorcentaje(pct: number, overflow: number) {
    return -overflow * (pct / 100)
  }

  function porcentajeDesdeOffset(offset: number, overflow: number) {
    if (overflow <= 0) return 50
    return clamp((-offset / overflow) * 100, 0, 100)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    const { overflowX, overflowY } = repetir
      ? { overflowX: calcularOverflowXRepetido(), overflowY: altoBaldosa }
      : calcularOverflowCover()
    dragRef.current = {
      activo: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offsetDesdePorcentaje(posicion.x, overflowX),
      startOffsetY: repetir
        ? offsetYBaldosaRepetida(yEfectivaRepetida(posicion.y), overflowY)
        : offsetDesdePorcentaje(posicion.y, overflowY),
      overflowX,
      overflowY,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag?.activo) return
    const dx = (event.clientX - drag.startX) / escala
    const dy = (event.clientY - drag.startY) / escala
    const nuevoOffsetX = clamp(drag.startOffsetX + dx, -drag.overflowX, 0)
    if (repetir) {
      // Sin clamp en Y a propósito: el patrón se repite infinito, así que
      // arrastrar sin soltar "gira" en vez de trabarse en un extremo — el
      // módulo pasa a `porcentajeYDesdeOffsetBaldosa`.
      const nuevoOffsetY = drag.startOffsetY + dy
      setPosicion((prev) => ({
        ...prev,
        x: porcentajeDesdeOffset(nuevoOffsetX, drag.overflowX),
        y: porcentajeYDesdeOffsetBaldosa(nuevoOffsetY, drag.overflowY),
      }))
      return
    }
    const nuevoOffsetY = clamp(drag.startOffsetY + dy, -drag.overflowY, 0)
    setPosicion((prev) => ({
      ...prev,
      x: porcentajeDesdeOffset(nuevoOffsetX, drag.overflowX),
      y: porcentajeDesdeOffset(nuevoOffsetY, drag.overflowY),
    }))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
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
            <Move className="size-3.5 shrink-0" />
            {repetir
              ? "Arrastra para elegir qué parte del patrón se repite — gira sin límite."
              : "Arrastra la imagen para ajustar qué parte se ve."}
          </p>
          <div
            ref={containerRef}
            className="relative mt-4 w-full touch-none overflow-hidden rounded-xl border border-border bg-muted"
            style={{ height: alto }}
          >
            {repetir ? (
              // Vista previa REAL (tileada), no un recorte tipo cover — el
              // mismo cálculo que usa la tarjeta real (FondoImagenRepetido),
              // así lo que se arrastra acá es 1:1 con el resultado final.
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute inset-0 size-full cursor-grab touch-none select-none active:cursor-grabbing"
                style={{
                  backgroundImage: `url(${imagenUrl})`,
                  backgroundRepeat: "repeat-y",
                  backgroundSize: `${100 * escala}% auto`,
                  backgroundPosition: `${posicion.x}% ${offsetYBaldosaRepetida(yEfectivaRepetida(posicion.y), altoBaldosa)}px`,
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- arrastre directo con pointer events, next/image no expone eso
              <img
                src={imagenUrl}
                alt=""
                onLoad={handleImageLoad}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute inset-0 size-full cursor-grab touch-none object-cover select-none active:cursor-grabbing"
                style={{ objectPosition: `${posicion.x}% ${posicion.y}%`, transform: `scale(${escala})`, transformOrigin: `${posicion.x}% ${posicion.y}%` }}
                draggable={false}
              />
            )}
          </div>
          <label className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <ZoomIn className="size-4 shrink-0" />
            <input
              type="range"
              min={ESCALA_MIN}
              max={ESCALA_MAX}
              step={0.05}
              value={escala}
              onChange={(e) => setPosicion((prev) => ({ ...prev, escala: Number(e.target.value) }))}
              className="w-full accent-foreground"
            />
          </label>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => onConfirmar(escala !== ESCALA_MIN ? posicion : { x: posicion.x, y: posicion.y })}
            >
              Listo
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
