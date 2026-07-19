"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { Logo } from "@/components/logo"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/admin/dashboard")
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/admin/dashboard")
    })
    return () => subscription.subscription.unsubscribe()
  }, [router])

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
      <Logo className="mx-auto" size="lg" href={null} />
      <h1 className="text-2xl font-semibold text-foreground">Iniciar sesión</h1>
      <p className="text-sm text-muted-foreground">Acceso administrativo.</p>
      <AuthMethods redirectTo="/admin/dashboard" />
    </div>
  )
}
