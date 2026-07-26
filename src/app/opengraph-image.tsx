import { ImageResponse } from "next/og"

import { cargarSoraBold, renderOgImageGenerico } from "@/lib/og"

export const alt = "Linkard — tu tarjeta digital en segundos"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const soraBold = await cargarSoraBold()

  return new ImageResponse(renderOgImageGenerico(), {
    ...size,
    fonts: [{ name: "Sora", data: soraBold, style: "normal", weight: 700 }],
  })
}
