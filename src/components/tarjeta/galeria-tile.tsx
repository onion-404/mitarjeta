"use client"

import Image from "next/image"
import * as React from "react"

import { posterVideoGaleria, videoOptimizadoGaleria } from "@/lib/cloudinary-media"
import { esUrlOptimizable } from "@/lib/imagen-posicion"
import type { GaleriaItem } from "@/lib/types"

// Límites del clamp de proporción: 9:16 (retrato típico de celular) a 16:9
// (paisaje) — cubre los 2 formatos de video estándar y todo lo intermedio
// (4:5, 1:1, etc.) sin dejar que un archivo con una proporción rarísima
// (un screenshot 1:4, por ejemplo) rompa la fila del slide horizontal con
// un tile absurdamente alto o angosto.
const RATIO_MIN = 9 / 16
const RATIO_MAX = 16 / 9

function clamp(valor: number, min: number, max: number) {
  return Math.min(Math.max(valor, min), max)
}

/** Mide la proporción real (ancho/alto) de un archivo de la galería —
 *  liviana (solo pide metadata/dimensiones, no la descarga completa) y
 *  desconectada del DOM visible, un `Image()`/`<video>` dispara sus
 *  eventos igual sin estar montado. `null` mientras no hay medida todavía
 *  (fallback a cuadrado en el render). Sin depender de que el archivo haya
 *  guardado su ancho/alto en la base — funciona igual para contenido viejo
 *  subido antes de esta feature. */
function useProporcionMedia(url: string, tipo: "imagen" | "video") {
  const [estado, setEstado] = React.useState<{ url: string; ratio: number | null }>({
    url,
    ratio: null,
  })

  // Ajuste de estado DURANTE el render (patrón recomendado por React para
  // resetear estado derivado de una prop que cambió, en vez de un
  // setState-en-efecto) — sin esto, cambiar de `url` seguiría mostrando el
  // ratio del archivo ANTERIOR hasta que termine de medirse el nuevo.
  if (estado.url !== url) {
    setEstado({ url, ratio: null })
  }

  React.useEffect(() => {
    if (!url) return
    let cancelado = false

    function aplicar(ratio: number) {
      if (cancelado) return
      // Guardia extra por `url`: si el efecto de una medición anterior
      // resuelve tarde (después de que `url` ya cambió de nuevo), no pisa
      // el resultado del archivo actual — el flag `cancelado` del cleanup
      // ya cubre la mayoría de los casos, esto es un cinturón extra.
      setEstado((prev) => (prev.url === url ? { url, ratio } : prev))
    }

    if (tipo === "imagen") {
      const img = new window.Image()
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          aplicar(clamp(img.naturalWidth / img.naturalHeight, RATIO_MIN, RATIO_MAX))
        }
      }
      img.src = url
      return () => {
        cancelado = true
      }
    }

    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        aplicar(clamp(video.videoWidth / video.videoHeight, RATIO_MIN, RATIO_MAX))
      }
    }
    video.src = url
    return () => {
      cancelado = true
    }
  }, [url, tipo])

  const ratio = estado.url === url ? estado.ratio : null

  return ratio
}

interface GaleriaTileProps {
  archivo: GaleriaItem
}

/** Un tile del slide horizontal de "Contenido multimedia" — ancho fijo
 *  (220px, mismo criterio que el resto del slide), alto DERIVADO de la
 *  proporción real del archivo en vez de forzado a cuadrado: un video o
 *  foto vertical se ve alto, uno horizontal se ve más bajo (pedido
 *  explícito del cliente — antes todo se recortaba a 1:1 sin importar el
 *  formato original). Mientras se mide la proporción usa 1:1 como
 *  fallback, así no hay un tile roto en el instante inicial. */
export function GaleriaTile({ archivo }: GaleriaTileProps) {
  const ratio = useProporcionMedia(archivo.url, archivo.tipo)

  return (
    <div
      className="relative w-[220px] shrink-0 snap-center overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-md dark:border-[rgba(255,255,255,0.1)]"
      style={{ aspectRatio: ratio ?? 1 }}
    >
      {archivo.tipo === "video" ? (
        <video
          src={esUrlOptimizable(archivo.url) ? videoOptimizadoGaleria(archivo.url) : archivo.url}
          poster={posterVideoGaleria(archivo.url)}
          controls
          playsInline
          preload="none"
          className="size-full object-cover"
        />
      ) : (
        <Image
          src={archivo.url}
          alt=""
          fill
          sizes="220px"
          unoptimized={!esUrlOptimizable(archivo.url)}
          className="object-cover"
        />
      )}
    </div>
  )
}
