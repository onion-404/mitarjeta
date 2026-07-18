// Sin "server-only" a propósito: lo usan tanto páginas de servidor
// (/pago/exito, /pago/pendiente) como el widget de reserva en el cliente
// (reservar-servicio.tsx), que necesita mostrar horarios en la zona horaria
// de la tarjeta, no la del navegador del visitante.

/** Formatea un timestamp UTC en la hora local de la tarjeta (fecha y hora completas). */
export function formatearFechaHoraLocal(fechaHoraInicio: string, zonaHoraria: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: zonaHoraria,
  }).format(new Date(fechaHoraInicio))
}

/** Formatea un timestamp UTC en la hora local de la tarjeta (solo hora, para botones de horario). */
export function formatearHoraLocal(fechaHoraInicio: string, zonaHoraria: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeStyle: "short",
    timeZone: zonaHoraria,
  }).format(new Date(fechaHoraInicio))
}
