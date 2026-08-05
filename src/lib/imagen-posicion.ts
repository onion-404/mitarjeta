import type { CSSProperties } from "react"

import type { PosicionImagen } from "@/lib/types"

/** Rango del slider de zoom en ReposicionarImagen — 1 = sin zoom extra
 *  sobre el object-fit:cover de base (comportamiento de siempre). */
export const ESCALA_MIN = 1
export const ESCALA_MAX = 2.5

/** Estilo inline compartido por avatar/banner/imagen de fondo: además del
 *  `object-position` de siempre (dónde queda anclada la imagen dentro de
 *  su caja), aplica un `transform: scale()` opcional con `transformOrigin`
 *  en el mismo punto — permite "acercar" la imagen más allá de lo que
 *  object-fit:cover ya hace por su cuenta, anclado al mismo punto que se
 *  arrastra en ReposicionarImagen. `escala` ausente o 1 = idéntico al
 *  render de antes de este campo (sin transform en absoluto, no solo
 *  `scale(1)`, para no forzar una capa de composición GPU de más en las
 *  tarjetas que nunca usaron el zoom). */
export function estiloImagenPosicionada(pos?: PosicionImagen): CSSProperties {
  const x = pos?.x ?? 50
  const y = pos?.y ?? 50
  const escala = pos?.escala ?? 1
  return {
    objectPosition: `${x}% ${y}%`,
    ...(escala !== 1
      ? { transform: `scale(${escala})`, transformOrigin: `${x}% ${y}%` }
      : undefined),
  }
}
