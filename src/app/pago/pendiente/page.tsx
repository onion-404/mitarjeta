import { Clock } from "lucide-react"
import Link from "next/link"

import { ReclamarTarjeta } from "@/components/pago/reclamar-tarjeta"
import { buttonVariants } from "@/components/ui/button"
import { getCitaParaConfirmacion } from "@/lib/citas"
import { confirmarPagoDesdeRedirect } from "@/lib/confirmar-pago"
import { formatearFechaHoraLocal } from "@/lib/fecha"

interface PagoPendientePageProps {
  searchParams: Promise<{ payment_id?: string; collection_id?: string }>
}

export default async function PagoPendientePage({
  searchParams,
}: PagoPendientePageProps) {
  const params = await searchParams
  const { estadoPago, slug, tipo, citaId } = await confirmarPagoDesdeRedirect(
    params.payment_id ?? params.collection_id
  )
  const aprobado = estadoPago === "approved"
  const cita = tipo === "cita" && citaId ? await getCitaParaConfirmacion(citaId) : null

  const titulo =
    tipo === "cita"
      ? aprobado
        ? "¡Tu cita quedó confirmada!"
        : "Tu pago está en revisión"
      : tipo === "cobro_manual"
        ? aprobado
          ? "¡Tu pago fue aprobado!"
          : "Tu pago está en revisión"
        : aprobado
          ? "¡Tu pago fue aprobado!"
          : "Tu pago está en revisión"

  const descripcion =
    tipo === "cita"
      ? aprobado && cita
        ? `Tu cita de ${cita.servicioNombre} quedó agendada para el ${formatearFechaHoraLocal(cita.fechaHoraInicio, cita.zonaHoraria)}.`
        : `Tu pago está siendo procesado. Te confirmaremos la cita por ${cita?.clienteContacto ?? "el contacto que dejaste"} en cuanto se apruebe.`
      : tipo === "cobro_manual"
        ? aprobado
          ? "Gracias por tu pago."
          : "Algunos medios de pago tardan un poco más en confirmarse. Te avisaremos apenas se apruebe."
        : aprobado
          ? "Tu tarjeta ya está activa y lista para compartir."
          : "Algunos medios de pago tardan un poco más en confirmarse. Te avisaremos apenas se apruebe."

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-zinc-50 px-4 py-16 text-center dark:bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-amber-400 opacity-25 blur-3xl dark:opacity-30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-orange-400 opacity-25 blur-3xl dark:opacity-30"
      />

      <div className="relative flex w-full max-w-md flex-col items-center gap-3 rounded-[2rem] border border-black/5 bg-white/80 p-10 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80">
        <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          <Clock className="size-6" />
        </span>
        <h1 className="text-xl font-semibold text-foreground">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descripcion}</p>

        {tipo === "cita" && cita?.tarjetaSlug && (
          <Link
            href={`/${cita.tarjetaSlug}`}
            className={buttonVariants({ size: "lg", className: "mt-2" })}
          >
            Ver la tarjeta
          </Link>
        )}

        {tipo === "tarjeta" && (
          <>
            {slug && (
              <Link href={`/${slug}`} className={buttonVariants({ size: "lg", className: "mt-2" })}>
                Ver mi tarjeta
              </Link>
            )}
            <div className="mt-2 w-full border-t border-border/60 pt-4">
              <ReclamarTarjeta />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
