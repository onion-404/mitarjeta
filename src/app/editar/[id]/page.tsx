"use client"

import type { Session } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { use } from "react"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { TarjetaForm } from "@/components/tarjeta/tarjeta-form"
import { getTarjetaPorId } from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { Tarjeta } from "@/lib/types"

interface EditarTarjetaPageProps {
  params: Promise<{ id: string }>
}

export default function EditarTarjetaPage({ params }: EditarTarjetaPageProps) {
  const { id } = use(params)
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [tarjeta, setTarjeta] = React.useState<Tarjeta | null | undefined>(undefined)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!session) return
    getTarjetaPorId(id).then(setTarjeta)
  }, [session, id])

  if (session === undefined || (session && tarjeta === undefined)) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session === null) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Iniciá sesión para editar esta tarjeta.
        </p>
        <AuthMethods redirectTo={`/editar/${id}`} />
      </div>
    )
  }

  if (!tarjeta || tarjeta.user_id !== session.user.id) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No encontramos esa tarjeta o no tenés permiso para editarla.
        </p>
        <Link href="/editar" className="text-sm underline underline-offset-2">
          Volver a mis tarjetas
        </Link>
      </div>
    )
  }

  return <TarjetaForm tarjeta={tarjeta} />
}
