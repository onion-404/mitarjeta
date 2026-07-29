"use client"

import * as React from "react"

interface TarjetaTiltProps {
  children: React.ReactNode
  className?: string
}

// Envuelve el abanico completo en un elemento PROPIO que solo controla
// `transform` (perspective + rotateX/rotateY) vía JS — deliberadamente en
// una capa nueva, no en ninguno de los divs del abanico que ya usan
// translate/scale/rotate como propiedades independientes (ver comentario en
// page.tsx): si el tilt tocara esos mismos elementos, la animación pisaría
// esas propiedades. Acá no hay conflicto porque `transform` vive en ESTE
// wrapper, que no tiene ninguna otra utilidad de Tailwind compitiendo por
// esa misma propiedad.
export function TarjetaTilt({ children, className }: TarjetaTiltProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [transform, setTransform] = React.useState("perspective(1200px) rotateX(0deg) rotateY(0deg)")
  const [transicion, setTransicion] = React.useState("transform 0.5s cubic-bezier(0.16,1,0.3,1)")
  const prefiereMenosMovimiento = React.useRef(false)

  React.useEffect(() => {
    prefiereMenosMovimiento.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (prefiereMenosMovimiento.current || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    setTransicion("transform 0.1s ease-out")
    setTransform(`perspective(1200px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg)`)
  }

  function handleMouseLeave() {
    setTransicion("transform 0.6s cubic-bezier(0.16,1,0.3,1)")
    setTransform("perspective(1200px) rotateX(0deg) rotateY(0deg)")
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, transition: transicion, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </div>
  )
}
