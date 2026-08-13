"use client"

import * as React from "react"

import { altoBaldosaRepetida, offsetYBaldosaRepetida, yEfectivaRepetida } from "@/lib/imagen-posicion"
import type { PosicionImagen } from "@/lib/types"

/**
 * Mide en vivo lo necesario para expresar el desplazamiento vertical de
 * "Repetir fondo" en píxeles relativos a UNA baldosa, en vez de en % del
 * contenedor completo (ver la nota larga del porqué en `lib/imagen-
 * posicion.ts`): ancho real del contenedor vía `ResizeObserver` (cambia
 * entre mobile/desktop/miniatura del editor) + tamaño natural del archivo
 * vía un `Image()` fuera del DOM (una sola vez por URL, sin depender de un
 * `<img>` visible con `onLoad`).
 *
 * Reusado tal cual por `FondoImagenRepetido` (render final/preview del
 * editor) y por `ReposicionarImagen` (arrastre del modal) — mismo cálculo
 * en los 2 lugares, así el modal siempre muestra EXACTAMENTE lo mismo que
 * termina viéndose en la tarjeta real.
 */
export function useAltoBaldosaRepetida<T extends HTMLElement>(
  contenedorRef: React.RefObject<T | null>,
  imagenUrl: string,
  escala: number
) {
  const [anchoContenedor, setAnchoContenedor] = React.useState(0)
  const [naturalSize, setNaturalSize] = React.useState({ w: 0, h: 0 })

  React.useEffect(() => {
    const el = contenedorRef.current
    if (!el) return
    setAnchoContenedor(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setAnchoContenedor(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [contenedorRef])

  React.useEffect(() => {
    let cancelado = false
    if (!imagenUrl) {
      // Diferido (regla react-hooks/set-state-in-effect): un setState
      // síncrono en el cuerpo del efecto dispara renders en cascada, mismo
      // criterio que ya usa ReposicionarImagen para su propio reset.
      window.setTimeout(() => {
        if (!cancelado) setNaturalSize({ w: 0, h: 0 })
      }, 0)
      return () => {
        cancelado = true
      }
    }
    const img = new window.Image()
    img.onload = () => {
      if (!cancelado) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = imagenUrl
    return () => {
      cancelado = true
    }
  }, [imagenUrl])

  return altoBaldosaRepetida(anchoContenedor, escala, naturalSize.w, naturalSize.h)
}

interface FondoImagenRepetidoProps {
  imagenUrl: string
  posicion?: PosicionImagen
  className?: string
}

/** Fondo de imagen en modo "Repetir" (ancho completo, se repite hacia
 *  abajo) — un solo componente reusado por la tarjeta real (pantalla
 *  completa y contenida) Y la miniatura del editor, así ninguna de las dos
 *  puede quedar desincronizada de la otra. */
export function FondoImagenRepetido({ imagenUrl, posicion, className }: FondoImagenRepetidoProps) {
  const contenedorRef = React.useRef<HTMLDivElement>(null)
  const escala = posicion?.escala ?? 1
  const x = posicion?.x ?? 50
  // El default compartido con el modo cover (50 = centro) se interpreta acá
  // como "arriba" (0) — ver la nota larga en lib/imagen-posicion.ts. Un
  // patrón repetido arranca naturalmente en el tope, no centrado.
  const y = yEfectivaRepetida(posicion?.y ?? 50)
  const altoBaldosa = useAltoBaldosaRepetida(contenedorRef, imagenUrl, escala)
  const offsetY = offsetYBaldosaRepetida(y, altoBaldosa)

  return (
    <div
      ref={contenedorRef}
      className={className}
      style={{
        backgroundImage: `url(${imagenUrl})`,
        backgroundRepeat: "repeat-y",
        backgroundSize: `${100 * escala}% auto`,
        backgroundPosition: `${x}% ${offsetY}px`,
      }}
      aria-hidden
    />
  )
}
