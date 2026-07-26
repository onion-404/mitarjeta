import { supabase } from "@/lib/supabase"
import type { DatosContacto, Suscripcion } from "@/lib/types"

export interface SuscripcionConDetalle extends Suscripcion {
  tarjetas: { slug: string; datos_contacto: DatosContacto } | null
  planes: { nombre_display: string; slug: string } | null
}

// Listado fila-por-fila de suscripciones (no agregados) — complementa a
// admin-metricas.ts, que solo trae aggregates (MRR/churn) sin id/join. La
// policy `suscripciones_admin_todo` ya cubre el acceso, mismo patrón que
// el resto del admin.
export async function getSuscripcionesConDetalle(): Promise<SuscripcionConDetalle[]> {
  const { data } = await supabase
    .from("suscripciones")
    .select("*, tarjetas(slug, datos_contacto), planes(nombre_display, slug)")
    .order("created_at", { ascending: false })

  return (data ?? []) as SuscripcionConDetalle[]
}
