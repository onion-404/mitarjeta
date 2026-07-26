import {
  ArrowRight,
  Check,
  MessageCircle,
  Palette,
  QrCode,
  Share2,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react"
import Link from "next/link"

import { AdminShortcut } from "@/components/admin/admin-shortcut"
import { HeaderGlobal } from "@/components/header-global"
import { buttonVariants } from "@/components/ui/button"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"

export const dynamic = "force-dynamic"

const TARJETA_DEMO = {
  tipo: "personal" as const,
  datosContacto: {
    nombre: "Sofía Martín",
    puesto: "Diseñadora UX",
    telefono: "+52 55 5555 5555",
    whatsapp: "+52 55 5555 5555",
    email: "sofia@ejemplo.com",
    redes: [
      { plataforma: "instagram" as const, label: "", url: "https://instagram.com/sofia" },
    ],
  },
  identidadVisual: {
    colorPrimario: "#6366f1",
    colorSecundario: "#a855f7",
    bannerPreset: "aurora",
  },
}

const DOLORES = [
  {
    icono: Trash2,
    texto: "Imprimes 500 tarjetas y la mitad termina en la basura antes de la semana.",
  },
  {
    icono: MessageCircle,
    texto: "Cambias de número o de trabajo y ya nadie tiene tu contacto actualizado.",
  },
  {
    icono: Zap,
    texto: "Pierdes la venta porque el cliente se le \"olvidó\" guardar tu número.",
  },
]

const PASOS = [
  {
    numero: "1",
    titulo: "Crea",
    texto: "Elige si es personal o de tu negocio y completa tus datos en minutos.",
  },
  {
    numero: "2",
    titulo: "Personaliza",
    texto: "Colores, foto, banner y catálogo con vista previa en tiempo real.",
  },
  {
    numero: "3",
    titulo: "Comparte",
    texto: "Un link y un QR listos para tu bio, WhatsApp o mostrador.",
  },
]

export default async function Home() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-black">
      <AdminShortcut />

      <HeaderGlobal />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 size-[28rem] rounded-full bg-indigo-500 opacity-25 blur-3xl dark:opacity-35"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-20 size-[28rem] rounded-full bg-fuchsia-500 opacity-25 blur-3xl dark:opacity-35"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/3 bottom-0 size-[24rem] rounded-full bg-amber-400 opacity-10 blur-3xl dark:opacity-20"
        />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur dark:bg-zinc-900/50">
              <Sparkles className="size-3.5 animate-pulse text-indigo-500" />{" "}
              Linkard: tu contacto, siempre en su celular
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
              No más tarjetas de papel que terminan en la basura
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground text-balance">
              Cierra ventas en segundos con un solo toque: comparte tu
              contacto, catálogo y redes con un link o QR, directo desde tu
              celular.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/crear"
                className={buttonVariants({ size: "lg", className: "px-8 text-base" })}
              >
                Crea tu tarjeta <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/planes"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "px-6 text-base",
                })}
              >
                Da clic para ver precios
              </Link>
            </div>

            <Link
              href="/editar"
              className="mt-4 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ¿Ya tienes una tarjeta? Edítala aquí
            </Link>
          </div>

          <div className="relative flex justify-center py-10 lg:justify-end">
            <div
              aria-hidden
              className="absolute size-72 animate-glow rounded-full bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/40 blur-3xl"
            />

            {/* Mockup de celular */}
            <div className="relative animate-float">
              <div className="relative w-[17rem] rounded-[2.75rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl dark:border-zinc-800">
                <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-900 dark:bg-zinc-800" />
                <div className="max-h-[34rem] overflow-hidden rounded-[2rem] bg-zinc-50 pt-6 dark:bg-black">
                  <TarjetaCard
                    {...TARJETA_DEMO}
                    className="w-full min-w-0 rounded-none border-0 shadow-none"
                  />
                </div>
              </div>

              {/* Insignias flotantes */}
              <div className="animate-float-delayed absolute -left-10 top-10 flex items-center gap-1.5 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs font-semibold shadow-xl dark:border-white/10 dark:bg-zinc-900">
                <QrCode className="size-4 text-indigo-500" /> Escanea y listo
              </div>
              <div className="animate-float absolute -right-8 top-1/2 flex items-center gap-1.5 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs font-semibold shadow-xl dark:border-white/10 dark:bg-zinc-900">
                <Check className="size-4 animate-pulse text-emerald-500" /> Contacto
                guardado
              </div>
              <div className="animate-float-delayed absolute -bottom-4 left-1/4 flex items-center gap-1.5 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs font-semibold shadow-xl dark:border-white/10 dark:bg-zinc-900">
                <Share2 className="size-4 text-fuchsia-500" /> Un solo link
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Qué es Linkard — descripción explícita del producto en texto real,
          no solo dentro del componente <Logo />, para que quede claro tanto
          para una persona como para un revisor automatizado qué hace la app
          y bajo qué nombre. */}
      <section className="border-t border-border/60 py-14">
        <div className="mx-auto w-full max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-semibold text-balance text-foreground sm:text-3xl">
            ¿Qué es Linkard?
          </h2>
          <p className="mt-4 text-lg text-balance text-muted-foreground">
            <strong className="font-semibold text-foreground">Linkard</strong>{" "}
            es la tarjeta digital todo-en-uno para negocios y creadores: un
            solo link con tu perfil de contacto, tu agenda para que tus
            clientes reserven citas, y tu catálogo de productos para vender.
            Sin apps que instalar ni tarjetas de papel que imprimir.
          </p>
        </div>
      </section>

      {/* Dolor / agitación del problema */}
      <section className="border-t border-border/60 bg-zinc-950 py-16 text-white">
        <div className="mx-auto w-full max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-semibold text-balance sm:text-3xl">
            ¿Te ha pasado esto?
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {DOLORES.map((dolor) => (
              <div key={dolor.texto} className="flex flex-col items-center gap-3 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-red-400">
                  <dolor.icono className="size-5" />
                </span>
                <p className="text-sm text-zinc-300">{dolor.texto}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-lg font-semibold text-balance">
            Con Linkard, tu contacto vive en el celular de tu cliente para
            siempre.
          </p>
        </div>
      </section>

      {/* Pasos */}
      <section className="border-t border-border/60 bg-zinc-50 py-20 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center text-3xl font-semibold text-foreground">
            Lista en 3 pasos
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {PASOS.map((paso) => (
              <div
                key={paso.numero}
                className="flex flex-col items-start gap-3 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white">
                  {paso.numero}
                </span>
                <h3 className="text-base font-semibold text-foreground">
                  {paso.titulo}
                </h3>
                <p className="text-sm text-muted-foreground">{paso.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-20">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-6 sm:grid-cols-3">
          {[
            { icono: Palette, titulo: "Tu marca, no una plantilla", texto: "Colores, banners y logo en cada tarjeta." },
            { icono: QrCode, titulo: "Escanea y listo", texto: "QR generado al instante para tu tarjeta." },
            { icono: Share2, titulo: "Todo en un solo link", texto: "Compártelo en tu bio, firma o mostrador." },
          ].map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="flex flex-col items-start gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
                <Icono className="size-4" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
              <p className="text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Precios — teaser liviano, sin números propios a propósito: /planes
          ya es la única fuente de verdad de precios (100% DB-driven vía
          getPlanesActivos()), duplicar montos acá los desincronizaría. */}
      <section className="relative overflow-hidden border-t border-border/60 bg-zinc-950 py-20 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-indigo-600 opacity-30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-fuchsia-600 opacity-30 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-semibold text-balance sm:text-4xl">
            Un plan para cada etapa de tu negocio
          </h2>
          <p className="mt-2 text-zinc-400">
            Presencia, Alcance o Poder — elegí el que se ajuste a vos hoy.
            Cada tarjeta tiene su propio plan y su propia suscripción.
          </p>
          <div className="mt-8">
            <Link
              href="/planes"
              className={buttonVariants({ size: "lg", className: "px-8 text-base" })}
            >
              Ver planes y precios <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 text-center">
        <h2 className="text-3xl font-semibold text-balance text-foreground">
          Tu próxima venta empieza con un toque
        </h2>
        <p className="mt-2 text-muted-foreground">
          Crea tu tarjeta hoy y déjala lista para compartir en minutos.
        </p>
        <div className="mt-6">
          <Link
            href="/crear"
            className={buttonVariants({ size: "lg", className: "px-8 text-base" })}
          >
            Crea tu tarjeta <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
          <Link
            href="/politica-privacidad"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Política de Privacidad
          </Link>
          <Link
            href="/condiciones-servicio"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Condiciones de Servicio
          </Link>
          <Link
            href="/login"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Acceso Admin
          </Link>
        </div>
      </footer>
    </div>
  )
}
