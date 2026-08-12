"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Menu } from "@base-ui/react/menu"
import { Check, Copy, IdCard, QrCode, Share2, X } from "lucide-react"
import * as React from "react"

import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"
import { TarjetaQr } from "@/components/tarjeta/tarjeta-qr"
import { descargarVCard } from "@/lib/exportar-tarjeta"
import type { DatosContacto } from "@/lib/types"

interface AccionesTarjetaProps {
  slug: string
  titulo: string
  datosContacto: DatosContacto
  /** Override de posicionamiento del botón — default `fixed` (viewport),
   *  igual que compartir-tarjeta.tsx/tarjeta-qr.tsx de siempre. Siempre
   *  `fixed` a propósito (nunca `sticky`): el botón debe mantenerse en el
   *  mismo lugar de la pantalla sin importar el scroll, decisión explícita
   *  del cliente aunque eso implique que puede solaparse visualmente con
   *  el footer al llegar al final — es un solo círculo chico en la
   *  esquina, no dos botones anchos como antes. */
  className?: string
}

const itemClase =
  "flex w-full cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none select-none data-highlighted:bg-muted disabled:pointer-events-none disabled:opacity-50"

function suscribirseSinCambios() {
  return () => {}
}

function detectarShareNativo() {
  return typeof navigator !== "undefined" && "share" in navigator
}

function detectarShareNativoServidor() {
  return false
}

export function AccionesTarjeta({ slug, titulo, datosContacto, className }: AccionesTarjetaProps) {
  const [copiado, setCopiado] = React.useState(false)
  const [qrAbierto, setQrAbierto] = React.useState(false)
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

  const url = obtenerUrl()
  const textoCompartido = encodeURIComponent(`${titulo} · ${url}`)
  const urlCodificada = encodeURIComponent(url)

  return (
    <>
      <Menu.Root>
        {/* .fab-glow (globals.css): anillo giratorio sutil alrededor del
            borde, un "destello" angosto en vez de un halo parejo —
            respeta prefers-reduced-motion. */}
        <div className={className ?? "fixed right-6 bottom-6 z-40"}>
          <div className="fab-glow relative">
            <Menu.Trigger
              aria-label="Compartir y acciones"
              className="relative flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition-transform hover:scale-105 data-popup-open:scale-105"
            >
              <Share2 className="size-6" />
            </Menu.Trigger>
          </div>
        </div>
        <Menu.Portal>
          <Menu.Positioner side="top" align="end" sideOffset={12} className="z-50 outline-none">
            <Menu.Popup className="min-w-56 rounded-2xl border border-border bg-background p-1.5 shadow-2xl outline-none transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              {tieneShareNativo && (
                <Menu.Item onClick={compartirNativo} className={itemClase}>
                  <Share2 className="size-4" /> Compartir
                </Menu.Item>
              )}
              <Menu.Item onClick={copiarEnlace} closeOnClick={false} className={itemClase}>
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiado ? "¡Copiado!" : "Copiar enlace"}
              </Menu.Item>
              <Menu.LinkItem
                href={`https://wa.me/?text=${textoCompartido}`}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClase}
              >
                <SOCIAL_ICONS.whatsapp className="size-4" /> WhatsApp
              </Menu.LinkItem>
              <Menu.LinkItem
                href={`https://www.facebook.com/sharer/sharer.php?u=${urlCodificada}`}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClase}
              >
                <SOCIAL_ICONS.facebook className="size-4" /> Facebook
              </Menu.LinkItem>
              <Menu.LinkItem
                href={`https://twitter.com/intent/tweet?text=${textoCompartido}`}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClase}
              >
                <SOCIAL_ICONS.x className="size-4" /> X / Twitter
              </Menu.LinkItem>
              <Menu.Separator className="my-1 h-px bg-border" />
              <Menu.Item onClick={() => setQrAbierto(true)} className={itemClase}>
                <QrCode className="size-4" /> Código QR
              </Menu.Item>
              <Menu.Item onClick={() => descargarVCard(datosContacto)} className={itemClase}>
                <IdCard className="size-4" /> Guardar contacto
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog.Root open={qrAbierto} onOpenChange={setQrAbierto}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-6 text-center shadow-2xl transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Dialog.Close
              aria-label="Cerrar"
              className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </Dialog.Close>
            <Dialog.Title className="sr-only">Escaneá para ver la tarjeta</Dialog.Title>
            <Dialog.Description className="sr-only">
              Apunta la cámara del celular al código.
            </Dialog.Description>
            <TarjetaQr slug={slug} variant="inline" />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
