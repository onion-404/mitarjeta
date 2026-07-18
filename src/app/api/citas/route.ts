import { estaDentroDeDisponibilidad } from "@/lib/agenda"
import { crearPreferenciaPago } from "@/lib/mercadopago"
import { excedeLimite, obtenerIpCliente } from "@/lib/rate-limit"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const LIMITE_CITAS = { maximo: 10, ventanaMs: 60_000 }

interface BodyCrearCita {
  tarjeta_id?: string
  servicio_id?: string
  cliente_nombre?: string
  cliente_contacto?: string
  fecha_hora_inicio?: string
}

// Toda la escritura de `citas` pasa por acá con el cliente de service role:
// la tabla no tiene policy de insert para anon/authenticated a propósito
// (ver migración de agenda), porque crear una cita implica revalidar
// disponibilidad y, si aplica, generar la preferencia de Checkout Pro —
// mismo patrón que confirmar-pago.ts para el pago de tarjetas.
export async function POST(request: Request) {
  if (excedeLimite(`citas:${obtenerIpCliente(request)}`, LIMITE_CITAS)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Esperá un momento y volvé a intentar." },
      { status: 429 }
    )
  }

  const body = (await request.json().catch(() => null)) as BodyCrearCita | null
  const { tarjeta_id, servicio_id, cliente_nombre, cliente_contacto, fecha_hora_inicio } =
    body ?? {}

  if (
    !tarjeta_id ||
    !servicio_id ||
    !cliente_nombre?.trim() ||
    !cliente_contacto?.trim() ||
    !fecha_hora_inicio
  ) {
    return Response.json({ error: "Faltan datos para agendar la cita." }, { status: 400 })
  }

  const inicio = new Date(fecha_hora_inicio)
  if (Number.isNaN(inicio.getTime()) || inicio.getTime() <= Date.now()) {
    return Response.json({ error: "La fecha y hora de la cita no es válida." }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json({ error: "El servicio de agenda no está disponible." }, { status: 500 })
  }

  const { data: servicio } = await admin
    .from("servicios_agendables")
    .select("id, nombre, duracion_minutos, precio, requiere_pago_inmediato, activo")
    .eq("id", servicio_id)
    .eq("tarjeta_id", tarjeta_id)
    .maybeSingle()

  if (!servicio || !servicio.activo) {
    return Response.json(
      { error: "El servicio elegido no existe o ya no está disponible." },
      { status: 400 }
    )
  }

  const fin = new Date(inicio.getTime() + servicio.duracion_minutos * 60_000)

  // Revalidación server-side en dos pasos: primero que la franja sigue
  // dentro del horario publicado, después que nadie más la tomó mientras
  // tanto. No confiamos en los slots que el cliente vio antes.
  const dentroDeHorario = await estaDentroDeDisponibilidad(tarjeta_id, inicio, fin)
  if (!dentroDeHorario) {
    return Response.json(
      { error: "Ese horario está fuera de la disponibilidad del proveedor." },
      { status: 400 }
    )
  }

  const { data: solapa, error: errorSolape } = await admin.rpc("existe_solapamiento_cita", {
    p_tarjeta_id: tarjeta_id,
    p_fecha_hora_inicio: inicio.toISOString(),
    p_fecha_hora_fin: fin.toISOString(),
  })

  if (errorSolape) {
    return Response.json(
      { error: "No pudimos validar la disponibilidad, intentá de nuevo." },
      { status: 500 }
    )
  }
  if (solapa) {
    return Response.json({ error: "Ese horario ya no está disponible, elegí otro." }, { status: 409 })
  }

  const estadoInicial = servicio.requiere_pago_inmediato ? "pendiente_pago" : "confirmada"

  const { data: cita, error: errorInsert } = await admin
    .from("citas")
    .insert({
      tarjeta_id,
      servicio_id,
      cliente_nombre: cliente_nombre.trim(),
      cliente_contacto: cliente_contacto.trim(),
      fecha_hora_inicio: inicio.toISOString(),
      fecha_hora_fin: fin.toISOString(),
      estado: estadoInicial,
      monto_bruto: servicio.precio,
    })
    .select("id")
    .single()

  if (errorInsert || !cita) {
    return Response.json({ error: "No pudimos crear la cita, intentá de nuevo." }, { status: 500 })
  }

  if (!servicio.requiere_pago_inmediato) {
    return Response.json({ citaId: cita.id, estado: estadoInicial, requierePago: false })
  }

  const preferencia = await crearPreferenciaPago({
    referenciaId: cita.id,
    tipo: "cita",
    titulo: `Cita: ${servicio.nombre}`,
    precio: servicio.precio,
  })

  if (!preferencia) {
    // Best-effort: no dejamos una cita pendiente_pago huérfana sin
    // preferencia asociada. No desbloquea a nadie más (el solapamiento solo
    // mira 'confirmada'/'pagada'), pero evita basura visible en el dashboard.
    await admin.from("citas").delete().eq("id", cita.id)
    return Response.json(
      { error: "No pudimos iniciar el pago con Mercado Pago." },
      { status: 502 }
    )
  }

  await admin
    .from("citas")
    .update({ preference_id: preferencia.preferenceId })
    .eq("id", cita.id)

  return Response.json({
    citaId: cita.id,
    estado: estadoInicial,
    requierePago: true,
    initPoint: preferencia.initPoint,
  })
}
