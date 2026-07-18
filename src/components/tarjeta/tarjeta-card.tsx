"use client"

import {
  Building2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react"
import Image from "next/image"
import * as React from "react"

import { obtenerBannerPreset } from "@/lib/banner-presets"
import { obtenerColorContraste } from "@/lib/contraste"
import { obtenerPlataforma } from "@/lib/redes"
import { cn } from "@/lib/utils"
import { obtenerYoutubeEmbedUrl } from "@/lib/youtube"
import type { DatosContacto, IdentidadVisual, ServicioAgendable, TarjetaTipo } from "@/lib/types"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"

interface TarjetaCardProps {
  tipo: TarjetaTipo
  datosContacto: DatosContacto
  identidadVisual: IdentidadVisual
  className?: string
  mostrarAcciones?: boolean
  /** Servicios agendables activos, para la sección "Agendar" (no viene de datosContacto: son filas propias, no JSONB). */
  agendaServicios?: ServicioAgendable[]
}

function formatDuracion(minutos: number) {
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

const ETIQUETA_TIPO: Record<TarjetaTipo, string> = {
  personal: "Tarjeta personal",
  empresarial: "Tarjeta empresarial",
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

function construirVCard(tipo: TarjetaTipo, datos: DatosContacto) {
  const esEmpresarial = tipo === "empresarial"
  const nombrePrincipal = esEmpresarial ? datos.nombreEmpresa : datos.nombre
  const telefono = esEmpresarial ? datos.telefonoCorporativo : datos.telefono

  const lineas = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${nombrePrincipal || "Sin nombre"}`,
    esEmpresarial ? `ORG:${nombrePrincipal || ""}` : "",
    !esEmpresarial && datos.puesto ? `TITLE:${datos.puesto}` : "",
    esEmpresarial && datos.giro ? `TITLE:${datos.giro}` : "",
    telefono ? `TEL;TYPE=WORK,VOICE:${telefono}` : "",
    !esEmpresarial && datos.whatsapp ? `TEL;TYPE=CELL:${datos.whatsapp}` : "",
    datos.email ? `EMAIL:${datos.email}` : "",
    esEmpresarial && datos.sitioWeb ? `URL:${datos.sitioWeb}` : "",
    esEmpresarial && datos.direccion ? `ADR;TYPE=WORK:;;${datos.direccion}` : "",
    "END:VCARD",
  ].filter(Boolean)

  return lineas.join("\r\n")
}

export function TarjetaCard({
  tipo,
  datosContacto,
  identidadVisual,
  className,
  mostrarAcciones = false,
  agendaServicios,
}: TarjetaCardProps) {
  const cardRef = React.useRef<HTMLElement>(null)
  const [descargandoPdf, setDescargandoPdf] = React.useState(false)

  const esEmpresarial = tipo === "empresarial"
  const {
    nombre,
    empresa,
    puesto,
    telefono,
    whatsapp,
    email,
    nombreEmpresa,
    giro,
    telefonoCorporativo,
    direccion,
    direccionMapsUrl,
    sitioWeb,
    horarios,
    videoUrl,
    descripcionServicios,
    servicios,
    productos,
    redes,
  } = datosContacto
  const {
    colorPrimario,
    colorSecundario,
    avatarUrl,
    bannerUrl,
    bannerPreset,
    brochureUrl,
    temaModo,
    avatarForma,
    estiloTipografia,
  } = identidadVisual
  const [productosAbiertos, setProductosAbiertos] = React.useState(false)
  const [serviciosAbiertos, setServiciosAbiertos] = React.useState<Set<number>>(
    () => new Set()
  )

  function toggleServicio(index: number) {
    setServiciosAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(index)) siguiente.delete(index)
      else siguiente.add(index)
      return siguiente
    })
  }

  const nombrePrincipal = esEmpresarial ? nombreEmpresa : nombre
  const subtitulo = esEmpresarial ? giro : puesto
  const telefonoPrincipal = esEmpresarial ? telefonoCorporativo : telefono
  const videoEmbedUrl = obtenerYoutubeEmbedUrl(videoUrl)
  const esOscuro = temaModo === "oscuro"
  const AVATAR_FORMA_CLASE: Record<string, string> = {
    circulo: "rounded-full",
    suave: "rounded-[2rem]",
    cuadrado: "rounded-xl",
  }
  const avatarFormaClase = AVATAR_FORMA_CLASE[avatarForma ?? "circulo"]
  const fuenteEncabezado =
    estiloTipografia === "elegante"
      ? "var(--font-elegante)"
      : estiloTipografia === "creativa"
        ? "var(--font-creativa)"
        : undefined

  const preset = obtenerBannerPreset(bannerPreset)
  const gradienteInline =
    colorPrimario && colorSecundario
      ? `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`
      : undefined
  const fondoBanner = preset?.background ?? gradienteInline
  const colorTextoCta = colorPrimario ? obtenerColorContraste(colorPrimario) : undefined
  const estiloCta = colorPrimario
    ? { backgroundColor: colorPrimario, color: colorTextoCta }
    : undefined
  const estiloBadge = colorSecundario
    ? { backgroundColor: `${colorSecundario}1a`, color: colorSecundario }
    : undefined

  // Colores en HEX/RGBA (no oklch/color-mix) para que html2canvas pueda exportar el PDF
  const accionClase =
    "inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.8)] px-3.5 py-1.5 text-xs font-medium text-[#3f3f46] shadow-sm backdrop-blur transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#f4f4f5]"

  const nombreArchivo = (nombrePrincipal || "tarjeta")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")

  function handleGuardarContacto() {
    const contenido = construirVCard(tipo, datosContacto)
    const blob = new Blob([contenido], { type: "text/vcard;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = `${nombreArchivo}.vcf`
    enlace.click()
    URL.revokeObjectURL(url)
  }

  async function handleDescargarPdf() {
    if (!cardRef.current || descargandoPdf) return
    setDescargandoPdf(true)
    try {
      const html2pdf = (await import("html2pdf.js")).default
      await html2pdf()
        .from(cardRef.current)
        .set({
          filename: `${nombreArchivo}.pdf`,
          margin: 0.2,
          jsPDF: { unit: "in", format: [4, 6], orientation: "portrait" },
          html2canvas: { scale: 2, backgroundColor: "#ffffff" },
        })
        .save()
    } finally {
      setDescargandoPdf(false)
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", esOscuro && "dark")}>
      <article
        ref={cardRef}
        className={cn(
          "relative w-full min-w-[320px] max-w-sm overflow-hidden rounded-[2rem] border border-[rgba(0,0,0,0.05)] bg-white shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#18181b]",
          className
        )}
      >
        <div data-campo="banner" className="relative h-48 w-full overflow-hidden">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 100vw, 384px"
              unoptimized={!esUrlOptimizable(bannerUrl)}
              className="object-cover object-center"
            />
          ) : (
            <div
              className={cn(
                "size-full",
                !fondoBanner && `bg-gradient-to-br ${GRADIENTE_PLACEHOLDER[tipo]}`
              )}
              style={fondoBanner ? { background: fondoBanner } : undefined}
            />
          )}
        </div>

        <div className="relative -mt-14 rounded-t-[2rem] border-t border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.85)] px-6 pb-7 pt-3 text-center shadow-[0_-8px_30px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(24,24,27,0.85)]">
          <div className="-mt-14 flex justify-center">
            <div
              data-campo="avatar"
              className={cn(
                "relative flex size-24 shrink-0 items-center justify-center overflow-hidden text-xl font-semibold text-[#71717a] shadow-lg ring-4 ring-white dark:text-[#d4d4d8] dark:ring-[#18181b]",
                avatarFormaClase
              )}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={nombrePrincipal ?? "Avatar"}
                  fill
                  sizes="96px"
                  unoptimized={!esUrlOptimizable(avatarUrl)}
                  className="object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a]">
                  {iniciales(nombrePrincipal)}
                </span>
              )}
            </div>
          </div>

          <span
            style={estiloBadge}
            className={cn(
              "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
              !estiloBadge &&
                "bg-[rgba(24,24,27,0.05)] text-[#71717a] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#a1a1aa]"
            )}
          >
            {esEmpresarial ? (
              <Building2 className="size-3" />
            ) : (
              <Sparkles className="size-3" />
            )}
            {ETIQUETA_TIPO[tipo]}
          </span>

          <h1
            data-campo="nombre"
            style={fuenteEncabezado ? { fontFamily: fuenteEncabezado } : undefined}
            className="mt-2 text-xl font-semibold text-balance text-[#18181b] dark:text-[#fafafa]"
          >
            {nombrePrincipal?.trim() || "Sin nombre"}
          </h1>
          {empresa?.trim() && (
            <p className="text-sm font-medium text-[#3f3f46] dark:text-[#d4d4d8]">{empresa}</p>
          )}
          {subtitulo?.trim() && (
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">{subtitulo}</p>
          )}

          {(direccion?.trim() || (esEmpresarial && horarios?.trim())) && (
            <div data-campo="ubicacion" className="mt-3 flex flex-col items-center gap-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
              {direccion?.trim() && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {direccion}
                </span>
              )}
              {esEmpresarial && horarios?.trim() && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {horarios}
                </span>
              )}
            </div>
          )}

          {Boolean(
            telefonoPrincipal ||
              whatsapp ||
              email ||
              sitioWeb ||
              direccionMapsUrl ||
              redes?.length
          ) && (
            <div className="mt-5 flex w-full flex-wrap items-center justify-center gap-2">
              {telefonoPrincipal && (
                <a data-campo="contacto" href={`tel:${telefonoPrincipal}`} className={accionClase}>
                  <Phone className="size-3.5" /> Llamar
                </a>
              )}
              {!esEmpresarial && whatsapp && (
                <a
                  data-campo="contacto"
                  href={`https://wa.me/${soloDigitos(whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={accionClase}
                >
                  <SOCIAL_ICONS.whatsapp className="size-3.5" /> WhatsApp
                </a>
              )}
              {email && (
                <a data-campo="contacto" href={`mailto:${email}`} className={accionClase}>
                  <Mail className="size-3.5" /> Email
                </a>
              )}
              {esEmpresarial && sitioWeb && (
                <a
                  data-campo="contacto"
                  href={sitioWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={accionClase}
                >
                  <Globe className="size-3.5" /> Sitio web
                </a>
              )}
              {direccionMapsUrl && (
                <a
                  data-campo="ubicacion"
                  href={direccionMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
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

          {(descripcionServicios?.trim() || servicios?.length || brochureUrl) && (
            <div data-campo="servicios" className="mt-5 w-full text-left">
              <h2
                style={fuenteEncabezado ? { fontFamily: fuenteEncabezado } : undefined}
                className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]"
              >
                Servicios
              </h2>
              {descripcionServicios?.trim() && (
                <p className="mt-1.5 text-sm text-[#3f3f46] dark:text-[#d4d4d8]">
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
          )}

          {Boolean(agendaServicios?.length) && (
            <div data-campo="agenda" className="mt-5 w-full text-left">
              <h2
                style={fuenteEncabezado ? { fontFamily: fuenteEncabezado } : undefined}
                className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]"
              >
                Agendar
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {agendaServicios?.map((servicio) => (
                  <div
                    key={servicio.id}
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
                ))}
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
                  style={fuenteEncabezado ? { fontFamily: fuenteEncabezado } : undefined}
                  className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]"
                >
                  Nuestros Productos ({productos?.length ?? 0})
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
                      <div className="px-1.5 py-1.5 text-center">
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

      {mostrarAcciones && (
        <div className="flex w-full max-w-sm flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleGuardarContacto}
            style={estiloCta}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
              !estiloCta && "bg-foreground text-background"
            )}
          >
            <IdCard className="size-3.5" /> Guardar contacto
          </button>
          <button
            type="button"
            onClick={handleDescargarPdf}
            disabled={descargandoPdf}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="size-3.5" />
            {descargandoPdf ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
      )}
    </div>
  )
}
