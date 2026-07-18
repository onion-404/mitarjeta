"use client"

import type { Session } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { use } from "react"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { TarjetaForm } from "@/components/tarjeta/tarjeta-form"
import { getPlanPorSlug } from "@/lib/planes"
import { supabase } from "@/lib/supabase"
import type { PeriodicidadSuscripcion, Plan } from "@/lib/types"

interface CrearTarjetaPageProps {
  searchParams: Promise<{ plan?: string; ciclo?: string }>
}

// Sesión requerida ANTES de armar la tarjeta (ya no hay flujo de invitado: los
// 3 planes son de pago, no tiene sentido crear sin saber quién va a pagar).
// Mismo patrón de auth-gate que ya usan /editar y /editar/[id] (chequeo de
// sesión client-side + <AuthMethods> inline), no un redirect a /login — esa
// página está hardcodeada para el acceso admin.
export default function CrearTarjetaPage({ searchParams }: CrearTarjetaPageProps) {
  const router = useRouter()
  const { plan: planSlug, ciclo } = use(searchParams)
  const periodicidad: PeriodicidadSuscripcion = ciclo === "mensual" ? "mensual" : "anual"

  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [plan, setPlan] = React.useState<Plan | null | undefined>(undefined)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    async function resolverPlan() {
      if (!planSlug) {
        setPlan(null)
        router.replace("/planes")
        return
      }
      const data = await getPlanPorSlug(planSlug)
      if (!data) {
        setPlan(null)
        router.replace("/planes")
        return
      }
      setPlan(data)
    }
    resolverPlan()
  }, [planSlug, router])

  if (session === undefined || plan === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // plan === null: slug ausente o inválido, ya redirigiendo a /planes.
  if (!plan) return null

  if (session === null) {
    const redirectTo = `/crear?plan=${encodeURIComponent(plan.slug)}&ciclo=${periodicidad}`
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Iniciá sesión para continuar
        </h1>
        <p className="text-sm text-muted-foreground">
          Elegiste el plan <strong>{plan.nombre_display}</strong> (
          {periodicidad === "anual" ? "anual" : "mensual"}). Iniciá sesión para crear tu
          tarjeta y activarlo.
        </p>
        <AuthMethods redirectTo={redirectTo} />
      </div>
    )
  }

  return <TarjetaForm plan={plan} periodicidad={periodicidad} />
}
