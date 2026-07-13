import {
  ArrowRight,
  Check,
  Palette,
  QrCode,
  Share2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"

const TARJETA_DEMO = {
  tipo: "personal" as const,
  datosContacto: {
    nombre: "Sofía Martín",
    puesto: "Diseñadora UX",
    telefono: "+54 11 5555-5555",
    whatsapp: "+54 11 5555-5555",
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

const PASOS = [
  {
    numero: "1",
    titulo: "Creá",
    texto: "Elegí si es personal o de tu negocio y completá tus datos en minutos.",
  },
  {
    numero: "2",
    titulo: "Personalizá",
    texto: "Colores, foto, banner y redes con vista previa en tiempo real.",
  },
  {
    numero: "3",
    titulo: "Compartí",
    texto: "Un enlace y un QR listos para tu bio, firma de email o mostrador.",
  },
]

const PLANES = [
  {
    nombre: "Personal",
    precio: "$2.999",
    periodo: "/mes",
    descripcion: "Para profesionales independientes.",
    destacado: false,
    caracteristicas: [
      "Tarjeta personal ilimitada",
      "QR y enlace propio",
      "Descarga de contacto (.vcf)",
      "Descarga en PDF",
    ],
  },
  {
    nombre: "Negocio",
    precio: "$5.999",
    periodo: "/mes",
    descripcion: "Para marcas y equipos que atienden clientes.",
    destacado: true,
    caracteristicas: [
      "Todo lo de Personal",
      "Tarjeta empresarial con horarios y ubicación",
      "Banners e identidad de marca",
      "Soporte prioritario",
    ],
  },
]

export default function Home() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-black">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 size-[28rem] rounded-full bg-indigo-400 opacity-20 blur-3xl dark:opacity-30"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-20 size-[28rem] rounded-full bg-fuchsia-400 opacity-20 blur-3xl dark:opacity-30"
        />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur dark:bg-zinc-900/50">
              <Sparkles className="size-3.5" /> Tarjetas digitales premium
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
              Tu presencia profesional, en un enlace inolvidable
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground text-balance">
              Diseñá una tarjeta personal o de tu negocio con identidad
              propia: banner, colores, QR y descarga de contacto incluidos.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/crear"
                className={buttonVariants({ size: "lg", className: "px-8 text-base" })}
              >
                Crear mi tarjeta <ArrowRight className="size-4" />
              </Link>
              <a
                href="#precios"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "px-6 text-base",
                })}
              >
                Ver planes
              </a>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div
              aria-hidden
              className="absolute size-72 rounded-full bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 blur-3xl"
            />
            <TarjetaCard
              {...TARJETA_DEMO}
              className="relative rotate-3 transition-transform duration-500 hover:rotate-0"
            />
          </div>
        </div>
      </section>

      {/* Pasos */}
      <section className="border-t border-border/60 bg-zinc-50 py-20 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center text-3xl font-semibold text-foreground">
            Listo en 3 pasos
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {PASOS.map((paso) => (
              <div
                key={paso.numero}
                className="flex flex-col items-start gap-3 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
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
            { icono: Palette, titulo: "Identidad propia", texto: "Colores, banners y logo en cada tarjeta." },
            { icono: QrCode, titulo: "QR al instante", texto: "Generado automáticamente para tu tarjeta." },
            { icono: Share2, titulo: "Un solo enlace", texto: "Compartilo en bio, firma o mostrador." },
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
      <section id="precios" className="border-t border-border/60 bg-zinc-50 py-20 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-semibold text-foreground">Planes simples</h2>
          <p className="mt-2 text-muted-foreground">
            Sin capa gratuita: tu tarjeta activa, publicada y con soporte.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PLANES.map((plan) => (
              <div
                key={plan.nombre}
                className={`relative flex flex-col items-start gap-4 rounded-3xl border p-8 text-left shadow-sm ${
                  plan.destacado
                    ? "border-foreground bg-foreground text-background shadow-xl"
                    : "border-black/5 bg-white dark:border-white/10 dark:bg-zinc-900"
                }`}
              >
                {plan.destacado && (
                  <span className="absolute -top-3 right-8 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white">
                    Más elegido
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.nombre}</h3>
                <p
                  className={`text-sm ${plan.destacado ? "text-background/70" : "text-muted-foreground"}`}
                >
                  {plan.descripcion}
                </p>
                <p className="text-3xl font-semibold">
                  {plan.precio}
                  <span className="text-base font-normal opacity-70">
                    {plan.periodo}
                  </span>
                </p>
                <ul className="flex flex-col gap-2 text-sm">
                  {plan.caracteristicas.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0" /> {item}
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
                  Empezar ahora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 text-center">
        <h2 className="text-3xl font-semibold text-balance text-foreground">
          Tu tarjeta digital te espera
        </h2>
        <p className="mt-2 text-muted-foreground">
          Empezá gratis el diseño, publicá cuando estés list@.
        </p>
        <div className="mt-6">
          <Link
            href="/crear"
            className={buttonVariants({ size: "lg", className: "px-8 text-base" })}
          >
            Crear mi tarjeta <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
