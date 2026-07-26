"use client"

import { Drawer } from "@base-ui/react/drawer"
import type { LucideIcon } from "lucide-react"
import { Menu as MenuIcon, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import { cn } from "@/lib/utils"

export interface PanelTab {
  href: string
  label: string
  icon: LucideIcon
}

interface PanelShellProps {
  titulo: string
  tabs: PanelTab[]
  children: React.ReactNode
}

// Mismo lenguaje visual que ya usa el resto del proyecto (panelClase de
// TarjetaForm, la lista de tarjetas de /editar, los popups de Menu/Dialog
// de header-global.tsx) — nada nuevo, solo reutilizado acá.
const navItemClase =
  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
const navItemActivaClase = "bg-foreground text-background"
const navItemInactivaClase = "text-muted-foreground hover:bg-muted hover:text-foreground"

function esRutaActiva(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavList({
  tabs,
  pathname,
  onNavigate,
}: {
  tabs: PanelTab[]
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1">
      {tabs.map((tab) => {
        const activa = esRutaActiva(pathname, tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={onNavigate}
            className={cn(navItemClase, activa ? navItemActivaClase : navItemInactivaClase)}
          >
            <tab.icon className="size-4 shrink-0" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function PanelShell({ titulo, tabs, children }: PanelShellProps) {
  const pathname = usePathname()
  const [drawerAbierto, setDrawerAbierto] = React.useState(false)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:px-10">
      {/* Sidebar: persistente en desktop */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-8 rounded-3xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50">
          <h1 className="px-2 pb-3 text-sm font-semibold text-foreground">{titulo}</h1>
          <NavList tabs={tabs} pathname={pathname} />
        </div>
      </aside>

      {/* Topbar con hamburguesa: solo mobile */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <h1 className="text-sm font-semibold text-foreground">{titulo}</h1>
        <button
          type="button"
          onClick={() => setDrawerAbierto(true)}
          aria-label="Abrir navegación"
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted"
        >
          <MenuIcon className="size-4" />
        </button>
      </div>

      <Drawer.Root open={drawerAbierto} onOpenChange={setDrawerAbierto} swipeDirection="left">
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-start">
            <Drawer.Popup className="h-full w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-background p-4 shadow-2xl transition-transform duration-300 ease-out [transform:translateX(var(--drawer-swipe-movement-x))] data-ending-style:[transform:translateX(-100%)] data-starting-style:[transform:translateX(-100%)]">
              <div className="mb-3 flex items-center justify-between px-2">
                <Drawer.Title className="text-sm font-semibold text-foreground">
                  {titulo}
                </Drawer.Title>
                <Drawer.Close
                  aria-label="Cerrar"
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </Drawer.Close>
              </div>
              <NavList tabs={tabs} pathname={pathname} onNavigate={() => setDrawerAbierto(false)} />
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Contenido: padding-top extra en mobile para no quedar debajo del topbar fijo */}
      <main className="min-w-0 flex-1 pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
