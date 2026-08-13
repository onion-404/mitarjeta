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

// Las URL de Cloudinary son http(s) y pueden optimizarse con next/image; las
// vistas previas locales sin guardar todavía (blob:) no, porque no existen
// en un servidor al que next/image pueda pedirlas. Extraída de
// tarjeta-card.tsx (2026-08-09) porque catalogo-item-modal.tsx también la
// necesita.
export function esUrlOptimizable(url: string) {
  return url.startsWith("http://") || url.startsWith("https://")
}

// --- "Repetir fondo" (fondoImagenRepetir) ---
//
// Bug real corregido (2026-08-16): con `background-repeat: repeat-y`, un
// `background-position` en porcentaje se calcula contra el ALTO TOTAL del
// contenedor (`(altoContenedor - altoImagen) * pct`) — nunca contra el alto
// de UNA baldosa. El alto del contenedor no tiene ninguna relación con el
// alto de una baldosa (puede medir miles de píxeles en la tarjeta real,
// unos pocos en la miniatura del editor), así que el mismo % de Y guardado
// producía un desplazamiento en píxeles gigantesco que, al repetirse la
// imagen cada `altoBaldosa` píxeles, terminaba en un punto casi arbitrario
// del patrón (a veces indistinguible del original, a veces un salto raro) —
// de ahí el reporte real de "el reposicionamiento solo funciona horizontal".
// En X no pasa porque no hay `repeat-x`: el ancho de la baldosa se fija en
// `container * escala` (mismo contenedor que se usa para el %), así que ahí
// el % SÍ es válido.
//
// Fix: expresar el offset de Y en píxeles ABSOLUTOS relativos a una sola
// baldosa (en vez de en % del contenedor). El alto de una baldosa se deriva
// del ancho real del contenedor (measured, cambia entre mobile/desktop/
// miniatura) y de la proporción natural del archivo — ver el hook
// `useAltoBaldosaRepetida` en fondo-imagen-repetido.tsx, que mide ambos y
// llama a `altoBaldosaRepetida` de acá abajo. Mismas 3 funciones puras
// reusadas por el render final (`FondoImagenRepetido`) y por el arrastre en
// vivo del modal (`ReposicionarImagen`) — un solo cálculo, nunca pueden
// divergir entre "lo que se arrastra" y "lo que se guarda".

/** Alto real (px) de UNA baldosa del patrón repetido — 0 si todavía no hay
 *  medidas (imagen sin cargar, contenedor sin renderizar). */
export function altoBaldosaRepetida(
  anchoContenedorPx: number,
  escala: number,
  naturalW: number,
  naturalH: number
) {
  if (!naturalW || !naturalH || anchoContenedorPx <= 0) return 0
  return anchoContenedorPx * escala * (naturalH / naturalW)
}

/** % de Y (0-100, dentro de una baldosa) → offset en px (siempre ≤ 0) —
 *  misma convención de signo que `object-position`/`background-position`. */
export function offsetYBaldosaRepetida(porcentajeY: number, altoBaldosa: number) {
  if (altoBaldosa <= 0) return 0
  return -altoBaldosa * (porcentajeY / 100)
}

/** Inversa de la anterior, usada mientras se arrastra. A diferencia del eje
 *  X (que sí tiene un límite real: el ancho de la baldosa vs. el
 *  contenedor, se recorta con `clamp`), acá cualquier offset es válido
 *  porque el patrón se repite infinito — se normaliza al rango 0-100 con
 *  módulo en vez de recortarse, así arrastrar sin soltar "gira" el patrón
 *  sin tope en vez de trabarse en un extremo. */
export function porcentajeYDesdeOffsetBaldosa(offsetPx: number, altoBaldosa: number) {
  if (altoBaldosa <= 0) return 50
  const pct = (-offsetPx / altoBaldosa) * 100
  return ((pct % 100) + 100) % 100
}

/** `fondoImagenPosicion` es un campo COMPARTIDO con el modo sin repetir
 *  (cover), donde `y: 50` significa "centrado" — el default con el que
 *  arranca toda tarjeta nueva. En modo Repetir ese mismo 50 se traducía
 *  literal a "medio tile de offset" (`offsetYBaldosaRepetida`), que se ve
 *  como si la imagen estuviera centrada en vez de arrancar arriba — bug
 *  real reportado por el cliente ("se ve como si estuviera posicionando
 *  center"). El arranque natural de un patrón que se repite hacia abajo es
 *  el tope de la imagen contra el tope del banner (`y: 0`, offset 0, sin
 *  desplazamiento) — así que mientras el dueño no haya arrastrado el eje Y
 *  a mano (sigue en el 50 default), se interpreta como 0. Si ya lo movió a
 *  cualquier otro valor, se respeta tal cual — esto NO reescribe el dato
 *  guardado, solo cambia cómo se INTERPRETA el sentinel compartido cuando
 *  el modo es Repetir. */
export function yEfectivaRepetida(y: number) {
  return y === 50 ? 0 : y
}
