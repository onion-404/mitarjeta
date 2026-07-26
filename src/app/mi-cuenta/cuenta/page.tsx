"use client"

import type { Session } from "@supabase/supabase-js"
import { Loader2, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

// "Cuenta" — email + cerrar sesión, extraído de lo que antes vivía suelto
// en /mi-cuenta.
export default function MiCuentaCuentaPage() {
  const router = useRouter()
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (session === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-foreground">Cuenta</h1>

      <div className="mt-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <p className="text-xs text-muted-foreground">Email</p>
        <p className="mt-1 text-sm font-medium text-foreground">{session?.user.email}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleSignOut}
        className="mt-6"
      >
        <LogOut className="size-4" /> Cerrar sesión
      </Button>
    </div>
  )
}
