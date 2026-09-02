import type { PlataformaRed } from "@/lib/types"

export interface PlataformaConfig {
  id: PlataformaRed
  nombre: string
  prefijo: string
  placeholder: string
}

export const PLATAFORMAS: PlataformaConfig[] = [
  { id: "instagram", nombre: "Instagram", prefijo: "https://instagram.com/", placeholder: "usuario" },
  { id: "facebook", nombre: "Facebook", prefijo: "https://facebook.com/", placeholder: "usuario" },
  { id: "tiktok", nombre: "TikTok", prefijo: "https://tiktok.com/@", placeholder: "usuario" },
  { id: "linkedin", nombre: "LinkedIn", prefijo: "https://linkedin.com/in/", placeholder: "usuario" },
  { id: "youtube", nombre: "YouTube", prefijo: "https://youtube.com/@", placeholder: "canal" },
  { id: "whatsapp", nombre: "WhatsApp", prefijo: "https://wa.me/", placeholder: "5491122334455" },
  { id: "x", nombre: "X / Twitter", prefijo: "https://x.com/", placeholder: "usuario" },
  { id: "reddit", nombre: "Reddit", prefijo: "https://reddit.com/user/", placeholder: "usuario" },
  { id: "spotify", nombre: "Spotify", prefijo: "https://open.spotify.com/user/", placeholder: "usuario o playlist" },
  { id: "github", nombre: "GitHub", prefijo: "https://github.com/", placeholder: "usuario" },
  { id: "discord", nombre: "Discord", prefijo: "https://discord.gg/", placeholder: "código de invitación" },
  { id: "twitch", nombre: "Twitch", prefijo: "https://twitch.tv/", placeholder: "usuario" },
  { id: "pinterest", nombre: "Pinterest", prefijo: "https://pinterest.com/", placeholder: "usuario" },
  { id: "snapchat", nombre: "Snapchat", prefijo: "https://snapchat.com/add/", placeholder: "usuario" },
  { id: "telegram", nombre: "Telegram", prefijo: "https://t.me/", placeholder: "usuario o canal" },
  { id: "threads", nombre: "Threads", prefijo: "https://threads.net/@", placeholder: "usuario" },
  { id: "personalizado", nombre: "Personalizado", prefijo: "", placeholder: "https://tu-enlace.com" },
]

export function obtenerPlataforma(id: PlataformaRed) {
  return PLATAFORMAS.find((p) => p.id === id) ?? PLATAFORMAS[PLATAFORMAS.length - 1]
}
