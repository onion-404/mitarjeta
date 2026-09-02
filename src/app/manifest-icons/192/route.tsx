import { ImageResponse } from "next/og"

// Ícono del manifest PWA (2026-09-04, "Agregar a pantalla de inicio") —
// mismo triángulo + fondo #171717 que ya usan icon.tsx/apple-icon.tsx,
// solo que estos dos viven fuera de la convención de archivo especial
// (icon.tsx/apple-icon.tsx están reservados a favicon/Apple, un manifest
// necesita sus propias URLs de ícono declaradas a mano en manifest.ts) —
// por eso son un route handler normal en vez de otro icon.tsx.
export const dynamic = "force-static"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
        }}
      >
        <span style={{ color: "#fafafa", fontSize: 110, lineHeight: 1 }}>▲</span>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
