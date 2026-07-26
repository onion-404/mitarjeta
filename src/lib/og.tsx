import type { ReactElement } from "react"

/**
 * Descarga el binario de Sora bold para Satori (next/og no puede usar
 * next/font/google directamente). Compartido entre la imagen OG genérica
 * del sitio y la dinámica por tarjeta (/[slug]).
 */
export async function cargarSoraBold(): Promise<ArrayBuffer> {
  const css = await (
    await fetch("https://fonts.googleapis.com/css2?family=Sora:wght@700")
  ).text()
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/)
  if (!match) throw new Error("No se pudo resolver la fuente Sora")
  const response = await fetch(match[1])
  return response.arrayBuffer()
}

/**
 * Imagen OG genérica del sitio — usada tanto por opengraph-image.tsx (raíz)
 * como por [slug]/opengraph-image.tsx cuando la tarjeta no existe o no
 * tiene un plan activo (fallback).
 */
export function renderOgImageGenerico(): ReactElement {
  return (
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
          Linkard
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
  )
}
