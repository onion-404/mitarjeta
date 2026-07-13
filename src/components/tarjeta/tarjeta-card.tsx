"use client"

import {
  Building2,
  Clock,
  Download,
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
import type { DatosContacto, IdentidadVisual, TarjetaTipo } from "@/lib/types"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"

interface TarjetaCardProps {
  tipo: TarjetaTipo
  datosContacto: DatosContacto
  identidadVisual: IdentidadVisual
  className?: string
  mostrarAcciones?: boolean
}

const GRADIENTE_PLACEHOLDER: Record<TarjetaTipo, string> = {
  personal: "from-indigo-500 via-violet-500 to-fuchsia-500",
  empresarial: "from-amber-500 via-orange-500 to-rose-500",
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
    redes,
  } = datosContacto
  const { colorPrimario, colorSecundario, avatarUrl, bannerUrl, bannerPreset } =
    identidadVisual

  const nombrePrincipal = esEmpresarial ? nombreEmpresa : nombre
  const subtitulo = esEmpresarial ? giro : puesto
  const telefonoPrincipal = esEmpresarial ? telefonoCorporativo : telefono

  const preset = obtenerBannerPreset(bannerPreset)
  const gradienteInline =
    colorPrimario && colorSecundario
      ? `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`
      : undefined

  const bannerEstilo: React.CSSProperties | undefined = bannerUrl
    ? {
        backgroundImage: `url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : preset
      ? { background: preset.background }
      : gradienteInline
        ? { background: gradienteInline }
        : undefined

  const accionClase =
    "inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100"

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
          "relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-zinc-900",
          className
        )}
      >
        <div
          className={cn(
            "h-36 w-full",
            !bannerEstilo && `bg-gradient-to-br ${GRADIENTE_PLACEHOLDER[tipo]}`
          )}
          style={bannerEstilo}
        />

        <div className="relative -mt-14 rounded-t-[2rem] border-t border-white/50 bg-white/85 px-6 pb-7 pt-3 text-center shadow-[0_-8px_30px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/85">
          <div className="-mt-14 flex justify-center">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-semibold text-zinc-500 shadow-lg ring-4 ring-white dark:text-zinc-300 dark:ring-zinc-900">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL de Cloudinary o externa
                <img
                  src={avatarUrl}
                  alt={nombrePrincipal ?? "Avatar"}
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                  {iniciales(nombrePrincipal)}
                </span>
              )}
            </div>
          </div>

          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-zinc-900/5 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            {esEmpresarial ? (
              <Building2 className="size-3" />
            ) : (
              <Sparkles className="size-3" />
            )}
            {ETIQUETA_TIPO[tipo]}
          </span>

          <h1 className="mt-2 text-xl font-semibold text-balance text-zinc-900 dark:text-zinc-50">
            {nombrePrincipal?.trim() || "Sin nombre"}
          </h1>
          {subtitulo?.trim() && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitulo}</p>
          )}

          {esEmpresarial && (horarios?.trim() || direccion?.trim()) && (
            <div className="mt-3 flex flex-col items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              {direccion?.trim() && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {direccion}
                </span>
              )}
              {horarios?.trim() && (
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
              {esEmpresarial && direccionMapsUrl && (
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
