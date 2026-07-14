"use client"

import type { Session } from "@supabase/supabase-js"
import { Loader2, Pencil } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { buttonVariants } from "@/components/ui/button"
import { getTarjetasDeUsuario, nombrePrincipalDeTarjeta } from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { Tarjeta } from "@/lib/types"

export default function EditarTarjetasPage() {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [tarjetas, setTarjetas] = React.useState<Tarjeta[] | null>(null)

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

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Editar mi tarjeta
      </h1>

      {session === undefined && (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      )}

      {session === null && (
        <div className="w-full max-w-sm text-left">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Iniciá sesión con la cuenta que usaste al crear tu tarjeta.
          </p>
          <AuthMethods redirectTo="/editar" />
        </div>
      )}

      {session && tarjetas === null && (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      )}

      {session && tarjetas && tarjetas.length === 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Todavía no tenés ninguna tarjeta creada con esta cuenta.
          </p>
          <Link href="/crear" className={buttonVariants({ size: "lg" })}>
            Crear mi tarjeta
          </Link>
        </>
      )}

      {session && tarjetas && tarjetas.length > 0 && (
        <div className="flex w-full flex-col gap-2.5">
          {tarjetas.map((tarjeta) => (
            <Link
              key={tarjeta.id}
              href={`/editar/${tarjeta.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur transition-colors hover:bg-muted dark:bg-zinc-900/50"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {nombrePrincipalDeTarjeta(tarjeta)}
                </p>
                <p className="text-xs text-muted-foreground">/{tarjeta.slug}</p>
              </div>
              <Pencil className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
