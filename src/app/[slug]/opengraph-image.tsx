import { ImageResponse } from "next/og"

import { obtenerColorContraste } from "@/lib/contraste"
import { cargarSoraBold, renderOgImageGenerico } from "@/lib/og"
import { getTarjetaPublicada } from "@/lib/tarjetas"

export const alt = "Linkard — tarjeta digital"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/**
 * Descarga el avatar de Cloudinary y lo convierte a data URI ANTES de
 * construir el ImageResponse. Satori sí soporta <img src="https://..."> con
 * fetch remoto, pero esa carga ocurre de forma perezosa dentro del
 * ReadableStream de ImageResponse (ver next/dist/server/og/image-response.js)
 * — un try/catch alrededor de `new ImageResponse(...)` NO alcanza a
 * capturarla. Resolviendo la imagen acá, con nuestro propio try/catch, una
 * foto rota/lenta cae a las iniciales en vez de romper la imagen OG entera.
 */
async function cargarImagenBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const tipo = res.headers.get("content-type") || "image/jpeg"
    return `data:${tipo};base64,${Buffer.from(buffer).toString("base64")}`
  } catch {
    return null
  }
}

/** Corta a `maxLargo` caracteres (respetando palabras enteras cuando se
 *  puede) — la imagen OG es de alto fijo, no hay wrap/line-clamp confiable
 *  para un párrafo largo de Bio acá. */
function recortarTexto(valor: string | undefined, maxLargo: number): string | undefined {
  const texto = valor?.trim()
  if (!texto) return undefined
  if (texto.length <= maxLargo) return texto
  const cortado = texto.slice(0, maxLargo)
  const ultimoEspacio = cortado.lastIndexOf(" ")
  return `${(ultimoEspacio > maxLargo * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).trim()}…`
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const soraBold = await cargarSoraBold()
  const fonts = [
    { name: "Sora", data: soraBold, style: "normal" as const, weight: 700 as const },
  ]

  const tarjeta = await getTarjetaPublicada(slug)

  if (!tarjeta || !tarjeta.plan_id) {
    return new ImageResponse(renderOgImageGenerico(), { ...size, fonts })
  }

  const nombre = tarjeta.datos_contacto.nombre || "Linkard"
  // Antes `subtitulo` era `empresa || puesto` — un OR excluyente: si la
  // tarjeta tenía AMBOS campos cargados (el caso más común), la Bio nunca
  // se mostraba en la miniatura, solo el rol/empresa. Reportado por el
  // cliente probando el share real: una tarjeta con ambos campos no
  // mostraba la Bio, otra que solo tenía Bio (sin "empresa") sí. Ahora los
  // dos se muestran siempre que existan, cada uno en su propia línea — la
  // Bio truncada a una sola línea (con `recortarTexto`) porque el lienzo
  // de la imagen OG es de alto fijo (630px) y Satori no soporta
  // text-overflow/line-clamp de forma confiable.
  const subtitulo = tarjeta.datos_contacto.empresa
  const bio = recortarTexto(tarjeta.datos_contacto.puesto, 90)

  const { colorPrimario, colorSecundario, avatarUrl } = tarjeta.identidad_visual
  const fondo =
    colorPrimario && colorSecundario
      ? `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`
      : colorPrimario || "#171717"
  const colorTexto = obtenerColorContraste(colorPrimario || "#171717")
  const colorTextoSuave =
    colorTexto === "#ffffff" ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.6)"
  const colorMarcaAgua =
    colorTexto === "#ffffff" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"

  const avatarSrc = avatarUrl ? await cargarImagenBase64(avatarUrl) : null
  const inicial = nombre.trim().charAt(0).toUpperCase() || "L"
  const fontSizeNombre = nombre.length > 22 ? 56 : 72

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: fondo,
          padding: "0 96px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              width={220}
              height={220}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: `6px solid ${colorTextoSuave}`,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 220,
                height: 220,
                borderRadius: "50%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  colorTexto === "#ffffff"
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(0,0,0,0.1)",
                fontSize: 96,
                fontFamily: "Sora",
                fontWeight: 700,
                color: colorTexto,
              }}
            >
              {inicial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <span
              style={{
                fontSize: fontSizeNombre,
                fontFamily: "Sora",
                fontWeight: 700,
                color: colorTexto,
                lineHeight: 1.1,
              }}
            >
              {nombre}
            </span>
            {subtitulo ? (
              <span style={{ marginTop: 14, fontSize: 32, color: colorTextoSuave }}>
                {subtitulo}
              </span>
            ) : null}
            {bio ? (
              <span style={{ marginTop: 10, fontSize: 24, color: colorTextoSuave }}>{bio}</span>
            ) : null}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 96,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24">
            <polygon points="12,3 22,21 2,21" fill={colorMarcaAgua} />
          </svg>
          <span
            style={{
              fontSize: 28,
              fontFamily: "Sora",
              fontWeight: 700,
              color: colorMarcaAgua,
            }}
          >
            Linkard
          </span>
        </div>
      </div>
    ),
    { ...size, fonts }
  )
}
