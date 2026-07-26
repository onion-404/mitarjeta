import { supabase } from "@/lib/supabase"
import type { Testimonio } from "@/lib/types"

// Admin: todas las filas (activas e inactivas), ordenadas para reflejar el
// orden de despliegue real del home.
export async function getTestimonios(): Promise<Testimonio[]> {
  const { data } = await supabase.from("testimonios").select("*").order("orden")

  return (data ?? []) as Testimonio[]
}

// Home: sin "server-only" a propósito, mismo criterio que getPlanesActivos()
// (lib/planes.ts) — se llama directo desde un server component.
export async function getTestimoniosActivos(): Promise<Testimonio[]> {
  const { data } = await supabase
    .from("testimonios")
    .select("*")
    .eq("activo", true)
    .order("orden")

  return (data ?? []) as Testimonio[]
}

interface CrearTestimonioInput {
  nombre: string
  rolONegocio: string
  cita: string
  avatarUrl?: string | null
  calificacion?: number | null
  orden: number
}

export async function crearTestimonio(input: CrearTestimonioInput) {
  return supabase.from("testimonios").insert({
    nombre: input.nombre.trim(),
    rol_o_negocio: input.rolONegocio.trim(),
    cita: input.cita.trim(),
    avatar_url: input.avatarUrl || null,
    calificacion: input.calificacion ?? null,
    orden: input.orden,
  })
}

export async function actualizarTestimonio(id: string, cambios: Partial<Testimonio>) {
  return supabase.from("testimonios").update(cambios).eq("id", id)
}

export async function eliminarTestimonio(id: string) {
  return supabase.from("testimonios").delete().eq("id", id)
}

// Usado dos veces (una por fila) para intercambiar `orden` entre vecinos al
// mover una fila arriba/abajo en /admin/testimonios — sin librería de
// drag-and-drop, la lista es corta y no hay ninguna otra en el proyecto.
export async function guardarOrden(id: string, orden: number) {
  return supabase.from("testimonios").update({ orden }).eq("id", id)
}

// Compartido entre /admin/testimonios (miniatura de la lista) y
// testimonios-destacados.tsx (avatar en el home) — fallback cuando no hay
// avatar_url.
export function inicialesDeNombre(nombre: string): string {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "?"
  )
}
