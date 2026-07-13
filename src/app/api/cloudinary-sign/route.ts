import { firmarSubidaCloudinary } from "@/lib/cloudinary"

export async function POST(request: Request) {
  const { folder } = (await request.json()) as { folder?: string }
  const timestamp = Math.round(Date.now() / 1000)
  const carpeta = folder || "mitarjeta"
  const signature = firmarSubidaCloudinary({ timestamp, folder: carpeta })

  return Response.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: carpeta,
  })
}
