import Link from "next/link"

import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  /** Tamaño del texto (controla todo el bloque, incluido el triángulo). */
  size?: "sm" | "md" | "lg"
  /** Ruta a la que enlaza el logo. `null` lo deja como texto sin link. */
  href?: string | null
  /** true = fondo detrás del logo oscuro (ej. footer de una tarjeta con
   *  tema oscuro o imagen de fondo) — fuerza triángulo y wordmark a blanco
   *  en vez de los tokens de tema (`text-primary`/`text-foreground`, que
   *  siguen el modo claro/oscuro del SITIO, no el de la tarjeta que se está
   *  mostrando). Un ternario en vez de apilar clases: dos utilidades para
   *  la misma propiedad de color no tienen un orden de "gana la última"
   *  confiable en Tailwind. */
  oscuro?: boolean
}

const TAMANOS = {
  sm: "text-base gap-1",
  md: "text-xl gap-1.5",
  lg: "text-3xl gap-2",
}

export function Logo({ className, size = "md", href = "/", oscuro = false }: LogoProps) {
  const contenido = (
    <span className={cn("inline-flex items-center", TAMANOS[size], className)}>
      <span aria-hidden className={oscuro ? "text-white" : "text-primary"}>
        ▲
      </span>
      <span
        className={cn(
          "font-[family-name:var(--font-logo)] font-bold",
          oscuro ? "text-white" : "text-foreground"
        )}
      >
        Linkard
      </span>
    </span>
  )

  if (!href) return contenido

  return (
    <Link href={href} aria-label="Linkard — ir al inicio" className="inline-flex">
      {contenido}
    </Link>
  )
}
