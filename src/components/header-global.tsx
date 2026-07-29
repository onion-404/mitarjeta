"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Menu } from "@base-ui/react/menu"
import type { Session } from "@supabase/supabase-js"
import { CircleUserRound, LogOut, User, X } from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { Logo } from "@/components/logo"
import { buttonVariants } from "@/components/ui/button"
import { getTarjetasDeUsuario, nombrePrincipalDeTarjeta } from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { Tarjeta } from "@/lib/types"
import { cn } from "@/lib/utils"

interface HeaderGlobalProps {
  /** true mientras la propia página ya muestra su gate de auth inline (ej.
   *  /crear, /editar/[id], /mi-cuenta con session === null) — evita un
   *  segundo control de "Iniciar sesión" redundante acá al lado del que ya
   *  muestra la página. */
  ocultarLoginSinSesion?: boolean
  /** "flotante" = píldora sticky con blur, exclusiva del home premium
   *  (mockup del cliente). Default preserva el header de siempre en el
   *  resto del sitio (editor, panel, /planes, etc.) — cero cambio ahí. */
  variant?: "default" | "flotante"
  /** Links de marketing (ej. "Precios", "Cómo funciona") — solo tiene
   *  sentido junto a variant="flotante", el resto de las páginas no lo pasa. */
  nav?: { etiqueta: string; href: string }[]
}

function iniciales(nombre?: string) {
  if (!nombre?.trim()) return null
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("")
}

// Las URL de Cloudinary son http(s); una preview local sin guardar (blob:)
// no existe en un servidor al que next/image pueda pedirla — mismo chequeo
// que ya usa tarjeta-card.tsx para el avatar de la tarjeta.
function esUrlOptimizable(url: string) {
  return url.startsWith("http://") || url.startsWith("https://")
}

const menuItemClase =
  "flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-muted"

export function HeaderGlobal({
  ocultarLoginSinSesion = false,
  variant = "default",
  nav,
}: HeaderGlobalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [tarjetas, setTarjetas] = React.useState<Tarjeta[] | null>(null)
  const [dialogAbierto, setDialogAbierto] = React.useState(false)

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

  // La tarjeta más reciente (getTarjetasDeUsuario ya ordena por created_at
  // desc) define el avatar/nombre — si el usuario tiene varias, siempre la
  // última creada, según lo pedido.
  const tarjetaReciente = tarjetas?.[0]
  const avatarUrl = tarjetaReciente?.identidad_visual.avatarUrl
  const nombre = tarjetaReciente ? nombrePrincipalDeTarjeta(tarjetaReciente) : session?.user.email
  const inicialesNombre = iniciales(nombre)

  return (
    <header
      className={
        variant === "flotante"
          ? // El Logo lee --primary/--foreground (tokens de tema) para el
            // triángulo y el wordmark — en vez de pelear especificidad con
            // un selector descendiente, se redefinen esos 2 tokens acá
            // mismo (arbitrary property de Tailwind), así cualquier
            // descendiente que los use hereda el blanco automáticamente.
            "fixed inset-x-0 top-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-6 rounded-full border border-white/10 bg-black/40 px-5 py-2.5 text-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl [--border:rgba(255,255,255,0.2)] [--foreground:#ffffff] [--muted:rgba(255,255,255,0.15)] [--primary:#ffffff]"
          : "relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6"
      }
    >
      <Logo />

      {variant === "flotante" && nav && nav.length > 0 && (
        <nav className="hidden items-center gap-5 text-sm font-medium text-white/70 sm:flex">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-white">
              {item.etiqueta}
            </a>
          ))}
        </nav>
      )}

      {variant === "flotante" && <div className="flex-1" />}

      {session === null && !ocultarLoginSinSesion && (
        <Dialog.Root open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <Dialog.Trigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              // buttonVariants "outline" es bg-background/sin color de texto
              // propio — en variant="flotante" bg-background sigue
              // resolviendo a blanco (no se sobreescribe ese token, a
              // diferencia de --foreground/--primary/--muted/--border más
              // arriba) mientras el texto hereda blanco del header: texto
              // blanco sobre fondo blanco, invisible. Bug real encontrado
              // renderizado antes de dar esto por terminado.
              variant === "flotante" && "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            )}
          >
            Iniciar sesión
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
            <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-6 shadow-2xl transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <Dialog.Close
                aria-label="Cerrar"
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </Dialog.Close>
              <Dialog.Title className="text-lg font-semibold text-foreground">
                Iniciá sesión
              </Dialog.Title>
              <Dialog.Description className="mt-1 mb-5 text-sm text-muted-foreground">
                Para crear o editar tu tarjeta digital.
              </Dialog.Description>
              <AuthMethods redirectTo={pathname} />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {session && (
        <Menu.Root>
          <Menu.Trigger
            aria-label="Cuenta"
            className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold text-foreground outline-none transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                sizes="36px"
                unoptimized={!esUrlOptimizable(avatarUrl)}
                className="object-cover"
              />
            ) : inicialesNombre ? (
              inicialesNombre
            ) : (
              <CircleUserRound className="size-5 text-muted-foreground" />
            )}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={8} className="outline-none">
              <Menu.Popup className="min-w-44 rounded-2xl border border-border bg-background p-1.5 shadow-2xl outline-none transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                <Menu.Item onClick={() => router.push("/mi-cuenta")} className={menuItemClase}>
                  <User className="size-4" /> Mi Cuenta
                </Menu.Item>
                <Menu.Separator className="my-1 h-px bg-border" />
                <Menu.Item onClick={handleSignOut} className={menuItemClase}>
                  <LogOut className="size-4" /> Cerrar sesión
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
    </header>
  )
}
