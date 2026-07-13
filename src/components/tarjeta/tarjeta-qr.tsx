"use client"

import { Dialog } from "@base-ui/react/dialog"
import { QrCode, X } from "lucide-react"
import QRCode from "qrcode"
import * as React from "react"

export function TarjetaQr({ slug }: { slug: string }) {
  const [open, setOpen] = React.useState(false)
  const [dataUrl, setDataUrl] = React.useState("")
  const url = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : ""

  React.useEffect(() => {
    if (!open || !url) return
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setDataUrl)
  }, [open, url])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mostrar código QR"
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition-transform hover:scale-105"
      >
        <QrCode className="size-6" />
      </button>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-6 text-center shadow-2xl transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Close
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </Dialog.Close>

          <Dialog.Title className="text-base font-semibold text-foreground">
            Escaneá para ver la tarjeta
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Apuntá la cámara del celular al código.
          </Dialog.Description>

          <div className="mt-4 flex items-center justify-center">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL generada en el cliente
              <img
                src={dataUrl}
                alt="Código QR de la tarjeta"
                className="size-56 rounded-xl border border-border"
              />
            ) : (
              <div className="flex size-56 items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
                Generando...
              </div>
            )}
          </div>

          <p className="mt-3 truncate text-xs text-muted-foreground">{url}</p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
