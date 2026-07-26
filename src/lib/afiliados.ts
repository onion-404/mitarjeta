import { supabase } from "@/lib/supabase"
import type { Afiliado, AfiliadoPago, CuponUso } from "@/lib/types"

// Sistema de afiliados: comisión recurrente (sobre CADA cobro/renovación,
// no solo la venta inicial — ver CLAUDE.md) calculada sobre el monto NETO
// (ya con el fee real de Stripe restado). Alta 100% manual por el admin,
// sin autoregistro. Mismo criterio que cupones.ts: agregación en
// TypeScript en el momento de la lectura (no vista materializada ni
// función de Postgres) — a este volumen no hace falta, y ya es el patrón
// que usa getCuponesConRendimiento().

export async function getAfiliados(): Promise<Afiliado[]> {
  const { data } = await supabase.from("afiliados").select("*").order("created_at", { ascending: false })
  return (data ?? []) as Afiliado[]
}

/**
 * Lectura de solo la propia fila — RLS (afiliados_select_propio) ya
 * restringe el resultado a `lower(email) = lower(auth.jwt()->>'email')`,
 * no hace falta filtrar por email acá: alguien no podría pedir la fila de
 * otro aunque lo intentara. Devuelve null si el usuario logueado no es un
 * afiliado activo — usado tanto para el gate de la pestaña "Ganancias" en
 * Mi Cuenta como para la propia página, que revalida por su cuenta.
 */
export async function getAfiliadoPropio(): Promise<Afiliado | null> {
  const { data } = await supabase.from("afiliados").select("*").eq("activo", true).maybeSingle()
  return (data as Afiliado | null) ?? null
}

interface CrearAfiliadoInput {
  nombre: string
  email: string
  porcentajeComision: number
}

export async function crearAfiliado(input: CrearAfiliadoInput) {
  return supabase.from("afiliados").insert({
    nombre: input.nombre.trim(),
    email: input.email.trim().toLowerCase(),
    porcentaje_comision: input.porcentajeComision,
  })
}

export async function actualizarAfiliado(id: string, cambios: Partial<Afiliado>) {
  return supabase.from("afiliados").update(cambios).eq("id", id)
}

export async function getPagosAfiliado(afiliadoId: string): Promise<AfiliadoPago[]> {
  const { data } = await supabase
    .from("afiliado_pagos")
    .select("*")
    .eq("afiliado_id", afiliadoId)
    .order("fecha", { ascending: false })
  return (data ?? []) as AfiliadoPago[]
}

interface RegistrarPagoInput {
  afiliadoId: string
  afiliadoNombre: string
  monto: number
  fecha: string
  nota?: string | null
}

export async function registrarPagoAfiliado(input: RegistrarPagoInput) {
  return supabase.from("afiliado_pagos").insert({
    afiliado_id: input.afiliadoId,
    afiliado_nombre: input.afiliadoNombre,
    monto: input.monto,
    fecha: input.fecha,
    nota: input.nota?.trim() || null,
  })
}

export interface RendimientoAfiliado {
  codigosVigentes: string[]
  codigosHistoricos: string[]
  cantidadCobros: number
  ventasBrutas: number
  ventasNetas: number
  comisionGenerada: number
  totalPagado: number
  saldoPendiente: number
}

/**
 * Rendimiento de UN afiliado — compartido entre la vista de detalle del
 * admin y la propia página "Ganancias" del afiliado (mismo cálculo, RLS ya
 * escopea qué filas puede leer cada uno). `monto_neto ?? precio_final` es
 * un fallback deliberado: mientras el fee real de Stripe todavía no llegó
 * (lag async, ver backfillComisionStripe en confirmar-suscripcion-stripe.ts),
 * se usa el bruto como aproximación temporal en vez de excluir ese cobro —
 * se autocorrige solo en cuanto charge.updated complete el dato real.
 */
export async function getRendimientoAfiliado(
  afiliadoId: string,
  porcentajeComision: number
): Promise<RendimientoAfiliado> {
  const [{ data: usos }, { data: cuponesVigentes }, { data: pagos }] = await Promise.all([
    supabase
      .from("cupon_usos")
      .select("codigo, precio_final, monto_neto")
      .eq("afiliado_id", afiliadoId)
      .returns<Pick<CuponUso, "codigo" | "precio_final" | "monto_neto">[]>(),
    supabase.from("cupones").select("codigo").eq("afiliado_id", afiliadoId),
    supabase.from("afiliado_pagos").select("monto").eq("afiliado_id", afiliadoId),
  ])

  const codigosVigentes = new Set((cuponesVigentes ?? []).map((c) => c.codigo as string))
  const codigosEnUsos = new Set((usos ?? []).map((u) => u.codigo))
  const codigosHistoricos = Array.from(codigosEnUsos).filter((c) => !codigosVigentes.has(c))

  let ventasBrutas = 0
  let ventasNetas = 0
  for (const uso of usos ?? []) {
    ventasBrutas += uso.precio_final
    ventasNetas += uso.monto_neto ?? uso.precio_final
  }

  const comisionGenerada = ventasNetas * (porcentajeComision / 100)
  const totalPagado = (pagos ?? []).reduce((acc, p) => acc + (p.monto as number), 0)

  return {
    codigosVigentes: Array.from(codigosVigentes),
    codigosHistoricos,
    cantidadCobros: (usos ?? []).length,
    ventasBrutas,
    ventasNetas,
    comisionGenerada,
    totalPagado,
    saldoPendiente: comisionGenerada - totalPagado,
  }
}

export interface AfiliadoConResumen extends Afiliado {
  rendimiento: RendimientoAfiliado
}

/** Listado admin: cada afiliado + su rendimiento agregado, para la tabla principal. */
export async function getAfiliadosConResumen(): Promise<AfiliadoConResumen[]> {
  const afiliados = await getAfiliados()
  return Promise.all(
    afiliados.map(async (a) => ({
      ...a,
      rendimiento: await getRendimientoAfiliado(a.id, a.porcentaje_comision),
    }))
  )
}
