# Dashboards de métricas

> Detalle de métricas — referenciado desde CLAUDE.md. Actualizar acá, no ahí.

## Dashboards de métricas
- **Instrumentación**: `POST /api/eventos` (sin auth, rate-limit 60/min por IP,
  `lib/eventos.ts` server-only: `TIPOS_EVENTO`, `hashVisitante()` — sha256 rotativo diario con
  pepper = `SUPABASE_SERVICE_ROLE_KEY`, `registrarEventoServidor()`). `lib/track-evento.ts`
  (cliente, fire-and-forget, `keepalive:true`). Disparado desde `tarjeta-card.tsx`
  (`vista_tarjeta`, `click_enlace`, `click_producto`), `reservar-servicio.tsx`
  (`click_agendar`, `agenda_completada` sin pago), `confirmar-pago.ts`
  (`agenda_completada` con pago, server-side).
- **`compra_completada` deliberadamente sin instrumentar** — los productos son links de salida
  (WhatsApp, tienda externa), no hay checkout propio; `click_producto` es el proxy real de
  conversión. Sigue en el CHECK constraint y en la UI (listo para conectar el día que exista
  checkout de productos propio) — decisión explícita del cliente, no un olvido.
- **Dashboard del dueño** (`/mi-cuenta/estadisticas`, sección "Estadísticas" de `TarjetaForm`
  en modo edición): `src/lib/metricas.ts` — `getTotalesPorPeriodo`/`getSerieDiaria` (desde
  `metricas_diarias`), `getEventosDetalle` (solo si `plan.features.metricas_desglose`, desde
  `eventos_metricas` crudo). **Gating de 2 niveles desde 2026-08-11**:
  `planes.features.metricas_activas` es el gate de ENTRADA a toda la sección — con Connect
  (`false`) el bloqueo es total, ni los 4 tiles básicos ni la tendencia se muestran (mismo
  criterio que Agenda sin plan: sección entera bloqueada, no datos vacíos). Con Growth
  (`true`) se ven además `metricas_desglose` (top 5 por enlace/servicio/producto + donut
  único/recurrente vía `visitante_hash`), `metricas_rango_custom` (rango de fechas custom) y
  `metricas_exportacion` (CSV client-side) — las 4 features de Growth están todas en `true`
  a la vez, así que en la práctica todo-o-nada. Variantes multi-tarjeta
  (`getTotalesPorPeriodoUsuario` etc.) para la vista agregada de todas las tarjetas del
  usuario aplican el mismo gate por tarjeta ANTES de sumar a los totales (una tarjeta en
  Connect no aporta ni un solo evento al agregado, a diferencia del modelo de 3 tiers
  anterior donde toda tarjeta con plan sumaba a los totales básicos) — aviso en pantalla si
  hay tarjetas mixtas de plan (algunas Growth, otras Connect/sin plan), bloqueo total de la
  página si NINGUNA tarjeta está en Growth.
- **Dashboard admin** (`/admin/tarjetas`, `/admin/suscripciones`): `src/lib/admin-metricas.ts`
  — `getSuscripcionesAutorizadas()`, `getTarjetaIdsConAgendaActiva()`,
  `getSuscripcionesHistorial()`, `calcularChurn(historial, desde, hasta)` (función pura,
  reconstruye estado en `desde` desde `suscripciones_historial` y detecta transición a
  terminal en la ventana — mirar el `estado` actual no alcanza, es last-write-wins). MRR:
  normaliza anual÷12 antes de sumar. Período fijo: últimos 30 días (sin selector). Stat tiles
  del Resumen admin: "Tarjetas con plan activo", "Tasa de conversión", "Suscripciones
  pendientes", "MRR total", "Churn (30 días)" — los 3 primeros reemplazaron tiles viejos que
  leían `estado_pago`/`precio_pagado` (modelo huérfano, ver bug de `estado_pago` abajo).
- Paleta de charts: tokens `--chart-1..5` en `globals.css`, paleta categórica validada con la
  skill `dataviz` (`scripts/validate_palette.js`). `recharts` (`^3.10.1`) instalado.
- Detalle completo de verificaciones end-to-end (tarjetas de prueba sembradas, capturas,
  cálculos a mano confirmados) en HISTORIAL.md.

## 🔴→✅ Bug crítico ya resuelto: `/[slug]` gateaba con `estado_pago` (campo huérfano)
- `estado_pago` es 100% del modelo viejo de pago único (Checkout Pro pre-planes) — el flujo
  actual de Stripe nunca lo toca. **Único gate de acceso real que dependía de él**: la línea
  de `[slug]/page.tsx` que mostraba "Tarjeta temporalmente inactiva". Cualquier tarjeta nueva
  con suscripción de Stripe `autorizada` real se hubiera seguido mostrando inactiva a TODO el
  mundo — bug real, aunque no había afectado a ningún cliente pagador todavía al momento del
  fix.
- **Fix**: `src/app/[slug]/page.tsx` cambiado a gatear con `!tarjeta.plan_id` (misma fuente de
  verdad que ya usan las policies RLS de agenda). Otras referencias reales a `estado_pago`
  (admin dashboard "Ventas recientes" del modelo viejo, `/api/checkout` sin caller) se dejaron
  intactas — no son gates de acceso, son bookkeeping legacy válido para tarjetas viejas.
  Verificación end-to-end completa en HISTORIAL.md.
