import { esUrlOptimizable } from "@/lib/imagen-posicion"

// Transformaciones "on the fly" en la URL de ENTREGA de Cloudinary — a
// diferencia de la firma de SUBIDA (`lib/cloudinary.ts`, server-only,
// necesita el API secret), esto es pura manipulación de string: Cloudinary
// genera la variante transformada la primera vez que se pide esa URL y la
// cachea, sin necesitar ninguna firma. Por eso este archivo NO es
// server-only y se puede importar tanto desde componentes cliente
// (`tarjeta-card.tsx`) como servidor.

function insertarTransformacion(url: string, transformacion: string) {
  if (!esUrlOptimizable(url) || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/${transformacion}/`)
}

/** Video optimizado para un tile chico de la galería de "Contenido
 *  multimedia": mismo recorte cuadrado que ya hace `object-cover` en CSS,
 *  pero resuelto del lado de Cloudinary en vez de bajar el archivo a
 *  resolución completa — un clip vertical de celular fácil pesa varios MB
 *  en 1080×1920 para mostrarse en un tile de 220px. `f_auto`/`q_auto`:
 *  formato y calidad automáticos (Cloudinary elige el códec más liviano
 *  que soporte el navegador). `ladoPx` en 2x el tile real (220px) para que
 *  se vea nítido en pantallas retina. URLs no optimizables (preview local
 *  `blob:` sin guardar todavía) se devuelven tal cual, sin transformar. */
export function videoOptimizadoGaleria(url: string, ladoPx = 440) {
  return insertarTransformacion(url, `f_auto,q_auto,c_fill,w_${ladoPx},h_${ladoPx}`)
}

/** Miniatura estática (JPG) del PRIMER frame del video (`so_0` = offset
 *  0 segundos), recortada al mismo cuadrado — pensada como `poster` del
 *  `<video>`: se ve una imagen real de inmediato en vez de un tile negro/
 *  vacío mientras carga, y habilita `preload="none"` en el `<video>` (cero
 *  descarga de video hasta que el visitante toca play — más liviano
 *  todavía que `preload="metadata"`, que igual pedía algo de data al
 *  servidor). URLs no optimizables se devuelven sin cambios (sin poster
 *  posible para una preview local todavía no subida). */
export function posterVideoGaleria(url: string, ladoPx = 440) {
  if (!esUrlOptimizable(url) || !url.includes("/upload/")) return undefined
  const sinExtension = url.replace(/\.[a-zA-Z0-9]+$/, "")
  return insertarTransformacion(
    `${sinExtension}.jpg`,
    `so_0,c_fill,w_${ladoPx},h_${ladoPx},f_auto,q_auto`
  )
}

/** Imagen recortada/optimizada por Cloudinary a un cuadrado — mismo
 *  criterio que `videoOptimizadoGaleria`, reusado para ítems de catálogo
 *  (grid o lista, el recorte final siempre termina siendo un cuadrado) en
 *  vez de bajar el archivo a resolución completa para un tile chico.
 *  Ventaja extra sobre dejar que el proxy de optimización de next/image lo
 *  resuelva: esta es la URL FINAL, exacta y predecible de antemano — se
 *  puede precargar en segundo plano con `new Image()` y garantizar que
 *  caiga en el mismo cache-hit que el `<Image unoptimized>` real (a
 *  diferencia de `/_next/image?...`, que arma su URL según el `sizes`
 *  resuelto en cada momento, imposible de predecir para precargar). */
export function imagenOptimizadaCuadrada(url: string, ladoPx = 320) {
  return insertarTransformacion(url, `f_auto,q_auto,c_fill,w_${ladoPx},h_${ladoPx}`)
}
