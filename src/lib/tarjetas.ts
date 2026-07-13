import { cache } from "react"

import { supabase } from "@/lib/supabase"
import type { Tarjeta } from "@/lib/types"

export const getTarjetaPublicada = cache(async (slug: string) => {
  const { data } = await supabase
    .from("tarjetas")
    .select("*")
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle()

  return data as Tarjeta | null
})
