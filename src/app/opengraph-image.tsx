import { ImageResponse } from "next/og"

export const alt = "Linkard — tu tarjeta digital en segundos"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

async function cargarSoraBold() {
  const css = await (
    await fetch("https://fonts.googleapis.com/css2?family=Sora:wght@700")
  ).text()
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/)
  if (!match) throw new Error("No se pudo resolver la fuente Sora")
  const response = await fetch(match[1])
  return response.arrayBuffer()
}

export default async function Image() {
  const soraBold = await cargarSoraBold()

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#171717",
          padding: "0 96px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* Triángulo como SVG (no el carácter Unicode ▲): Satori solo
              resuelve glifos contra la fuente Sora cargada abajo, que no
              incluye símbolos del bloque Geometric Shapes — con el carácter
              renderiza como un glifo faltante. El CSS border-triangle hack
              tampoco funciona bien en Satori (renderiza un cuadrado sólido). */}
          <svg width="60" height="60" viewBox="0 0 24 24">
            <polygon points="12,3 22,21 2,21" fill="#fafafa" />
          </svg>
          <span
            style={{
              color: "#fafafa",
              fontSize: 84,
              fontFamily: "Sora",
              fontWeight: 700,
            }}
          >
            Linkard.
          </span>
        </div>
        <span
          style={{
            marginTop: 28,
            color: "#a1a1a1",
            fontSize: 36,
          }}
        >
          Tu tarjeta digital en segundos
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Sora", data: soraBold, style: "normal", weight: 700 }],
    }
  )
}
