import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  Check,
  CreditCard,
  Palette,
  ShoppingBag,
  Sparkles,
  Wallet,
  X,
} from "lucide-react"
import Link from "next/link"

import { AdminShortcut } from "@/components/admin/admin-shortcut"
import { HeaderGlobal } from "@/components/header-global"
import { ContadorAnimado } from "@/components/landing/contador-animado"
import { CuponLanzamiento } from "@/components/landing/cupon-lanzamiento"
import { PreciosDestacados } from "@/components/landing/precios-destacados"
import { TarjetaTilt } from "@/components/landing/tarjeta-tilt"
import { TestimoniosDestacados } from "@/components/landing/testimonios-destacados"
import { buttonVariants } from "@/components/ui/button"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { getPlanesActivos } from "@/lib/planes"
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
  slug: "sofia-martin",
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
  slug: "estudio-raiz",
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
  slug: "tacos-el-primo",
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

const NAV_HOME = [
  { etiqueta: "Todo incluido", href: "#incluye" },
  { etiqueta: "Precios", href: "#precios" },
  { etiqueta: "Opiniones", href: "#testimonios" },
]

const ANTES = [
  "Imprimes cientos de tarjetas y la mitad termina en la basura antes de la semana.",
  "Cambias de número o de trabajo y tus contactos se pierden para siempre.",
  "Mandas capturas de pantalla borrosas de tu catálogo por WhatsApp.",
  "No tienes idea de si tu presencia digital está funcionando o no.",
]

const DESPUES = [
  "Un solo link que actualizas al instante, para siempre — nada que reimprimir.",
  "Tu cliente guarda tu contacto con un toque, sin escribir nada a mano.",
  "Tu catálogo, tu agenda y tus redes, en un lugar que se ve profesional.",
  "Un panel real te dice qué está funcionando — no lo adivinas.",
]

const INCLUYE = [
  {
    icono: Palette,
    titulo: "Personalización de verdad",
    texto:
      "Elige entre 6 plantillas premium o arma la tuya: formas de foto, colores, tipografías y efecto vidrio. Tu tarjeta se ve como tú, no como una plantilla más.",
  },
  {
    icono: Calendar,
    titulo: "Agenda con cobro opcional",
    texto:
      "Deja que agenden contigo solos, con o sin cobro por adelantado. Se acabó el ida y vuelta por WhatsApp para cuadrar un horario.",
  },
  {
    icono: ShoppingBag,
    titulo: "Venta de productos",
    texto:
      "Muestra tu catálogo y manda tráfico directo a comprar — sin que nadie se pierda buscando tu tienda o tu WhatsApp.",
  },
  {
    icono: BarChart3,
    titulo: "Panel de métricas real",
    texto:
      "Vistas, clics y agendamientos reales de tu tarjeta. Sabes qué está funcionando, no lo adivinas.",
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
    texto: "Plantilla, colores, foto y catálogo con vista previa en tiempo real.",
  },
  {
    numero: "3",
    titulo: "Comparte",
    texto: "Un link y un QR listos para tu bio, WhatsApp o mostrador.",
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
  "flex size-9 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-sm font-bold text-white"
const NUMERO_FONDO = ["bg-violet-500", "bg-fuchsia-500", "bg-indigo-500"]

export default async function Home() {
  const [testimonios, planes] = await Promise.all([getTestimoniosActivos(), getPlanesActivos()])

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#08070d] text-white">
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
              <Sparkles className="size-3.5 text-violet-400" /> LINKARD · PLATAFORMA DIGITAL
            </span>

            <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Tu presencia digital,{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                en un solo link
              </span>
              .
            </h1>
            <p className="mt-4 max-w-lg text-lg text-balance text-white/70">
              <strong className="font-semibold text-white">Linkard</strong> es la plataforma
              todo-en-uno: perfil de contacto, agenda con cobro, catálogo de productos y
              métricas reales — para negocios y para creadores.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/crear"
                className={buttonVariants({
                  size: "lg",
                  className: "bg-white px-8 text-base text-violet-700 hover:bg-white/90",
                })}
              >
                Crea tu tarjeta <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/planes"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "border-white/20 bg-white/5 px-6 text-base text-white hover:bg-white/10",
                })}
              >
                Ver planes y precios
              </Link>
            </div>

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

      {/* Antes / Después — cualitativo, sin estadísticas inventadas. */}
      <section className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-4xl px-6">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
            Sin Linkard vs. con Linkard
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-red-400">
                Sin Linkard
              </h3>
              <ul className="flex flex-col gap-4">
                {ANTES.map((texto) => (
                  <li key={texto} className="flex items-start gap-3">
                    <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                    <p className="text-sm text-white/70">{texto}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
                Con Linkard
              </h3>
              <ul className="flex flex-col gap-4">
                {DESPUES.map((texto) => (
                  <li key={texto} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    <p className="text-sm text-white/70">{texto}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Todo lo que incluye tu tarjeta — voz de venta sobre lo que Linkard
          realmente ofrece hoy, no una lista de specs genérica. */}
      <section id="incluye" className="relative border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
            Todo lo que incluye tu tarjeta
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {INCLUYE.map(({ icono: Icono, titulo, texto }) => (
              <div
                key={titulo}
                className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-colors duration-200 ease-out hover:bg-white/[0.07]"
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
            Lista en 3 pasos
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {PASOS.map((paso, index) => (
              <div key={paso.numero} className="flex flex-col items-start gap-3">
                <span className={`${NUMERO_CLASE} ${NUMERO_FONDO[index]}`}>{paso.numero}</span>
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

      {/* CTA final */}
      <section className="relative border-t border-white/10 py-24 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-balance sm:text-4xl">
          Tu próxima venta empieza con un toque
        </h2>
        <p className="mt-2 text-white/60">
          Crea tu tarjeta hoy y déjala lista para compartir en minutos.
        </p>
        <div className="mt-6">
          <Link
            href="/crear"
            className={buttonVariants({
              size: "lg",
              className: "bg-white px-8 text-base text-violet-700 hover:bg-white/90",
            })}
          >
            Crea tu tarjeta <ArrowRight className="size-4" />
          </Link>
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
