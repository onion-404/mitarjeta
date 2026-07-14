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

// Nota: sin `cache()` a propósito, se usan desde componentes cliente
// (efectos/handlers), no en render de servidor.
export async function getTarjetaPorId(id: string) {
  const { data } = await supabase
    .from("tarjetas")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  return data as Tarjeta | null
}

export async function getTarjetasDeUsuario(userId: string) {
  const { data } = await supabase
    .from("tarjetas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return (data ?? []) as Tarjeta[]
}

export function nombrePrincipalDeTarjeta(tarjeta: Tarjeta) {
  const datos = tarjeta.datos_contacto
  return (
    (tarjeta.tipo === "empresarial" ? datos.nombreEmpresa : datos.nombre) ||
    "Sin nombre"
  )
}
