import crypto from "crypto"

import { ADMIN_EMAIL } from "@/lib/admin"
import { crearPreferenciaPago } from "@/lib/mercadopago"
import { excedeLimite, obtenerIpCliente } from "@/lib/rate-limit"
import { supabase } from "@/lib/supabase"

const LIMITE_COBRO_MANUAL = { maximo: 20, ventanaMs: 60_000 }

interface BodyCobroManual {
  monto?: number
  descripcion?: string
  payerEmail?: string
}

// Genera un link de Checkout Pro para un cobro puntual armado a mano desde
// el admin (ej. un servicio o producto que no pasó por el flujo normal de
// tarjeta/cita). A propósito NO se persiste nada en DB: no hay fila que
// referenciar, así que se usa un id generado al vuelo como
// external_reference ("cobro_manual:<uuid>") y confirmar-pago.ts sabe
// ignorarlo (ver el branch "cobro_manual" ahí) para no intentar actualizar
// ninguna tabla al confirmarse el pago.
export async function POST(request: Request) {
  if (excedeLimite(`cobro-manual:${obtenerIpCliente(request)}`, LIMITE_COBRO_MANUAL)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Esperá un momento y volvé a intentar." },
      { status: 429 }
    )
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return Response.json({ error: "Iniciá sesión para continuar." }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || userData.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: "No tenés permiso para hacer esto." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as BodyCobroManual | null
  const { monto, descripcion, payerEmail } = body ?? {}

  if (!monto || !Number.isFinite(monto) || monto <= 0) {
    return Response.json({ error: "El monto tiene que ser un número mayor a 0." }, { status: 400 })
  }
  if (!descripcion?.trim()) {
    return Response.json({ error: "Falta la descripción del cobro." }, { status: 400 })
  }

  const preferencia = await crearPreferenciaPago({
    referenciaId: crypto.randomUUID(),
    tipo: "cobro_manual",
    titulo: descripcion.trim(),
    precio: monto,
    payerEmail: payerEmail?.trim() || undefined,
  })

  if (!preferencia) {
    return Response.json(
      { error: "No pudimos generar el link de pago con Mercado Pago." },
      { status: 502 }
    )
  }

  return Response.json({ initPoint: preferencia.initPoint })
}
