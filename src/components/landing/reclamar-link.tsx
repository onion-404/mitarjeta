"use client"

import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { cn } from "@/lib/utils"

// "Interactive Claim Input" del hero (patrón GoDaddy Airo): la persona
// escribe su nombre o el de su negocio y lo "reclama" — el texto viaja como
// ?nombre=... a través de /planes → /crear (mismo criterio de reenvío por
// query param que ya usa el cupón de lanzamiento, ver CLAUDE.md) y
// TarjetaForm lo pre-llena como Título al llegar. No arma el slug final acá
// (elegir plan sigue siendo el primer paso obligatorio del embudo real) —
// el valor de este input es de enganche/conversión, no de reserva de
// disponibilidad.
export function ReclamarLink() {
  const router = useRouter()
  const [valor, setValor] = React.useState("")

  function reclamar(event: React.FormEvent) {
    event.preventDefault()
    const nombre = valor.trim()
    router.push(nombre ? `/planes?nombre=${encodeURIComponent(nombre)}` : "/planes")
  }

  return (
    <form
      onSubmit={reclamar}
      className="mt-8 flex w-full max-w-md flex-col gap-1 rounded-2xl border border-white/15 bg-white/5 p-1.5 backdrop-blur sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-1 rounded-xl bg-black/20 px-3 py-2 sm:py-0">
        <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-sm text-white/40">
          linkard.mx/
        </span>
        <input
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder="tu-nombre-o-negocio"
          maxLength={60}
          className="w-full min-w-0 bg-transparent py-1.5 font-[family-name:var(--font-geist-mono)] text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className={cn(
          "flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white",
          "transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(139,92,246,0.5)] active:scale-[0.98]"
        )}
      >
        Reclamar mi Link <ArrowRight className="size-4" />
      </button>
    </form>
  )
}
