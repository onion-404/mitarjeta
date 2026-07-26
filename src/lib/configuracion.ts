import { supabase } from "@/lib/supabase"
import type { Configuracion } from "@/lib/types"

const CONFIGURACION_DEFECTO: Configuracion = {
  id: 1,
  precio_regular: 600,
  precio_lanzamiento: 400,
  promocion_activa: true,
  promocion_fin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  descuento_tarjeta_adicional_pct: 0,
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
