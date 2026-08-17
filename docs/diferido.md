# Diferido a fase posterior

> NO construir salvo instrucción explícita. Referenciado desde CLAUDE.md.

- Integración Google Calendar (candidato a feature de plan "poder"/Connect, ver docs/negocio.md
  para el hueco de marketing que esto deja pendiente).
- Billetera nativa con ledger de comisión + solicitud de retiro.
- Migración del modelo de pago único legacy de `tarjetas` (coexiste, no se toca).
- **Guardar la tarjeta en el wallet del celular** (Apple Wallet / Google Wallet) — un "pase"
  con nombre/logo del negocio + QR a `linkard.mx/{slug}`. Requisitos relevados
  (2026-08-10), nada implementado todavía:
  - **Apple Wallet**: cuenta Apple Developer ($99/año) + certificado "Pass Type ID" + WWDR
    intermedio. `.pkpass` = ZIP firmado (`pass.json` + imágenes + firma), generado por tarjeta
    al vuelo (librería `passkit-generator` en Node). Sin proceso de aprobación externo.
  - **Google Wallet**: proyecto de Google Cloud + API de Wallet + cuenta de servicio +
    **Issuer ID que requiere aprobación de Google** (verificación de negocio, puede tardar
    días/semanas — es un trámite aparte del código, conviene iniciarlo temprano si se decide
    avanzar). Pase = JWT firmado que arma el link "Agregar a Google Wallet".
  - En ambos casos alcanza con lo que ya existe (logo/avatar de Cloudinary, `colorPrimario`,
    slug para el QR) — faltarían 2 endpoints nuevos + botón "Agregar a Wallet" en `/[slug]` +
    gestión de certificados/credenciales como secrets.
  - Recomendación dada al cliente: arrancar por Apple (sin trámite externo) y dejar Google
    Wallet para después / en paralelo si se quiere iniciar ya el trámite de aprobación.
- **Confirmación de agenda por WhatsApp vía Make — CONSTRUIDA (2026-08-11)**. Código real
  funcionando: `src/lib/notificaciones-agenda.ts` — `notificarNuevaCita(citaId)` dispara un
  `POST` server-side a `MAKE_WEBHOOK_AGENDA_URL` (seteada en `.env.local` con una URL real) con
  los datos de la cita (tarjeta, cliente, cita) — Make arma los 2 mensajes (uno al cliente, uno
  al dueño) del lado de su propio conector de WhatsApp Business API, este proyecto no sabe nada
  de templates/Meta. Se llama desde 2 puntos (mismo criterio que `agenda_completada` en
  `eventos_metricas`): `/api/citas/route.ts` cuando la cita queda `'confirmada'` sin pago
  inmediato, `confirmar-pago.ts` cuando el pago se confirma y queda `'pagada'` — nunca antes de
  que la cita esté de verdad confirmada. Tolerante a fallos a propósito (si Make está caído o
  la env var no está seteada, solo loguea y sigue, nunca rompe el flujo real de agendar/pagar).
  El campo de contacto del cliente en `reservar-servicio.tsx` exige teléfono (`TELEFONO_REGEX`,
  validación liviana) — Make necesita un número real, un email ya no alcanza.
  - **Es una CONFIRMACIÓN al momento de agendar, no un recordatorio programado antes de la
    cita** — importante para el copy de marketing: "Recordatorios y notificaciones... Cero
    ausencias" (ver `lib/planes-copy.ts`, docs/negocio.md) describe una función de reducción de
    no-shows más amplia (recordatorio la víspera/el día de la cita) que todavía no existe — hoy
    es un solo mensaje disparado en el momento de la reserva/pago. Publicado igual en el
    comparador por decisión explícita del cliente (2026-08-11) — 🔴 pendiente real: construir el
    recordatorio programado (no solo la confirmación) para que el copy sea 100% preciso.
  - 🔴 **Pendiente**: confirmar si estos archivos ya están commiteados (estado a 2026-08-11: sin
    commitear). Sin explorar todavía: si Make dispara el mensaje él mismo o hace falta algo más
    de nuestro lado — parece que no, ya está funcionando end-to-end con la URL real configurada.
