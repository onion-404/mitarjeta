import { Clock } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Logo } from "@/components/logo"
import { TarjetaPublica } from "@/components/tarjeta/tarjeta-publica"
import { buttonVariants } from "@/components/ui/button"
import { getServiciosAgendablesActivos, getTarjetaPublicada } from "@/lib/tarjetas"
import { cn } from "@/lib/utils"

interface TarjetaPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: TarjetaPageProps): Promise<Metadata> {
  const { slug } = await params
  const tarjeta = await getTarjetaPublicada(slug)

  if (!tarjeta) return { title: "Tarjeta no encontrada" }

  const nombre = tarjeta.datos_contacto.nombre?.trim() || "Tarjeta digital"
  const titulo = `${nombre} · Linkard`
  // La descripción se arma SIEMPRE con la info de la propia tarjeta (rol +
  // bio, cuando existan) — nunca con el copy de marketing genérico del
  // layout raíz ("Crea tu tarjeta de presentación..."). El dueño está
  // pagando un plan; no tiene sentido publicitarle Linkard a SUS propios
  // visitantes en la vista previa que se comparte por WhatsApp/redes.
  // Bug real corregido acá: antes solo se seteaban `title`/`description`
  // (los tags genéricos) — WhatsApp/Telegram/Twitter/iMessage leen
  // `og:title`/`og:description` (de `openGraph`) y `twitter:title`/
  // `twitter:description` (de `twitter`), que NUNCA se sobreescribían acá
  // y por eso seguían mostrando el copy genérico heredado del layout raíz
  // sin importar qué dijera `description`.
  const partes = [tarjeta.datos_contacto.empresa?.trim(), tarjeta.datos_contacto.puesto?.trim()].filter(
    (parte): parte is string => Boolean(parte)
  )
  const descripcion = partes.length > 0 ? partes.join(" — ") : `Tarjeta digital de ${nombre} en Linkard.`

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      siteName: "Linkard",
      locale: "es_MX",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descripcion,
    },
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
  // El footer NO hereda el tema (temaModo/fondoTarjetaColor) de la tarjeta —
  // ese tema solo aplica al panel de la card (el toggle `.dark` vive
  // adentro de TarjetaCard, ver esOscuro ahí), el footer sigue siendo del
  // SITIO, con su propio fondo claro (`bg-zinc-50`) que ya se adapta solo
  // al modo claro/oscuro del sistema operativo vía CSS — forzar el logo a
  // blanco ahí sería logo blanco sobre fondo claro, invisible (bug real
  // encontrado en verificación visual). El único caso real en que el
  // footer deja de ser "su propio fondo claro" es cuando la imagen de
  // fondo de la tarjeta (mobile, `fixed`) bleedea detrás de él — ahí sí
  // hace falta forzar blanco + el scrim de abajo, sin importar el tema.
  const tieneFondoImagen = Boolean(tarjeta.identidad_visual.fondoImagenUrl)
  const footerOscuro = tieneFondoImagen

  return (
    <div className="relative flex w-full flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-black">
      {/* TarjetaPublica (client): agrupa el contenido scrolleable de la
         tarjeta + el FAB de acciones (compartir/QR/PDF/contacto) y termina
         justo antes del <footer> — ver ese componente para el detalle de
         layout mobile-full-bleed + el motivo de sticky en vez de fixed. */}
      <TarjetaPublica tarjeta={tarjeta} slug={slug} agendaServicios={agendaServicios} />

      <footer
        className={cn(
          "relative flex flex-col items-center gap-2 border-t px-4 py-5 text-center text-xs",
          // Con imagen de fondo detrás (bleed), un scrim propio asegura
          // legibilidad sin importar qué tan clara/oscura sea la imagen —
          // sin esto, `text-muted-foreground` sobre una foto cualquiera es
          // ilegible la mitad de las veces.
          tieneFondoImagen
            ? "border-white/15 bg-black/45 text-white/90 backdrop-blur-sm"
            : "border-border/60 text-muted-foreground"
        )}
      >
        <Logo size="sm" oscuro={footerOscuro} />
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
