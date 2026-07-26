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

// Edición real de precios vigentes (admin/configuracion) — solo
// precio_mensual/anual, no toca slug/orden/features/activo, que no tienen
// UI de edición todavía. El Price que ya usan las suscripciones activas NO
// se recalcula retroactivamente (Stripe usa price_data inline al momento
// de cada checkout, ver CLAUDE.md) — un cambio acá solo afecta a
// suscripciones NUEVAS creadas después del cambio.
export async function actualizarPlan(
  id: string,
  cambios: Partial<Pick<Plan, "precio_mensual" | "precio_anual">>
) {
  return supabase.from("planes").update(cambios).eq("id", id)
}
