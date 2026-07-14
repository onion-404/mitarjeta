export function obtenerYoutubeEmbedUrl(url?: string): string | null {
  if (!url?.trim()) return null

  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, "")
  let id: string | null = null

  if (host === "youtu.be") {
    id = parsed.pathname.slice(1)
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v")
    } else if (parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.split("/")[2]
    } else if (parsed.pathname.startsWith("/shorts/")) {
      id = parsed.pathname.split("/")[2]
    }
  }

  if (!id) return null
  return `https://www.youtube.com/embed/${id}`
}
