/** Color de texto (#000000 o #ffffff) con mejor contraste WCAG sobre un fondo hex dado. */
export function obtenerColorContraste(hex: string): string {
  const limpio = hex.replace("#", "")
  const valor =
    limpio.length === 3
      ? limpio
          .split("")
          .map((c) => c + c)
          .join("")
      : limpio.padEnd(6, "0").slice(0, 6)

  const canal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const r = canal(parseInt(valor.slice(0, 2), 16) / 255)
  const g = canal(parseInt(valor.slice(2, 4), 16) / 255)
  const b = canal(parseInt(valor.slice(4, 6), 16) / 255)
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b

  return luminancia > 0.179 ? "#000000" : "#ffffff"
}
