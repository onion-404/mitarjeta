"use client"

import { Dialog } from "@base-ui/react/dialog"
import * as React from "react"
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type PercentCrop,
  type PixelCrop,
} from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"

import { Button } from "@/components/ui/button"

interface RecortarAvatarProps {
  archivo: File | null
  onCancelar: () => void
  onConfirmar: (archivo: File) => void
}

export function RecortarAvatar({ archivo, onCancelar, onConfirmar }: RecortarAvatarProps) {
  const [crop, setCrop] = React.useState<PercentCrop>()
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>()
  const imgRef = React.useRef<HTMLImageElement>(null)
  const src = React.useMemo(() => (archivo ? URL.createObjectURL(archivo) : ""), [archivo])

  React.useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [src])

  function handleImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = event.currentTarget
    setCrop(centerCrop(makeAspectCrop({ unit: "%", width: 90 }, 1, width, height), width, height))
    setCompletedCrop(undefined)
  }

  function handleConfirmar() {
    if (!imgRef.current || !archivo) return
    const image = imgRef.current
    const pixelCrop =
      completedCrop ?? (crop ? convertToPixelCrop(crop, image.width, image.height) : null)
    if (!pixelCrop) return
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const size = 512
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      size,
      size
    )
    canvas.toBlob((blob) => {
      if (!blob) return
      onConfirmar(new File([blob], archivo.name, { type: "image/jpeg" }))
    }, "image/jpeg", 0.92)
  }

  return (
    <Dialog.Root open={Boolean(archivo)} onOpenChange={(open) => !open && onCancelar()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-6 shadow-2xl transition-all duration-300 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Title className="text-base font-semibold text-foreground">
            Ajustá tu foto
          </Dialog.Title>
          {src && (
            <div className="mt-4 flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- necesita ref directa para recortar en canvas */}
                <img
                  ref={imgRef}
                  src={src}
                  alt=""
                  onLoad={handleImageLoad}
                  className="max-h-80"
                />
              </ReactCrop>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1" onClick={handleConfirmar}>
              Listo
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
