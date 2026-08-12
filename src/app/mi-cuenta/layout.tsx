"use client"

import type { Session } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"
import * as React from "react"

import { getAfiliadoPropio } from "@/lib/afiliados"
import { AuthMethods } from "@/components/auth/auth-methods"
import { HeaderGlobal } from "@/components/header-global"
import { PanelShell } from "@/components/panel/panel-shell"
import { GANANCIAS_TAB, MI_CUENTA_TABS } from "@/components/panel/panel-tabs"
import { supabase } from "@/lib/supabase"

// Auth-gate único para toda la sección /mi-cuenta/* — antes vivía inline en
// mi-cuenta/page.tsx. Sin sesión, muestra <AuthMethods> inline (mismo patrón
// que /crear) en vez de redirigir a /login (esa página está hardcodeada al
// acceso admin). El PanelShell recién se monta con sesión confirmada.
export default function MiCuentaLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [esAfiliado, setEsAfiliado] = React.useState(false)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  // Pestaña "Ganancias" condicional: solo si el email de la sesión matchea
  // un afiliado activo (RLS de afiliados_select_propio ya escopea esto,
  // ver CLAUDE.md). No es el único gate — /mi-cuenta/ganancias revalida
  // por su cuenta, fail-closed, para alguien que navegue directo a la URL.
  React.useEffect(() => {
    if (!session) return
    getAfiliadoPropio().then((afiliado) => setEsAfiliado(Boolean(afiliado)))
  }, [session])

  const tabs = esAfiliado ? [...MI_CUENTA_TABS, GANANCIAS_TAB] : MI_CUENTA_TABS

  return (
    <div className="flex flex-1 flex-col">
      <HeaderGlobal ocultarLoginSinSesion={session === null} />

      {session === undefined && (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {session === null && (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Mi cuenta</h1>
          <p className="text-sm text-muted-foreground">Inicia sesión para ver tu cuenta.</p>
          <div className="w-full text-left">
            <AuthMethods redirectTo="/mi-cuenta" />
          </div>
        </div>
      )}

      {session && (
        <PanelShell titulo="Mi cuenta" tabs={tabs}>
          {children}
        </PanelShell>
      )}
    </div>
  )
}
