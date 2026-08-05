import Image from "next/image"
import type { ReactNode } from "react"

import { estiloImagenPosicionada } from "@/lib/imagen-posicion"
import { FORMAS_AVATAR } from "@/lib/personalizacion"
import type { AvatarForma as AvatarFormaId, PosicionImagen } from "@/lib/types"
import { cn } from "@/lib/utils"

// "cuadrado" es legacy (ver lib/personalizacion.ts — el picker ya no la
// ofrece, pero tarjetas viejas guardadas con ese valor la siguen
// necesitando). Junto con circulo/suave, son las 3 formas que se resuelven
// con className + el ring-4 ring-white de box-shadow de siempre: un
// box-shadow sigue el rectángulo del elemento, y para circulo/rounded-2xl/
// rounded-xl eso ya se ve bien — no hace falta tocar nada acá.
const CLASE_LEGACY: Record<string, string> = {
  cuadrado: "rounded-xl",
}

const TAMANO_REFERENCIA = 100 // px — caja en la que se autoraron los path()

interface AvatarFormaProps {
  forma: AvatarFormaId | undefined
  tamanoPx: number
  imagenUrl?: string
  /** Ancla de reposicionamiento + zoom (ver ReposicionarImagen) — sin esto,
   *  se ve exactamente igual que antes (centrado, sin zoom). */
  imagenPosicion?: PosicionImagen
  alt: string
  iniciales: ReactNode
  unoptimized?: boolean
}

// Encapsula las 3 estrategias de render (className legacy / clip-path
// directo / clip-path con wrapper+scale) y, para las 4 formas nuevas, la
// técnica de "anillo" (mismo clip-path en una capa más grande detrás) —
// un ring-*/box-shadow normal no abraza un hexágono/blob/corazón/estrella,
// se ve como un halo rectangular (verificado renderizado antes de
// implementar esto, ver CLAUDE.md).
export function AvatarForma({
  forma,
  tamanoPx,
  imagenUrl,
  imagenPosicion,
  alt,
  iniciales,
  unoptimized,
}: AvatarFormaProps) {
  const claseLegacy = forma ? CLASE_LEGACY[forma] : undefined
  const meta = FORMAS_AVATAR.find((f) => f.id === forma)

  const contenido = imagenUrl ? (
    <Image
      src={imagenUrl}
      alt={alt}
      fill
      sizes={`${tamanoPx}px`}
      unoptimized={unoptimized}
      className="object-cover"
      style={estiloImagenPosicionada(imagenPosicion)}
    />
  ) : (
    <span className="flex size-full items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a]">
      {iniciales}
    </span>
  )

  // Legacy (circulo/suave/cuadrado, o sin forma definida): sin cambios,
  // exactamente el mismo render que antes de este sistema.
  if (claseLegacy || !meta || meta.claseCss) {
    const clase = claseLegacy ?? meta?.claseCss ?? "rounded-full"
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden text-xl font-semibold text-[#71717a] shadow-lg ring-4 ring-white dark:text-[#d4d4d8] dark:ring-[#18181b]",
          clase
        )}
        style={{ width: tamanoPx, height: tamanoPx }}
      >
        {contenido}
      </div>
    )
  }

  // hexágono/estrella (polygon, porcentual): el "anillo" es una capa
  // idéntica pero un poco más grande (-inset), el clip-path porcentual
  // escala solo con el tamaño de cada caja.
  if (!meta.requiereWrapperEscala) {
    return (
      <div className="relative shrink-0" style={{ width: tamanoPx, height: tamanoPx }}>
        <div
          className="absolute -inset-1.5 bg-white shadow-lg dark:bg-[#18181b]"
          style={{ clipPath: meta.clipPath }}
        />
        <div
          className="absolute inset-0 overflow-hidden text-xl font-semibold text-[#71717a] dark:text-[#d4d4d8]"
          style={{ clipPath: meta.clipPath }}
        >
          {contenido}
        </div>
      </div>
    )
  }

  // blob/corazón (path() con curvas): coordenadas atadas a una caja de
  // 100x100 — hace falta el wrapper con scale para que se vea proporcionado
  // al tamaño real pedido (verificado renderizado a 32px y 96px antes de
  // implementar, ver CLAUDE.md).
  const escalaContenido = tamanoPx / TAMANO_REFERENCIA
  const escalaAnillo = (tamanoPx + 12) / TAMANO_REFERENCIA
  return (
    <div className="relative shrink-0" style={{ width: tamanoPx, height: tamanoPx }}>
      <div
        className="absolute left-1/2 top-1/2 bg-white shadow-lg dark:bg-[#18181b]"
        style={{
          width: TAMANO_REFERENCIA,
          height: TAMANO_REFERENCIA,
          clipPath: meta.clipPath,
          transform: `translate(-50%, -50%) scale(${escalaAnillo})`,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden text-xl font-semibold text-[#71717a] dark:text-[#d4d4d8]"
        style={{
          width: TAMANO_REFERENCIA,
          height: TAMANO_REFERENCIA,
          clipPath: meta.clipPath,
          transform: `translate(-50%, -50%) scale(${escalaContenido})`,
        }}
      >
        {contenido}
      </div>
    </div>
  )
}
