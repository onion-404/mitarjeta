import { crearPreferenciaPago } from "@/lib/mercadopago"
import { excedeLimite, obtenerIpCliente } from "@/lib/rate-limit"

// Iniciar un checkout es una acción poco frecuente por usuario real; un
// límite bajo alcanza para frenar scripts que spameen creación de preferencias.
const LIMITE_CHECKOUT = { maximo: 10, ventanaMs: 60_000 }

export async function POST(request: Request) {
  if (excedeLimite(`checkout:${obtenerIpCliente(request)}`, LIMITE_CHECKOUT)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Esperá un momento y volvé a intentar." },
      { status: 429 }
    )
  }

  const { tarjetaId, titulo, precio } = (await request.json()) as {
    tarjetaId?: string
    titulo?: string
    precio?: number
  }

  if (!tarjetaId || !titulo || !precio || precio <= 0) {
    return Response.json({ error: "Datos de checkout inválidos." }, { status: 400 })
  }

  const initPoint = await crearPreferenciaPago({ tarjetaId, titulo, precio })

  if (!initPoint) {
    return Response.json(
      { error: "No pudimos iniciar el pago con Mercado Pago." },
      { status: 502 }
    )
  }

  return Response.json({ initPoint })
}
