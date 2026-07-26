import {
  ArrowRight,
  BarChart3,
  Calendar,
  Link2,
  MapPin,
  ShoppingBag,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

import { AdminShortcut } from "@/components/admin/admin-shortcut"
import { HeaderGlobal } from "@/components/header-global"
import { TestimoniosDestacados } from "@/components/landing/testimonios-destacados"
import { buttonVariants } from "@/components/ui/button"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { getTestimoniosActivos } from "@/lib/testimonios"

export const dynamic = "force-dynamic"

// Las 3 tarjetas del abanico del hero: personas de ejemplo (mismo criterio
// que ya usaba TARJETA_DEMO — mockup de producto, no un testimonio ni una
// afirmación de cliente real) que muestran las dos audiencias por igual:
// 1 creadora de contenido + 2 sabores de negocio pequeño. Cada una usa un
// bannerPreset real (lib/banner-presets.ts) en vez de un gradiente inventado
// para la landing — el color de esta sección ES el producto, no decoración.
const TARJETA_CREADORA = {
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

const TARJETA_ESTUDIO = {
  tipo: "empresarial" as const,
  datosContacto: {
    nombreEmpresa: "Estudio Raíz",
    giro: "Peluquería y estética",
    telefonoCorporativo: "+52 55 4444 4444",
    horarios: "Lun-Sáb 9-19h",
  },
  identidadVisual: {
    bannerPreset: "sunset",
    estiloTipografia: "elegante" as const,
  },
}

const TARJETA_ANTOJITOS = {
  tipo: "empresarial" as const,
  datosContacto: {
    nombreEmpresa: "Tacos El Primo",
    giro: "Antojitos mexicanos",
    telefonoCorporativo: "+52 55 3333 3333",
    horarios: "Todos los días 18-24h",
  },
  identidadVisual: {
    bannerPreset: "citrus",
    estiloTipografia: "creativa" as const,
  },
}

const PARA_NEGOCIO = [
  { icono: Calendar, texto: "Que agenden citas contigo, con o sin cobro por adelantado." },
  { icono: MapPin, texto: "Ubicación, horarios y WhatsApp siempre al día, sin repetirlo nunca." },
  { icono: ShoppingBag, texto: "Tu catálogo con un clic directo a tu tienda o tu WhatsApp." },
]

const PARA_CONTENIDO = [
  { icono: Link2, texto: "Todas tus redes en un solo link para tu bio." },
  { icono: ShoppingBag, texto: "Tus productos o packs, directo desde tu perfil." },
  { icono: BarChart3, texto: "Qué enlace generó más clics — no adivines, mídelo." },
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

const NUMERO_CLASE =
  "flex size-9 items-center justify-center rounded-full font-[family-name:var(--font-creativa)] text-sm font-bold text-white"
const NUMERO_FONDO = ["bg-indigo-500", "bg-orange-500", "bg-lime-600"]

export default async function Home() {
  const testimonios = await getTestimoniosActivos()

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-black">
      <AdminShortcut />

      <HeaderGlobal />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-xs font-medium tracking-tight text-muted-foreground shadow-sm backdrop-blur dark:bg-zinc-900/50">
              <Sparkles className="size-3.5 text-indigo-500" /> LINKARD · TARJETA DIGITAL
            </span>

            <h1 className="mt-6 font-[family-name:var(--font-creativa)] text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              Todo lo tuyo, en un solo link.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground text-balance">
              <strong className="font-semibold text-foreground">Linkard</strong> es tu
              tarjeta digital todo-en-uno: perfil de contacto, agenda de citas y
              catálogo de productos — o tus redes y tu bio, si eres creador. Sin
              apps que instalar, sin tarjetas de papel que imprimir.
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
                Ver planes y precios
              </Link>
            </div>

            <Link
              href="/editar"
              className="mt-4 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ¿Ya tienes una tarjeta? Edítala aquí
            </Link>
          </div>

          {/* Abanico de 3 tarjetas reales — la firma visual de la página:
              muestra personalización real (3 bannerPresets, 3 estilos de
              tipografía) y las dos audiencias (creadora + 2 negocios) sin
              necesitar texto que lo explique. */}
          {/* 3 niveles de wrapper a propósito: cada uno anima/escala una
              única propiedad para que no se pisen entre sí. En Tailwind v4,
              las utilidades scale y rotate y translate y las keyframes de
              abajo (que usan `translate`/`scale` como propiedades
              independientes, no `transform`) SOLO componen sin conflicto si
              viven en elementos DISTINTOS — dos reglas escribiendo la misma
              propiedad en el mismo elemento se pisan, la última gana. */}
          <div className="relative mx-auto h-[30rem] w-full max-w-sm lg:mx-0 lg:justify-self-end">
            {/* Nivel 1: escala responsiva estática (no animada). */}
            <div className="absolute inset-0 origin-center scale-[0.72] sm:scale-[0.85] lg:scale-100">
              {/* Nivel 2: entrada única al cargar (opacity + translate + scale). */}
              <div className="motion-safe:animate-fan-in absolute inset-0">
                {/* Las 3 comparten el mismo punto de anclaje (mismo left/
                    bottom/-translate-x-1/2, origin-bottom): rotar cada una
                    alrededor de ese pivote común es lo que las abre en
                    abanico, como una mano de cartas — sin rotate + origen
                    compartido, las 3 quedan apiladas exactamente encima. */}
                <div className="absolute bottom-8 left-1/2 z-10 origin-bottom -translate-x-1/2 rotate-[-12deg] scale-[0.72]">
                  <TarjetaCard
                    {...TARJETA_ESTUDIO}
                    className="w-[20rem] shrink-0 shadow-2xl"
                  />
                </div>
                <div className="absolute bottom-8 left-1/2 z-10 origin-bottom -translate-x-1/2 rotate-[12deg] scale-[0.72]">
                  <TarjetaCard
                    {...TARJETA_ANTOJITOS}
                    className="w-[20rem] shrink-0 shadow-2xl"
                  />
                </div>
                {/* Nivel 3 (solo la de enfrente): posición estática afuera,
                    bobbing continuo adentro — mismo motivo de separación. */}
                <div className="absolute bottom-8 left-1/2 z-20 origin-bottom -translate-x-1/2 scale-[0.9]">
                  <div className="motion-safe:animate-float">
                    <TarjetaCard
                      {...TARJETA_CREADORA}
                      className="w-[20rem] shrink-0 shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Para quién es — reemplaza la agitación genérica ("¿Te ha pasado
          esto?") y la grilla de 3 iconos ("Beneficios") por algo que habla a
          las dos audiencias por igual, con capacidades concretas del
          producto real, no beneficios abstractos. */}
      <section className="border-t border-border/60 bg-zinc-50 py-20 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-5xl px-6">
          <p className="text-center text-sm text-balance text-muted-foreground">
            Tarjetas impresas que se pierden, números que cambian, ventas que se
            enfrían porque nadie guardó tu contacto — Linkard resuelve las tres.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-5 rounded-3xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <h2 className="font-[family-name:var(--font-creativa)] text-xl font-bold text-foreground">
                Para tu negocio
              </h2>
              <ul className="flex flex-col gap-4">
                {PARA_NEGOCIO.map(({ icono: Icono, texto }) => (
                  <li key={texto} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <Icono className="size-4" />
                    </span>
                    <p className="text-sm text-muted-foreground">{texto}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-5 rounded-3xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <h2 className="font-[family-name:var(--font-creativa)] text-xl font-bold text-foreground">
                Para tu contenido
              </h2>
              <ul className="flex flex-col gap-4">
                {PARA_CONTENIDO.map(({ icono: Icono, texto }) => (
                  <li key={texto} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Icono className="size-4" />
                    </span>
                    <p className="text-sm text-muted-foreground">{texto}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona — numeración real: es un proceso de 3 pasos genuino,
          no un adorno. */}
      <section className="py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center font-[family-name:var(--font-creativa)] text-3xl font-bold text-foreground">
            Lista en 3 pasos
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {PASOS.map((paso, index) => (
              <div key={paso.numero} className="flex flex-col items-start gap-3">
                <span className={`${NUMERO_CLASE} ${NUMERO_FONDO[index]}`}>{paso.numero}</span>
                <h3 className="text-base font-semibold text-foreground">{paso.titulo}</h3>
                <p className="text-sm text-muted-foreground">{paso.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tu panel, sin adivinar — vocabulario idéntico al de
          /mi-cuenta/estadisticas (Vistas, Clicks en enlaces, Agendamientos):
          "vista → click → venta" no se instrumenta hoy (compra_completada
          queda sin trackear a propósito, ver CLAUDE.md), así que el mockup
          se detiene en agendamientos, no en "ventas". */}
      <section className="border-t border-border/60 bg-zinc-50 py-20 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-3xl px-6 text-center">
          <h2 className="font-[family-name:var(--font-creativa)] text-3xl font-bold text-foreground">
            Tu panel, sin adivinar
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cada vista, cada clic y cada cita quedan en tu panel. Sabes qué
            está funcionando, no lo adivinas.
          </p>

          <div className="relative mt-10 rounded-3xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <span className="absolute right-6 top-6 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Ejemplo ilustrativo
            </span>
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              {[
                { valor: "128", etiqueta: "Vistas" },
                { valor: "34", etiqueta: "Clicks en enlaces", nota: "27% de las vistas" },
                { valor: "9", etiqueta: "Agendamientos", nota: "7% de las vistas" },
              ].map((stat, index) => (
                <div key={stat.etiqueta} className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-[family-name:var(--font-geist-mono)] text-4xl font-bold text-foreground">
                      {stat.valor}
                    </span>
                    <span className="text-sm font-medium text-foreground">{stat.etiqueta}</span>
                    {stat.nota && (
                      <span className="text-xs text-muted-foreground">{stat.nota}</span>
                    )}
                  </div>
                  {index < 2 && (
                    <ArrowRight className="size-5 shrink-0 text-muted-foreground/40 max-sm:hidden" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {testimonios.length > 0 && <TestimoniosDestacados testimonios={testimonios} />}

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
          className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-orange-500 opacity-20 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-2xl px-6 text-center">
          <h2 className="font-[family-name:var(--font-creativa)] text-3xl font-bold text-balance sm:text-4xl">
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
        <h2 className="font-[family-name:var(--font-creativa)] text-3xl font-bold text-balance text-foreground">
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
