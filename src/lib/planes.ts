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
