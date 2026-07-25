import "server-only"

import { createHash } from "crypto"

import type { getSupabaseAdmin } from "@/lib/supabase-admin"

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>

// Debe coincidir exactamente con el check constraint de
// eventos_metricas.tipo_evento (20260716120000_add_planes_suscripciones_metricas.sql).
// `compra_completada` queda en la lista (válida a nivel de schema/dashboard)
// pero nada la dispara todavía: los productos son links de salida a un
// destino externo (`datos_contacto.productos[].enlaceUrl`), no hay checkout
// propio de productos en la plataforma, así que no existe ninguna señal real
// de que la venta se completó del otro lado — decisión explícita del
// cliente, ver CLAUDE.md.
export const TIPOS_EVENTO = [
  "vista_tarjeta",
  "click_enlace",
  "click_agendar",
  "agenda_completada",
  "click_producto",
  "compra_completada",
] as const

export type TipoEvento = (typeof TIPOS_EVENTO)[number]

export function esTipoEvento(valor: unknown): valor is TipoEvento {
  return typeof valor === "string" && (TIPOS_EVENTO as readonly string[]).includes(valor)
}

// Pepper del hash: reusa SUPABASE_SERVICE_ROLE_KEY (ya requerida, ya secreta,
// ya cargada server-side) en vez de pedir una env var nueva solo para esto.
// Sin pepper, hash(ip+user-agent+día) sería trivial de revertir por fuerza
// bruta (espacio de IPs conocido/acotable) — con un secreto de servidor que
// el atacante no tiene, el hash deja de ser reversible.
const PEPPER = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "linkard-metricas-pepper"

/**
 * Hash no reversible de IP + user-agent + fecha UTC del día — nunca se
 * guarda IP/user-agent en crudo. Rota diariamente (mismo visitante da un
 * hash distinto cada día), así que solo sirve para distinguir único/
 * recurrente DENTRO de una misma tarjeta comparando por día, no como
 * identificador estable de largo plazo ni para cruzar tarjetas distintas.
 */
export function hashVisitante(ip: string, userAgent: string): string {
  const fechaUtc = new Date().toISOString().slice(0, 10)
  return createHash("sha256").update(`${ip}|${userAgent}|${fechaUtc}|${PEPPER}`).digest("hex")
}

interface RegistrarEventoParams {
  tarjetaId: string
  tipoEvento: TipoEvento
  metadata?: Record<string, unknown>
  visitanteHash?: string | null
}

/**
 * Inserta un evento en eventos_metricas con el cliente de service role que
 * ya resolvió el caller (getSupabaseAdmin()) — reutilizado tanto por
 * POST /api/eventos (tráfico real del visitante, con rate-limit) como por
 * confirmar-pago.ts (evento server-to-server cuando el webhook de Mercado
 * Pago confirma el pago de una cita: el visitante nunca vuelve a cargar la
 * tarjeta pública en ese momento, así que no hay ningún componente cliente
 * que lo pueda disparar). Best-effort a propósito: un fallo acá no debe
 * interrumpir el flujo que lo llama (ni la vista pública, ni la
 * confirmación de un pago real).
 */
export async function registrarEventoServidor(
  admin: SupabaseAdmin,
  { tarjetaId, tipoEvento, metadata, visitanteHash }: RegistrarEventoParams
): Promise<void> {
  const { error } = await admin.from("eventos_metricas").insert({
    tarjeta_id: tarjetaId,
    tipo_evento: tipoEvento,
    metadata: metadata ?? {},
    visitante_hash: visitanteHash ?? null,
  })

  if (error) {
    console.error(
      `[eventos] No se pudo registrar "${tipoEvento}" para la tarjeta ${tarjetaId}: ${error.message}`
    )
  }
}
