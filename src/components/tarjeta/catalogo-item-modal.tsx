"use client"

import { Dialog } from "@base-ui/react/dialog"
import { ArrowUpRight, X } from "lucide-react"
import Image from "next/image"
import type { CSSProperties } from "react"

import { esEnlaceWhatsapp } from "@/lib/boton-cta"
import { obtenerColorContraste } from "@/lib/contraste"
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
  /** Color de acento de la tarjeta (`colorBotonesFinal` en TarjetaCard) —
   *  tiñe la banda superior, la regla del título y el chip de precio para
   *  que el modal lleve la identidad del dueño y no se vea genérico. */
  acento?: string
  /** Tipografías elegidas por el dueño (título / cuerpo) — el modal las
   *  aplica igual que el resto de la tarjeta. */
  fuenteTitulo?: string
  fuenteCuerpo?: string
  /** true = glassmorfismo activo en la tarjeta: el popup usa fondo
   *  translúcido + blur en vez de sólido. */
  glass?: boolean
  onAbrirEnlace?: () => void
}

const ACENTO_FALLBACK = "#6366f1"

/** Modal de detalle de un ítem de botón "catalogo". Toma la identidad
 *  visual del dueño (color de acento, tipografías, glassmorfismo) para no
 *  verse como un diálogo genérico del sistema: banda de acento arriba,
 *  imagen a sangre con el precio flotando encima, regla de acento antes del
 *  título y CTA con el mismo estilo que los botones de la tarjeta. Clona el
 *  patrón `Dialog.Root > Dialog.Portal > Dialog.Backdrop + Dialog.Popup` de
 *  `boton-cta-modal.tsx` en vez de reusar ese componente (está acoplado a
 *  `BotonCta`/`BotonVistaPrevia`, no a un `Producto`). */
export function CatalogoItemModal({
  item,
  open,
  onOpenChange,
  estiloCta,
  acento,
  fuenteTitulo,
  fuenteCuerpo,
  glass,
  onAbrirEnlace,
}: CatalogoItemModalProps) {
  const acentoSafe = acento || ACENTO_FALLBACK
  const estiloChipPrecio: CSSProperties = {
    backgroundColor: acentoSafe,
    color: obtenerColorContraste(acentoSafe),
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          style={{
            boxShadow: `0 28px 80px -24px ${acentoSafe}66, 0 10px 32px -14px rgba(0,0,0,0.4)`,
          }}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.75rem] border border-border transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            glass ? "bg-background/80 backdrop-blur-xl" : "bg-background"
          )}
        >
          {/* Banda de acento a lo ancho — primer toque de identidad, hugea
              las esquinas redondeadas por el overflow-hidden del popup. */}
          <span
            aria-hidden
            className="block h-1.5 w-full"
            style={{ background: `linear-gradient(90deg, ${acentoSafe}, ${acentoSafe}88)` }}
          />

          {/* z-10 explícito: sin esto, la imagen de abajo (también
              `position: relative`) pinta DESPUÉS en el DOM y tapa este botón
              — bug real reportado. Fondo semi-opaco + blur para seguir
              legible sobre cualquier imagen. */}
          <Dialog.Close
            aria-label="Cerrar"
            className="absolute right-3 top-3.5 z-10 rounded-full bg-background/70 p-1.5 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-foreground"
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
                // Imagen publicitaria: SIEMPRE completa, nunca recortada
                // (object-contain sobre fondo neutro). A sangre contra los
                // bordes del modal; el precio flota sobre la esquina.
                <div className="relative aspect-square w-full overflow-hidden bg-[#f4f4f5] dark:bg-[#27272a]">
                  <Image
                    src={item.imagenUrl}
                    alt={item.titulo}
                    fill
                    sizes="(max-width: 640px) 90vw, 384px"
                    unoptimized={!esUrlOptimizable(item.imagenUrl)}
                    className="object-contain"
                    style={estiloImagenPosicionada(item.imagenPosicion)}
                  />
                  {item.precio?.trim() && (
                    <span
                      style={estiloChipPrecio}
                      className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-sm font-bold shadow-lg"
                    >
                      ${item.precio}
                    </span>
                  )}
                </div>
              )}

              <div className={cn("px-6 pb-6", item.imagenUrl ? "pt-5" : "pt-10")}>
                <span
                  aria-hidden
                  className="mb-2.5 block h-1 w-10 rounded-full"
                  style={{ backgroundColor: acentoSafe }}
                />
                <h3
                  style={{ fontFamily: fuenteTitulo }}
                  className="text-xl leading-snug font-bold text-foreground"
                >
                  {item.titulo}
                </h3>

                {!item.imagenUrl && item.precio?.trim() && (
                  <span
                    style={estiloChipPrecio}
                    className="mt-2.5 inline-block rounded-full px-3 py-1 text-sm font-bold"
                  >
                    ${item.precio}
                  </span>
                )}

                {item.descripcion?.trim() && (
                  <p
                    style={{ fontFamily: fuenteCuerpo }}
                    className="mt-3 text-sm leading-relaxed text-muted-foreground"
                  >
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
                      "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-3 text-sm font-semibold shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
                      !estiloCta && "bg-foreground text-background"
                    )}
                  >
                    {esEnlaceWhatsapp(item.enlaceUrl) ? "Solicitar información" : "Ver más"}
                    <ArrowUpRight className="size-4" />
                  </a>
                )}
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
