import "server-only"

import { formatearFechaHoraLocal } from "@/lib/fecha"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

/** Payload enviado al webhook de Make (integración de confirmación de
 *  agenda por WhatsApp, ver CLAUDE.md) — Make arma los 2 mensajes (uno al
 *  cliente que agendó, uno al dueño de la tarjeta) a partir de estos datos;
 *  acá no sabemos nada de WhatsApp Business API ni de templates, eso vive
 *  del lado de Make/Meta. */
interface PayloadWebhookAgenda {
  tarjeta: {
    slug: string
    nombre: string
    /** null si el dueño nunca cargó WhatsApp en "Canales de contacto" —
     *  Make debería simplemente omitir ese mensaje en ese caso. */
    whatsappOwner: string | null
  }
  cliente: {
    nombre: string
    /** Validado como teléfono en el propio formulario (reservar-servicio.tsx,
     *  2026-08-10) — antes aceptaba también un email, ya no. */
    telefono: string
  }
  cita: {
    servicio: string
    fechaHoraInicioIso: string
    fechaHoraInicioLocal: string
    precio: number
    requierePagoInmediato: boolean
  }
}

interface FilaCitaConRelaciones {
  cliente_nombre: string
  cliente_contacto: string
  fecha_hora_inicio: string
  monto_bruto: number
  servicios_agendables: { nombre: string; requiere_pago_inmediato: boolean } | null
  tarjetas: {
    slug: string
    datos_contacto: { nombre?: string; whatsapp?: string } | null
    zona_horaria: string
  } | null
}

/**
 * Dispara el webhook de Make para una cita ya realmente confirmada — se
 * llama desde 2 puntos distintos según el servicio requiera pago o no
 * (mismo criterio que ya usa `agenda_completada` en eventos_metricas, ver
 * CLAUDE.md): `/api/citas/route.ts` cuando la cita queda 'confirmada' sin
 * pago, y `confirmar-pago.ts` cuando el pago se confirma y queda 'pagada'.
 * NUNCA se llama para 'pendiente_pago'/'pendiente_confirmacion' — mandar un
 * WhatsApp de "tu cita fue confirmada" antes de que lo esté de verdad sería
 * engañoso.
 *
 * Tolerante a fallos a propósito: si `MAKE_WEBHOOK_AGENDA_URL` no está
 * seteada o Make está caído, solo loguea y sigue — nunca debe romper el
 * flujo real de agendar/pagar por un problema de una integración de
 * notificaciones que es best-effort.
 */
export async function notificarNuevaCita(citaId: string): Promise<void> {
  const webhookUrl = process.env.MAKE_WEBHOOK_AGENDA_URL
  if (!webhookUrl) return

  const admin = getSupabaseAdmin()
  if (!admin) return

  const { data } = await admin
    .from("citas")
    .select(
      "cliente_nombre, cliente_contacto, fecha_hora_inicio, monto_bruto, " +
        "servicios_agendables(nombre, requiere_pago_inmediato), " +
        "tarjetas(slug, datos_contacto, zona_horaria)"
    )
    .eq("id", citaId)
    .maybeSingle()

  const cita = data as unknown as FilaCitaConRelaciones | null
  if (!cita?.servicios_agendables || !cita.tarjetas) return

  const payload: PayloadWebhookAgenda = {
    tarjeta: {
      slug: cita.tarjetas.slug,
      nombre: cita.tarjetas.datos_contacto?.nombre || cita.tarjetas.slug,
      whatsappOwner: cita.tarjetas.datos_contacto?.whatsapp || null,
    },
    cliente: {
      nombre: cita.cliente_nombre,
      telefono: cita.cliente_contacto,
    },
    cita: {
      servicio: cita.servicios_agendables.nombre,
      fechaHoraInicioIso: cita.fecha_hora_inicio,
      fechaHoraInicioLocal: formatearFechaHoraLocal(cita.fecha_hora_inicio, cita.tarjetas.zona_horaria),
      precio: cita.monto_bruto,
      requierePagoInmediato: cita.servicios_agendables.requiere_pago_inmediato,
    },
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))
  } catch (error) {
    console.error(`[notificaciones-agenda] No se pudo notificar a Make para la cita ${citaId}:`, error)
  }
}
