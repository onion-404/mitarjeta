"use client"

import type { Session } from "@supabase/supabase-js"
import { CreditCard, Layers, Loader2, Pencil, Plus } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { buttonVariants } from "@/components/ui/button"
import { getTarjetasDeUsuario, nombrePrincipalDeTarjeta } from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { TarjetaConPlan } from "@/lib/types"
import { cn } from "@/lib/utils"

// "Resumen" — antes /mi-cuenta era una sola pantalla con esto mismo (saludo
// + listado + crear + logout); ahora es solo el vistazo rápido, el resto se
// movió a sus tabs propios (Mis Tarjetas, Estadísticas, Suscripción y Pago,
// Cuenta) dentro del mismo PanelShell.
export default function MiCuentaPage() {
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

  const conPlan = tarjetas.filter((t) => t.plan_id).length

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Resumen</h1>
        <p className="mt-1 text-sm text-muted-foreground">{session?.user.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 opacity-20 blur-2xl"
          />
          <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
            <Layers className="size-4" />
          </span>
          <p className="relative mt-3 text-2xl font-semibold text-foreground">
            {tarjetas.length}
          </p>
          <p className="relative text-xs text-muted-foreground">Tarjetas</p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-20 blur-2xl"
          />
          <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <CreditCard className="size-4" />
          </span>
          <p className="relative mt-3 text-2xl font-semibold text-foreground">{conPlan}</p>
          <p className="relative text-xs text-muted-foreground">Con plan activo</p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Tus tarjetas</h2>
          <Link href="/planes" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" /> Crear nueva tarjeta
          </Link>
        </div>

        {tarjetas.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Todavía no tienes ninguna tarjeta creada con esta cuenta.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            {tarjetas.map((tarjeta) => (
              <Link
                key={tarjeta.id}
                href={`/editar/${tarjeta.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur transition-colors hover:bg-muted dark:bg-zinc-900/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {nombrePrincipalDeTarjeta(tarjeta)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">/{tarjeta.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      tarjeta.planes
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    )}
                  >
                    {tarjeta.planes?.nombre_display ?? "Sin plan"}
                  </span>
                  <Pencil className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
