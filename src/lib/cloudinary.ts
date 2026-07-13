import crypto from "crypto"

export function firmarSubidaCloudinary(params: Record<string, string | number>) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET!
  const base = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&")
  return crypto
    .createHash("sha1")
    .update(base + apiSecret)
    .digest("hex")
}
