# Pagos: Checkout Pro, Stripe, MP histórico, flujo de compra

> Detalle de pagos — referenciado desde CLAUDE.md. Actualizar acá, no ahí.

## Pagos — dos flujos separados, nunca mezclar
- **Checkout Pro** (`lib/mercadopago.ts`): pagos ÚNICOS — venta de productos, pago opcional de
  cita, cobro manual admin.
- **Suscripciones** (`lib/stripe-suscripciones.ts`, ver sección Stripe abajo): EXCLUSIVO para
  el cobro recurrente del plan de la tarjeta.
- **Cobro manual** (`/admin/cobro-manual`, gate `ADMIN_EMAIL`): genera link de Checkout Pro
  puntual (monto + descripción + email opcional) vía `crearPreferenciaPago()` con
  `tipo: "cobro_manual"`, `referenciaId` generado al vuelo (`crypto.randomUUID()`), sin
  insertar fila en DB. `confirmar-pago.ts` reconoce el prefijo `"cobro_manual:"` y no actualiza
  ninguna tabla para ese tipo. Cuotas: automáticas de Mercado Pago, sin parámetro extra.

## Suscripciones (cobro recurrente del plan) — proveedor activo: **Stripe**
- Migrado desde Mercado Pago (2026-07-21) por fricción de conversión (MP exigía sesión propia
  del pagador). Stripe Checkout hosteado, tokenización 100% del lado de Stripe — el número de
  tarjeta nunca pasa por nuestro código.
- **Archivos**: `lib/stripe.ts` (cliente), `lib/stripe-suscripciones.ts`
  (`crearCheckoutSession`, `crearPortalSession`), `lib/confirmar-suscripcion-stripe.ts`
  (mapeo de estados + sync `tarjetas.plan_id` + `registrarCobroDeCupon`),
  `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`,
  `app/api/stripe/portal/route.ts`.
- `/api/suscripciones` y `mercadopago-suscripciones.ts` (Mercado Pago) quedan como código
  muerto, sin caller — no borrados.
- **Sin Price IDs pre-creados**: se usa `price_data` inline (recurring), calculado con
  `planes.precio_mensual/anual` + descuento server-side — el precio queda fijo para esa
  suscripción puntual (coincide con la regla: el descuento aplica para siempre a esa
  suscripción).
- **Customer nuevo por checkout**, no reusado entre tarjetas del mismo usuario (no hay
  concepto de "usuario" con customer_id compartido). Email de pago ya NO se pide en nuestro
  form — Stripe lo pide en su propio checkout.
- `suscripciones.proveedor` (`'mercadopago' | 'stripe' | 'manual'`, default `'mercadopago'`) +
  `stripe_customer_id`, `stripe_subscription_id` (unique), `stripe_checkout_session_id`
  (nullable). Índice único `suscripciones_una_activa_por_tarjeta` (una suscripción viva por
  tarjeta) agnóstico de proveedor.
- Mapeo `Subscription.status` → `EstadoSuscripcion`: `active`/`trialing`→`autorizada`;
  `past_due`/`paused`→`pausada`; `canceled`→`cancelada`; `unpaid`/`incomplete_expired`→
  `vencida`; `incomplete`→`pendiente`.
- Webhook: `checkout.session.completed` (vincula ids vía `client_reference_id`),
  `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `invoice.paid`
  (dispara `registrarCobroDeCupon`, ver docs/afiliados.md) — todos re-consultan el objeto
  completo contra la API de Stripe, nunca confían en el payload del evento. Si
  `checkout.session.completed` no llegó todavía, la búsqueda cae a `suscripcion_id` en los
  metadata del Subscription.
- **Notas de API de Stripe (v22.3.2)**: `Subscription.current_period_end` no existe en el
  objeto raíz — vive en `subscription.items.data[0].current_period_end`. `Invoice.subscription`
  no existe — es `invoice.parent.subscription_details.subscription`. Ni `Charge` ni
  `PaymentIntent` tienen campo `invoice` en esta versión (no hay forma de correlacionar un
  cobro hacia atrás sin el invoice en mano).
- **Monto mínimo Stripe MXN: $10.00** (`unit_amount >= 1000` centavos) — validado en
  `app/api/stripe/checkout/route.ts` ANTES de insertar la fila en `suscripciones` (si
  `0 < precioFinal < 10` → `400` con motivo). `precioFinal === 0` (cupón 100%) se permite.
- **Reintento de checkout tras cancelar**: si ya existe una fila `pendiente` para la tarjeta,
  se reutiliza con `UPDATE` (recalcula montos/cupón, limpia los ids de Stripe) en vez de
  insertar — evita el 409 falso contra `suscripciones_una_activa_por_tarjeta`.
  `autorizada`/`pausada` siguen bloqueando con 409 real.
- `locale: "es-419"` seteado en `stripe.checkout.sessions.create()` (moneda/idioma MX
  correctos, default sin esto era europeo/inglés).
- **Keys**: `.env.local` tiene las 3 keys en modo **LIVE** (`sk_live_`/`pk_live_`/`whsec_`,
  cuenta `acct_1TvfXG1jsNdj9fiJ`, business_profile "Linkard"). 🔴 **Pendiente manual**:
  agregar las 3 keys a Vercel (Environment Variables) — hoy solo están en `.env.local`.
  🔴 **Endpoint live sin `customer.subscription.created` ni `invoice.paid` suscritos en el
  dashboard de Stripe** — el código ya los escucha; sin `invoice.paid` en producción, el
  sistema de afiliados no registra nada real todavía. Set completo que debería tener (6
  eventos): `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
  `invoice.payment_failed`, `invoice.paid`. `charge.updated` NO hace falta (confirmado: no
  hay forma de correlacionar con el invoice en esta versión de API).
- 🔴 **Sin resolver — bug reportado en producción**: crear suscripción para una tarjeta
  adicional a veces devuelve "no pudimos iniciar la suscripción con Stripe". Hipótesis de
  cupón 100% descartada con evidencia real. Sin acceso a Runtime Logs de Vercel desde este
  entorno — necesita que el usuario pegue el log real o dé un token de Vercel.
- 🔴 **Sin resolver — login con Google pierde `?plan=` en el retorno, solo con cuentas de
  Google NUEVAS** (confirmado por el usuario, reproducible). Descartado: trigger de Postgres,
  Auth Hook, código de la app (idéntico para cuenta nueva/existente). Causa probable: fuera de
  este repo (Dashboard de Supabase o Google Cloud Console), no verificable desde acá.
- **Stripe Customer Portal** (`/mi-cuenta/suscripcion`): botón "Administrar pago" por tarjeta
  (deshabilitado hasta tener `stripe_customer_id`), usa la suscripción más reciente con ese
  campo. 🔴 **Pendiente manual**: configurar el "Customer portal" default en el Dashboard de
  Stripe (Settings → Billing) — sin eso falla con "No configuration provided".
- Ver HISTORIAL.md para el detalle completo de las verificaciones end-to-end (Stripe CLI,
  test clocks, Playwright) que confirmaron cada uno de estos puntos.

## Suscripciones (Mercado Pago) — histórico, ya no es el proveedor activo
- Modalidad: preapproval "sin plan asociado" (términos inline, sin `preapproval_plan`).
  `suscripciones.preapproval_plan_id` queda sin usar.
- `POST /api/suscripciones` (código muerto hoy, sin caller): requiere Bearer token de la
  sesión del dueño, calcula el ranking real de la tarjeta, inserta en 'pendiente' antes de
  llamar a MP.
- Regla de combinación de descuentos (tarjeta adicional + cupón): **se aplica el mayor de los
  dos, no se suman** (decisión explícita, sigue vigente conceptualmente aunque hoy el cálculo
  vive en el código de Stripe).
- Webhook bifurcaba por tipo (`payment` vs `subscription_preapproval`), sincronizando
  `tarjetas.plan_id` en ambas direcciones (asignado en `autorizada`, vuelto a `null` en
  cualquier otro estado) — mismo criterio fail-closed que sigue vigente hoy con Stripe.
- Requería 2 apps separadas en Mercado Pago ("mitarjeta" para Checkout Pro,
  "mitarjeta-suscripciones" para preapprovals, tokens distintos) — detalle ya resuelto, sin
  relevancia para trabajo futuro salvo que se reactive este proveedor.
- Detalle completo de bugs encontrados/corregidos (`back_url`, emails con "+tag", email de
  pago editable) en HISTORIAL.md — código muerto hoy, no se toca salvo que se reactive MP.

## Flujo de compra: /planes → /crear → Stripe
- **`/planes`**: comparativa de los 3 planes desde `lib/planes.ts` (`getPlanesActivos`),
  nada hardcodeado por plan salvo etiquetas de features. Toggle mensual/anual. "Recomendado" =
  el de `orden` intermedio. → `/crear?plan=<slug>&ciclo=<mensual|anual>&cupon=<code>?`.
- **`/crear`**: resuelve plan por slug, redirige a `/planes` sin `?plan=` válido. Sin sesión,
  `<AuthMethods redirectTo={path+query completo}>` inline (no redirect a `/login`, esa ruta es
  solo para admin). Con sesión, `<TarjetaForm plan periodicidad cuponInicial />`.
- **Botón final de `TarjetaForm`** (creación): inserta la tarjeta (`user_id` real,
  `publicado: true`, sin `estado_pago`/`metodo_pago`/`precio_pagado` del modelo viejo) →
  `POST /api/stripe/checkout` con `{tarjetaId, planId, periodicidad, cuponCodigo}` (Bearer
  token) → redirige a la Checkout Session (`checkoutUrl`). Sección "Tu plan" muestra
  plan/precio + input de cupón (preview nomás, la combinación real es server-side).
- `/api/checkout` (Checkout Pro genérico) sin caller real — no borrado.
- **Cupón por query param a través de todo el embudo**: `/planes?cupon=X` → `/crear?...&cupon=X`
  → sobrevive el login (`redirectTo` incluye el param) → `TarjetaForm` lo pre-llena y lo
  VALIDA de nuevo contra `fn_cupon_es_valido` antes de mostrarlo aplicado (nunca confía
  ciegamente en el query param).

## Botón "Cancelar suscripción manual" en /admin/tarjetas/[id] (2026-08-13)
- **Caso real que lo motivó**: el cliente había hecho un alta manual para una tarjeta creada a
  nombre de otra persona (esperaba una transferencia), reasignó la tarjeta a esa persona, y esa
  persona terminó prefiriendo pagar en línea con su propia tarjeta — pero no había forma de
  liberar la suscripción manual para dejar pasar un pago real por Stripe sin tocar Supabase a
  mano. La sección "Activar plan manualmente" de esa misma página ya avisaba en texto
  ("Cancélala primero si quieres reemplazarla") pero no tenía ningún botón que lo hiciera —
  hueco real, no un olvido de esta sesión.
- **`POST /api/admin/cancelar-suscripcion`** (nuevo, gate `ADMIN_EMAIL`, mismo patrón que
  `activar-manual`/`reasignar-tarjeta`): recibe `suscripcionId`, la vuelve a consultar server-
  side (nunca confía en lo que ya tenga la página en memoria) y **rechaza cualquier
  `proveedor` que no sea `"manual"`** (400, con el mensaje "cancélala desde ahí") — cancelar acá
  una suscripción real de Stripe/Mercado Pago solo tocaría nuestra fila sin avisarle al
  proveedor real, que seguiría cobrando igual del lado de Stripe; ese caso queda fuera de
  alcance a propósito, se cancela desde el Customer Portal o la API de Stripe. Con `proveedor:
  "manual"` real: `estado → "cancelada"` + `tarjetas.plan_id → null` en la misma llamada —
  mismo criterio fail-closed que ya aplica el webhook de Stripe automáticamente (cualquier
  estado que no sea autorizada/trialing vacía `plan_id`), acá no hay webhook así que el
  endpoint lo hace explícito.
- **UI** (`/admin/tarjetas/[id]`): el aviso ámbar de "ya tiene una suscripción" ahora es
  condicional por `proveedor` — con `"manual"` suma el botón "Cancelar suscripción manual"
  (con `window.confirm` avisando que la tarjeta va a quedar pública como "temporalmente
  inactiva" hasta reactivarse, mismo campo `plan_id` que gatea `/{slug}`); con cualquier otro
  proveedor, el aviso solo indica que hay que cancelarla desde su propio panel, sin botón.
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (42 rutas — suma la nueva ruta de API)
  limpios. 🔴 No verificado todavía en navegador real — pendiente confirmar con una suscripción
  manual real: que el botón cancela, que `/{slug}` pasa a "temporalmente inactiva" al instante,
  y que después el dueño real puede completar un checkout de Stripe para esa misma tarjeta sin
  el 409 que motivó todo esto.

## Periodicidad (mensual/anual) editable en "Tu plan" antes de pagar (2026-08-13)
- **Caso real que lo destapó**: siguiendo el flujo de la sección anterior, el cliente reasignó
  y liberó una tarjeta que él mismo había armado en ciclo anual (alta manual) — el dueño real
  llegó al editor, avanzó hasta "Tu plan" para pagar por Stripe, y quería mensual en vez de
  anual, sin ninguna forma de cambiarlo ahí.
- **Causa real, más ancha que este caso puntual**: `periodicidad` era un prop FIJO en
  `TarjetaForm`, nunca estado — en `/crear` viene de `?ciclo=` (elegido en `/planes`, ANTES de
  llegar al editor) y en `/editar/[id]` (reintentar pago) viene de la periodicidad de la
  ÚLTIMA suscripción intentada (que puede ser una manual vieja con el ciclo que el admin haya
  cargado, o un intento de Stripe abandonado hace tiempo) — en NINGUNO de los 2 flujos había
  manera de cambiar de mensual a anual (o viceversa) una vez adentro del editor, había que
  volver atrás y re-armar la URL con otro `?ciclo=` (inviable para una tarjeta ya existente).
- **Fix**: `periodicidad` pasa a ser estado (`useState`, inicializado con el prop de siempre
  como punto de partida — sin cambios en el flujo normal si nadie lo toca) + un toggle real
  (mismo patrón pill mensual/anual que `/planes`/home) en el resumen "Tu plan" — reemplaza el
  badge de solo-lectura que había ahí antes. Precio/cupón ya eran cálculos reactivos sobre
  `plan`+`periodicidad`+`cuponValidado` (sin memización con deps desactualizadas), así que
  recalculan solos al tocar el toggle, sin tocar esa lógica.
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (42 rutas) limpios. 🔴 No verificado
  todavía en navegador real — pendiente confirmar que el toggle cambia el precio mostrado en
  vivo (con y sin cupón aplicado) y que el checkout de Stripe efectivamente cobra el ciclo
  elegido en el toggle, no el que traía el prop original.
