import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { TarjetaQr } from "@/components/tarjeta/tarjeta-qr"
import { getTarjetaPublicada } from "@/lib/tarjetas"

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

  const { colorPrimario, colorSecundario } = tarjeta.identidad_visual

  return (
    <div className="relative flex flex-1 w-full items-center justify-center overflow-hidden bg-zinc-50 px-4 py-16 dark:bg-black">
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
        mostrarAcciones
        className="relative"
      />
      <TarjetaQr slug={slug} />
    </div>
  )
}
