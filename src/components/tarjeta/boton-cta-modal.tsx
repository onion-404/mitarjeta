"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Check, Copy, ExternalLink, MoreVertical, Share2, X } from "lucide-react"
import * as React from "react"

import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"
import { obtenerBotonIcono, obtenerBotonTextura } from "@/lib/boton-cta"
import type { BotonCta } from "@/lib/types"

interface BotonCtaModalProps {
  boton: BotonCta
  /** Estilo ya resuelto (color de fondo/texto/borde) del CTA real en
   *  TarjetaCard — se reusa tal cual para que la vista previa del modal se
   *  vea idéntica al botón de la tarjeta, sin recalcular contraste acá. */
  estiloCta?: React.CSSProperties
}

function suscribirseSinCambios() {
  return () => {}
}

function detectarShareNativo() {
  return typeof navigator !== "undefined" && "share" in navigator
}

function detectarShareNativoServidor() {
  return false
}

/** Contenido del botón (ícono/imagen a la izquierda + título/subtítulo) —
 *  el mismo markup se usa tanto en el CTA real de la tarjeta como acá
 *  adentro del modal, para que la "vista previa" sea 1:1. */
export function ContenidoBotonCta({ boton }: { boton: BotonCta }) {
  const iconoMeta = boton.iconoTipo === "icono" ? obtenerBotonIcono(boton.iconoId) : undefined
  const Icono = iconoMeta?.Icono

  return (
    <>
      {boton.iconoTipo === "imagen" && boton.imagenUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- ícono chico, puede ser vista previa local sin guardar
        <img
          src={boton.imagenUrl}
          alt=""
          className="size-9 shrink-0 rounded-full object-cover"
        />
      ) : Icono ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/10">
          <Icono className="size-4.5" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold">
          {boton.titulo?.trim() || "Botón"}
        </span>
        {boton.subtitulo?.trim() && (
          <span className="block truncate text-xs opacity-80">{boton.subtitulo}</span>
        )}
      </span>
    </>
  )
}

export function estiloTexturaBoton(texturaId: string | undefined): React.CSSProperties | undefined {
  const meta = obtenerBotonTextura(texturaId)
  if (!meta?.backgroundImage) return undefined
  return { backgroundImage: meta.backgroundImage, backgroundSize: meta.backgroundSize }
}

/** Trigger "⋮" + Dialog con info/vista previa/compartir de UN botón CTA
 *  puntual — separado del click principal del botón (que navega a
 *  `boton.url`), ver el wrapper en TarjetaCard. */
export function BotonCtaModal({ boton, estiloCta }: BotonCtaModalProps) {
  const [open, setOpen] = React.useState(false)
  const [copiado, setCopiado] = React.useState(false)
  const tieneShareNativo = React.useSyncExternalStore(
    suscribirseSinCambios,
    detectarShareNativo,
    detectarShareNativoServidor
  )

  const url = boton.url?.trim() || ""
  const titulo = boton.titulo?.trim() || "Botón"
  const textoCompartido = encodeURIComponent(`${titulo} · ${url}`)

  async function copiarEnlace() {
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    window.setTimeout(() => setCopiado(false), 2000)
  }

  async function compartirNativo() {
    try {
      await navigator.share({ title: titulo, url })
    } catch {
      // el usuario canceló el share nativo
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label="Opciones del botón"
        className="absolute left-2 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-current opacity-60 hover:opacity-100"
      >
        <MoreVertical className="size-4" />
      </button>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-6 shadow-2xl transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Close
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </Dialog.Close>

          <Dialog.Title className="text-base font-semibold text-foreground">
            Información del botón
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Vista previa, información y opciones para compartir este botón.
          </Dialog.Description>

          {/* Vista previa — mismo markup/estilo que el CTA real. */}
          <div
            style={{ ...estiloCta, ...estiloTexturaBoton(boton.textura) }}
            className="relative mt-4 flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3"
          >
            <ContenidoBotonCta boton={boton} />
          </div>

          <div className="mt-4 flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-3 text-xs">
            <span className="font-medium text-foreground">{titulo}</span>
            {boton.subtitulo?.trim() && (
              <span className="text-muted-foreground">{boton.subtitulo}</span>
            )}
            <span className="mt-1 truncate text-muted-foreground">{url || "Sin enlace"}</span>
          </div>

          {url && (
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground hover:bg-muted"
              >
                <ExternalLink className="size-4" /> Abrir enlace
              </a>
              <button
                type="button"
                onClick={copiarEnlace}
                className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground hover:bg-muted"
              >
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiado ? "¡Copiado!" : "Copiar enlace"}
              </button>
              {tieneShareNativo ? (
                <button
                  type="button"
                  onClick={compartirNativo}
                  className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                >
                  <Share2 className="size-4" /> Compartir
                </button>
              ) : (
                <a
                  href={`https://wa.me/?text=${textoCompartido}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                >
                  <SOCIAL_ICONS.whatsapp className="size-4" /> Compartir por WhatsApp
                </a>
              )}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
