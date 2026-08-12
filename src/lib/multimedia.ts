import { obtenerYoutubeEmbedUrl } from "@/lib/youtube"
import type { DatosContacto, MultimediaItem, MultimediaTipo } from "@/lib/types"

// ============================================================================
// "Contenido multimedia" (2026-08-13) — mismo patrón que la unificación de
// Botones (lib/boton-cta.ts): un solo `videoUrl` de YouTube pasa a ser una
// lista tipada de ítems (video/galería), con migración en memoria desde el
// campo legacy — nunca se escribe hasta el próximo "Guardar".
// ============================================================================

export const TOPE_MULTIMEDIA = 4
export const TOPE_GALERIA_ITEMS = 8

export const MULTIMEDIA_TIPO_ETIQUETA: Record<MultimediaTipo, string> = {
  video: "Video",
  galeria: "Galería",
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

// Tipos válidos hoy — usado por `normalizarMultimedia()` para descartar
// cualquier ítem con un `tipo` desconocido (defensivo: cubre el caso real
// de una tarjeta que ya tenía ítems `tipo: "reels"` guardados de la feature
// vieja, retirada por completo el 2026-08-15, ver CLAUDE.md — sin esto,
// esos ítems viejos quedarían huérfanos en el render público en vez de
// simplemente no mostrarse).
const TIPOS_VALIDOS = new Set<MultimediaTipo>(["video", "galeria"])

/** Migración en memoria (mismo criterio que `normalizarBotones()`,
 *  lib/boton-cta.ts): si `datosContacto.multimedia` ya existe (aunque sea
 *  `[]` — la tarjeta ya pasó por el editor nuevo, incluso si borró todo),
 *  se usa tal cual (filtrando tipos desconocidos, ver `TIPOS_VALIDOS`).
 *  Solo se sintetiza un ítem "video" desde el `videoUrl` legacy cuando
 *  `multimedia` es `undefined` (tarjeta nunca regrabada desde este
 *  cambio). ID determinístico (nunca `crypto.randomUUID()`, ver
 *  CLAUDE.md) para no romper memoización entre renders. Nunca escribe. */
export function normalizarMultimedia(datosContacto: DatosContacto): MultimediaItem[] {
  if (datosContacto.multimedia) {
    return datosContacto.multimedia.filter((item) => TIPOS_VALIDOS.has(item.tipo))
  }
  if (datosContacto.videoUrl?.trim()) {
    return [{ id: "migrado-video", tipo: "video", url: datosContacto.videoUrl }]
  }
  return []
}
