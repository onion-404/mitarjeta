import { supabase } from "@/lib/supabase"
import type { Cupon } from "@/lib/types"

// Separado de configuracion.ts a propósito: el sistema de cupones creció
// (afiliados, vencimiento, límite de usos, rendimiento) y ya no encaja como
// unas pocas funciones más en un archivo genérico de "configuración". Las
// funciones de configuracion.ts que sí siguen ahí
// (getConfiguracionActiva/actualizarConfiguracion) no se tocaron.

export async function getCupones(): Promise<Cupon[]> {
  const { data } = await supabase
    .from("cupones")
    .select("*")
    .order("created_at", { ascending: false })

  return (data ?? []) as Cupon[]
}

interface CrearCuponInput {
  codigo: string
  porcentajeDescuento: number
  afiliadoId?: string | null
  afiliadoNombre?: string | null
  fechaVencimiento?: string | null
  limiteUsos?: number | null
}

export async function crearCupon(input: CrearCuponInput) {
  return supabase.from("cupones").insert({
    codigo: input.codigo.trim().toUpperCase(),
    porcentaje_descuento: input.porcentajeDescuento,
    afiliado_id: input.afiliadoId || null,
    afiliado_nombre: input.afiliadoNombre?.trim() || null,
    fecha_vencimiento: input.fechaVencimiento || null,
    limite_usos: input.limiteUsos ?? null,
  })
}

export async function actualizarCupon(id: number, cambios: Partial<Cupon>) {
  return supabase.from("cupones").update(cambios).eq("id", id)
}

// El "on delete set null" de cupon_usos.cupon_id (migración
// 20260726000000_add_cupones_avanzado.sql) hace que esto sea seguro incluso
// con historial real: las filas de cupon_usos de este código sobreviven,
// solo pierden la referencia al cupón ya borrado. No hace falta ningún paso
// adicional acá — la UI es responsable de confirmar con el admin si hay
// usos registrados antes de llamar a esto (ver admin/cupones/page.tsx).
export async function eliminarCupon(id: number) {
  return supabase.from("cupones").delete().eq("id", id)
}

/**
 * Preview del lado del cliente (TarjetaForm) — usa fn_cupon_es_valido()
 * como única fuente de verdad para activo/vencimiento/límite de usos
 * (misma función que usa el servidor en /api/stripe/checkout, ver
 * CLAUDE.md sobre por qué está centralizada en una función de Postgres en
 * vez de duplicar la lógica en TypeScript). El select posterior solo trae
 * los datos para mostrar el descuento en el preview — ya no repite la
 * validación de vencimiento/límite, fn_cupon_es_valido ya la hizo.
 */
export async function validarCupon(codigo: string): Promise<Cupon | null> {
  if (!codigo.trim()) return null

  const codigoNormalizado = codigo.trim().toUpperCase()

  const { data: esValido } = await supabase.rpc("fn_cupon_es_valido", {
    p_codigo: codigoNormalizado,
  })
  if (!esValido) return null

  const { data } = await supabase
    .from("cupones")
    .select("*")
    .eq("codigo", codigoNormalizado)
    .eq("activo", true)
    .maybeSingle()

  return data as Cupon | null
}

export interface RendimientoCupon {
  cuponId: number | null
  codigo: string
  afiliadoNombre: string | null
  cuponVigente: boolean
  usosTotal: number
  ingresosGenerados: number
  tarjetasActivas: number
}

/**
 * Rendimiento por código (agrupado por `codigo`, no por `cupon_id`): un
 * cupón borrado sigue apareciendo acá con sus usos históricos intactos
 * (cuponVigente: false), porque el snapshot en cupon_usos.codigo no
 * depende de que la fila de cupones todavía exista. "Tarjetas activas
 * atribuibles" es null-safe sobre `suscripcion_id` a propósito: esa
 * columna puede ser null (la suscripción se borró después del uso), en
 * cuyo caso ese uso simplemente no suma a tarjetasActivas — sigue sumando
 * a usosTotal/ingresosGenerados igual, esos dos nunca dependen de las FK.
 * Solo el admin puede leer esto (policy `cupon_usos_admin_todo`).
 */
export async function getCuponesConRendimiento(): Promise<RendimientoCupon[]> {
  const [{ data: usos }, { data: cuponesVigentes }] = await Promise.all([
    supabase.from("cupon_usos").select("cupon_id, codigo, afiliado_nombre, suscripcion_id, precio_final"),
    supabase.from("cupones").select("id, codigo"),
  ])

  const idsSuscripcion = Array.from(
    new Set(
      (usos ?? [])
        .map((u) => u.suscripcion_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  )

  let autorizadasSet = new Set<string>()
  if (idsSuscripcion.length > 0) {
    const { data: subs } = await supabase
      .from("suscripciones")
      .select("id")
      .in("id", idsSuscripcion)
      .eq("estado", "autorizada")
    autorizadasSet = new Set((subs ?? []).map((s) => s.id as string))
  }

  const codigosVigentes = new Set((cuponesVigentes ?? []).map((c) => c.codigo as string))

  const porCodigo = new Map<string, RendimientoCupon>()

  for (const uso of usos ?? []) {
    const codigo = uso.codigo as string
    let fila = porCodigo.get(codigo)
    if (!fila) {
      fila = {
        cuponId: uso.cupon_id as number | null,
        codigo,
        afiliadoNombre: uso.afiliado_nombre as string | null,
        cuponVigente: codigosVigentes.has(codigo),
        usosTotal: 0,
        ingresosGenerados: 0,
        tarjetasActivas: 0,
      }
      porCodigo.set(codigo, fila)
    }
    fila.usosTotal += 1
    fila.ingresosGenerados += uso.precio_final as number
  }

  // "Tarjetas activas atribuibles" cuenta suscripciones DISTINTAS, no
  // filas: desde que cupon_usos guarda una fila por cada cobro/renovación
  // (no una por suscripción, ver migración 20260727000000), una misma
  // suscripción puede aportar varias filas al mismo código.
  const suscripcionesPorCodigo = new Map<string, Set<string>>()
  for (const uso of usos ?? []) {
    if (!uso.suscripcion_id || !autorizadasSet.has(uso.suscripcion_id as string)) continue
    const codigo = uso.codigo as string
    const set = suscripcionesPorCodigo.get(codigo) ?? new Set<string>()
    set.add(uso.suscripcion_id as string)
    suscripcionesPorCodigo.set(codigo, set)
  }
  for (const [codigo, set] of suscripcionesPorCodigo) {
    const fila = porCodigo.get(codigo)
    if (fila) fila.tarjetasActivas = set.size
  }

  // Cupones vigentes que todavía no tienen ningún uso también deben
  // aparecer en la tabla de rendimiento (con todo en cero), no solo los
  // que ya tuvieron actividad.
  for (const c of cuponesVigentes ?? []) {
    const codigo = c.codigo as string
    if (!porCodigo.has(codigo)) {
      porCodigo.set(codigo, {
        cuponId: c.id as number,
        codigo,
        afiliadoNombre: null,
        cuponVigente: true,
        usosTotal: 0,
        ingresosGenerados: 0,
        tarjetasActivas: 0,
      })
    }
  }

  return Array.from(porCodigo.values()).sort((a, b) => b.usosTotal - a.usosTotal)
}
