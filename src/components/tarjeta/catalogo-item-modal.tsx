"use client"

import { Dialog } from "@base-ui/react/dialog"
import { ExternalLink, X } from "lucide-react"
import Image from "next/image"
import type { CSSProperties } from "react"

import { esEnlaceWhatsapp } from "@/lib/boton-cta"
import { esUrlOptimizable, estiloImagenPosicionada } from "@/lib/imagen-posicion"
import { renderizarTextoEnriquecido } from "@/lib/texto-enriquecido"
import { cn } from "@/lib/utils"
import type { Producto } from "@/lib/types"

interface CatalogoItemModalProps {
  /** null mientras se cierra (animación de salida) — el contenido no
   *  desaparece de golpe antes de que termine la transición del Dialog. */
  item: Producto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Mismo estilo ya resuelto (color/vidrio) que usa el resto de los CTA de
   *  la tarjeta — se reusa tal cual para que "Ver más" combine con el resto. */
  estiloCta?: CSSProperties
  onAbrirEnlace?: () => void
}

/** Modal de detalle de un ítem de botón "catalogo" — reemplaza el resumen
 *  apretado que antes vivía inline en el tile (título+descripción con
 *  line-clamp+precio+link, los 4 a la vez en un tile de ~110px). Clona el
 *  patrón `Dialog.Root > Dialog.Portal > Dialog.Backdrop + Dialog.Popup` de
 *  `boton-cta-modal.tsx` en vez de reusar ese componente (está acoplado a
 *  `BotonCta`/`BotonVistaPrevia`, no a un `Producto`). */
export function CatalogoItemModal({ item, open, onOpenChange, estiloCta, onAbrirEnlace }: CatalogoItemModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-6 shadow-2xl transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          {/* z-10 explícito: sin esto, la imagen de abajo (también
              `position: relative`, mismo nivel de stacking que un
              `absolute` sin z-index) pinta DESPUÉS en el DOM y termina
              tapando este botón — bug real reportado (la imagen "tapaba"
              el cierre). Fondo semi-opaco propio (no solo hover) para que
              siga siendo legible apoyado sobre cualquier imagen, no solo
              sobre el fondo del modal. */}
          <Dialog.Close
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur hover:bg-muted"
          >
            <X className="size-4" />
          </Dialog.Close>

          {item && (
            <>
              <Dialog.Title className="sr-only">{item.titulo}</Dialog.Title>
              <Dialog.Description className="sr-only">
                Detalle de &ldquo;{item.titulo}&rdquo;.
              </Dialog.Description>

              {item.imagenUrl && (
                <div className="relative mt-8 aspect-square w-full overflow-hidden rounded-2xl">
                  <Image
                    src={item.imagenUrl}
                    alt={item.titulo}
                    fill
                    sizes="(max-width: 640px) 90vw, 384px"
                    unoptimized={!esUrlOptimizable(item.imagenUrl)}
                    className="object-cover"
                    style={estiloImagenPosicionada(item.imagenPosicion)}
                  />
                </div>
              )}
              <h3
                className={cn("text-base font-semibold text-foreground", item.imagenUrl ? "mt-4" : "mt-8")}
              >
                {item.titulo}
              </h3>
              {item.precio?.trim() && (
                <p className="mt-1 text-sm font-semibold text-foreground">${item.precio}</p>
              )}
              {item.descripcion?.trim() && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {renderizarTextoEnriquecido(item.descripcion)}
                </p>
              )}
              {item.enlaceUrl?.trim() && (
                <a
                  href={item.enlaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onAbrirEnlace}
                  style={estiloCta}
                  className={cn(
                    "mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
                    !estiloCta && "bg-foreground text-background"
                  )}
                >
                  {esEnlaceWhatsapp(item.enlaceUrl) ? "Solicitar información" : "Ver más"}{" "}
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
