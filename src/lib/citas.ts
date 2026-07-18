import "server-only"

import { getSupabaseAdmin } from "@/lib/supabase-admin"

export interface CitaParaConfirmacion {
  servicioNombre: string
  fechaHoraInicio: string
  clienteContacto: string
  zonaHoraria: string
  tarjetaSlug: string | null
}

interface FilaCitaConfirmacion {
  fecha_hora_inicio: string
  cliente_contacto: string
  servicios_agendables: { nombre: string } | null
  tarjetas: { zona_horaria: string; slug: string } | null
}

/**
 * Lectura de solo presentación para las páginas /pago/* (no toca estado, no
 * calcula comisiones): trae lo mínimo para mostrarle al cliente qué cita
 * pagó y cuándo es, en la hora local de la tarjeta. Usa el cliente de
 * service role porque `citas` no tiene policy de select para anon/authenticated.
 */
export async function getCitaParaConfirmacion(
  citaId: string
): Promise<CitaParaConfirmacion | null> {
  const admin = getSupabaseAdmin()
  if (!admin) return null

  const { data } = await admin
    .from("citas")
    .select("fecha_hora_inicio, cliente_contacto, servicios_agendables(nombre), tarjetas(zona_horaria, slug)")
    .eq("id", citaId)
    .maybeSingle()

  if (!data) return null

  const fila = data as unknown as FilaCitaConfirmacion

  return {
    servicioNombre: fila.servicios_agendables?.nombre ?? "tu servicio",
    fechaHoraInicio: fila.fecha_hora_inicio,
    clienteContacto: fila.cliente_contacto,
    zonaHoraria: fila.tarjetas?.zona_horaria || "America/Mexico_City",
    tarjetaSlug: fila.tarjetas?.slug ?? null,
  }
}
