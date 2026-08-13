"use client"

import * as React from "react"

import { TarjetaSkeleton } from "@/components/tarjeta/tarjeta-skeleton"
import { cn } from "@/lib/utils"

// Techo de espera — si alguna imagen crítica nunca resuelve (servidor
// caído, URL rota), el preloader igual se rinde y muestra la tarjeta real
// en vez de trabar la página para siempre.
const TIMEOUT_MAXIMO_MS = 4000

interface TarjetaPreloaderProps {
  /** URLs de las imágenes "arriba del pliegue" (avatar, banner o imagen de
   *  fondo, título como logo) — se precargan en paralelo con `Image()`
   *  desconectado del DOM antes de destapar la tarjeta real. */
  urlsCriticas: string[]
  children: React.ReactNode
  className?: string
}

/**
 * Preloader REAL para la tarjeta pública — a diferencia de `[slug]/
 * loading.tsx` (el fallback de Suspense de la ruta, que solo cubre el
 * round-trip de datos del servidor contra Supabase), esto cubre lo que
 * pasa DESPUÉS de que el HTML ya llegó: las imágenes críticas todavía
 * tardan en bajar, y sin esto se ven "poppear" una por una a medida que el
 * navegador las va resolviendo — pedido explícito del cliente: un
 * preloader que funcione con la carga real, no uno cosmético de duración
 * fija.
 *
 * La tarjeta real (`children`) se renderiza SIEMPRE de entrada — nunca se
 * oculta del DOM ni se retrasa su montaje — así el HTML que le llega a
 * cualquier crawler/lector sin JS ya tiene el contenido real (nombre, bio,
 * botones) desde el primer byte, y las imágenes reales arrancan su propia
 * descarga de inmediato (la misma que dispara este preloader al precargar
 * en paralelo). Lo único que hace este componente es tapar visualmente esa
 * carga con un overlay (mismo look que `TarjetaSkeleton`) hasta que las
 * URLs críticas resuelven — cargadas O falladas, un error nunca debe
 * trabar el preloader para siempre — o se cumple el timeout de seguridad.
 */
export function TarjetaPreloader({ urlsCriticas, children, className }: TarjetaPreloaderProps) {
  const [listo, setListo] = React.useState(urlsCriticas.length === 0)

  React.useEffect(() => {
    if (urlsCriticas.length === 0) return
    let restantes = urlsCriticas.length
    let cancelado = false

    function asentar() {
      restantes -= 1
      if (restantes <= 0 && !cancelado) setListo(true)
    }

    const imagenes = urlsCriticas.map((url) => {
      const img = new window.Image()
      img.onload = asentar
      img.onerror = asentar
      img.src = url
      return img
    })

    const timeoutId = window.setTimeout(() => {
      if (!cancelado) setListo(true)
    }, TIMEOUT_MAXIMO_MS)

    return () => {
      cancelado = true
      window.clearTimeout(timeoutId)
      imagenes.forEach((img) => {
        img.onload = null
        img.onerror = null
      })
    }
    // urlsCriticas es un array nuevo en cada render del padre (server
    // component) — comparar por contenido en vez de por identidad evita
    // reiniciar el precargado en cada re-render sin que la lista real haya
    // cambiado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsCriticas.join("|")])

  return (
    <div className={cn("relative w-full", className)}>
      {children}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 z-40 flex items-start justify-center overflow-hidden bg-zinc-50 py-6 transition-opacity duration-300 ease-out dark:bg-black sm:items-center sm:py-16",
          // pointer-events solo se libera una vez destapada — mientras el
          // overlay sigue visible (aunque ya arrancó el fade), no debería
          // poder tocarse el contenido real de abajo, todavía cargando.
          listo ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <TarjetaSkeleton />
      </div>
    </div>
  )
}
