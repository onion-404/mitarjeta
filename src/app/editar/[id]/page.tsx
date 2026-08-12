"use client"

import type { Session } from "@supabase/supabase-js"
import Link from "next/link"
import { use } from "react"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { HeaderGlobal } from "@/components/header-global"
import { TarjetaForm } from "@/components/tarjeta/tarjeta-form"
import { TarjetaSkeleton } from "@/components/tarjeta/tarjeta-skeleton"
import { getPlanPorId } from "@/lib/planes"
import { getSuscripcionPendientePorTarjeta, getTarjetaPorId } from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { Plan, PeriodicidadSuscripcion, Tarjeta } from "@/lib/types"

interface EditarTarjetaPageProps {
  params: Promise<{ id: string }>
}

export default function EditarTarjetaPage({ params }: EditarTarjetaPageProps) {
  const { id } = use(params)
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [tarjeta, setTarjeta] = React.useState<Tarjeta | null | undefined>(undefined)
  // Solo se resuelve si la tarjeta ya existe pero sin plan activo (canceló o
  // abandonó el pago en Stripe) — recupera qué plan intentaba comprar para
  // poder ofrecerle de nuevo la sección "Tu plan" en el editor.
  const [planPendiente, setPlanPendiente] = React.useState<{
    plan: Plan
    periodicidad: PeriodicidadSuscripcion
  } | null>(null)
  // Plan REAL de la tarjeta (distinto de planPendiente, que es sobre una
  // suscripción abandonada/cancelada) — necesario para el gating por plan
  // de la personalización avanzada (formas exóticas, divisores, modo
  // avanzado, glassmorfismo). Sin plan_id (nunca pagó), queda null y el
  // gating cae fail-closed (igual que el resto del gating por plan del
  // proyecto).
  const [planActivo, setPlanActivo] = React.useState<Plan | null>(null)

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

  React.useEffect(() => {
    if (!tarjeta || tarjeta.plan_id) return
    getSuscripcionPendientePorTarjeta(tarjeta.id).then(async (suscripcion) => {
      if (!suscripcion) return
      const plan = await getPlanPorId(suscripcion.plan_id)
      if (plan) setPlanPendiente({ plan, periodicidad: suscripcion.periodicidad })
    })
  }, [tarjeta])

  React.useEffect(() => {
    if (!tarjeta?.plan_id) return
    getPlanPorId(tarjeta.plan_id).then(setPlanActivo)
  }, [tarjeta?.plan_id])

  let contenido: React.ReactNode
  if (session === undefined || (session && tarjeta === undefined)) {
    contenido = (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <TarjetaSkeleton />
      </div>
    )
  } else if (session === null) {
    contenido = (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión para editar esta tarjeta.
        </p>
        <AuthMethods redirectTo={`/editar/${id}`} />
      </div>
    )
  } else if (!tarjeta || tarjeta.user_id !== session.user.id) {
    contenido = (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No encontramos esa tarjeta o no tienes permiso para editarla.
        </p>
        <Link href="/editar" className="text-sm underline underline-offset-2">
          Volver a mis tarjetas
        </Link>
      </div>
    )
  } else {
    contenido = (
      <TarjetaForm
        tarjeta={tarjeta}
        plan={planPendiente?.plan}
        periodicidad={planPendiente?.periodicidad}
        planActivo={planActivo}
      />
    )
  }

  return (
    <>
      <HeaderGlobal ocultarLoginSinSesion={session === null} />
      {contenido}
    </>
  )
}
