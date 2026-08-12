import type { ReactNode } from "react"

import { CandadoPlan } from "@/components/tarjeta/candado-plan"
import { ALTO_REFERENCIA_DIVISOR, type DivisorBannerMeta, type FormaAvatarMeta } from "@/lib/personalizacion"
import { cn } from "@/lib/utils"

interface OpcionPersonalizacionProps {
  seleccionada: boolean
  bloqueada?: { plan: "connect" | "growth" } | null
  etiqueta: string
  onClick: () => void
  children: ReactNode
}

// Generaliza el botón de grilla que ya existía en TarjetaForm (border-2,
// rounded-xl, estado seleccionado con border-foreground) para reusarlo en
// la grilla de forma de avatar y la de divisor. El click SIEMPRE dispara
// onClick, esté bloqueada o no — bloqueada solo agrega el badge visual, la
// opción se puede seguir probando en vivo (el bloqueo real es al guardar,
// ver lib/personalizacion.ts).
export function OpcionPersonalizacion({
  seleccionada,
  bloqueada,
  etiqueta,
  onClick,
  children,
}: OpcionPersonalizacionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-xs transition-colors duration-200 ease-out",
        seleccionada
          ? "border-foreground bg-background"
          : "border-border bg-background/50 hover:bg-background"
      )}
    >
      {bloqueada && <CandadoPlan plan={bloqueada.plan} className="absolute -right-1.5 -top-1.5" />}
      {children}
      {etiqueta}
    </button>
  )
}

const TAMANO_SWATCH_FORMA = 24 // px

// Todas las 6 formas se ven como un ícono sólido (no hueco/con borde como
// las 2 originales circulo/suave) — un borde no compone bien con clip-path
// (el borde se pinta sobre la caja rectangular original y ese trazo
// también queda recortado, se ve roto en hexágono/blob/corazón/estrella).
// Un ícono sólido es consistente en las 6 opciones de la grilla.
export function SwatchForma({ forma }: { forma: FormaAvatarMeta }) {
  if (forma.claseCss) {
    return <span className={cn("size-6 bg-muted-foreground", forma.claseCss)} />
  }
  if (!forma.requiereWrapperEscala) {
    return (
      <span className="size-6 bg-muted-foreground" style={{ clipPath: forma.clipPath }} />
    )
  }
  // path(): autorado en una caja de 100x100, hace falta el wrapper con
  // scale para que se vea proporcionado igual en un swatch chico que en el
  // avatar real (verificado renderizado, ver lib/personalizacion.ts).
  const escala = TAMANO_SWATCH_FORMA / 100
  return (
    <span className="relative block size-6 overflow-visible">
      <span
        className="absolute left-0 top-0 size-[100px] origin-top-left bg-muted-foreground"
        style={{ clipPath: forma.clipPath, transform: `scale(${escala})` }}
      />
    </span>
  )
}

const ANCHO_SWATCH_DIVISOR = 56
const ALTO_SWATCH_DIVISOR = 40

export function SwatchDivisor({ divisor }: { divisor: DivisorBannerMeta }) {
  let capaSuperior: ReactNode
  if (divisor.clipPath === null) {
    capaSuperior = <span className="absolute inset-x-0 bottom-0 top-4 rounded-t-md bg-background" />
  } else {
    // X del clip-path ya es % (escala solo con el ancho real, sin reescalar
    // acá) — el alto de referencia (ALTO_REFERENCIA_DIVISOR, mismo que
    // -mt-14 en TarjetaCard) sí necesita comprimirse verticalmente al alto
    // chico del swatch, con scaleY solamente (nunca scale() uniforme: eso
    // volvería a achicar X, que ya viene correcto en %).
    const escalaY = ALTO_SWATCH_DIVISOR / ALTO_REFERENCIA_DIVISOR
    capaSuperior = (
      <span
        className="absolute inset-x-0 top-0 origin-top bg-background"
        style={{
          height: ALTO_REFERENCIA_DIVISOR,
          clipPath: divisor.clipPath,
          transform: `scaleY(${escalaY})`,
        }}
      />
    )
  }

  return (
    <span
      className="relative block overflow-hidden rounded-md border border-border"
      style={{ width: ANCHO_SWATCH_DIVISOR, height: ALTO_SWATCH_DIVISOR }}
    >
      <span className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-fuchsia-300" />
      {capaSuperior}
    </span>
  )
}
