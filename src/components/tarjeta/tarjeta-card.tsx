"use client"

import {
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react"
import Image from "next/image"
import * as React from "react"

import { obtenerBannerPreset } from "@/lib/banner-presets"
import { obtenerColorContraste } from "@/lib/contraste"
import { estiloImagenPosicionada } from "@/lib/imagen-posicion"
import { DIVISORES_BANNER, ESTILOS_TIPOGRAFIA } from "@/lib/personalizacion"
import { obtenerPlataforma } from "@/lib/redes"
import { registrarEvento, type TipoEventoCliente } from "@/lib/track-evento"
import { cn } from "@/lib/utils"
import { obtenerYoutubeEmbedUrl } from "@/lib/youtube"
import type { DatosContacto, IdentidadVisual, ServicioAgendable, TarjetaTipo } from "@/lib/types"
import { AvatarForma } from "@/components/tarjeta/avatar-forma"
import { ReservarServicio } from "@/components/tarjeta/reservar-servicio"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"

// Alto fijo (no atado al alto dinámico del panel) del layer de "imagen de
// fondo de toda la tarjeta" — ver la nota larga en IdentidadVisual.fondoImagenPosicion
// (lib/types.ts) sobre por qué no puede ser `inset-0`. Generoso a propósito:
// ninguna tarjeta real (agenda + varias secciones de servicios + productos)
// debería superar esto de alto.
const ALTO_FONDO_IMAGEN = 3000

interface TarjetaCardProps {
  tipo: TarjetaTipo
  datosContacto: DatosContacto
  identidadVisual: IdentidadVisual
  /** Enlace personalizado (el mismo de "Datos esenciales") — se muestra en el
   *  badge en vez del tipo de tarjeta. Sin slug (ej. antes de escribirlo al
   *  crear), el badge no se muestra. */
  slug?: string
  className?: string
  /** Ancho completo + sin rounded/border/shadow por debajo de `sm:` (la
   *  tarjeta pública real, `[slug]/page.tsx`) — el resto de los consumidores
   *  (demo del home, preview del editor) no lo pasan y se ven exactamente
   *  igual que siempre en cualquier viewport. */
  pantallaCompleta?: boolean
  /** Servicios agendables activos, para la sección "Agendar" (no viene de datosContacto: son filas propias, no JSONB). */
  agendaServicios?: ServicioAgendable[]
  /** Habilita la reserva interactiva por servicio (solo la tarjeta pública real la pasa;
   *  el preview del editor y el demo del home quedan igual que siempre, solo informativos). */
  permitirAgendar?: boolean
  /** Requeridos junto con permitirAgendar para llamar a /api/citas*. */
  tarjetaId?: string
  zonaHoraria?: string
}

export function formatDuracion(minutos: number) {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

// Gradientes en HEX (no oklch/lab) para compatibilidad con el exportador de PDF
const GRADIENTE_PLACEHOLDER: Record<TarjetaTipo, string> = {
  personal: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)",
  empresarial: "linear-gradient(135deg, #f59e0b, #f97316, #f43f5e)",
}

function iniciales(nombre?: string) {
  if (!nombre?.trim()) return "?"
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("")
}

function soloDigitos(valor: string) {
  return valor.replace(/[^\d]/g, "")
}

// Las URL de Cloudinary son http(s) y pueden optimizarse con next/image; las
// vistas previas locales sin guardar todavía (blob:) no, porque no existen
// en un servidor al que next/image pueda pedirlas.
function esUrlOptimizable(url: string) {
  return url.startsWith("http://") || url.startsWith("https://")
}

// Compartir/QR/contacto viven en un FAB separado (AccionesTarjeta), no
// adentro de este componente — así el mismo botón sirve tanto para la
// tarjeta pública real como para el preview "Ver tarjeta" del editor, sin
// duplicar esa lógica en cada lugar.
export function TarjetaCard({
  tipo,
  datosContacto,
  identidadVisual,
  slug,
  className,
  pantallaCompleta = false,
  agendaServicios,
  permitirAgendar = false,
  tarjetaId,
  zonaHoraria,
}: TarjetaCardProps) {
  const agendaInteractiva = permitirAgendar && Boolean(tarjetaId) && Boolean(zonaHoraria)

  // Solo la tarjeta pública real pasa tarjetaId (el preview del editor y el
  // demo del home no) — track() queda en no-op ahí, sin pegarle a /api/eventos.
  const vistaRegistradaRef = React.useRef(false)
  React.useEffect(() => {
    if (!tarjetaId || vistaRegistradaRef.current) return
    vistaRegistradaRef.current = true
    registrarEvento(tarjetaId, "vista_tarjeta")
  }, [tarjetaId])

  function track(tipoEvento: TipoEventoCliente, metadata?: Record<string, unknown>) {
    if (!tarjetaId) return
    registrarEvento(tarjetaId, tipoEvento, metadata)
  }

  const {
    nombre,
    empresa,
    puesto,
    telefono,
    whatsapp,
    email,
    direccion,
    direccionMapsUrl,
    horarios,
    videoUrl,
    descripcionServicios,
    servicios,
    seccionesServicios,
    productos,
    redes,
  } = datosContacto
  const {
    colorPrimario,
    colorSecundario,
    avatarUrl,
    avatarPosicion,
    bannerUrl,
    bannerPreset,
    brochureUrl,
    temaModo,
    avatarForma,
    estiloTipografia,
    colorTitulo,
    tituloTamano,
    tituloPeso,
    colorBotones,
    colorBadges,
    modoColorAvanzado,
    colorTextoBotones,
    colorTextoBadges,
    colorTextoGeneral,
    modoTipografiaAvanzado,
    estiloTipografiaCuerpo,
    divisorBanner,
    glassmorfismo,
    bannerPosicion,
    bannerAltura,
    fondoImagenUrl,
    fondoImagenPosicion,
    fondoTarjetaModo,
    fondoTarjetaColor,
    fondoTarjetaColorSecundario,
    fondoTarjetaTipoDegradado,
    fondoTarjetaDireccionGrados,
    tituloServicios,
    tituloProductos,
  } = identidadVisual
  const [productosAbiertos, setProductosAbiertos] = React.useState(false)
  // Legacy: expandir/colapsar la descripción de un ítem en el modelo VIEJO de
  // Servicios (una sola lista título+descripción, sin precio/imagen/enlace).
  // Se mantiene sin cambios para tarjetas no regrabadas todavía — ver
  // seccionesServiciosAbiertas de abajo para el modelo nuevo.
  const [serviciosAbiertos, setServiciosAbiertos] = React.useState<Set<number>>(
    () => new Set()
  )
  // Modelo nuevo: cada sección de Servicios es su propia grilla
  // colapsable, igual que "Productos" — un Set de índices de SECCIÓN
  // abiertas (no de ítem individual, a diferencia del legacy de arriba).
  const [seccionesServiciosAbiertas, setSeccionesServiciosAbiertas] = React.useState<
    Set<number>
  >(() => new Set())

  function toggleServicio(index: number) {
    setServiciosAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(index)) siguiente.delete(index)
      else siguiente.add(index)
      return siguiente
    })
  }

  function toggleSeccionServicios(index: number) {
    setSeccionesServiciosAbiertas((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(index)) siguiente.delete(index)
      else siguiente.add(index)
      return siguiente
    })
  }

  // Tipo único: "nombre" es el Título, "empresa" el Rol o descripción (línea
  // corta bajo el nombre) y "puesto" la Bio (párrafo largo, hasta 160
  // caracteres) — ver lib/types.ts y la sección "Datos Esenciales" del editor.
  const nombrePrincipal = nombre
  const telefonoPrincipal = telefono
  const videoEmbedUrl = obtenerYoutubeEmbedUrl(videoUrl)
  // Con un "Fondo de la tarjeta" personalizado, el contraste de TODO el
  // texto/bordes del panel (ya atados a dark: en vez de duplicarse por
  // elemento) sigue al color elegido en vez de a temaModo — mismo criterio
  // de auto-contraste que ya usan botones/badges, aplicado acá a nivel de
  // toggle .dark en vez de por className individual.
  const esOscuro = fondoTarjetaColor
    ? obtenerColorContraste(fondoTarjetaColor) === "#ffffff"
    : temaModo === "oscuro"

  // Reusa la metadata de ESTILOS_TIPOGRAFIA (lib/personalizacion.ts) en vez
  // de repetir el mapeo id → CSS var acá — con 9 estilos (ampliado
  // 2026-08-01) mantener un ternario manual duplicado se vuelve frágil.
  function fuentePorEstilo(estilo: typeof estiloTipografia) {
    return ESTILOS_TIPOGRAFIA.find((e) => e.id === estilo)?.fuente
  }
  const fuenteEncabezado = fuentePorEstilo(estiloTipografia)
  // Modo simple (default): el cuerpo usa la fuente del sistema, igual que
  // siempre. Modo avanzado: el cuerpo puede tener su propia fuente,
  // independiente de la de título — si no se eligió ninguna, cae en
  // ESTILOS_TIPOGRAFIA[0] ("moderna", sin fuente especial).
  const fuenteCuerpo = modoTipografiaAvanzado
    ? fuentePorEstilo(estiloTipografiaCuerpo ?? ESTILOS_TIPOGRAFIA[0].id)
    : undefined

  const preset = obtenerBannerPreset(bannerPreset)
  const gradienteInline =
    colorPrimario && colorSecundario
      ? `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`
      : undefined
  const fondoBanner = preset?.background ?? gradienteInline

  // Imagen de fondo de TODA la tarjeta (banner + detrás del panel) — cuando
  // está activa, tiene prioridad sobre el banner (color/preset/upload) Y
  // sobre "Fondo de la tarjeta" de abajo (mutuamente excluyentes, ver
  // CLAUDE.md). Los valores de banner/fondo-de-tarjeta NO se borran al
  // activarla — solo se ignoran en el render, así desactivarla no pierde
  // la configuración previa.
  const tieneFondoImagen = Boolean(fondoImagenUrl)
  const estiloBannerImagen = estiloImagenPosicionada(bannerPosicion)
  const estiloFondoImagen = estiloImagenPosicionada(fondoImagenPosicion)
  const alturaBanner = bannerAltura ?? 192

  // Fondo del panel de contenido (separado del fondo del banner de arriba).
  const fondoTarjetaInline =
    !tieneFondoImagen && fondoTarjetaColor
      ? fondoTarjetaModo === "avanzado" && fondoTarjetaColorSecundario
        ? fondoTarjetaTipoDegradado === "radial"
          ? `radial-gradient(circle, ${fondoTarjetaColor}, ${fondoTarjetaColorSecundario})`
          : `linear-gradient(${fondoTarjetaDireccionGrados ?? 135}deg, ${fondoTarjetaColor}, ${fondoTarjetaColorSecundario})`
        : fondoTarjetaColor
      : undefined

  // Botones/badges: colorBotones/colorBadges son nuevos, con default =
  // colorPrimario/colorSecundario para que una tarjeta que nunca los seteó
  // se vea exactamente igual que antes de este sistema.
  const colorBotonesFinal = colorBotones ?? colorPrimario
  const colorBadgesFinal = colorBadges ?? colorSecundario
  // Vidrio: fondo translúcido (sufijo de alfa en HEX) + blur. Sin soporte
  // de backdrop-filter en el navegador, el blur simplemente no aplica y
  // queda el fondo translúcido solo — se sigue viendo intencional, no
  // roto (fallback gratis, sin @supports ni JS).
  const alfaVidrio = glassmorfismo ? "cc" : ""
  const estiloVidrio = glassmorfismo
    ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
    : undefined
  const colorTextoCta =
    modoColorAvanzado && colorTextoBotones
      ? colorTextoBotones
      : colorBotonesFinal
        ? obtenerColorContraste(colorBotonesFinal)
        : undefined
  const estiloCta = colorBotonesFinal
    ? {
        backgroundColor: `${colorBotonesFinal}${alfaVidrio}`,
        color: colorTextoCta,
        ...estiloVidrio,
      }
    : undefined
  // Modo simple: badge "tintado" (fondo al 10% del color, texto sólido del
  // mismo color) — look de siempre. Modo avanzado: badge sólido con texto
  // propio, más gráfico/con más peso (ver "Mono Bold" en las plantillas).
  const colorTextoBadgeFinal =
    modoColorAvanzado && colorTextoBadges
      ? colorTextoBadges
      : colorBadgesFinal
        ? obtenerColorContraste(colorBadgesFinal)
        : undefined
  const estiloBadge = colorBadgesFinal
    ? modoColorAvanzado
      ? {
          backgroundColor: `${colorBadgesFinal}${alfaVidrio}`,
          color: colorTextoBadgeFinal,
          ...estiloVidrio,
        }
      : { backgroundColor: `${colorBadgesFinal}1a`, color: colorBadgesFinal, ...estiloVidrio }
    : undefined
  const estiloTextoGeneral = modoColorAvanzado && colorTextoGeneral ? { color: colorTextoGeneral } : undefined

  const divisorMeta = DIVISORES_BANNER.find((d) => d.id === divisorBanner)
  const estiloDivisor = divisorMeta?.clipPath ? { clipPath: divisorMeta.clipPath } : undefined

  // Colores en HEX/RGBA (no oklch/color-mix) para que html2canvas pueda exportar el PDF
  const accionClase = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
    glassmorfismo
      ? "border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.3)] text-[#3f3f46] backdrop-blur-lg dark:border-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#f4f4f5]"
      : "border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.8)] text-[#3f3f46] backdrop-blur dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#f4f4f5]"
  )

  // En pantallaCompleta (mobile), el panel de contenido nunca queda más
  // bajo que la pantalla menos el banner — así una tarjeta con poco
  // contenido (solo redes + dirección, por ej.) no deja un hueco de fondo
  // plano de la página entre el final de la tarjeta y el footer: el fondo
  // del panel (color/degradado/imagen) llena la pantalla igual. Variable
  // CSS + clase con `sm:` para apagarlo desde tablet/desktop (ahí la
  // tarjeta vuelve a ser una card chica centrada, no debe ocupar la
  // pantalla entera). `100dvh` en vez de `100vh`: en mobile real el
  // toolbar del navegador cambia el alto visible, dvh se ajusta con eso.
  const estiloAltoMinimo = pantallaCompleta
    ? ({ "--alto-min-divisor": `calc(100dvh - ${alturaBanner}px)` } as React.CSSProperties)
    : undefined

  return (
    <div className={cn("flex flex-col items-center gap-4", esOscuro && "dark")}>
      <article
        className={cn(
          "relative min-w-[320px] overflow-hidden border border-[rgba(0,0,0,0.05)] bg-white shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#18181b]",
          pantallaCompleta
            ? "w-full rounded-2xl border-0 shadow-none sm:max-w-sm sm:rounded-[2rem] sm:border sm:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)]"
            : "w-full max-w-sm rounded-[2rem]",
          className
        )}
      >
        {tieneFondoImagen &&
          (pantallaCompleta ? (
            // Pantalla completa (tarjeta pública real / preview "Ver
            // tarjeta"): la imagen cubre el viewport entero en `fixed`, no
            // solo el alto de la tarjeta — así se ve como un fondo real de
            // página en vez de una imagen "adentro" de la card, y de paso
            // no depende en absoluto de cuánto crezca el contenido. Se
            // apaga en sm: (la card vuelve a ser chica y centrada, un
            // fondo a pantalla completa detrás no tendría sentido ahí).
            <div className="fixed inset-0 z-0 sm:hidden" aria-hidden>
              <Image
                src={fondoImagenUrl!}
                alt=""
                fill
                priority
                sizes="100vw"
                unoptimized={!esUrlOptimizable(fondoImagenUrl!)}
                className="object-cover"
                style={estiloFondoImagen}
              />
            </div>
          ) : null)}
        {tieneFondoImagen && (
          // Versión contenida (siempre en desktop/sm:, y la única versión
          // en cualquier consumidor que no sea pantallaCompleta — preview
          // chico del editor, demo del home): alto FIJO
          // (ALTO_FONDO_IMAGEN), no `inset-0` atado al alto dinámico del
          // panel — ver el comentario largo en
          // IdentidadVisual.fondoImagenPosicion (lib/types.ts). El
          // `<article>` recorta con overflow-hidden todo lo que exceda el
          // alto real de la tarjeta, así que esto no desborda nada. Sin
          // `priority`: en pantallaCompleta ya la tiene la versión `fixed`
          // de arriba (mismo src, no hace falta preload duplicado).
          <div
            className={cn(
              "absolute inset-x-0 top-0 z-0",
              pantallaCompleta && "hidden sm:block"
            )}
            style={{ height: ALTO_FONDO_IMAGEN }}
            aria-hidden
          >
            <Image
              src={fondoImagenUrl!}
              alt=""
              fill
              priority={!pantallaCompleta}
              sizes="(max-width: 640px) 100vw, 384px"
              unoptimized={!esUrlOptimizable(fondoImagenUrl!)}
              className="object-cover"
              style={estiloFondoImagen}
            />
          </div>
        )}

        <div
          data-campo="banner"
          className="relative z-10 w-full overflow-hidden"
          style={{ height: alturaBanner }}
        >
          {!tieneFondoImagen &&
            (bannerUrl ? (
              <Image
                src={bannerUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 640px) 100vw, 384px"
                unoptimized={!esUrlOptimizable(bannerUrl)}
                className="object-cover"
                style={estiloBannerImagen}
              />
            ) : (
              <div
                className={cn(
                  "size-full",
                  !fondoBanner && `bg-gradient-to-br ${GRADIENTE_PLACEHOLDER[tipo]}`
                )}
                style={fondoBanner ? { background: fondoBanner } : undefined}
              />
            ))}
        </div>

        <div
          data-campo="divisor"
          style={{
            ...estiloAltoMinimo,
            ...estiloDivisor,
            ...(tieneFondoImagen ? undefined : { background: fondoTarjetaInline }),
          }}
          className={cn(
            "relative z-10 -mt-14 border-t px-6 pb-7 pt-3 text-center shadow-[0_-8px_30px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl",
            pantallaCompleta && "min-h-[var(--alto-min-divisor)] sm:min-h-0",
            !estiloDivisor && (pantallaCompleta ? "rounded-2xl sm:rounded-t-[2rem]" : "rounded-t-[2rem]"),
            tieneFondoImagen
              ? "border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.55)] dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(24,24,27,0.55)]"
              : fondoTarjetaInline
                ? "border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.1)]"
                : "border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.85)] dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(24,24,27,0.85)]"
          )}
        >
          <div className="-mt-14 flex justify-center">
            <div data-campo="avatar">
              <AvatarForma
                forma={avatarForma}
                tamanoPx={96}
                imagenUrl={avatarUrl}
                imagenPosicion={avatarPosicion}
                alt={nombrePrincipal ?? "Avatar"}
                iniciales={iniciales(nombrePrincipal)}
                unoptimized={avatarUrl ? !esUrlOptimizable(avatarUrl) : undefined}
              />
            </div>
          </div>

          {slug?.trim() && (
            <span
              style={estiloBadge}
              className={cn(
                "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
                !estiloBadge &&
                  "bg-[rgba(24,24,27,0.05)] text-[#71717a] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#a1a1aa]"
              )}
            >
              <Sparkles className="size-3" />
              @{slug.trim()}
            </span>
          )}

          <h1
            data-campo="nombre"
            style={{
              fontFamily: fuenteEncabezado,
              ...estiloTextoGeneral,
              fontSize: tituloTamano ? `${tituloTamano}px` : undefined,
              fontWeight: tituloPeso ?? undefined,
              ...(colorTitulo ? { color: colorTitulo } : undefined),
            }}
            className="mt-2 text-xl font-semibold text-balance text-[#18181b] dark:text-[#fafafa]"
          >
            {nombrePrincipal?.trim() || "Sin nombre"}
          </h1>
          {empresa?.trim() && (
            <p
              style={{ fontFamily: fuenteCuerpo, ...estiloTextoGeneral }}
              className="text-sm font-medium text-[#3f3f46] dark:text-[#d4d4d8]"
            >
              {empresa}
            </p>
          )}
          {puesto?.trim() && (
            <p
              data-campo="bio"
              style={{ fontFamily: fuenteCuerpo, ...estiloTextoGeneral }}
              className="mt-1.5 max-w-xs text-sm whitespace-pre-line text-[#52525b] dark:text-[#a1a1aa]"
            >
              {puesto}
            </p>
          )}

          {(direccion?.trim() || horarios?.trim()) && (
            <div
              data-campo="ubicacion"
              style={estiloTextoGeneral}
              className="mt-3 flex flex-col items-center gap-1 text-xs text-[#71717a] dark:text-[#a1a1aa]"
            >
              {direccion?.trim() && (
                <span className="inline-flex items-start gap-1">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span>{direccion}</span>
                </span>
              )}
              {horarios?.trim() && (
                <span className="inline-flex items-start gap-1">
                  <Clock className="mt-0.5 size-3.5 shrink-0" />
                  <span>{horarios}</span>
                </span>
              )}
            </div>
          )}

          {Boolean(
            telefonoPrincipal || whatsapp || email || direccionMapsUrl || redes?.length
          ) && (
            <div className="mt-5 flex w-full flex-wrap items-center justify-center gap-2">
              {telefonoPrincipal && (
                <a
                  data-campo="contacto"
                  href={`tel:${telefonoPrincipal}`}
                  onClick={() => track("click_enlace", { tipo_enlace: "tel" })}
                  className={accionClase}
                >
                  <Phone className="size-3.5" /> Llamar
                </a>
              )}
              {whatsapp && (
                <a
                  data-campo="contacto"
                  href={`https://wa.me/${soloDigitos(whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("click_enlace", { tipo_enlace: "whatsapp" })}
                  className={accionClase}
                >
                  <SOCIAL_ICONS.whatsapp className="size-3.5" /> WhatsApp
                </a>
              )}
              {email && (
                <a
                  data-campo="contacto"
                  href={`mailto:${email}`}
                  onClick={() => track("click_enlace", { tipo_enlace: "email" })}
                  className={accionClase}
                >
                  <Mail className="size-3.5" /> Email
                </a>
              )}
              {direccionMapsUrl && (
                <a
                  data-campo="ubicacion"
                  href={direccionMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("click_enlace", { tipo_enlace: "ubicacion" })}
                  className={accionClase}
                >
                  <MapPin className="size-3.5" /> Cómo llegar
                </a>
              )}
              {redes?.map((red) => {
                if (!red.url) return null
                const Icono = SOCIAL_ICONS[red.plataforma] ?? Globe
                const etiqueta =
                  red.plataforma === "personalizado"
                    ? red.label || "Enlace"
                    : obtenerPlataforma(red.plataforma).nombre
                return (
                  <a
                    key={red.url}
                    data-campo="redes"
                    href={red.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      track("click_enlace", { tipo_enlace: "red_social", red: red.plataforma })
                    }
                    className={accionClase}
                  >
                    <Icono className="size-3.5" /> {etiqueta}
                  </a>
                )
              })}
            </div>
          )}

          {videoEmbedUrl && (
            <div data-campo="video" className="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.1)]">
              <iframe
                src={videoEmbedUrl}
                title={`Video de ${nombrePrincipal || "la tarjeta"}`}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}

          {seccionesServicios?.length ? (
            // Modelo nuevo: N secciones tipo catálogo (mismo patrón visual
            // que la grilla de "Productos" de abajo — título, precio,
            // descripción, imagen, enlace por ítem). El folleto PDF sigue
            // colgado de la sección [0] únicamente.
            seccionesServicios.map((seccion, indiceSeccion) => {
              const tituloSeccion =
                seccion.titulo?.trim() || (indiceSeccion === 0 ? "Servicios" : `Sección ${indiceSeccion + 1}`)
              const mostrarBrochure = indiceSeccion === 0 && Boolean(brochureUrl)
              if (!seccion.items.length && !mostrarBrochure) return null
              const abierta = seccionesServiciosAbiertas.has(indiceSeccion)
              return (
                <div
                  key={indiceSeccion}
                  data-campo={`servicios-${indiceSeccion}`}
                  className="mt-5 w-full text-left"
                >
                  {seccion.items.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleSeccionServicios(indiceSeccion)}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <h2
                        style={{ fontFamily: fuenteEncabezado, ...estiloTextoGeneral }}
                        className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]"
                      >
                        {tituloSeccion} ({seccion.items.length})
                      </h2>
                      <ChevronDown
                        className={cn(
                          "size-3.5 shrink-0 text-[#71717a] transition-transform duration-200 ease-out dark:text-[#a1a1aa]",
                          abierta && "rotate-180"
                        )}
                      />
                    </button>
                  ) : (
                    <h2
                      style={{ fontFamily: fuenteEncabezado, ...estiloTextoGeneral }}
                      className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]"
                    >
                      {tituloSeccion}
                    </h2>
                  )}
                  {abierta && seccion.items.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2.5">
                      {seccion.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex flex-col overflow-hidden rounded-xl border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.08)]"
                        >
                          {item.imagenUrl ? (
                            <div className="relative aspect-square w-full">
                              <Image
                                src={item.imagenUrl}
                                alt={item.titulo}
                                fill
                                sizes="(max-width: 640px) 30vw, 128px"
                                unoptimized={!esUrlOptimizable(item.imagenUrl)}
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-square w-full bg-[#f4f4f5] dark:bg-[#27272a]" />
                          )}
                          <div style={estiloTextoGeneral} className="px-1.5 py-1.5 text-center">
                            <p className="truncate text-[11px] font-medium text-[#18181b] dark:text-[#fafafa]">
                              {item.titulo}
                            </p>
                            {item.descripcion?.trim() && (
                              <p className="mt-0.5 line-clamp-2 text-[10px] text-[#71717a] dark:text-[#a1a1aa]">
                                {item.descripcion}
                              </p>
                            )}
                            {item.precio?.trim() && (
                              <p className="mt-0.5 text-[10px] font-semibold text-[#18181b] dark:text-[#fafafa]">
                                ${item.precio}
                              </p>
                            )}
                            {item.enlaceUrl?.trim() && (
                              <a
                                href={item.enlaceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#3f3f46] underline underline-offset-2 dark:text-[#d4d4d8]"
                              >
                                Ver más <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {mostrarBrochure && (
                    <a
                      href={brochureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={estiloCta}
                      className={cn(
                        "mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
                        !estiloCta && "bg-foreground text-background"
                      )}
                    >
                      <FileText className="size-3.5" /> Descargar folleto (PDF)
                    </a>
                  )}
                </div>
              )
            })
          ) : (
            // Legacy: tarjeta todavía no regrabada con el modelo nuevo — se
            // mantiene el render viejo exacto (una sola lista título+
            // descripción, con la descripción general y el folleto) para no
            // perder contenido real ya publicado. En cuanto el dueño guarda
            // una vez desde el editor, pasa a `seccionesServicios` y esta
            // rama deja de usarse para esa tarjeta.
            (descripcionServicios?.trim() || servicios?.length || brochureUrl) && (
              <div data-campo="servicios-0" className="mt-5 w-full text-left">
                <h2
                  style={{ fontFamily: fuenteEncabezado, ...estiloTextoGeneral }}
                  className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]"
                >
                  {tituloServicios?.trim() || "Servicios"}
                </h2>
                {descripcionServicios?.trim() && (
                  <p
                    style={{ fontFamily: fuenteCuerpo, ...estiloTextoGeneral }}
                    className="mt-1.5 text-sm text-[#3f3f46] dark:text-[#d4d4d8]"
                  >
                    {descripcionServicios}
                  </p>
                )}
                {Boolean(servicios?.length) && (
                  <div className="mt-3 flex flex-col gap-2">
                    {servicios?.map((servicio, index) => {
                      const abierto = serviciosAbiertos.has(index)
                      const tieneDescripcion = Boolean(servicio.descripcion?.trim())
                      return (
                        <div
                          key={index}
                          style={estiloTextoGeneral}
                          className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.08)]"
                        >
                          <button
                            type="button"
                            onClick={() => tieneDescripcion && toggleServicio(index)}
                            className="flex w-full items-center justify-between gap-2 bg-[rgba(24,24,27,0.03)] p-3 text-left dark:bg-[rgba(255,255,255,0.05)]"
                          >
                            <span className="flex items-center gap-1.5 text-sm font-medium text-[#18181b] dark:text-[#fafafa]">
                              {servicio.titulo}
                            </span>
                            {tieneDescripcion && (
                              <ChevronDown
                                className={cn(
                                  "size-3.5 shrink-0 text-[#71717a] transition-transform duration-200 ease-out dark:text-[#a1a1aa]",
                                  abierto && "rotate-180"
                                )}
                              />
                            )}
                          </button>
                          {abierto && tieneDescripcion && (
                            <p className="border-t border-[rgba(0,0,0,0.05)] p-3 text-xs text-[#71717a] dark:border-[rgba(255,255,255,0.08)] dark:text-[#a1a1aa]">
                              {servicio.descripcion}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {brochureUrl && (
                  <a
                    href={brochureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={estiloCta}
                    className={cn(
                      "mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
                      !estiloCta && "bg-foreground text-background"
                    )}
                  >
                    <FileText className="size-3.5" /> Descargar folleto (PDF)
                  </a>
                )}
              </div>
            )
          )}

          {Boolean(agendaServicios?.length) && (
            <div data-campo="agenda" className="mt-5 w-full text-left">
              <h2
                style={{ fontFamily: fuenteEncabezado, ...estiloTextoGeneral }}
                className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]"
              >
                Agendar
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {agendaServicios?.map((servicio) =>
                  agendaInteractiva ? (
                    <ReservarServicio
                      key={servicio.id}
                      tarjetaId={tarjetaId!}
                      zonaHoraria={zonaHoraria!}
                      servicio={servicio}
                    />
                  ) : (
                    <div
                      key={servicio.id}
                      style={estiloTextoGeneral}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(0,0,0,0.05)] p-3 dark:border-[rgba(255,255,255,0.08)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#18181b] dark:text-[#fafafa]">
                          {servicio.nombre}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                          <Clock className="size-3" /> {formatDuracion(servicio.duracion_minutos)}
                          {" · "}
                          {servicio.requiere_pago_inmediato ? "Pago al agendar" : "Pago contra entrega"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[#18181b] dark:text-[#fafafa]">
                        ${servicio.precio}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {Boolean(productos?.length) && (
            <div data-campo="productos" className="mt-5 w-full text-left">
              <button
                type="button"
                onClick={() => setProductosAbiertos((valor) => !valor)}
                className="flex w-full items-center justify-between gap-2"
              >
                <h2
                  style={{ fontFamily: fuenteEncabezado, ...estiloTextoGeneral }}
                  className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]"
                >
                  {tituloProductos?.trim() || "Productos"} ({productos?.length ?? 0})
                </h2>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-[#71717a] transition-transform duration-200 ease-out dark:text-[#a1a1aa]",
                    productosAbiertos && "rotate-180"
                  )}
                />
              </button>
              {productosAbiertos && (
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {productos?.map((producto, index) => (
                    <div
                      key={index}
                      className="flex flex-col overflow-hidden rounded-xl border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.08)]"
                    >
                      {producto.imagenUrl ? (
                        <div className="relative aspect-square w-full">
                          <Image
                            src={producto.imagenUrl}
                            alt={producto.titulo}
                            fill
                            sizes="(max-width: 640px) 30vw, 128px"
                            unoptimized={!esUrlOptimizable(producto.imagenUrl)}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square w-full bg-[#f4f4f5] dark:bg-[#27272a]" />
                      )}
                      <div style={estiloTextoGeneral} className="px-1.5 py-1.5 text-center">
                        <p className="truncate text-[11px] font-medium text-[#18181b] dark:text-[#fafafa]">
                          {producto.titulo}
                        </p>
                        {producto.descripcion?.trim() && (
                          <p className="mt-0.5 line-clamp-2 text-[10px] text-[#71717a] dark:text-[#a1a1aa]">
                            {producto.descripcion}
                          </p>
                        )}
                        {producto.precio?.trim() && (
                          <p className="mt-0.5 text-[10px] font-semibold text-[#18181b] dark:text-[#fafafa]">
                            ${producto.precio}
                          </p>
                        )}
                        {producto.enlaceUrl?.trim() && (
                          <a
                            href={producto.enlaceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              track("click_producto", { producto_titulo: producto.titulo })
                            }
                            className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#3f3f46] underline underline-offset-2 dark:text-[#d4d4d8]"
                          >
                            Ver producto <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
