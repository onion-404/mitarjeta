import { ImageResponse } from "next/og"

// Ver la nota larga en manifest-icons/192/route.tsx — mismo criterio,
// tamaño grande (también sirve como ícono "maskable": el glifo queda bien
// adentro del "safe zone" que recortan Android/iOS al enmascarar a círculo).
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
        <span style={{ color: "#fafafa", fontSize: 290, lineHeight: 1 }}>▲</span>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
