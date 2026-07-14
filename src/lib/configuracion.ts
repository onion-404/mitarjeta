import { supabase } from "@/lib/supabase"
import type { Configuracion, Cupon } from "@/lib/types"

const CONFIGURACION_DEFECTO: Configuracion = {
  id: 1,
  precio_regular: 600,
  precio_lanzamiento: 400,
  promocion_activa: true,
  promocion_fin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
}

export async function getConfiguracionActiva(): Promise<Configuracion> {
  const { data } = await supabase
    .from("configuracion")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  return (data as Configuracion | null) ?? CONFIGURACION_DEFECTO
}

export async function actualizarConfiguracion(cambios: Partial<Configuracion>) {
  return supabase.from("configuracion").update(cambios).eq("id", 1)
}

export async function getCupones(): Promise<Cupon[]> {
  const { data } = await supabase
    .from("cupones")
    .select("*")
    .order("created_at", { ascending: false })

  return (data ?? []) as Cupon[]
}

export async function crearCupon(codigo: string, porcentajeDescuento: number) {
  return supabase.from("cupones").insert({
    codigo: codigo.trim().toUpperCase(),
    porcentaje_descuento: porcentajeDescuento,
  })
}

export async function actualizarCupon(id: string, cambios: Partial<Cupon>) {
  return supabase.from("cupones").update(cambios).eq("id", id)
}

export async function validarCupon(codigo: string): Promise<Cupon | null> {
  if (!codigo.trim()) return null

  const { data } = await supabase
    .from("cupones")
    .select("*")
    .eq("codigo", codigo.trim().toUpperCase())
    .eq("activo", true)
    .maybeSingle()

  return data as Cupon | null
}
