"use client"

import type { Session } from "@supabase/supabase-js"
import { Loader2, LogOut, Pencil, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { HeaderGlobal } from "@/components/header-global"
import { Button, buttonVariants } from "@/components/ui/button"
import { getTarjetasDeUsuario, nombrePrincipalDeTarjeta } from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { Tarjeta } from "@/lib/types"

// Mismo patrón de auth-gate que /editar/[id] y /editar (chequeo de sesión
// client-side + <AuthMethods> inline) — no un redirect a /login, esa página
// está hardcodeada al acceso admin (redirectTo="/admin/dashboard").
export default function MiCuentaPage() {
  const router = useRouter()
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
    let cancelado = false
    async function cargar() {
      if (!session) {
        if (!cancelado) setTarjetas(null)
        return
      }
      const data = await getTarjetasDeUsuario(session.user.id)
      if (!cancelado) setTarjetas(data)
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [session])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex flex-1 flex-col">
      <HeaderGlobal ocultarLoginSinSesion={session === null} />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Mi cuenta</h1>

        {session === undefined && (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}

        {session === null && (
          <div className="w-full max-w-sm text-left">
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Iniciá sesión para ver tu cuenta.
            </p>
            <AuthMethods redirectTo="/mi-cuenta" />
          </div>
        )}

        {session && (
          <>
            <p className="-mt-2 text-sm text-muted-foreground">{session.user.email}</p>

            {tarjetas === null ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : tarjetas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no tenés ninguna tarjeta creada con esta cuenta.
              </p>
            ) : (
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

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/planes" className={buttonVariants({ size: "lg" })}>
                <Plus className="size-4" /> Crear nueva tarjeta
              </Link>
              <Button type="button" variant="outline" size="lg" onClick={handleSignOut}>
                <LogOut className="size-4" /> Cerrar sesión
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
