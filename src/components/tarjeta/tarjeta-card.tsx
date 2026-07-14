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
import * as React from "react"

import { obtenerBannerPreset } from "@/lib/banner-presets"
import { obtenerPlataforma } from "@/lib/redes"
import { cn } from "@/lib/utils"
import { obtenerYoutubeEmbedUrl } from "@/lib/youtube"
import type { DatosContacto, IdentidadVisual, TarjetaTipo } from "@/lib/types"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"

interface TarjetaCardProps {
  tipo: TarjetaTipo
  datosContacto: DatosContacto
  identidadVisual: IdentidadVisual
  className?: string
  mostrarAcciones?: boolean
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
}: TarjetaCardProps) {
  const cardRef = React.useRef<HTMLElement>(null)
  const [descargandoPdf, setDescargandoPdf] = React.useState(false)

  const esEmpresarial = tipo === "empresarial"
  const {
    nombre,
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
  } = identidadVisual
  const [mostrarTodosProductos, setMostrarTodosProductos] = React.useState(false)

  const nombrePrincipal = esEmpresarial ? nombreEmpresa : nombre
  const subtitulo = esEmpresarial ? giro : puesto
  const telefonoPrincipal = esEmpresarial ? telefonoCorporativo : telefono
  const videoEmbedUrl = obtenerYoutubeEmbedUrl(videoUrl)
  const PRODUCTOS_VISIBLES = 3
  const productosAMostrar = mostrarTodosProductos
    ? productos
    : productos?.slice(0, PRODUCTOS_VISIBLES)

  const preset = obtenerBannerPreset(bannerPreset)
  const gradienteInline =
    colorPrimario && colorSecundario
      ? `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`
      : undefined
  const fondoBanner = preset?.background ?? gradienteInline

  // Colores en HEX/RGBA (no oklch/color-mix) para que html2canvas pueda exportar el PDF
  const accionClase =
    "inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.8)] px-3.5 py-1.5 text-xs font-medium text-[#3f3f46] shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#f4f4f5]"

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
    <div className="flex flex-col items-center gap-4">
      <article
        ref={cardRef}
        className={cn(
          "relative w-full min-w-[320px] max-w-sm overflow-hidden rounded-[2rem] border border-[rgba(0,0,0,0.05)] bg-white shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#18181b]",
          className
        )}
      >
        <div className="relative h-48 w-full overflow-hidden">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL de Cloudinary o externa
            <img
              src={bannerUrl}
              alt=""
              className="size-full w-full object-cover object-center"
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
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-semibold text-[#71717a] shadow-lg ring-4 ring-white dark:text-[#d4d4d8] dark:ring-[#18181b]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL de Cloudinary o externa
                <img
                  src={avatarUrl}
                  alt={nombrePrincipal ?? "Avatar"}
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a]">
                  {iniciales(nombrePrincipal)}
                </span>
              )}
            </div>
          </div>

          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[rgba(24,24,27,0.05)] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#71717a] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#a1a1aa]">
            {esEmpresarial ? (
              <Building2 className="size-3" />
            ) : (
              <Sparkles className="size-3" />
            )}
            {ETIQUETA_TIPO[tipo]}
          </span>

          <h1 className="mt-2 text-xl font-semibold text-balance text-[#18181b] dark:text-[#fafafa]">
            {nombrePrincipal?.trim() || "Sin nombre"}
          </h1>
          {subtitulo?.trim() && (
            <p className="text-sm text-[#71717a] dark:text-[#a1a1aa]">{subtitulo}</p>
          )}

          {(direccion?.trim() || (esEmpresarial && horarios?.trim())) && (
            <div className="mt-3 flex flex-col items-center gap-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
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
                <a href={`tel:${telefonoPrincipal}`} className={accionClase}>
                  <Phone className="size-3.5" /> Llamar
                </a>
              )}
              {!esEmpresarial && whatsapp && (
                <a
                  href={`https://wa.me/${soloDigitos(whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={accionClase}
                >
                  <SOCIAL_ICONS.whatsapp className="size-3.5" /> WhatsApp
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className={accionClase}>
                  <Mail className="size-3.5" /> Email
                </a>
              )}
              {esEmpresarial && sitioWeb && (
                <a
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
            <div className="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.1)]">
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
            <div className="mt-5 w-full text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]">
                Servicios
              </h2>
              {descripcionServicios?.trim() && (
                <p className="mt-1.5 text-sm text-[#3f3f46] dark:text-[#d4d4d8]">
                  {descripcionServicios}
                </p>
              )}
              {Boolean(servicios?.length) && (
                <div className="mt-3 flex flex-col gap-2">
                  {servicios?.map((servicio, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-[rgba(0,0,0,0.05)] bg-[rgba(24,24,27,0.03)] p-3 dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.05)]"
                    >
                      <p className="text-sm font-medium text-[#18181b] dark:text-[#fafafa]">
                        {servicio.titulo}
                      </p>
                      {servicio.descripcion?.trim() && (
                        <p className="mt-0.5 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                          {servicio.descripcion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {brochureUrl && (
                <a
                  href={brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                >
                  <FileText className="size-3.5" /> Descargar folleto (PDF)
                </a>
              )}
            </div>
          )}

          {Boolean(productos?.length) && (
            <div className="mt-5 w-full text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]">
                Productos
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {productosAMostrar?.map((producto, index) => (
                  <div
                    key={index}
                    className="flex flex-col overflow-hidden rounded-xl border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.08)]"
                  >
                    {producto.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL de Cloudinary
                      <img
                        src={producto.imagenUrl}
                        alt={producto.titulo}
                        className="aspect-square w-full object-cover"
                      />
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
              {productos && productos.length > PRODUCTOS_VISIBLES && (
                <button
                  type="button"
                  onClick={() => setMostrarTodosProductos((valor) => !valor)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1 text-xs font-medium text-[#3f3f46] hover:underline dark:text-[#d4d4d8]"
                >
                  {mostrarTodosProductos
                    ? "Ver menos"
                    : `Ver más productos (${productos.length - PRODUCTOS_VISIBLES})`}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      mostrarTodosProductos && "rotate-180"
                    )}
                  />
                </button>
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
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          >
            <IdCard className="size-3.5" /> Guardar contacto
          </button>
          <button
            type="button"
            onClick={handleDescargarPdf}
            disabled={descargandoPdf}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="size-3.5" />
            {descargandoPdf ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
      )}
    </div>
  )
}
