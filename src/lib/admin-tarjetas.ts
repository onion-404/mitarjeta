import { supabase } from "@/lib/supabase"
import type { TarjetaConPlan } from "@/lib/types"

// Único lugar del proyecto que trae TODAS las tarjetas (todos los usuarios)
// con su plan embebido — la policy `tarjetas_admin_todo` ya le da al admin
// acceso completo vía su propio JWT, mismo patrón que el resto del admin
// dashboard (sin service role). `admin/dashboard/page.tsx` hacía hasta hoy
// un `select("*")` plano sin join; esta función lo reemplaza para el
// listado filtrable de la tab "Tarjetas".
export async function getTodasLasTarjetasConDetalle(): Promise<TarjetaConPlan[]> {
  const { data } = await supabase
    .from("tarjetas")
    .select("*, planes(nombre_display, slug)")
    .order("created_at", { ascending: false })

  return (data ?? []) as TarjetaConPlan[]
}
