import { crearPreferenciaPago } from "@/lib/mercadopago"

export async function POST(request: Request) {
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
