"use client"

import * as React from "react"

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

// Carga única y compartida del widget oficial de Instagram (embed.js) — a
// diferencia de YouTube/Vimeo, Instagram NO sirve un iframe reproducible
// directo en `/embed`: sin este script, esa URL solo muestra una tarjeta
// estática con un link que saca al visitante a instagram.com (bug real
// reportado: "me redirige a Instagram" en vez de reproducir ahí mismo).
// Es la ÚNICA forma soportada de reproducir un reel embebido de verdad
// (mismo <blockquote class="instagram-media"> + embed.js que da el propio
// botón "Insertar" de Instagram) — sí implica cargar JS de un tercero en
// la tarjeta pública, contrapartida aceptada porque no hay alternativa sin
// salir del sitio.
let promesaScript: Promise<void> | null = null

function cargarInstagramEmbedScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.instgrm) return Promise.resolve()
  if (promesaScript) return promesaScript
  promesaScript = new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://www.instagram.com/embed.js"
    script.async = true
    script.onload = () => resolve()
    // Si falla la carga (bloqueado por el navegador, sin red, etc.), no
    // dejamos la promesa colgada — el fallback (el link "Ver en Instagram"
    // del propio blockquote) sigue siendo visible.
    script.onerror = () => resolve()
    document.body.appendChild(script)
  })
  return promesaScript
}

interface InstagramReelEmbedProps {
  url: string
}

/** Un reel embebido de verdad (reproduce inline, nunca navega afuera) —
 *  wrapper del <blockquote class="instagram-media"> oficial. `process()`
 *  se llama en cada mount/cambio de `url`: Instagram reemplaza el
 *  blockquote por su iframe real la primera vez que lo ve, e ignora los
 *  que ya procesó — seguro de llamar más de una vez con varios reels en
 *  la misma página (el carrusel de "Contenido multimedia"). */
export function InstagramReelEmbed({ url }: InstagramReelEmbedProps) {
  React.useEffect(() => {
    let cancelado = false
    cargarInstagramEmbedScript().then(() => {
      if (cancelado) return
      window.instgrm?.Embeds.process()
    })
    return () => {
      cancelado = true
    }
  }, [url])

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      // Sin data-instgrm-captioned: es la variante MÁS compacta que soporta
      // el widget oficial (sin el bloque de texto de la descripción debajo
      // del video) — igual conserva el encabezado (foto+usuario) y el pie
      // (íconos + link "Ver en Instagram") propios de Instagram, que no se
      // pueden quitar (contenido de un iframe de otro origen, no hay CSS
      // nuestro que llegue adentro). 328px = el ANCHO MÍNIMO real que
      // Instagram documenta para este widget — achicarlo más de acá no lo
      // hace más chico, lo corta mal (bug real reportado: "se ve feo").
      style={{ background: "#FFF", border: 0, borderRadius: 12, margin: 0, minWidth: 328, maxWidth: 328, width: 328 }}
    >
      <a href={url} target="_blank" rel="noopener noreferrer">
        Ver esta publicación en Instagram
      </a>
    </blockquote>
  )
}
