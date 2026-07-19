import Link from "next/link"

import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  /** Tamaño del texto (controla todo el bloque, incluido el triángulo). */
  size?: "sm" | "md" | "lg"
  /** Ruta a la que enlaza el logo. `null` lo deja como texto sin link. */
  href?: string | null
}

const TAMANOS = {
  sm: "text-base gap-1",
  md: "text-xl gap-1.5",
  lg: "text-3xl gap-2",
}

export function Logo({ className, size = "md", href = "/" }: LogoProps) {
  const contenido = (
    <span className={cn("inline-flex items-center", TAMANOS[size], className)}>
      <span aria-hidden className="text-primary">
        ▲
      </span>
      <span className="font-[family-name:var(--font-logo)] font-bold text-foreground">
        Linkard.
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
