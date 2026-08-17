import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CreditCard,
  LayoutGrid,
  Link2,
  Sparkles,
  Wallet,
  X,
} from "lucide-react"
import Link from "next/link"

import { AdminShortcut } from "@/components/admin/admin-shortcut"
import { HeaderGlobal } from "@/components/header-global"
import { ContadorAnimado } from "@/components/landing/contador-animado"
import { CuponLanzamiento } from "@/components/landing/cupon-lanzamiento"
import { FaqAcordeon } from "@/components/landing/faq-acordeon"
import { PreciosDestacados } from "@/components/landing/precios-destacados"
import { ReclamarLink } from "@/components/landing/reclamar-link"
import { ShowcaseNichos } from "@/components/landing/showcase-nichos"
import { TarjetaTilt } from "@/components/landing/tarjeta-tilt"
import { TestimoniosDestacados } from "@/components/landing/testimonios-destacados"
import { buttonVariants } from "@/components/ui/button"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { getPlanesActivos } from "@/lib/planes"
import { getTarjetaEjemploPorGiro } from "@/lib/tarjetas"
import { getTestimoniosActivos } from "@/lib/testimonios"
import type { Giro } from "@/lib/types"

import { TARJETA_ANTOJITOS, TARJETA_CREADORA, TARJETA_ESTUDIO } from "@/components/landing/tarjetas-demo"

// Giros que hoy tienen su propio tab en el showcase de la landing (ver
// showcase-nichos.tsx) — se resuelve acá, server-side, cuál Linkard real
// mostrar (o ninguna, y el componente cae a su mockup de ejemplo).
const GIROS_SHOWCASE: Giro[] = ["salud_bienestar", "belleza_estetica", "legal_consultoria", "gastronomia"]

export const dynamic = "force-dynamic"

const NAV_HOME = [
  { etiqueta: "Nichos", href: "#nichos" },
  { etiqueta: "Todo incluido", href: "#incluye" },
  { etiqueta: "Precios", href: "#precios" },
  { etiqueta: "Preguntas", href: "#faq" },
]

// Tabla "Sin Linkard vs. con Linkard" — comparación fila a fila, no dos
// listas sueltas: cada índice de SIN_LINKARD se lee junto a su par en
// CON_LINKARD.
const SIN_LINKARD = [
  "Perder horas respondiendo DMs con precios y horarios.",
  "Mandar números de cuenta o links de pago sueltos por chat.",
  "Enviar PDFs pesados o catálogos desactualizados.",
  "Usar un \"link en bio\" tradicional que solo tiene botones aburridos.",
]

const CON_LINKARD = [
  "Tu cliente agenda y paga solo, sin que muevas un dedo.",
  "Cobra por tu tiempo o tus servicios por adelantado, de forma segura.",
  "Muestra tus productos y servicios impecables en segundos.",
  "Una mini página web profesional que proyecta autoridad y cierra ventas.",
]

const INCLUYE = [
  {
    icono: CreditCard,
    titulo: "Cobro de citas y servicios",
    texto:
      "Cobra el anticipo o el total de tus citas al instante. Tu cliente paga con tarjeta directo desde tu Linkard, sin salir del chat.",
  },
  {
    icono: Calendar,
    titulo: "Agendamiento de citas inteligente",
    texto:
      "Tu agenda se llena sin mensajes de ida y vuelta. Define tus horarios disponibles y deja que reserven las 24 horas del día.",
  },
  {
    icono: LayoutGrid,
    titulo: "Catálogo y portafolio visual",
    texto:
      "Muestra tu trabajo y enamora a primera vista. Organiza tus productos, servicios o proyectos en un catálogo armado por ti.",
  },
  {
    icono: Link2,
    titulo: "Red de enlaces y contacto directo",
    texto:
      "Conecta tu WhatsApp, tus redes sociales, un archivo descargable y tu ubicación — todo en un solo lugar, sin verse saturado.",
  },
]

const PASOS = [
  {
    numero: "01",
    titulo: "Crea y personaliza",
    texto: "Elige tu diseño, sube tu foto o logo y completa tus datos en minutos.",
  },
  {
    numero: "02",
    titulo: "Agrega tus servicios o tu agenda",
    texto: "Define cuánto cobras, tu catálogo y tus horarios de atención.",
  },
  {
    numero: "03",
    titulo: "Pega tu link en tus redes",
    texto: "Ponlo en Instagram, TikTok o WhatsApp y empieza a recibir clientes en automático.",
  },
]

const PROXIMAMENTE = [
  {
    icono: Wallet,
    titulo: "Wallet",
    texto: "Guarda tu tarjeta en Apple Wallet o Google Wallet, como un boarding pass.",
  },
  {
    icono: CreditCard,
    titulo: "Checkout nativo (Linkard Pago)",
    texto: "Cobra tus productos sin salir de tu tarjeta ni depender de enlaces externos.",
  },
  {
    icono: Bot,
    titulo: "Asistente de IA",
    texto: "Que te ayude a escribir tu perfil, tus servicios y tus respuestas automáticas.",
  },
]

const NUMERO_CLASE =
  "flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-[family-name:var(--font-display)] text-base font-extrabold text-white shadow-[0_0_20px_-4px_var(--tw-shadow-color)]"
const NUMERO_SOMBRA = ["shadow-violet-500/60", "shadow-fuchsia-500/60", "shadow-indigo-500/60"]

export default async function Home() {
  const [testimonios, planes, tarjetasPorGiro] = await Promise.all([
    getTestimoniosActivos(),
    getPlanesActivos(),
    Promise.all(GIROS_SHOWCASE.map((giro) => getTarjetaEjemploPorGiro(giro))),
  ])

  // Solo los 3 campos que <TarjetaCard> necesita (ver tarjetas-demo.ts) —
  // giros sin ninguna Linkard real todavía quedan afuera del objeto, y
  // ShowcaseNichos cae a su mockup de ejemplo para esos.
  const tarjetasReales = Object.fromEntries(
    GIROS_SHOWCASE.map((giro, index) => [giro, tarjetasPorGiro[index]] as const)
      .filter(([, tarjeta]) => tarjeta !== null)
      .map(([giro, tarjeta]) => [
        giro,
        {
          tipo: tarjeta!.tipo,
          slug: tarjeta!.slug,
          datosContacto: tarjeta!.datos_contacto,
          identidadVisual: tarjeta!.identidad_visual,
        },
      ])
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#090a0f] text-white">
      <AdminShortcut />

      <HeaderGlobal variant="flotante" nav={NAV_HOME} />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 size-[32rem] rounded-full bg-indigo-600/30 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-40 size-[28rem] rounded-full bg-fuchsia-600/20 blur-[100px]"
        />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
          <div className="flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-xs font-medium tracking-tight text-white/70 backdrop-blur">
              🚀 Mucho más que un &quot;link en tu bio&quot;
            </span>

            <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Transforma tus seguidores en clientes.{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                Tu agenda, pagos y servicios en un solo link.
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-balance text-white/70">
              Deja de perder tiempo respondiendo &quot;¿qué precio tiene?&quot; o coordinando
              horarios por mensaje. Con <strong className="font-semibold text-white">Linkard</strong>,
              tus clientes agendan y pagan su cita, ven tu catálogo completo y te contactan —
              todo en automático.
            </p>

            <ReclamarLink />
            <p className="mt-3 text-sm text-white/50">
              ⚡ Listo para compartir en menos de 3 minutos.
            </p>

            <Link
              href="/editar"
              className="mt-4 text-sm font-medium text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              ¿Ya tienes una tarjeta? Edítala aquí
            </Link>
          </div>

          {/* Abanico de 3 tarjetas reales con tilt 3D — la firma visual de
              la página: muestra personalización real (3 bannerPresets, 3
              estilos de tipografía) y las dos audiencias sin necesitar
              texto que lo explique. El tilt envuelve el conjunto completo
              en un wrapper PROPIO (TarjetaTilt) — no toca ninguna de las
              propiedades translate/scale/rotate que ya usa el abanico
              interno, así no hay conflicto de composición. */}
          <TarjetaTilt className="relative mx-auto h-[30rem] w-full max-w-sm lg:mx-0 lg:justify-self-end">
            {/* Nivel 1: escala responsiva estática (no animada). */}
            <div className="absolute inset-0 origin-center scale-[0.72] sm:scale-[0.85] lg:scale-100">
              {/* Nivel 2: entrada única al cargar (opacity + translate + scale). */}
              <div className="motion-safe:animate-fan-in absolute inset-0">
                {/* Las 3 comparten el mismo punto de anclaje (mismo left/
                    bottom/-translate-x-1/2, origin-bottom): rotar cada una
                    alrededor de ese pivote común es lo que las abre en
                    abanico, como una mano de cartas. */}
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
          </TarjetaTilt>
        </div>
      </section>

      {/* Cupón de lanzamiento — contador real vía fn_cupon_usos_restantes(),
          no un setInterval falso. Ver CLAUDE.md. */}
      <section className="relative px-6 pb-20">
        <CuponLanzamiento codigo="LINKARD15" porcentaje={15} />
      </section>

      {/* Showcase por nichos — misma <TarjetaCard> real detrás de cada
          pestaña (ver showcase-nichos.tsx), no capturas estáticas. */}
      <section id="nichos" className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
            Un Linkard para cada tipo de negocio
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-white/60">
            Así se ve un Linkard armado para tu rubro — elige tu categoría y mira el resultado.
          </p>
          <div className="mt-12">
            <ShowcaseNichos tarjetasReales={tarjetasReales} />
          </div>
        </div>
      </section>

      {/* Sin Linkard vs. con Linkard — fila a fila, no dos listas sueltas. */}
      <section className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-4xl px-6">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
            Por qué los negocios eligen Linkard frente a un link tradicional
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-white/60">
            Compara lo que vives hoy contra lo que lograrás con tu perfil automatizado.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <h3 className="px-2 pb-2 text-xs font-semibold tracking-wide text-red-400 uppercase">
                ❌ Sin Linkard
              </h3>
              {SIN_LINKARD.map((texto) => (
                <div
                  key={texto}
                  className="flex min-h-[4.5rem] items-start gap-3 rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-4"
                >
                  <X className="mt-0.5 size-4 shrink-0 text-red-400/80" />
                  <p className="text-sm text-white/60">{texto}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="px-2 pb-2 text-xs font-semibold tracking-wide text-violet-300 uppercase">
                ✅ Con Linkard
              </h3>
              {CON_LINKARD.map((texto) => (
                <div
                  key={texto}
                  className="flex min-h-[4.5rem] items-start gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/[0.08] p-4 shadow-[0_0_30px_-15px_rgba(139,92,246,0.8)]"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <p className="text-sm text-white/85">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Todo lo que incluye tu tarjeta — voz de venta sobre lo que Linkard
          realmente ofrece hoy, no una lista de specs genérica. */}
      <section id="incluye" className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
            Todo lo que tu negocio necesita en una sola herramienta
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {INCLUYE.map(({ icono: Icono, titulo, texto }) => (
              <div
                key={titulo}
                className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white/[0.07]"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Icono className="size-5" />
                </span>
                <h3 className="text-lg font-semibold text-white">{titulo}</h3>
                <p className="text-sm text-white/60">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona — numeración real: es un proceso de 3 pasos genuino. */}
      <section className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-extrabold">
            Tu Linkard listo en menos de 3 minutos
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {PASOS.map((paso, index) => (
              <div key={paso.numero} className="flex flex-col items-start gap-3">
                <span className={`${NUMERO_CLASE} ${NUMERO_SOMBRA[index]}`}>{paso.numero}</span>
                <h3 className="text-base font-semibold text-white">{paso.titulo}</h3>
                <p className="text-sm text-white/60">{paso.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Métricas — números ilustrativos (referencia visual, decisión
          explícita del cliente de no etiquetarlos como ejemplo, ver
          CLAUDE.md), con animación de conteo al entrar en viewport. */}
      <section className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-3xl px-6 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
            Tu panel, sin adivinar
          </h2>
          <p className="mt-3 text-white/60">
            Cada vista, cada clic y cada cita quedan en tu panel.
          </p>

          <div className="relative mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              {[
                { valor: 128, etiqueta: "Vistas" },
                { valor: 34, etiqueta: "Clicks en enlaces", nota: "27% de las vistas" },
                { valor: 9, etiqueta: "Agendamientos", nota: "7% de las vistas" },
              ].map((stat, index) => (
                <div key={stat.etiqueta} className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <ContadorAnimado
                      valor={stat.valor}
                      className="font-[family-name:var(--font-geist-mono)] text-4xl font-bold text-white"
                    />
                    <span className="text-sm font-medium text-white">{stat.etiqueta}</span>
                    {stat.nota && <span className="text-xs text-white/50">{stat.nota}</span>}
                  </div>
                  {index < 2 && (
                    <ArrowRight className="size-5 shrink-0 text-white/20 max-sm:hidden" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {testimonios.length > 0 && (
        <div id="testimonios">
          <TestimoniosDestacados testimonios={testimonios} />
        </div>
      )}

      <PreciosDestacados planes={planes} />

      {/* FAQ — rompiendo objeciones antes del CTA final. */}
      <section id="faq" className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-2xl px-6">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
            Preguntas frecuentes
          </h2>
          <div className="mt-10">
            <FaqAcordeon />
          </div>
        </div>
      </section>

      {/* Próximamente — roadmap real confirmado, presentado como tal. */}
      <section className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
            Próximamente en Linkard
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PROXIMAMENTE.map(({ icono: Icono, titulo, texto }) => (
              <div
                key={titulo}
                className="relative flex flex-col gap-3 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8"
              >
                <span className="absolute right-5 top-5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                  Próximamente
                </span>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white/80">
                  <Icono className="size-5" />
                </span>
                <h3 className="text-base font-semibold text-white">{titulo}</h3>
                <p className="text-sm text-white/50">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final — card de cierre con glow, alto impacto. */}
      <section className="relative border-t border-white/10 py-24">
        <div className="mx-auto w-full max-w-3xl px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-violet-950/60 via-[#0d0b16] to-fuchsia-950/40 p-10 text-center shadow-[0_0_120px_-30px_rgba(139,92,246,0.5)] sm:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 size-[28rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-violet-600/30 blur-[100px]"
            />
            <div className="relative flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-xs font-medium text-white/70 backdrop-blur">
                <Sparkles className="size-3.5 text-violet-400" /> LINKARD
              </span>
            </div>
            <h2 className="relative mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
              ¿Listo para automatizar tus ventas y agendar citas mientras duermes?
            </h2>
            <p className="relative mt-3 text-white/60">
              Únete a los profesionales que ya le dieron un giro a su presencia digital.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link
                href="/crear"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 text-base text-white transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]",
                })}
              >
                Crear mi Linkard <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/10 py-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-white/50">
          <Link href="/politica-privacidad" className="underline-offset-4 hover:text-white hover:underline">
            Política de Privacidad
          </Link>
          <Link href="/condiciones-servicio" className="underline-offset-4 hover:text-white hover:underline">
            Condiciones de Servicio
          </Link>
          <Link href="/login" className="underline-offset-4 hover:text-white hover:underline">
            Acceso Admin
          </Link>
        </div>
      </footer>
    </div>
  )
}
