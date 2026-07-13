export async function subirImagenCloudinary(
  file: File,
  folder: string
): Promise<string | null> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) return null

  const firmaRes = await fetch("/api/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  })
  if (!firmaRes.ok) return null

  const { timestamp, signature, apiKey, folder: carpeta } = await firmaRes.json()

  const formData = new FormData()
  formData.append("file", file)
  formData.append("api_key", apiKey)
  formData.append("timestamp", String(timestamp))
  formData.append("signature", signature)
  formData.append("folder", carpeta)

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  )
  if (!uploadRes.ok) return null

  const data = await uploadRes.json()
  return data.secure_url as string
}
