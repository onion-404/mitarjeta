import { cache } from "react"

import { supabase } from "@/lib/supabase"
import type {
  EstadoSuscripcion,
  PeriodicidadSuscripcion,
  ProveedorSuscripcion,
  ServicioAgendable,
  Tarjeta,
  TarjetaConPlan,
} from "@/lib/types"

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

// Con el plan embebido (join por plan_id) — lo necesitan tanto el avatar/
// nombre de HeaderGlobal (no usa `planes`, pero el campo extra no le
// afecta) como el listado filtrable de /mi-cuenta/tarjetas.
export async function getTarjetasDeUsuario(userId: string): Promise<TarjetaConPlan[]> {
  const { data } = await supabase
    .from("tarjetas")
    .select("*, planes(nombre_display, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return (data ?? []) as TarjetaConPlan[]
}

export interface SuscripcionResumen {
  id: string
  tarjeta_id: string
  estado: EstadoSuscripcion
  proveedor: ProveedorSuscripcion
  stripe_customer_id: string | null
  plan_id: string
  periodicidad: PeriodicidadSuscripcion
  precio_final: number
  created_at: string
}

/**
 * La suscripción MÁS RECIENTE de cada tarjeta (no solo las activas — una
 * tarjeta puede tener una fila `cancelada`/`vencida` vieja seguida de una
 * `pendiente` nueva por un reintento) — para /mi-cuenta/suscripcion, que
 * necesita saber si ya existe `stripe_customer_id` para habilitar el botón
 * "Administrar pago" de cada tarjeta. La policy `suscripciones_select_propia`
 * ya le da al dueño acceso vía su propio JWT, mismo patrón que el resto de
 * este archivo.
 */
export async function getSuscripcionesDeUsuario(
  tarjetaIds: string[]
): Promise<Record<string, SuscripcionResumen>> {
  if (tarjetaIds.length === 0) return {}

  const { data } = await supabase
    .from("suscripciones")
    .select(
      "id, tarjeta_id, estado, proveedor, stripe_customer_id, plan_id, periodicidad, precio_final, created_at"
    )
    .in("tarjeta_id", tarjetaIds)
    .order("created_at", { ascending: false })

  const porTarjeta: Record<string, SuscripcionResumen> = {}
  for (const fila of (data ?? []) as SuscripcionResumen[]) {
    if (!porTarjeta[fila.tarjeta_id]) porTarjeta[fila.tarjeta_id] = fila
  }
  return porTarjeta
}

export function nombrePrincipalDeTarjeta(tarjeta: Tarjeta) {
  const datos = tarjeta.datos_contacto
  return (
    (tarjeta.tipo === "empresarial" ? datos.nombreEmpresa : datos.nombre) ||
    "Sin nombre"
  )
}
