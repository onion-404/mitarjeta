"use client"

import type { Session } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { HeaderGlobal } from "@/components/header-global"
import { PanelShell } from "@/components/panel/panel-shell"
import { ADMIN_TABS } from "@/components/panel/panel-tabs"
import { ADMIN_EMAIL } from "@/lib/admin"
import { supabase } from "@/lib/supabase"

// Auth-gate único para toda la sección /admin/* — antes cada página
// (dashboard, cobro-manual) repetía el mismo chequeo de ADMIN_EMAIL por su
// cuenta. El resto de las páginas admin ya no necesitan repetirlo: no se
// montan (children no se renderiza) hasta que esAdmin sea true acá.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  const esAdmin = session?.user.email === ADMIN_EMAIL

  React.useEffect(() => {
    if (session === undefined) return
    if (!esAdmin) router.replace("/")
  }, [session, esAdmin, router])

  if (session === undefined || !esAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <HeaderGlobal />
      <PanelShell titulo="Panel de administración" tabs={ADMIN_TABS}>
        {children}
      </PanelShell>
    </div>
  )
}
