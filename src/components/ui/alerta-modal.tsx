"use client"

import { Dialog } from "@base-ui/react/dialog"
import { AlertTriangle, Check, X } from "lucide-react"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

export type TipoAlerta = "exito" | "error" | "advertencia"

interface AlertaModalProps {
  abierto: boolean
  onCerrar: () => void
  tipo: TipoAlerta
  mensaje: string
}

const ESTILO_TIPO: Record<TipoAlerta, { icono: ComponentType<{ className?: string }>; clase: string }> = {
  exito: {
    icono: Check,
    clase:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  error: {
    icono: AlertTriangle,
    clase: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
  advertencia: {
    icono: AlertTriangle,
    clase:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
}

const TITULO_TIPO: Record<TipoAlerta, string> = {
  exito: "Listo",
  error: "Error",
  advertencia: "Aviso",
}

/** Reemplaza el patrón viejo de "toast"/banner inline (pedido explícito:
 *  "cualquier notificación o alerta aparezca como modal, no como elemento
 *  de la ui en general") — un solo Dialog flotante reusado en toda la app,
 *  en vez de un toast que se autodesvanece o un `<div>` de color metido en
 *  el flujo normal de la página. Cierre manual (✕, clic afuera o Escape)
 *  — sin auto-dismiss: si bloquea la pantalla como modal, que el aviso se
 *  quede hasta que el usuario lo confirme, no que desaparezca solo. */
export function AlertaModal({ abierto, onCerrar, tipo, mensaje }: AlertaModalProps) {
  const { icono: Icono, clase } = ESTILO_TIPO[tipo]
  return (
    <Dialog.Root open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[60] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-5 shadow-2xl outline-none transition-all duration-200 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Close
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </Dialog.Close>
          <Dialog.Title className="sr-only">{TITULO_TIPO[tipo]}</Dialog.Title>
          <div className={cn("flex items-start gap-3 rounded-2xl border p-4 text-sm", clase)}>
            <Icono className="size-5 shrink-0" />
            <Dialog.Description className="leading-relaxed">{mensaje}</Dialog.Description>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
