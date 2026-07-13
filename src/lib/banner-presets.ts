export interface BannerPreset {
  id: string
  nombre: string
  background: string
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: "aurora",
    nombre: "Aurora",
    background:
      "radial-gradient(at 15% 20%, #818cf8 0, transparent 55%), radial-gradient(at 85% 10%, #f0abfc 0, transparent 55%), radial-gradient(at 50% 100%, #38bdf8 0, transparent 60%), #6366f1",
  },
  {
    id: "sunset",
    nombre: "Atardecer",
    background:
      "radial-gradient(at 10% 10%, #fb923c 0, transparent 55%), radial-gradient(at 90% 30%, #f472b6 0, transparent 55%), radial-gradient(at 50% 100%, #fbbf24 0, transparent 60%), #f97316",
  },
  {
    id: "mint",
    nombre: "Menta",
    background:
      "radial-gradient(at 15% 25%, #2dd4bf 0, transparent 55%), radial-gradient(at 85% 15%, #a3e635 0, transparent 55%), radial-gradient(at 50% 100%, #34d399 0, transparent 60%), #10b981",
  },
  {
    id: "noir",
    nombre: "Noir",
    background:
      "radial-gradient(at 20% 20%, #52525b 0, transparent 55%), radial-gradient(at 80% 80%, #27272a 0, transparent 55%), #18181b",
  },
  {
    id: "citrus",
    nombre: "Cítrico",
    background:
      "radial-gradient(at 20% 20%, #facc15 0, transparent 55%), radial-gradient(at 80% 10%, #4ade80 0, transparent 55%), radial-gradient(at 50% 100%, #fb7185 0, transparent 60%), #eab308",
  },
]

export function obtenerBannerPreset(id?: string) {
  return BANNER_PRESETS.find((preset) => preset.id === id)
}
