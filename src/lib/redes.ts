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
  { id: "personalizado", nombre: "Personalizado", prefijo: "", placeholder: "https://tu-enlace.com" },
]

export function obtenerPlataforma(id: PlataformaRed) {
  return PLATAFORMAS.find((p) => p.id === id) ?? PLATAFORMAS[PLATAFORMAS.length - 1]
}
