import type { SVGProps } from "react"

// Sello de verificación (2026-09-04, versión sólida — pedido explícito: "el
// relleno azul típico de todos los verificados", no el outline de lucide
// que se usaba antes). Misma silueta ondulada de 8 puntas que ya trae
// lucide-react (`BadgeCheck`, ISC license) — se reusa el path EXACTO tal
// cual (no uno adivinado a mano) pero pintado sólido: sello azul +
// checkmark blanco encima, en vez de un solo trazo monocromo. Componente
// propio (no un ícono de lucide) porque lucide no expone una variante
// "filled" de este ícono.
export function VerificadoBadge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-label="Cuenta verificada" {...props}>
      <path
        fill="#3b82f6"
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
      />
      <path
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 12 2 2 4-4"
      />
    </svg>
  )
}
