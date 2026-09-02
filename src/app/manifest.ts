import type { MetadataRoute } from "next"

// "Agregar a pantalla de inicio" (2026-09-04, pedido explícito) — Next.js
// sirve esto automático en /manifest.webmanifest apenas existe este
// archivo (convención de metadata, sin tocar layout.tsx para el <link>).
// `start_url: "/mi-cuenta"` es la decisión clave: quien instala Linkard
// desde su celular es el DUEÑO de una tarjeta (no un visitante genérico) —
// tocar el ícono lo lleva directo a su panel, no al home de marketing. Si
// no tiene sesión activa en ese navegador, `/mi-cuenta` ya redirige a su
// propio login inline (ver AuthMethods) — no hace falta lógica extra acá.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Linkard",
    short_name: "Linkard",
    description: "Tu tarjeta digital, agenda y catálogo en un solo enlace.",
    start_url: "/mi-cuenta",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [
      { src: "/manifest-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/manifest-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
