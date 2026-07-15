import "server-only"

interface RegistroLimite {
  intentos: number
  reinicioEn: number
}

const registros = new Map<string, RegistroLimite>()

/**
 * Limitador de tasa muy simple, en memoria, por ventana fija. Sirve para
 * frenar abuso básico (spam de firmas o de preferencias de pago) en una sola
 * instancia. En un despliegue serverless con múltiples instancias cada una
 * lleva su propio conteo, así que para un límite estricto a nivel global
 * conviene un store compartido (Redis/Upstash); acá priorizamos simplicidad.
 */
export function excedeLimite(
  clave: string,
  { maximo, ventanaMs }: { maximo: number; ventanaMs: number }
): boolean {
  const ahora = Date.now()

  // Barrido oportunista para no acumular claves vencidas indefinidamente.
  if (registros.size > 500 && Math.random() < 0.1) {
    for (const [k, v] of registros) {
      if (ahora > v.reinicioEn) registros.delete(k)
    }
  }

  const registro = registros.get(clave)
  if (!registro || ahora > registro.reinicioEn) {
    registros.set(clave, { intentos: 1, reinicioEn: ahora + ventanaMs })
    return false
  }

  registro.intentos += 1
  return registro.intentos > maximo
}

export function obtenerIpCliente(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "desconocido"
}
