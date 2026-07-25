import { cache } from "react"

import { supabase } from "@/lib/supabase"
import type { PeriodicidadSuscripcion, ServicioAgendable, Tarjeta } from "@/lib/types"

export const getTarjetaPublicada = cache(async (slug: string) => {
  const { data } = await supabase
    .from("tarjetas")
    .select("*")
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle()

  return data as Tarjeta | null
})

interface FilaServicioConTarjeta extends ServicioAgendable {
  tarjetas: { plan_id: string | null } | null
}

/**
 * Servicios agendables activos de una tarjeta, para la vista pública.
 * Filtra explícitamente `tarjetas.plan_id IS NOT NULL` (vía `!inner` para que
 * el filtro sobre la tabla embebida restrinja las filas, no solo el embed):
 * una tarjeta sin suscripción autorizada (plan_id null: nunca pagó, o se le
 * pausó/canceló) no debe seguir mostrando ni permitiendo agendar servicios ya
 * creados, aunque `servicios_agendables_select_publica` (RLS) no lo exija —
 * ese hardening a nivel de RLS queda pendiente (ver CLAUDE.md), esto es un
 * filtro de aplicación mientras tanto.
 */
export async function getServiciosAgendablesActivos(
  tarjetaId: string
): Promise<ServicioAgendable[]> {
  const { data } = await supabase
    .from("servicios_agendables")
    .select("*, tarjetas!inner(plan_id)")
    .eq("tarjeta_id", tarjetaId)
    .eq("activo", true)
    .not("tarjetas.plan_id", "is", null)
    .order("created_at", { ascending: true })

  return ((data ?? []) as FilaServicioConTarjeta[]).map(
    (fila): ServicioAgendable => ({
      id: fila.id,
      tarjeta_id: fila.tarjeta_id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      duracion_minutos: fila.duracion_minutos,
      precio: fila.precio,
      requiere_pago_inmediato: fila.requiere_pago_inmediato,
      activo: fila.activo,
      created_at: fila.created_at,
    })
  )
}

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

/**
 * Recupera plan_id/periodicidad de la suscripción más reciente de una
 * tarjeta sin plan activo (plan_id null) — para poder ofrecer de nuevo la
 * sección "Tu plan" en /editar cuando alguien creó la tarjeta, llegó a
 * Stripe, y canceló o abandonó el checkout sin completar el pago. Trae
 * cualquier proveedor (incluye filas viejas de Mercado Pago, previas a la
 * migración a Stripe) y cualquier estado — si lo único que hay es una fila
 * `cancelada`/`vencida`, igual sirve para saber qué plan intentaba comprar.
 */
export async function getSuscripcionPendientePorTarjeta(tarjetaId: string) {
  const { data } = await supabase
    .from("suscripciones")
    .select("plan_id, periodicidad")
    .eq("tarjeta_id", tarjetaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as { plan_id: string; periodicidad: PeriodicidadSuscripcion } | null
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
