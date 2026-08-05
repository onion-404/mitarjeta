import { Clock } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Logo } from "@/components/logo"
import { TarjetaPublica } from "@/components/tarjeta/tarjeta-publica"
import { buttonVariants } from "@/components/ui/button"
import { getServiciosAgendablesActivos, getTarjetaPublicada } from "@/lib/tarjetas"

interface TarjetaPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: TarjetaPageProps): Promise<Metadata> {
  const { slug } = await params
  const tarjeta = await getTarjetaPublicada(slug)
  const nombre = tarjeta?.datos_contacto.nombre
  const subtitulo = tarjeta?.datos_contacto.empresa || tarjeta?.datos_contacto.puesto

  return {
    title: nombre ? `${nombre} · Linkard` : "Tarjeta no encontrada",
    description: subtitulo,
  }
}

export default async function TarjetaPage({ params }: TarjetaPageProps) {
  const { slug } = await params
  const tarjeta = await getTarjetaPublicada(slug)

  if (!tarjeta) notFound()

  if (!tarjeta.plan_id) {
    return (
      <div className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 py-16 text-center dark:bg-black">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-indigo-400 opacity-20 blur-3xl dark:opacity-30"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-fuchsia-400 opacity-20 blur-3xl dark:opacity-30"
        />

        <div className="relative flex w-full max-w-md flex-col items-center gap-3 rounded-[2rem] border border-black/5 bg-white/80 p-10 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80">
          <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <Clock className="size-6" />
          </span>
          <h1 className="text-xl font-semibold text-foreground">
            Tarjeta temporalmente inactiva
          </h1>
          <p className="text-sm text-muted-foreground">
            Esta tarjeta digital se encuentra temporalmente inactiva o en
            proceso de activación.
          </p>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", className: "mt-2" })}
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    )
  }

  const agendaServicios = await getServiciosAgendablesActivos(tarjeta.id)

  return (
    <div className="relative flex w-full flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-black">
      {/* TarjetaPublica (client): agrupa el contenido scrolleable de la
         tarjeta + el FAB de acciones (compartir/QR/PDF/contacto) y termina
         justo antes del <footer> — ver ese componente para el detalle de
         layout mobile-full-bleed + el motivo de sticky en vez de fixed. */}
      <TarjetaPublica tarjeta={tarjeta} slug={slug} agendaServicios={agendaServicios} />

      <footer className="relative flex flex-col items-center gap-2 border-t border-border/60 px-4 py-5 text-center text-xs text-muted-foreground">
        <Logo size="sm" />
        <p className="flex flex-col items-center gap-2">
          <span>© {new Date().getFullYear()}</span>
          <Link
            href="/crear"
            className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          >
            Crea tu propia tarjeta digital con Linkard
          </Link>
        </p>
      </footer>
    </div>
  )
}
