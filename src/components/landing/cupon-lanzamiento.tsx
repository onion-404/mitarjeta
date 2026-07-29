"use client"

import { Check, Sparkles, Ticket } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { ContadorAnimado } from "@/components/landing/contador-animado"
import { getCuponUsosRestantes } from "@/lib/cupones"
import { cn } from "@/lib/utils"

interface CuponLanzamientoProps {
  codigo: string
  porcentaje: number
}

// Contador real (fn_cupon_usos_restantes vía RPC pública, ver CLAUDE.md) —
// null significa "sin límite de usos" o "el código ya no existe", en
// cualquiera de los dos casos no hay un número real que mostrar, así que el
// copy cae a una versión sin cifra en vez de mentir con un número inventado.
export function CuponLanzamiento({ codigo, porcentaje }: CuponLanzamientoProps) {
  const router = useRouter()
  const [restantes, setRestantes] = React.useState<number | null | undefined>(undefined)
  const [guardado, setGuardado] = React.useState(false)

  React.useEffect(() => {
    getCuponUsosRestantes(codigo).then(setRestantes)
  }, [codigo])

  function handleObtener() {
    setGuardado(true)
    // El código viaja en la URL (mismo mecanismo ya usado para plan/ciclo a
    // través de /planes → /crear → redirectTo de OAuth) — /planes es el
    // siguiente paso real del embudo, no un salto directo a /crear sin
    // elegir plan.
    window.setTimeout(() => {
      router.push(`/planes?cupon=${encodeURIComponent(codigo)}`)
    }, 900)
  }

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent p-6 text-center backdrop-blur-xl sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
          <Ticket className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">
            {restantes === undefined ? (
              <span className="inline-block h-4 w-40 animate-pulse rounded bg-white/20" />
            ) : restantes === null ? (
              <>Código {codigo}: {porcentaje}% de descuento de lanzamiento</>
            ) : (
              <>
                Quedan <ContadorAnimado valor={restantes} className="font-[family-name:var(--font-geist-mono)]" />{" "}
                cupones con {porcentaje}% de descuento
              </>
            )}
          </p>
          <p className="text-xs text-white/60">Código {codigo} · válido al crear tu tarjeta</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleObtener}
        disabled={guardado}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200 ease-out",
          guardado
            ? "bg-emerald-500 text-white"
            : "bg-white text-violet-700 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
        )}
      >
        {guardado ? (
          <>
            <Check className="size-4" /> ¡Cupón guardado!
          </>
        ) : (
          <>
            <Sparkles className="size-4" /> Obtener mi descuento
          </>
        )}
      </button>

      {guardado && (
        <div
          role="status"
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white shadow-lg"
        >
          Se aplicará automáticamente al pagar
        </div>
      )}
    </div>
  )
}
