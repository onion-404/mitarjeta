"use client"

import * as React from "react"

function calcularRestante(fin: string) {
  const diferencia = new Date(fin).getTime() - Date.now()
  if (diferencia <= 0) return null

  const horas = Math.floor(diferencia / (1000 * 60 * 60))
  const minutos = Math.floor((diferencia / (1000 * 60)) % 60)
  const segundos = Math.floor((diferencia / 1000) % 60)
  return { horas, minutos, segundos }
}

function dosDigitos(valor: number) {
  return String(valor).padStart(2, "0")
}

export function PromoCountdown({ fin }: { fin: string }) {
  const [restante, setRestante] = React.useState(() => calcularRestante(fin))

  React.useEffect(() => {
    const intervalo = setInterval(() => setRestante(calcularRestante(fin)), 1000)
    return () => clearInterval(intervalo)
  }, [fin])

  if (!restante) return null

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1 font-mono text-xs font-semibold tabular-nums dark:bg-white/10">
      <span>{dosDigitos(restante.horas)}</span>:
      <span>{dosDigitos(restante.minutos)}</span>:
      <span>{dosDigitos(restante.segundos)}</span>
    </div>
  )
}
