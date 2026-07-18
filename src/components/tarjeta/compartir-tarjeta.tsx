"use client"

import { Menu } from "@base-ui/react/menu"
import { Check, Copy, Share2 } from "lucide-react"
import * as React from "react"

import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"

interface CompartirTarjetaProps {
  slug: string
  titulo: string
  className?: string
  /** "flotante" (default): botón fijo con su propio Menu, como hasta ahora.
   *  "inline": lista de opciones de compartir sin botón/menú propio — para
   *  embeber dentro de otro contenedor (ej. un Drawer). */
  variant?: "flotante" | "inline"
}

const itemClase =
  "flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-muted"

const itemClaseInline =
  "flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground hover:bg-muted"

const botonClase =
  "fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-foreground px-5 py-3.5 text-sm font-semibold text-background shadow-xl transition-transform hover:scale-105 data-popup-open:scale-105"

function suscribirseSinCambios() {
  return () => {}
}

function detectarShareNativo() {
  return typeof navigator !== "undefined" && "share" in navigator
}

function detectarShareNativoServidor() {
  return false
}

function ContenidoCompartirInline({ slug, titulo }: { slug: string; titulo: string }) {
  const [copiado, setCopiado] = React.useState(false)
  const url = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : ""
  const textoCompartido = encodeURIComponent(`${titulo} · ${url}`)
  const urlCodificada = encodeURIComponent(url)

  async function copiarEnlace() {
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={copiarEnlace} className={itemClaseInline}>
        {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copiado ? "¡Copiado!" : "Copiar enlace"}
      </button>
      <a
        href={`https://wa.me/?text=${textoCompartido}`}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClaseInline}
      >
        <SOCIAL_ICONS.whatsapp className="size-4" /> WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${urlCodificada}`}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClaseInline}
      >
        <SOCIAL_ICONS.facebook className="size-4" /> Facebook
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${textoCompartido}`}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClaseInline}
      >
        <SOCIAL_ICONS.x className="size-4" /> X / Twitter
      </a>
    </div>
  )
}

export function CompartirTarjeta({ slug, titulo, className, variant = "flotante" }: CompartirTarjetaProps) {
  const [copiado, setCopiado] = React.useState(false)
  const tieneShareNativo = React.useSyncExternalStore(
    suscribirseSinCambios,
    detectarShareNativo,
    detectarShareNativoServidor
  )

  function obtenerUrl() {
    return typeof window !== "undefined" ? `${window.location.origin}/${slug}` : ""
  }

  async function compartirNativo() {
    try {
      await navigator.share({ title: titulo, url: obtenerUrl() })
    } catch {
      // el usuario canceló el share nativo
    }
  }

  async function copiarEnlace() {
    await navigator.clipboard.writeText(obtenerUrl())
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (variant === "inline") return <ContenidoCompartirInline slug={slug} titulo={titulo} />

  if (tieneShareNativo) {
    return (
      <button
        type="button"
        onClick={compartirNativo}
        className={className ?? botonClase}
      >
        <Share2 className="size-4" /> Compartir tarjeta
      </button>
    )
  }

  const url = obtenerUrl()
  const textoCompartido = encodeURIComponent(`${titulo} · ${url}`)
  const urlCodificada = encodeURIComponent(url)

  return (
    <Menu.Root>
      <Menu.Trigger className={className ?? botonClase}>
        <Share2 className="size-4" /> Compartir tarjeta
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={10} className="outline-none">
          <Menu.Popup className="min-w-52 rounded-2xl border border-border bg-background p-1.5 shadow-2xl outline-none transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.Item onClick={copiarEnlace} closeOnClick={false} className={itemClase}>
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "¡Copiado!" : "Copiar enlace"}
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.LinkItem
              href={`https://wa.me/?text=${textoCompartido}`}
              target="_blank"
              rel="noopener noreferrer"
              closeOnClick
              className={itemClase}
            >
              <SOCIAL_ICONS.whatsapp className="size-4" /> WhatsApp
            </Menu.LinkItem>
            <Menu.LinkItem
              href={`https://www.facebook.com/sharer/sharer.php?u=${urlCodificada}`}
              target="_blank"
              rel="noopener noreferrer"
              closeOnClick
              className={itemClase}
            >
              <SOCIAL_ICONS.facebook className="size-4" /> Facebook
            </Menu.LinkItem>
            <Menu.LinkItem
              href={`https://twitter.com/intent/tweet?text=${textoCompartido}`}
              target="_blank"
              rel="noopener noreferrer"
              closeOnClick
              className={itemClase}
            >
              <SOCIAL_ICONS.x className="size-4" /> X / Twitter
            </Menu.LinkItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
