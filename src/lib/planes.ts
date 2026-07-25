import { supabase } from "@/lib/supabase"
import type { Plan } from "@/lib/types"

export async function getPlanesActivos(): Promise<Plan[]> {
  const { data } = await supabase
    .from("planes")
    .select("*")
    .eq("activo", true)
    .order("orden")

  return (data ?? []) as Plan[]
}

export async function getPlanPorSlug(slug: string): Promise<Plan | null> {
  const { data } = await supabase
    .from("planes")
    .select("*")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle()

  return data as Plan | null
}

// Sin filtro `activo` a propósito: recupera el plan de una suscripción ya
// elegida (ver getSuscripcionPendientePorTarjeta en lib/tarjetas.ts) — si el
// plan se desactivó después de que alguien lo eligiera, igual necesita poder
// completar el pago de ESE plan puntual.
export async function getPlanPorId(id: string): Promise<Plan | null> {
  const { data } = await supabase.from("planes").select("*").eq("id", id).maybeSingle()

  return data as Plan | null
}
