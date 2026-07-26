"use client"

import type { Session } from "@supabase/supabase-js"
import { Loader2, Plus } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { buttonVariants } from "@/components/ui/button"
import { FiltroTarjetas } from "@/components/panel/filtro-tarjetas"
import { getTarjetasDeUsuario } from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { TarjetaConPlan } from "@/lib/types"

// "Mis Tarjetas" — listado filtrable por tipo (sin selector de plan: un
// usuario individual tiene pocas tarjetas, no necesita ese nivel de
// filtro, a diferencia de /admin/tarjetas). Mismo FiltroTarjetas
// reutilizado con scope distinto.
export default function MiCuentaTarjetasPage() {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [tarjetas, setTarjetas] = React.useState<TarjetaConPlan[] | null>(null)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!session) return
    getTarjetasDeUsuario(session.user.id).then(setTarjetas)
  }, [session])

  if (session === undefined || tarjetas === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mis tarjetas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas las tarjetas creadas con esta cuenta.
          </p>
        </div>
        <Link href="/planes" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" /> Crear nueva tarjeta
        </Link>
      </div>

      <FiltroTarjetas tarjetas={tarjetas} />
    </div>
  )
}
