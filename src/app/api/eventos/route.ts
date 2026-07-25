import { esTipoEvento, hashVisitante, registrarEventoServidor } from "@/lib/eventos"
import { excedeLimite, obtenerIpCliente } from "@/lib/rate-limit"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

// Más alto que /api/citas (10/min): una sola carga de la tarjeta pública ya
// puede disparar varios eventos reales (vista + clicks de contacto/redes) en
// pocos segundos, sin que sea abuso.
const LIMITE_EVENTOS = { maximo: 60, ventanaMs: 60_000 }

interface BodyRegistrarEvento {
  tarjeta_id?: string
  tipo_evento?: string
  metadata?: Record<string, unknown>
}

// Toda la escritura de eventos_metricas pasa por acá con el cliente de
// service role: la tabla no tiene policy de insert para anon/authenticated
// a propósito (evita inflar métricas, ver la migración de
// 20260716120000_add_planes_suscripciones_metricas.sql) — mismo patrón que
// /api/citas. Sin auth: es tráfico de un visitante anónimo de la tarjeta
// pública, no de un usuario logueado.
export async function POST(request: Request) {
  if (excedeLimite(`eventos:${obtenerIpCliente(request)}`, LIMITE_EVENTOS)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Esperá un momento y volvé a intentar." },
      { status: 429 }
    )
  }

  const body = (await request.json().catch(() => null)) as BodyRegistrarEvento | null
  const { tarjeta_id, tipo_evento, metadata } = body ?? {}

  if (!tarjeta_id || !esTipoEvento(tipo_evento)) {
    return Response.json({ error: "Datos de evento inválidos." }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    // No rompemos la experiencia pública por un problema de configuración
    // nuestro (falta SUPABASE_SERVICE_ROLE_KEY) — el visitante no debe
    // notar que las métricas fallaron.
    return Response.json({ ok: true })
  }

  const { data: tarjeta } = await admin
    .from("tarjetas")
    .select("id")
    .eq("id", tarjeta_id)
    .eq("publicado", true)
    .maybeSingle()

  if (!tarjeta) {
    return Response.json({ error: "Tarjeta no encontrada." }, { status: 400 })
  }

  const visitanteHash = hashVisitante(
    obtenerIpCliente(request),
    request.headers.get("user-agent") ?? "desconocido"
  )

  await registrarEventoServidor(admin, {
    tarjetaId: tarjeta_id,
    tipoEvento: tipo_evento,
    metadata,
    visitanteHash,
  })

  return Response.json({ ok: true })
}
