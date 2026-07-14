"use client"

import { Menu } from "@base-ui/react/menu"
import { Check, Copy, Share2 } from "lucide-react"
import * as React from "react"

import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"

interface CompartirTarjetaProps {
  slug: string
  titulo: string
  className?: string
}

const itemClase =
  "flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-muted"

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

export function CompartirTarjeta({ slug, titulo, className }: CompartirTarjetaProps) {
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
