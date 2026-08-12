import { obtenerYoutubeEmbedUrl } from "@/lib/youtube"
import type { DatosContacto, MultimediaItem, MultimediaTipo } from "@/lib/types"

// ============================================================================
// "Contenido multimedia" (2026-08-13) — mismo patrón que la unificación de
// Botones (lib/boton-cta.ts): un solo `videoUrl` de YouTube pasa a ser una
// lista tipada de ítems (video/reels), con migración en memoria desde el
// campo legacy — nunca se escribe hasta el próximo "Guardar".
// ============================================================================

export const TOPE_MULTIMEDIA = 4
export const TOPE_REELS_POR_BLOQUE = 5

export const MULTIMEDIA_TIPO_ETIQUETA: Record<MultimediaTipo, string> = {
  video: "Video",
  reels: "Reels de Instagram",
}

export type ProveedorVideo = "youtube" | "vimeo"

export interface EmbedVideo {
  proveedor: ProveedorVideo
  embedUrl: string
}

// Vimeo no tiene un helper propio como YouTube — un solo patrón simple: el
// ID es el último segmento puramente numérico del path, cubre tanto
// vimeo.com/123456789 y player.vimeo.com/video/123456789 como las variantes
// vimeo.com/channels/<canal>/123456789 y vimeo.com/groups/<grupo>/videos/123456789
// (el ID real sigue siendo el último tramo numérico en los 4 casos).
function obtenerVimeoEmbedUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, "")
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null
  const segmentos = parsed.pathname.split("/").filter(Boolean)
  const id = [...segmentos].reverse().find((segmento) => /^\d+$/.test(segmento))
  if (!id) return null
  return `https://player.vimeo.com/video/${id}`
}

/** Auto-detecta el proveedor a partir de la URL — el dueño no elige "es de
 *  YouTube o Vimeo" a mano, un solo campo de URL alcanza. */
export function resolverEmbedVideo(url?: string): EmbedVideo | null {
  const youtube = obtenerYoutubeEmbedUrl(url)
  if (youtube) return { proveedor: "youtube", embedUrl: youtube }
  if (!url?.trim()) return null
  const vimeo = obtenerVimeoEmbedUrl(url)
  if (vimeo) return { proveedor: "vimeo", embedUrl: vimeo }
  return null
}

// Embed directo por iframe (https://www.instagram.com/reel/{codigo}/embed) en
// vez del script oficial de Instagram (embed.js + <blockquote>) — a
// propósito: evita cargar y ejecutar JS de terceros en la tarjeta pública
// (superficie de seguridad/performance de más para lo que hace falta acá),
// mismo criterio que YouTube/Vimeo, que también se resuelven a un iframe
// simple. Contrapartida conocida: sin contador de likes/comentarios ni el
// chrome visual completo de Instagram, solo el video.
export function obtenerInstagramReelEmbedUrl(url?: string): string | null {
  if (!url?.trim()) return null
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, "")
  if (host !== "instagram.com") return null
  const match = parsed.pathname.match(/^\/(?:reel|reels|p)\/([^/]+)/)
  if (!match) return null
  return `https://www.instagram.com/reel/${match[1]}/embed`
}

/** Migración en memoria (mismo criterio que `normalizarBotones()`,
 *  lib/boton-cta.ts): si `datosContacto.multimedia` ya existe (aunque sea
 *  `[]` — la tarjeta ya pasó por el editor nuevo, incluso si borró todo),
 *  se usa tal cual. Solo se sintetiza un ítem "video" desde el `videoUrl`
 *  legacy cuando `multimedia` es `undefined` (tarjeta nunca regrabada desde
 *  este cambio). ID determinístico (nunca `crypto.randomUUID()`, ver
 *  CLAUDE.md) para no romper memoización entre renders. Nunca escribe. */
export function normalizarMultimedia(datosContacto: DatosContacto): MultimediaItem[] {
  if (datosContacto.multimedia) return datosContacto.multimedia
  if (datosContacto.videoUrl?.trim()) {
    return [{ id: "migrado-video", tipo: "video", url: datosContacto.videoUrl }]
  }
  return []
}
