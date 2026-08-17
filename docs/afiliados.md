# Cupones avanzados y sistema de afiliados

> Detalle de cupones/afiliados — referenciado desde CLAUDE.md. Actualizar acá, no ahí.

## Sistema de cupones avanzado
- `cupones` gana `afiliado_nombre` (snapshot legacy), `afiliado_id` (FK real),
  `fecha_vencimiento`, `limite_usos` (los 3 nullable = sin restricción). `cupones.id` es
  **`bigint`**, no `uuid` (a diferencia de `tarjetas`/`suscripciones`) — ojo con este detalle
  en cualquier FK nueva hacia `cupones`.
- Tabla `cupon_usos`: auditoría append-only, snapshot de `codigo`/`afiliado_nombre` congelado.
  Las 3 FK (`cupon_id` bigint, `tarjeta_id`, `suscripcion_id`) son nullable con
  `on delete set null`, ninguna en cascada — el historial sobrevive el borrado del cupón/
  tarjeta/suscripción, en cualquier orden.
- `fn_cupon_es_valido(p_codigo)` (Postgres, `security definer`): única fuente de verdad de
  "¿este código sirve hoy?" (activo + no vencido + no alcanzó su límite, contado contra filas
  reales de `cupon_usos`) — llamada tanto del cliente (`validarCupon()`) como del servidor
  (`/api/stripe/checkout`). `fn_cupon_usos_restantes(p_codigo)`: mismo patrón, expone el
  contador para el banner de landing.
- `src/lib/cupones.ts`: `getCupones`, `crearCupon`, `actualizarCupon`, `eliminarCupon` (seguro,
  el `on delete set null` no requiere pasos extra), `validarCupon`, `getCuponesConRendimiento`
  (agrupado por **`codigo`**, no por `cupon_id` — un cupón borrado sigue mostrando su
  historial; dedupea por `Set` de `suscripcion_id` para "tarjetas activas atribuibles", ya que
  `cupon_usos` es una fila por COBRO, no por suscripción — ver sistema de afiliados).
- **`/admin/cupones`**: crear + listado expandible (edición inline, toggle activo, eliminar
  con confirmación distinta según tenga usos o no) + sección "Cupones eliminados con
  historial" (solo lectura). Estado (vigente/inactivo/vencido/agotado) derivado en cliente, no
  columna en DB. Campo "Afiliado" es un `<select>` de afiliados activos (setea `afiliado_id` +
  auto-completa `afiliado_nombre`).
- **Cupón de lanzamiento real** (`LINKARD15`, 15% off): banner en el home
  (`cupon-lanzamiento.tsx`) con contador real vía `fn_cupon_usos_restantes` → guarda el código
  en la URL a través de todo el embudo de login (ver docs/pagos.md, "Flujo de compra").

## Sistema de afiliados con comisión recurrente
- Decisiones de negocio: login con el mismo Google que los dueños de tarjeta (si el email
  matchea `afiliados`, ve la pestaña "Ganancias"); **comisión RECURRENTE** (se calcula sobre
  CADA cobro, no solo la venta inicial); un afiliado puede tener múltiples cupones; % de
  comisión vive en `afiliados.porcentaje_comision` (no en el cupón); comisión sobre el monto
  NETO (fee real de Stripe ya restado); alta 100% manual por el admin.
- `afiliados` (`id uuid`, `nombre`, `email` con índice único case-insensitive, `porcentaje_
  comision numeric(5,2)`, `activo`) — **sin FK a `auth.users`**, el matching es en tiempo de
  consulta vía `auth.jwt()->>'email'` (mismo patrón que `ADMIN_EMAIL`). `afiliado_pagos`
  (registro manual: `monto`, `fecha`, `nota`, `registrado_por` default
  `auth.jwt()->>'email'`, no spoofeable) con mismo patrón de auditoría que `cupon_usos`.
- **Punto de captura: `invoice.paid`, no la transición de estado de la suscripción** —
  `registrarCobroDeCupon(invoice)` (`lib/confirmar-suscripcion-stripe.ts`) inserta una fila de
  `cupon_usos` por CADA invoice (`stripe_invoice_id` como clave de idempotencia,
  `upsert(..., {onConflict: "stripe_invoice_id", ignoreDuplicates: true})`) — una suscripción
  con 5 renovaciones deja 5 filas. `procesarSuscripcionStripe()` volvió a su alcance original
  (solo sincroniza `estado`/`plan_id`).
- **Fee real de Stripe**: `intentarObtenerFeeReal()` vía
  `PaymentIntent.latest_charge.balance_transaction.fee`, con hasta 3 reintentos (1.5s) por la
  captura asíncrona de Stripe. Requiere re-consultar el invoice con
  `expand: ["payments"]` explícito (no viene poblado en el payload del webhook). Si nunca
  llega, `comision_stripe`/`monto_neto` quedan `null` y `getRendimientoAfiliado()` cae a
  `monto_neto ?? precio_final` (sobreestimación temporal, no excluye la venta).
- `src/lib/afiliados.ts`: `getAfiliados`/`crearAfiliado`/`actualizarAfiliado` (admin),
  `getAfiliadoPropio` (RLS-scoped), `getRendimientoAfiliado(afiliadoId, porcentajeComision)`
  (compartido admin/afiliado: `ventasBrutas`/`ventasNetas` de `cupon_usos`, `comisionGenerada
  = ventasNetas * pct/100`, `saldoPendiente = comisionGenerada - sum(pagos)`),
  `getPagosAfiliado`, `registrarPagoAfiliado` (admin), `getAfiliadosConResumen`.
- UI: `/admin/afiliados` (listado + alta + detalle expandible con registro de pago inline),
  `/mi-cuenta/ganancias` (solo lectura, revalida `getAfiliadoPropio()` fail-closed —
  no confía en que la pestaña esté oculta).
- 🔴 **Pendiente — backfill de `afiliado_id`** en cupones/cupon_usos legacy (que tenían
  `afiliado_nombre` texto libre) — requiere que primero existan afiliados reales dados de
  alta para matchear por nombre.
- 🔴 **Pendiente — falta `invoice.paid` en el webhook LIVE de Stripe** (ver docs/pagos.md) —
  sin esto, ninguna venta de afiliado se registra en producción real.
