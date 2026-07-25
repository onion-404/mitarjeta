// Sin "server-only": se importa desde componentes cliente de la tarjeta
// pública (tarjeta-card.tsx, reservar-servicio.tsx) para instrumentar
// vistas/clicks. Deliberadamente no incluye "compra_completada" — nada la
// dispara todavía (ver src/lib/eventos.ts) y este tipo evita que se cablee
// por accidente desde la UI antes de que exista un flujo de compra propio.
export type TipoEventoCliente =
  | "vista_tarjeta"
  | "click_enlace"
  | "click_agendar"
  | "agenda_completada"
  | "click_producto"

/**
 * Fire-and-forget: nunca debe bloquear ni romper la experiencia pública de
 * la tarjeta por un fallo de métricas (red caída, endpoint rate-limiteado,
 * lo que sea). `keepalive` para que el request sobreviva si el click
 * dispara además una navegación/descarga inmediata (ej. abrir un link
 * externo en la misma pestaña).
 */
export function registrarEvento(
  tarjetaId: string,
  tipoEvento: TipoEventoCliente,
  metadata?: Record<string, unknown>
) {
  try {
    fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tarjeta_id: tarjetaId, tipo_evento: tipoEvento, metadata }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Ídem: un throw sincrónico acá tampoco debe romper el click real.
  }
}
