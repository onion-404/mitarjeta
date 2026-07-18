import { X } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { getCitaParaConfirmacion } from "@/lib/citas"
import { confirmarPagoDesdeRedirect } from "@/lib/confirmar-pago"

interface PagoErrorPageProps {
  searchParams: Promise<{ payment_id?: string; collection_id?: string }>
}

export default async function PagoErrorPage({ searchParams }: PagoErrorPageProps) {
  const params = await searchParams
  const { tipo, citaId } = await confirmarPagoDesdeRedirect(
    params.payment_id ?? params.collection_id
  )
  const cita = tipo === "cita" && citaId ? await getCitaParaConfirmacion(citaId) : null

  const titulo = tipo === "cita" ? "No pudimos procesar el pago de tu cita" : "No pudimos procesar tu pago"
  const descripcion =
    tipo === "cita"
      ? "El horario quedó liberado. Podés volver a agendar cuando quieras."
      : "Tu tarjeta quedó guardada, pero sin activar. Podés intentar de nuevo con otro medio de pago desde el editor."

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-zinc-50 px-4 py-16 text-center dark:bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-red-400 opacity-20 blur-3xl dark:opacity-25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-rose-400 opacity-20 blur-3xl dark:opacity-25"
      />

      <div className="relative flex w-full max-w-md flex-col items-center gap-3 rounded-[2rem] border border-black/5 bg-white/80 p-10 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80">
        <span className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
          <X className="size-6" />
        </span>
        <h1 className="text-xl font-semibold text-foreground">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descripcion}</p>

        {tipo === "cita" ? (
          cita?.tarjetaSlug && (
            <Link
              href={`/${cita.tarjetaSlug}`}
              className={buttonVariants({ size: "lg", className: "mt-2" })}
            >
              Volver a agendar
            </Link>
          )
        ) : (
          <Link href="/crear" className={buttonVariants({ size: "lg", className: "mt-2" })}>
            Volver a intentar
          </Link>
        )}
      </div>
    </div>
  )
}
