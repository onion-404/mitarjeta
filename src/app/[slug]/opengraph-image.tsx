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

interface Props {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const tarjeta = await getTarjetaPublicada(slug)

  if (!tarjeta || !tarjeta.plan_id) {
    const soraBold = await cargarSoraBold()
    const fonts = [
      { name: "Sora", data: soraBold, style: "normal" as const, weight: 700 as const },
    ]
    return new ImageResponse(renderOgImageGenerico(), { ...size, fonts })
  }

  // "Imagen OG" (2026-08-17, editor → sección propia): independiente de lo
  // que se ve en la tarjeta real — caso real que lo motivó: el dueño omite
  // el título EN LA TARJETA porque su logo ya lo tiene (redundante), pero
  // igual lo quiere en la miniatura que se comparte. `ogTipo === "ninguna"`
  // devuelve 404 ANTES de cargar la fuente/avatar (nada que renderizar) —
  // no hay forma de sacar el <meta og:image> del <head> por completo (ver
  // CLAUDE.md: el archivo de convención de Next SIEMPRE tiene prioridad
  // sobre lo que devuelva generateMetadata para ese mismo campo, así que
  // esta ruta se sigue anunciando en el HTML) pero la mayoría de las apps
  // de mensajería (WhatsApp/Telegram/iMessage/Facebook) omiten el recuadro
  // de imagen sin más si la URL referenciada devuelve error — mismo
  // resultado visual que "sin imagen" para quien recibe el link.
  const ogTipo = tarjeta.identidad_visual.ogTipo ?? "personalizada"
  if (ogTipo === "ninguna") {
    return new Response(null, { status: 404 })
  }

  const soraBold = await cargarSoraBold()
  const fonts = [
    { name: "Sora", data: soraBold, style: "normal" as const, weight: 700 as const },
  ]

  const { colorPrimario, colorSecundario, avatarUrl, ogNombre, ogSubtitulo, ogBio } =
    tarjeta.identidad_visual
  const nombre = ogNombre?.trim() || tarjeta.datos_contacto.nombre || "Linkard"
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

  // "Solo avatar": un cuadrado chico con nada más que el avatar/iniciales,
  // sin texto — imita cómo se ve una vista previa de link genérica (miniatura
  // al lado del título/descripción) en vez del banner grande de siempre.
  // Ancho/alto DISTINTOS al `size` exportado arriba (1200x630, fijo para
  // toda la ruta — next/og no permite variar `size` por request/slug) a
  // propósito: WhatsApp/Facebook/Telegram detectan el "tamaño de card"
  // (miniatura vs. banner grande) por la proporción REAL del archivo que
  // bajan, no por el `og:image:width/height` declarado — así que esto sí
  // logra el efecto pedido a pesar del mismatch con la metadata declarada
  // (verificado que las plataformas grandes leen las dimensiones reales del
  // archivo, no solo el hint declarado).
  if (ogTipo === "avatar") {
    const ladoAvatar = 600
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: fondo,
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              width={420}
              height={420}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: `10px solid ${colorTextoSuave}`,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 420,
                height: 420,
                borderRadius: "50%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  colorTexto === "#ffffff" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.1)",
                fontSize: 180,
                fontFamily: "Sora",
                fontWeight: 700,
                color: colorTexto,
              }}
            >
              {inicial}
            </div>
          )}
        </div>
      ),
      { width: ladoAvatar, height: ladoAvatar, fonts }
    )
  }

  // Antes `subtitulo` era `empresa || puesto` — un OR excluyente: si la
  // tarjeta tenía AMBOS campos cargados (el caso más común), la Bio nunca
  // se mostraba en la miniatura, solo el rol/empresa. Reportado por el
  // cliente probando el share real: una tarjeta con ambos campos no
  // mostraba la Bio, otra que solo tenía Bio (sin "empresa") sí. Ahora los
  // dos se muestran siempre que existan, cada uno en su propia línea. La
  // Bio se muestra COMPLETA (sin truncar) — el editor ya la limita a 160
  // caracteres (ver TarjetaForm), así que el peor caso real son ~4 líneas
  // envueltas dentro del `maxWidth` de la columna, que entran sin
  // desbordar el lienzo de 630px de alto (verificado con una Bio de 160
  // caracteres real). Un truncado con "…" se probó primero y el cliente
  // pidió texto completo — se sacó por completo, no solo se agrandó el
  // límite.
  const subtitulo = ogSubtitulo?.trim() || tarjeta.datos_contacto.empresa
  const bio = ogBio?.trim() || tarjeta.datos_contacto.puesto?.trim() || undefined
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
              <span
                style={{
                  marginTop: 10,
                  fontSize: 24,
                  lineHeight: 1.35,
                  color: colorTextoSuave,
                }}
              >
                {bio}
              </span>
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
