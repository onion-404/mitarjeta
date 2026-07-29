"use client"

import * as React from "react"

interface ContadorAnimadoProps {
  valor: number
  duracionMs?: number
  prefijo?: string
  sufijo?: string
  className?: string
}

// Cuenta de 0 al valor final una sola vez, al entrar en viewport (no cada
// vez que se scrollea de un lado a otro). easeOutCubic — arranca rápido,
// se asienta suave, no es un tick lineal de reloj.
export function ContadorAnimado({
  valor,
  duracionMs = 1400,
  prefijo = "",
  sufijo = "",
  className,
}: ContadorAnimadoProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [mostrado, setMostrado] = React.useState(0)
  const yaAnimoRef = React.useRef(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Diferido: setState síncrono dentro de un efecto dispara renders en
      // cascada (regla react-hooks/set-state-in-effect).
      window.setTimeout(() => setMostrado(valor), 0)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || yaAnimoRef.current) return
        yaAnimoRef.current = true
        const inicio = performance.now()
        function tick(ahora: number) {
          const progreso = Math.min((ahora - inicio) / duracionMs, 1)
          const facilitado = 1 - Math.pow(1 - progreso, 3)
          setMostrado(Math.round(valor * facilitado))
          if (progreso < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [valor, duracionMs])

  return (
    <span ref={ref} className={className}>
      {prefijo}
      {mostrado}
      {sufijo}
    </span>
  )
}
