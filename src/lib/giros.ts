import type { Giro } from "@/lib/types"

export interface GiroInfo {
  id: Giro
  label: string
}

// Lista cerrada — DEBE coincidir 1:1 con el CHECK constraint de
// supabase/migrations/20260817000000_add_tarjeta_giro.sql. Agregar/quitar un
// giro requiere actualizar los dos lugares a mano (no hay una fuente de
// verdad compartida entre SQL y TS en este proyecto).
export const GIROS: GiroInfo[] = [
  { id: "salud_bienestar", label: "Salud y Bienestar" },
  { id: "belleza_estetica", label: "Belleza y Estética" },
  { id: "gastronomia", label: "Gastronomía" },
  { id: "comercio_retail", label: "Comercio y Tiendas" },
  { id: "legal_consultoria", label: "Legal y Consultoría" },
  { id: "automotriz", label: "Automotriz" },
  { id: "hogar_servicios", label: "Hogar y Servicios" },
  { id: "educacion", label: "Educación y Capacitación" },
  { id: "arte_diseno", label: "Arte y Diseño" },
  { id: "eventos", label: "Eventos y Organización" },
  { id: "inmobiliaria", label: "Inmobiliaria y Construcción" },
  { id: "creadores_freelance", label: "Creadores y Freelancers" },
  { id: "otro", label: "Otro" },
]

export function obtenerGiro(id?: string | null): GiroInfo | undefined {
  return GIROS.find((giro) => giro.id === id)
}
