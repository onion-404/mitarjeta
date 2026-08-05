import type { DatosContacto } from "@/lib/types"

// Extraído de tarjeta-card.tsx (2026-08-04): antes vivía adentro del
// componente porque solo él mostraba los botones de acción. Ahora que
// compartir/QR/PDF/contacto se consolidan en un único FAB (AccionesTarjeta,
// renderizado por el consumidor de TarjetaCard, no por TarjetaCard mismo —
// necesita un ref al <article> real para el PDF), esta lógica se comparte
// desde un módulo aparte en vez de vivir atada a un componente puntual.

// Tipo único de tarjeta (ver nota en lib/types.ts): ya no bifurca por
// personal/empresarial — nombre ("Título"), empresa ("Rol o descripción") y
// puesto ("Bio") son los mismos 3 campos para cualquier tarjeta.
function construirVCard(datos: DatosContacto) {
  const nombrePrincipal = datos.nombre

  const lineas = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${nombrePrincipal || "Sin nombre"}`,
    datos.empresa ? `TITLE:${datos.empresa}` : "",
    datos.puesto ? `NOTE:${datos.puesto}` : "",
    datos.telefono ? `TEL;TYPE=CELL,VOICE:${datos.telefono}` : "",
    datos.whatsapp && datos.whatsapp !== datos.telefono
      ? `TEL;TYPE=CELL:${datos.whatsapp}`
      : "",
    datos.email ? `EMAIL:${datos.email}` : "",
    datos.direccion ? `ADR:;;${datos.direccion}` : "",
    "END:VCARD",
  ].filter(Boolean)

  return lineas.join("\r\n")
}

export function nombreArchivoDesde(nombre?: string) {
  return (nombre || "tarjeta")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
}

export function descargarVCard(datosContacto: DatosContacto) {
  const contenido = construirVCard(datosContacto)
  const blob = new Blob([contenido], { type: "text/vcard;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = `${nombreArchivoDesde(datosContacto.nombre)}.vcf`
  enlace.click()
  URL.revokeObjectURL(url)
}

export async function descargarPdf(elemento: HTMLElement, nombreArchivo: string) {
  const html2pdf = (await import("html2pdf.js")).default
  await html2pdf()
    .from(elemento)
    .set({
      filename: `${nombreArchivo}.pdf`,
      margin: 0.2,
      jsPDF: { unit: "in", format: [4, 6], orientation: "portrait" },
      html2canvas: { scale: 2, backgroundColor: "#ffffff" },
    })
    .save()
}
