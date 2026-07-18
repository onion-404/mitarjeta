import { Clock } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CompartirTarjeta } from "@/components/tarjeta/compartir-tarjeta"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { TarjetaQr } from "@/components/tarjeta/tarjeta-qr"
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
  const esEmpresarial = tarjeta?.tipo === "empresarial"
  const nombre = esEmpresarial
    ? tarjeta?.datos_contacto.nombreEmpresa
    : tarjeta?.datos_contacto.nombre
  const subtitulo = esEmpresarial
    ? tarjeta?.datos_contacto.giro
    : tarjeta?.datos_contacto.puesto

  return {
    title: nombre ? `${nombre} · miTarjeta` : "Tarjeta no encontrada",
    description: subtitulo,
  }
}

export default async function TarjetaPage({ params }: TarjetaPageProps) {
  const { slug } = await params
  const tarjeta = await getTarjetaPublicada(slug)

  if (!tarjeta) notFound()

  if (tarjeta.estado_pago !== "aprobado") {
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

  const { colorPrimario, colorSecundario } = tarjeta.identidad_visual
  const esEmpresarial = tarjeta.tipo === "empresarial"
  const nombrePrincipal = esEmpresarial
    ? tarjeta.datos_contacto.nombreEmpresa
    : tarjeta.datos_contacto.nombre
  const agendaServicios = await getServiciosAgendablesActivos(tarjeta.id)

  return (
    <div className="relative flex w-full flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: colorPrimario || "#6366f1" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: colorSecundario || "#a855f7" }}
        />

        <TarjetaCard
          tipo={tarjeta.tipo}
          datosContacto={tarjeta.datos_contacto}
          identidadVisual={tarjeta.identidad_visual}
          agendaServicios={agendaServicios}
          permitirAgendar
          tarjetaId={tarjeta.id}
          zonaHoraria={tarjeta.zona_horaria}
          mostrarAcciones
          className="relative"
        />
        <TarjetaQr slug={slug} />
        <CompartirTarjeta slug={slug} titulo={nombrePrincipal || "miTarjeta"} />
      </div>

      <footer className="relative border-t border-border/60 px-4 py-5 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Mi Tarjeta ·{" "}
          <Link
            href="/crear"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Creá tu propia tarjeta digital con Mi Tarjeta
          </Link>
        </p>
      </footer>
    </div>
  )
}
