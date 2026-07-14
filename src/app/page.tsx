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
import { PromoCountdown } from "@/components/landing/promo-countdown"
import { buttonVariants } from "@/components/ui/button"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { getConfiguracionActiva } from "@/lib/configuracion"

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

const BENEFICIOS_PERSONAL = [
  "Nunca más te quedas sin tarjetas que repartir",
  "Comparte tu contacto con un solo toque: WhatsApp, QR o link",
  "Se ve profesional desde el primer segundo",
  "El cliente guarda tu contacto en su celular con un toque (.vcf)",
  "Actualiza tus datos cuando quieras, sin reimprimir nada",
]

const BENEFICIOS_EMPRESARIAL = [
  "Todo lo de Personal, más herramientas para vender",
  "Catálogo de productos con fotos y precio",
  "Ubicación con botón directo a Google Maps",
  "Folleto o catálogo en PDF descargable",
  "Identidad de marca: tus colores, tu logo, tu estilo",
]

export default async function Home() {
  const config = await getConfiguracionActiva()
  const precioActivo = config.promocion_activa
    ? config.precio_lanzamiento
    : config.precio_regular
  const hayPromo = config.promocion_activa && config.precio_lanzamiento < config.precio_regular

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-black">
      <AdminShortcut />

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
              <Sparkles className="size-3.5 animate-pulse text-indigo-500" /> Tu
              contacto, siempre en su celular
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
              <a
                href="#precios"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "px-6 text-base",
                })}
              >
                Da clic para ver precios
              </a>
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
            Con Mi Tarjeta, tu contacto vive en el celular de tu cliente para
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

      {/* Precios */}
      <section
        id="precios"
        className="relative overflow-hidden border-t border-border/60 bg-zinc-950 py-20 text-white"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-indigo-600 opacity-30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-fuchsia-600 opacity-30 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-4xl px-6 text-center">
          {hayPromo && (
            <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-amber-400/15 px-4 py-1.5 text-xs font-semibold text-amber-300">
              🔥 Promoción de lanzamiento: válida por tiempo limitado
              <PromoCountdown fin={config.promocion_fin} />
            </div>
          )}

          <h2 className="text-3xl font-semibold text-balance sm:text-4xl">
            Un solo pago, todo un año
          </h2>
          <p className="mt-2 text-zinc-400">
            Sin mensualidades ni sorpresas: tu tarjeta activa, publicada y con
            soporte durante 12 meses.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            {hayPromo && (
              <span className="text-2xl font-medium text-zinc-500 line-through">
                ${config.precio_regular.toLocaleString("es-MX")}
              </span>
            )}
            <span className="text-5xl font-bold">
              ${precioActivo.toLocaleString("es-MX")}
              <span className="text-lg font-normal text-zinc-400"> MXN/año</span>
            </span>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 text-left sm:grid-cols-2">
            {[
              { nombre: "Personal", destacado: false, lista: BENEFICIOS_PERSONAL },
              { nombre: "Empresarial", destacado: true, lista: BENEFICIOS_EMPRESARIAL },
            ].map((plan) => (
              <div
                key={plan.nombre}
                className={`relative flex flex-col gap-4 rounded-3xl border p-8 shadow-xl ${
                  plan.destacado
                    ? "border-transparent bg-gradient-to-br from-indigo-500 to-fuchsia-600"
                    : "border-white/10 bg-white/5 backdrop-blur"
                }`}
              >
                {plan.destacado && (
                  <span className="absolute -top-3 right-8 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-zinc-900">
                    Más elegido
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.nombre}</h3>
                <p className="text-sm text-white/70">
                  ${precioActivo.toLocaleString("es-MX")} MXN al año
                </p>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {plan.lista.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/crear"
                  className={buttonVariants({
                    variant: plan.destacado ? "secondary" : "default",
                    className: "mt-2 w-full",
                  })}
                >
                  Crea tu tarjeta
                </Link>
              </div>
            ))}
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
    </div>
  )
}
