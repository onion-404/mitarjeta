"use client"

import { Dialog } from "@base-ui/react/dialog"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ConfirmModalProps {
  abierto: boolean
  titulo?: string
  mensaje: string
  textoConfirmar?: string
  /** Tinta el botón de confirmar en rojo (variant "destructive" de Button)
   *  + suma el ícono de alerta — para acciones que borran/cancelan algo. */
  destructivo?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/** Reemplaza `window.confirm()` (pedido explícito: "cualquier notificación
 *  o alerta aparezca como modal, no como elemento de la ui en general") —
 *  el confirm nativo del navegador YA bloqueaba la pantalla, pero se veía
 *  totalmente fuera de estilo del resto del producto. Mismo Dialog
 *  flotante que AlertaModal, con dos botones en vez de uno. */
export function ConfirmModal({
  abierto,
  titulo = "¿Confirmar?",
  mensaje,
  textoConfirmar = "Confirmar",
  destructivo = false,
  onConfirmar,
  onCancelar,
}: ConfirmModalProps) {
  return (
    <Dialog.Root open={abierto} onOpenChange={(open) => !open && onCancelar()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[60] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-5 shadow-2xl outline-none transition-all duration-200 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start gap-3">
            {destructivo && (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-sm font-semibold text-foreground">{titulo}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">{mensaje}</Dialog.Description>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={destructivo ? "destructive" : "default"}
              size="sm"
              onClick={onConfirmar}
            >
              {textoConfirmar}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
