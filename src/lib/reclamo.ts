import { supabase } from "@/lib/supabase"

const PENDIENTE_KEY = "mitarjeta_pendiente"

interface TarjetaPendiente {
  id: string
  slug: string
}

export function guardarTarjetaPendiente(tarjeta: TarjetaPendiente) {
  localStorage.setItem(PENDIENTE_KEY, JSON.stringify(tarjeta))
}

/** Intenta asignar al usuario autenticado la tarjeta de invitado guardada en localStorage. */
export async function reclamarTarjetaPendiente(
  userId: string
): Promise<TarjetaPendiente | null> {
  const raw = localStorage.getItem(PENDIENTE_KEY)
  if (!raw) return null

  const pendiente = JSON.parse(raw) as TarjetaPendiente
  const { error } = await supabase
    .from("tarjetas")
    .update({ user_id: userId })
    .eq("id", pendiente.id)
    .is("user_id", null)

  if (error) return null
  localStorage.removeItem(PENDIENTE_KEY)
  return pendiente
}
