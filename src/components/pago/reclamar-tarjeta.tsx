"use client"

import { ShieldCheck } from "lucide-react"
import { usePathname } from "next/navigation"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { reclamarTarjetaPendiente } from "@/lib/reclamo"
import { supabase } from "@/lib/supabase"

export function ReclamarTarjeta() {
  const pathname = usePathname()
  const [reclamada, setReclamada] = React.useState(false)
  const [listo, setListo] = React.useState(false)

  React.useEffect(() => {
    async function intentarReclamo(userId: string) {
      const resultado = await reclamarTarjetaPendiente(userId)
      setListo(true)
      if (resultado) setReclamada(true)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) intentarReclamo(data.session.user.id)
      else setListo(true)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) intentarReclamo(session.user.id)
      }
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  if (!listo) return null

  if (reclamada) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="size-4" /> Tu tarjeta quedó protegida en tu cuenta.
      </p>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
      <p className="text-center text-sm text-muted-foreground">
        Iniciá sesión para proteger el acceso de edición a tu tarjeta.
      </p>
      <AuthMethods redirectTo={pathname} />
    </div>
  )
}
