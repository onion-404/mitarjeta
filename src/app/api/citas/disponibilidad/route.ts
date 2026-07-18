import { obtenerSlotsDisponibles } from "@/lib/agenda"
import { excedeLimite, obtenerIpCliente } from "@/lib/rate-limit"

// Lectura pública (la calendariza la tarjeta pública), pero sigue costando
// varias consultas a Supabase por request: límite generoso solo para frenar
// scraping/abuso básico, no tráfico normal de un visitante.
const LIMITE_DISPONIBILIDAD = { maximo: 30, ventanaMs: 60_000 }
const DIAS_MAX_RANGO = 60
const UN_DIA_MS = 86_400_000
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function sumarDiasISO(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  if (excedeLimite(`disponibilidad:${obtenerIpCliente(request)}`, LIMITE_DISPONIBILIDAD)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Esperá un momento y volvé a intentar." },
      { status: 429 }
    )
  }

  const url = new URL(request.url)
  const tarjetaId = url.searchParams.get("tarjeta_id")
  const servicioId = url.searchParams.get("servicio_id")
  const desde = url.searchParams.get("desde") ?? hoyISO()
  const hasta = url.searchParams.get("hasta") ?? sumarDiasISO(desde, 14)

  if (
    !tarjetaId ||
    !servicioId ||
    !FECHA_REGEX.test(desde) ||
    !FECHA_REGEX.test(hasta) ||
    hasta < desde
  ) {
    return Response.json({ error: "Parámetros inválidos." }, { status: 400 })
  }

  const dias = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / UN_DIA_MS
  if (dias > DIAS_MAX_RANGO) {
    return Response.json(
      { error: `El rango máximo de consulta es de ${DIAS_MAX_RANGO} días.` },
      { status: 400 }
    )
  }

  const slots = await obtenerSlotsDisponibles({ tarjetaId, servicioId, desde, hasta })
  if (slots === null) {
    return Response.json({ error: "El servicio de agenda no está disponible." }, { status: 500 })
  }

  return Response.json({ slots })
}
