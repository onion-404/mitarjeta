import * as React from "react"

// ============================================================================
// "Texto enriquecido" liviano para descripciones cortas (ítems de catálogo) —
// a propósito NO es HTML real ni contentEditable: el valor sigue siendo un
// string plano (Producto.descripcion no cambia de tipo, cero migración de
// datos existentes) con 2 marcadores tipo Markdown (**negrita**, *cursiva*)
// que se interpretan SOLO al renderizar, acá. Sin HTML nunca en el medio no
// hay superficie de XSS que sanitizar — la alternativa (contentEditable +
// dangerouslySetInnerHTML + sanitizador) es justo el tipo de complejidad/
// riesgo que este proyecto evita cuando una solución nativa/simple alcanza
// (mismo criterio que ya usaron formas de avatar con clip-path en vez de
// una librería, fechas con Intl nativo, etc., ver CLAUDE.md).
// ============================================================================

/** Envuelve/desenvuelve la selección de un <textarea> con un marcador —
 *  reusado por EditorTextoEnriquecido para los botones Negrita/Cursiva. Si
 *  la selección ya está envuelta lo desenvuelve (toggle), si no hay
 *  selección inserta un placeholder "texto" entre los marcadores. Devuelve
 *  el valor nuevo completo y la posición de selección a restaurar. */
export function envolverSeleccion(
  valor: string,
  inicio: number,
  fin: number,
  marcador: string
): { valor: string; inicio: number; fin: number } {
  const seleccionado = valor.slice(inicio, fin)
  const yaEnvuelto =
    seleccionado.length >= marcador.length * 2 &&
    seleccionado.startsWith(marcador) &&
    seleccionado.endsWith(marcador)
  const reemplazo = yaEnvuelto
    ? seleccionado.slice(marcador.length, seleccionado.length - marcador.length)
    : `${marcador}${seleccionado || "texto"}${marcador}`
  return {
    valor: valor.slice(0, inicio) + reemplazo + valor.slice(fin),
    inicio,
    fin: inicio + reemplazo.length,
  }
}

/** Interpreta **negrita** y *cursiva* (o _cursiva_) línea por línea, sin
 *  anidamiento entre sí (alcanza para una descripción corta, sin necesidad
 *  de un parser real de Markdown) — `\n` se preserva como salto de línea
 *  explícito, mismo criterio visual que el `whitespace-pre-line` que ya
 *  usaba este campo antes de tener marcadores. Isomorfo (server y cliente):
 *  es manipulación de strings pura, sin ninguna API de DOM/navegador, así
 *  que funciona igual en el render público (SSR) que en el editor. */
export function renderizarTextoEnriquecido(texto: string): React.ReactNode {
  const lineas = texto.split("\n")
  return lineas.map((linea, indiceLinea) => (
    <React.Fragment key={indiceLinea}>
      {indiceLinea > 0 && <br />}
      {renderizarLinea(linea)}
    </React.Fragment>
  ))
}

function renderizarLinea(linea: string): React.ReactNode[] {
  // Regex local (no module-level): con el flag "g" el estado (`lastIndex`)
  // vive en la instancia, así que declararla acá evita cualquier duda sobre
  // reutilización entre llamadas.
  const regexMarcadores = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g
  const partes: React.ReactNode[] = []
  let ultimoIndice = 0
  let clave = 0
  let match: RegExpExecArray | null
  while ((match = regexMarcadores.exec(linea))) {
    if (match.index > ultimoIndice) partes.push(linea.slice(ultimoIndice, match.index))
    if (match[1] !== undefined) {
      partes.push(<strong key={clave++}>{match[1]}</strong>)
    } else {
      partes.push(<em key={clave++}>{match[2] ?? match[3]}</em>)
    }
    ultimoIndice = regexMarcadores.lastIndex
  }
  if (ultimoIndice < linea.length) partes.push(linea.slice(ultimoIndice))
  return partes
}
