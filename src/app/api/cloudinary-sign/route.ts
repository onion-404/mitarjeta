import { firmarSubidaCloudinary } from "@/lib/cloudinary"
import { excedeLimite, obtenerIpCliente } from "@/lib/rate-limit"

// Únicas carpetas para las que se puede pedir una firma de subida. Cualquier
// otro valor de `folder` se rechaza: sin esta whitelist, un cliente podría
// pedir una firma válida para subir contenido a una ruta arbitraria de Cloudinary.
const CARPETAS_PERMITIDAS = new Set([
  "mitarjeta/avatars",
  "mitarjeta/banners",
  "mitarjeta/productos",
  "mitarjeta/brochures",
])

// Una tarjeta con avatar, banner, brochure y varios productos puede disparar
// varias firmas en simultáneo al guardar; el límite queda holgado para ese
// uso legítimo y solo corta ráfagas mucho más grandes (spam/scripts).
const LIMITE_FIRMAS = { maximo: 30, ventanaMs: 60_000 }

export async function POST(request: Request) {
  if (excedeLimite(`cloudinary-sign:${obtenerIpCliente(request)}`, LIMITE_FIRMAS)) {
    return Response.json(
      { error: "Demasiadas solicitudes. Esperá un momento y volvé a intentar." },
      { status: 429 }
    )
  }

  const { folder } = (await request.json()) as { folder?: string }

  if (!folder || !CARPETAS_PERMITIDAS.has(folder)) {
    return Response.json({ error: "Carpeta no permitida." }, { status: 400 })
  }

  const timestamp = Math.round(Date.now() / 1000)
  const signature = firmarSubidaCloudinary({ timestamp, folder })

  return Response.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
  })
}
