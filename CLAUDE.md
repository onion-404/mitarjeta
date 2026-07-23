@AGENTS.md

# Estado del negocio y la arquitectura (mitarjeta)

> Última actualización: 2026-07-18. Este documento es la fuente de verdad para que
> cualquier sesión nueva entienda el estado real del proyecto sin releer el historial
> de chat. Actualizarlo cuando cambie algo de lo que describe.

## ⚠️ Nombre del producto: "Linkard" (linkard.mx)
- El producto se llama oficialmente **"Linkard"** de cara al usuario, dominio real
  **linkard.mx** (ya conectado en Vercel). "mitarjeta"/"Mi Tarjeta" fue el nombre
  interno original y **ya no es la marca visible** — no queda ningún texto de UI,
  metadata ni copy dirigido al usuario con ese nombre (rebrandeado 2026-07-18).
- **La carpeta del repo, el nombre técnico del proyecto y todo identificador
  interno siguen siendo "mitarjeta" A PROPÓSITO** — decisión explícita del cliente,
  no un descuido. **No lo "corrijas"** ni intentes renombrar la carpeta/repo en una
  sesión futura. Esto incluye (deliberadamente sin cambiar):
  - Nombres de tablas/columnas en Supabase.
  - Variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, etc. — ninguna lleva
    "mitarjeta" en el nombre, pero si alguna nueva lo llevara, tampoco se toca).
  - Carpetas de Cloudinary (`mitarjeta/avatars`, `mitarjeta/banners`,
    `mitarjeta/productos`, `mitarjeta/brochures` en `cloudinary-sign/route.ts` y
    `tarjeta-form.tsx`) — cambiar el prefijo fragmentaría dónde viven los assets
    ya subidos vs. los nuevos.
  - Los nombres reales de las dos apps registradas en el dashboard de Mercado
    Pago, "mitarjeta" y "mitarjeta-suscripciones" (comentario en
    `mercadopago-suscripciones.ts`) — son identificadores externos, no se
    renombran solos con un find-and-replace en el código.
  - `PENDIENTE_KEY = "mitarjeta_pendiente"` en `reclamo.ts` (clave de
    `localStorage`, cambiarla invalidaría reclamos ya pendientes en navegadores
    de usuarios reales).
  - `package.json` → `"name": "linkard"` sí se cambió (metadata interna de
    build, no público, sin referencias en código — no rompe nada).
- **Logo implementado (2026-07-18)**: `src/components/logo.tsx` (`<Logo />`) es
  el componente reutilizable — triángulo `▲` (carácter Unicode, no SVG dibujado)
  en `text-primary` + "Linkard." en Sora bold 700. Reemplaza cualquier mención
  de "Linkard" como texto plano en header público (`page.tsx`), footer de
  tarjeta pública (`[slug]/page.tsx`), login (`login/page.tsx`) y admin
  dashboard (`admin/dashboard/page.tsx`). La fuente Sora se carga con
  `next/font/google` **en `layout.tsx`** (mismo mecanismo que Geist/Playfair/
  Baloo ya existentes), expuesta como CSS var `--font-logo` en `<html>` —
  `logo.tsx` la consume vía `font-[family-name:var(--font-logo)]`, no crea su
  propia instancia de fuente.
- **Favicon (2026-07-18, RESUELTO)**: se borró el `favicon.ico` genérico de
  `create-next-app` y se reemplazó por `src/app/icon.tsx` + `apple-icon.tsx`
  (mecanismo nativo de Next.js con `ImageResponse` de `next/og` — **sin
  agregar ninguna dependencia nueva** para conversión SVG→ICO, se evitó
  a propósito). Ambos son el triángulo solo (sin texto, no se leería a ese
  tamaño) sobre fondo `#171717` (mismo valor que `--primary` en light mode).
  `public/` todavía conserva los SVGs default de Next.js (`next.svg`,
  `vercel.svg`, `globe.svg`, etc.) — no se tocaron, no son visibles al usuario
  (no están referenciados en ninguna página).
- **Open Graph / Twitter Card (2026-07-18)**: `src/app/opengraph-image.tsx`
  genera la imagen general del sitio (1200×630, `ImageResponse`, fondo
  `#171717`, logo completo + tagline "Tu tarjeta digital en segundos"), carga
  Sora bold vía fetch a la API de Google Fonts (patrón estándar para
  `next/og`, que no puede usar `next/font/google` directamente). `layout.tsx`
  agrega `metadataBase` (usa `NEXT_PUBLIC_SITE_URL`, antes no estaba seteado —
  sin esto las URLs de OG image resuelven mal al compartir) + bloques
  `openGraph`/`twitter` explícitos (`card: "summary_large_image"`).

### 🔴 PENDIENTE PRIORITARIO: imagen OG dinámica por tarjeta individual
- Lo de arriba es solo la imagen OG **general del sitio** (home, metadata por
  default). Las tarjetas individuales (`/[slug]`) siguen sin su propio
  `opengraph-image` — cuando alguien comparte el link de SU tarjeta (WhatsApp,
  redes), el preview muestra la imagen genérica de Linkard, no algo con el
  nombre/foto/colores de esa tarjeta puntual.
- **Es el siguiente paso natural y de alto impacto**: compartir el link de la
  tarjeta (WhatsApp, redes, bio de Instagram) es la principal vía de
  interacción y crecimiento del producto — cada preview genérico en vez de
  personalizado es una oportunidad de conversión perdida.
- Implementación sugerida (no hecha todavía): `src/app/[slug]/opengraph-image.tsx`
  dinámico (recibe `params.slug`, lee la tarjeta con `getTarjetaPublicada`,
  usa `nombrePrincipal`, `identidad_visual.colorPrimario/colorSecundario` y
  posiblemente el avatar/logo de la tarjeta si tiene uno subido a Cloudinary).
- **Pendiente de que el usuario lo haga manualmente (NO lo hace Claude)**:
  actualizar `NEXT_PUBLIC_SITE_URL` a `https://linkard.mx` en las Environment
  Variables del proyecto en el dashboard de Vercel (ya está actualizada en
  `.env.local` para desarrollo local, pero Vercel usa su propia configuración
  independiente) y disparar un redeploy para que tome efecto en producción.

## Modelo de negocio
- Plataforma tipo link-in-bio + agenda de servicios + venta de productos.
- El plan vive en la TARJETA, no en el usuario. Un usuario puede tener múltiples
  tarjetas, cada una con su propio plan y suscripción independiente.
- 3 planes: "presencia", "alcance", "poder" (slugs en DB, sin acentos), **los 3 de
  pago — no existe tier gratuito**. Ya sembrados en la tabla `planes` con precios
  placeholder — pendiente ajustar precios reales.
- Descuento configurable para tarjetas adicionales del mismo usuario (columna
  `configuracion.descuento_tarjeta_adicional_pct`), aplicado vía función
  `posicion_tarjeta_para_usuario()`.
- **Ya NO hay DEFAULT de `plan_id` en tarjetas nuevas** (revertido: con los 3 planes
  pagos, arrancar en "presencia" gratis por defecto daba gating de un plan pagado sin
  ningún intento de pago). Una tarjeta se registra igual aunque el pago se abandone o
  falle, pero `plan_id` queda `null` hasta que exista una suscripción `'autorizada'`
  real. La función `plan_id_por_defecto()` sigue existiendo (sin uso como default de
  columna) por si hiciera falta reutilizarla. Migración:
  `20260717230000_drop_default_plan_id_tarjetas.sql`.
- **Ya NO existe el flujo de creación como invitado (sin cuenta)**. Con los 3 planes
  de pago, no tiene sentido crear una tarjeta sin saber quién va a pagar la
  suscripción. `/crear` exige sesión autenticada ANTES de mostrar `TarjetaForm` (ver
  sección "Flujo de compra" abajo). `reclamo.ts` (guardar/reclamar tarjeta de
  invitado por `localStorage`) NO se borró — sigue siendo la única forma de que
  tarjetas YA EXISTENTES en producción con `user_id null` (creadas antes de este
  cambio, nunca reclamadas) puedan asociarse a una cuenta algún día — pero ya no
  está conectado al flujo de creación nuevo (el modal post-creación que ofrecía
  "reclamar" se eliminó de `TarjetaForm`, porque una tarjeta nueva ya nace con
  `user_id` real). `<ReclamarTarjeta>` sigue en `/pago/exito`/`/pago/pendiente` por
  la misma razón legacy.

## Pagos — IMPORTANTE, dos flujos separados que coexisten
- Checkout Pro (preferencias, ya integrado en `lib/mercadopago.ts`): pagos ÚNICOS. Se
  usa para venta de productos y para el pago opcional de una cita.
- Suscripciones (preapproval, `lib/mercadopago-suscripciones.ts`): EXCLUSIVO para el
  cobro recurrente mensual/anual del plan de la tarjeta. Backend implementado
  (funciones + endpoint + webhook), ver sección propia abajo.
- Nunca confundir ni mezclar ambos flujos — son archivos, tablas y webhooks
  separados a propósito.
- **Cobro manual** (`/admin/cobro-manual`, gate por `ADMIN_EMAIL`): genera un
  link de Checkout Pro puntual (monto + descripción libre + email opcional
  del pagador) para cobros que no encajan en tarjeta/cita — ej. compartir por
  WhatsApp. Reutiliza `crearPreferenciaPago()` con
  `tipo: "cobro_manual"` (agregado a `TipoReferenciaPago`) y un
  `referenciaId` generado al vuelo (`crypto.randomUUID()`), sin insertar
  ninguna fila en DB — es solo un generador de link, no algo persistido.
  `parseReferenciaExterna()`/`actualizarEstadoPagoTarjeta()` en
  `confirmar-pago.ts` reconocen el prefijo `"cobro_manual:"` y NO actualizan
  ninguna tabla para ese tipo (si cayera en el branch de "tarjeta" por
  default, el `UPDATE ... WHERE id = 'cobro_manual:<uuid>'` fallaría siempre
  y Mercado Pago reintentaría el webhook indefinidamente). Las páginas
  `/pago/exito`, `/pago/pendiente` y `/pago/error` tienen su propio texto
  genérico para este `tipo` (nada de "ver mi tarjeta" ni `<ReclamarTarjeta>`).
  Cuotas de Checkout Pro: no requieren ningún parámetro extra, Mercado Pago
  ya las ofrece automáticamente según el banco/tarjeta del pagador (incluidas
  las "sin intereses" si la cuenta tiene esa promoción — eso se configura del
  lado de Mercado Pago, no en la preferencia).

## Suscripciones (cobro recurrente del plan) — MIGRADO a Stripe (2026-07-21)
- **El proveedor activo hoy es Stripe, no Mercado Pago.** La sección "Suscripciones
  (Mercado Pago)" de abajo queda como referencia histórica — Mercado Pago Checkout
  Pro (citas, `/admin/cobro-manual`, `lib/mercadopago.ts`) sigue funcionando sin
  ningún cambio, es un producto separado que no se tocó.
- **Por qué**: Suscripciones de Mercado Pago exigía que el pagador tuviera/iniciara
  sesión en su propia cuenta de MP — fricción de conversión real. Stripe Checkout
  con tokenización de tarjeta directa (Bricks-equivalente de Stripe, corre en su
  iframe) elimina ese requisito. Restricción no negociable respetada: el número de
  tarjeta nunca pasa por nuestro código — Stripe Checkout es 100% hosteado por
  Stripe, redirect por URL, cero input de tarjeta propio.
- **Archivos nuevos** (separados a propósito de los de Mercado Pago, mismo
  criterio de cero acoplamiento entre proveedores que ya usa el proyecto):
  `lib/stripe.ts` (cliente), `lib/stripe-suscripciones.ts` (`crearCheckoutSession`),
  `lib/confirmar-suscripcion-stripe.ts` (mapeo de estados + sync de
  `tarjetas.plan_id`, misma lógica de idempotencia/terminal que la versión MP),
  `app/api/stripe/checkout/route.ts` (reemplaza la llamada que antes hacía
  `TarjetaForm` a `/api/suscripciones`), `app/api/stripe/webhook/route.ts`.
  El cálculo de descuento (tarjeta adicional + cupón) está **duplicado a
  propósito** en la ruta de Stripe en vez de extraído a un helper compartido con
  `/api/suscripciones` — mismo criterio de no acoplar proveedores, y para no
  tocar el flujo de Mercado Pago ya probado.
- **`/api/suscripciones` y `mercadopago-suscripciones.ts` (Mercado Pago) NO se
  borraron** — quedan como código muerto sin caller, mismo criterio que ya se usó
  con `/api/checkout`. `TarjetaForm` ahora llama a `/api/stripe/checkout`.
- **Sin Price IDs pre-creados en Stripe** — se usa `price_data` inline (recurring)
  calculado con `planes.precio_mensual/anual` + el descuento ya resuelto
  server-side, no Coupons/Promotion Codes de Stripe. Razón: los precios en
  `planes` todavía son "placeholder" (ver más abajo) — con Price IDs fijos, cada
  cambio de precio exigiría archivar/crear Prices en Stripe y sincronizar el ID;
  con `price_data` inline, cambiar `planes` alcanza. El Price que resulta queda
  fijo para todas las renovaciones de ESA suscripción puntual — coincide con la
  regla de negocio ya vigente (el descuento aplica para siempre a esa
  suscripción, no se recalcula por ciclo).
- **Customer de Stripe nuevo por checkout**, no reusado entre tarjetas del mismo
  usuario (el plan vive en la tarjeta, no en el usuario — no hay tabla de
  "usuario" donde persistir un customer_id compartido). Se crea con el
  `payerEmail` ya confirmado en el formulario (mismo campo que ya existía para
  Mercado Pago) — Stripe lo pre-llena y lo deja NO editable en su checkout,
  verificado contra la API real. Efecto colateral bueno: el bug de mismatch de
  email que tenía Mercado Pago (pagar con una cuenta de MP distinta a la
  logueada) **no puede pasar** con tokenización directa, no hay cuenta externa
  con la que pueda no coincidir.
- **`suscripciones.proveedor`** (`'mercadopago' | 'stripe'`, default
  `'mercadopago'` para no romper filas existentes) + columnas nuevas
  `stripe_customer_id`, `stripe_subscription_id` (unique),
  `stripe_checkout_session_id` — todas nullable, aditivas. Migración
  `20260721000000_add_stripe_suscripciones.sql`, **APLICADA** (confirmado con una
  consulta real a producción, no asumido — ver "Estado de la base de datos"
  abajo). El índice único existente
  `suscripciones_una_activa_por_tarjeta` (una suscripción viva por tarjeta) sigue
  funcionando sin cambios — es agnóstico de proveedor.
- Mapeo de estados de Stripe (`Subscription.status`) → `EstadoSuscripcion`:
  `active`/`trialing` → `autorizada`; `past_due`/`paused` → `pausada`;
  `canceled` → `cancelada`; `unpaid`/`incomplete_expired` → `vencida`;
  `incomplete` → `pendiente`. Mismo enum que ya existía, no se agregó ningún
  estado nuevo.
- Webhook (`app/api/stripe/webhook/route.ts`): `checkout.session.completed`
  (vincula `stripe_subscription_id`/`stripe_customer_id` a la fila insertada en
  'pendiente' al crear la Checkout Session, vía `client_reference_id`),
  `customer.subscription.created/updated/deleted` e `invoice.payment_failed`
  (re-chequeo defensivo) — los últimos cuatro re-consultan el `Subscription`
  completo contra la API de Stripe (nunca confían ciegamente en el payload del
  evento), mismo patrón que `obtenerPreapproval` en la versión de Mercado Pago.
  Si `checkout.session.completed` no llegó todavía cuando llega un evento de
  subscription (los webhooks no garantizan orden), la búsqueda cae al
  `suscripcion_id` que ya viaja en los metadata del Subscription desde la
  creación de la Checkout Session, y lo vincula ahí mismo.
- **Notas de campos de la API de Stripe que cambiaron de lugar en versiones
  recientes** (confirmado contra los tipos reales de `stripe` v22.3.2, no
  supuesto): `Subscription.current_period_end` ya no existe en el objeto
  Subscription — vive en `subscription.items.data[0].current_period_end`.
  `Invoice.subscription` tampoco existe más — es
  `invoice.parent.subscription_details.subscription`.
- **Webhook registrado en el dashboard de Stripe** apuntando a
  `https://linkard.mx/api/stripe/webhook`, `STRIPE_WEBHOOK_SECRET` ya en
  `.env.local`. **Pendiente de que el usuario lo haga manualmente**: agregar
  las 3 keys de Stripe (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`) a las Environment Variables de Vercel — hoy solo
  están en `.env.local` (desarrollo local), mismo problema recurrente que ya
  tuvimos con `NEXT_PUBLIC_SITE_URL`. **Importante**: las keys actuales son de
  modo TEST (`sk_test_`/`pk_test_`) — deployar así rompe el pago real para
  clientes reales (Stripe test-mode no acepta tarjetas reales) hasta que se
  reemplacen por las keys live.
- ✅ **Verificado end-to-end de punta a punta (2026-07-21), con Stripe CLI**
  (`stripe listen --forward-to localhost:3000/api/stripe/webhook`, autenticado
  vía `--api-key` con la key de test, sin pasar por `stripe login` interactivo)
  — no solo aislado, el flujo real completo vía Playwright: `/planes` (toggle
  mensual + elegir plan) → `/crear` (nombre + email de pago pre-llenado) →
  submit real (sin mockear nada) → Checkout real de Stripe (tarjeta de prueba
  `4242 4242 4242 4242`) → pago → webhook real recibido y verificado. Confirmado
  con 3 fuentes independientes, no una sola: (1) log de `stripe listen` con
  `checkout.session.completed` y `customer.subscription.created` en `200`, sin
  ningún 400/500; (2) query directa a Supabase después: `suscripciones.estado
  = 'autorizada'`, `stripe_subscription_id`/`stripe_customer_id` poblados,
  `tarjetas.plan_id` sincronizado; (3) capturas de pantalla del Checkout real de
  Stripe. Dato interesante: el "Card information" de Stripe Checkout **no está
  en un iframe con nombre/título propio** como se esperaba — vive directo en el
  documento de `checkout.stripe.com`, porque la página entera ya es un origen
  100% de Stripe (no hace falta sandboxing adicional dentro de una página que
  ya es enteramente de ellos). También se confirmó `customer.subscription.deleted`
  (cancelé la suscripción de prueba al limpiar): 200, no-op correcto porque la
  fila ya no existía en Supabase (se había borrado antes de que llegara la
  notificación) — no crashea. Todos los datos de prueba (tarjeta, suscripción,
  Customer) se cancelaron/borraron después.
- **Detalle de entorno encontrado en el camino**: `.env.local` tiene
  terminadores de línea CRLF (no LF) — no afecta a Next.js (su loader de env
  vars lo maneja bien), pero rompe cualquier parseo manual ingenuo tipo
  `split("\n")` sin `.trim()` en scripts de una sola línea (mandaba un `\r`
  final que Stripe rechazaba con un error de conexión genérico y confuso). Si
  se escribe un script rápido contra `.env.local` en el futuro, usar `.trim()`
  en el valor.

## Suscripciones (Mercado Pago) — histórico, ya no es el proveedor activo
- Modalidad elegida: preapproval **"sin plan asociado"** (términos inline en cada
  suscripción), NO "con plan asociado". La razón: Mercado Pago exige que una
  suscripción "con plan asociado" se cree ya con `card_token_id` (tarjeta
  tokenizada vía Checkout Bricks en el frontend) y status `authorized` **sin
  ningún redirect posible**. "Sin plan asociado" permite mandar `auto_recurring`
  directo y redirigir a un `init_point`, igual que Checkout Pro — sin agregar
  Bricks ni scope de tarjeta al frontend. Consecuencia: **no se usa
  `preapproval_plan`** en absoluto; `suscripciones.preapproval_plan_id` (ya
  existía, nullable) queda sin usar. El precio final se calcula igual que
  Checkout Pro: inline, al momento de crear cada suscripción.
- `POST /api/suscripciones` (`{ tarjetaId, planId, periodicidad, cuponCodigo? }`):
  a diferencia de `/api/checkout`/`/api/citas` (flujos de invitado), este
  endpoint SÍ requiere autenticación — exige `Authorization: Bearer <access_token>`
  de la sesión de Supabase del dueño de la tarjeta (verificado con
  `supabase.auth.getUser(token)`). Calcula el ranking real de la tarjeta entre
  las del usuario (NO reutiliza `posicion_tarjeta_para_usuario()`: esa función
  está pensada para "qué posición tendría una tarjeta nueva", no para rankear
  una ya existente), inserta `suscripciones` en 'pendiente' antes de llamar a
  Mercado Pago, y guarda `preapproval_id` al volver.
- Regla de combinación de descuentos (tarjeta adicional + cupón): **se aplica el
  mayor de los dos, no se suman** — confirmado explícitamente con el cliente.
  Al ser un cobro recurrente, acumular descuentos indefinidamente cada ciclo es
  más riesgoso que en una compra única.
- Cupón reutiliza la tabla `cupones` ya existente (mismo flujo que el pago único
  viejo de tarjeta). Se guarda en `suscripciones.cupon_codigo` (columna nueva,
  migración `20260717210000_add_suscripciones_cupon_codigo.sql`) para trazabilidad.
- Webhook: `/api/mercadopago/webhook` ahora bifurca por tipo de notificación —
  `payment` (como siempre) vs `subscription_preapproval` (nuevo, delegado a
  `lib/confirmar-suscripcion.ts`). Actualiza `suscripciones.estado` y mantiene
  `tarjetas.plan_id` sincronizado en LAS DOS direcciones: lo asigna al quedar
  `autorizada`, y lo vuelve a `null` en cualquier otro estado (pausada,
  cancelada, vencida) — no hay plan gratuito al que "bajar". Con idempotencia y
  protección contra notificaciones fuera de orden (no regresa un estado terminal).
- Gracias a que el caché (`tarjetas.plan_id`) se mantiene sincronizado en ambas
  direcciones, el código que lo lee para gating de features (comisión de citas en
  `confirmar-pago.ts`, límite `servicios_agendables_max` en `agenda-servicios.tsx`)
  **no necesita consultar `suscripciones` por separado** — ambos ya manejan `null`
  de forma fail-closed (sin plan confirmado = sin acceso, no "sin límite"). Riesgo
  residual aceptado: esto depende de que el webhook llegue, mismo modelo que ya
  acepta el resto del código de pagos (no hay job de reconciliación).
- **La UI que llama a `POST /api/suscripciones` ya está construida** (ver "Flujo de
  compra" abajo) — el botón final de `TarjetaForm` en modo creación es quien la
  dispara. Sigue pendiente: una página de confirmación dedicada — `back_url` hoy
  vuelve a `/editar/[tarjetaId]` sin más, no hay pantalla de éxito tipo
  `/pago/exito` para suscripciones.
- ✅ **Bloqueante anterior RESUELTO (2026-07-18)**: la cuenta "mitarjeta" (Checkout
  Pro) no podía crear preapprovals "sin plan asociado" (401/500 según la prueba).
  Causa real: Mercado Pago exige una **aplicación separada** para Suscripciones —
  se creó "mitarjeta-suscripciones" con su propio token
  (`MERCADO_PAGO_ACCESS_TOKEN_SUSCRIPCIONES`, ver comentario en
  `mercadopago-suscripciones.ts`). Las dos apps/tokens NO se comparten con
  `lib/mercadopago.ts` (Checkout Pro), que sigue usando `MERCADO_PAGO_ACCESS_TOKEN`
  sin cambios.
- ✅ **Dos bugs reales adicionales encontrados y corregidos en la misma verificación
  en vivo (2026-07-18)**, ambos confirmados contra la API real de Mercado Pago
  antes de tocar código (no se asumió nada):
  1. `back_url` se armaba con `NEXT_PUBLIC_SITE_URL`, que no estaba definida en
     `.env.local` → caía a `http://localhost:3000`, que Mercado Pago rechaza
     (`400 Invalid value for back_url, must be a valid URL`). **Corregido
     (2026-07-18)**: `NEXT_PUBLIC_SITE_URL=https://mitarjeta-delta.vercel.app`
     en `.env.local` — dominio real de Vercel, confirmado explícitamente por el
     cliente (un valor anterior, `mitarjeta.app`, había sido solo una
     inferencia mía a partir de un placeholder de UI y quedó descartado).
     `NEXT_PUBLIC_SITE_URL` **no es una variable nueva de hoy**: ya la usaba
     `lib/mercadopago.ts` (Checkout Pro) desde antes de esta sesión (commit
     `dfd9abc`, antes de agenda/citas/suscripciones) para el mismo propósito —
     nunca hubo dos variables distintas con nombres distintos. Lo que sí
     estaba duplicado era la línea `const APP_URL = process.env.NEXT_PUBLIC_SITE_URL
     || "http://localhost:3000"`, copiada igual en `mercadopago.ts` y en
     `mercadopago-suscripciones.ts`; se unificó en `lib/site-url.ts` (exporta
     `APP_URL`), que ambos archivos importan ahora, para que no puedan
     desincronizarse el día que se cambie de dominio. **Importante**: esto
     solo corrige `.env.local` (desarrollo local) — el valor real que usa el
     despliegue de Vercel en producción se configura aparte, en las variables
     de entorno del proyecto en el dashboard de Vercel, y no se pudo verificar
     desde acá si ya coincide con `https://mitarjeta-delta.vercel.app`.
  2. `payer_email` con "+tag" (ej. `usuario+algo@gmail.com`, común en emails
     reales de usuarios) hace que la API de preapproval de Mercado Pago devuelva
     `500 Internal server error` genérico — confirmado en pruebas controladas
     (mismo correo sin "+tag": `201`; con "+tag": `500`, dos veces). Se normaliza
     en `normalizarPayerEmail()` (`mercadopago-suscripciones.ts`), que le quita el
     "+tag" al correo justo antes de mandarlo a Mercado Pago.
  Con ambos fixes, `POST /api/suscripciones` fue verificado de punta a punta con
  datos reales: `200` y un `initPoint` real de Mercado Pago, cero errores de
  consola. El preapproval real creado en esa verificación se canceló
  (`PUT /preapproval/{id}` `status:"cancelled"`) y todos los datos de prueba
  (tarjeta, suscripción, usuario) se borraron.
- **Email de pago confirmable por el usuario (agregado 2026-07-20)**: antes
  `payerEmail` se tomaba ciegamente de `userData.user.email` (el email de la
  sesión de Supabase/Google) — bug real encontrado en pruebas en vivo:
  Mercado Pago rechaza el pago con "Tu e-mail no coincide con el de la
  suscripción" si la persona autoriza con una cuenta de MP distinta a la de
  su login de Google. Ahora la sección "Tu plan" de `TarjetaForm` (modo
  creación) tiene un input de email editable, pre-llenado con el de la
  sesión vía un `useEffect` (`supabase.auth.getSession()` al montar), con el
  texto "Usaremos este correo para tu suscripción en Mercado Pago — confirmá
  que sea el mismo con el que vas a pagar". `POST /api/suscripciones` ahora
  **recibe `payerEmail` en el body** (ya no lo deriva de la sesión) y lo
  valida con regex antes de mandarlo a Mercado Pago — `userData.user.email`
  solo se sigue usando para el chequeo de sesión válida, no como fuente del
  email de pago.
  - **Limitación conocida, documentada en `mercadopago-suscripciones.ts`**:
    si igual hay mismatch (la persona edita el campo pero de todos modos
    autoriza con otra cuenta de MP), no hay forma de detectarlo desde
    nuestro lado — ese rechazo pasa enteramente dentro del checkout hosteado
    por MP, el preapproval nunca cambia de estado (se queda `pending`), así
    que no dispara webhook, y `back_url` no trae ningún query param de error
    para leer. Evaluado y descartado inventar una detección — no existe la
    señal, solo mitigación preventiva (este campo).
- **Pendiente, sin resolver todavía**: no se probó el flujo hasta el webhook real
  (`subscription_preapproval`) porque requiere una de estas dos cosas, ninguna
  disponible hoy en este entorno: (a) una URL pública HTTPS donde Mercado Pago
  pueda entregar la notificación (hoy el dev server solo es accesible en
  `localhost`), y (b) autorizar de verdad el preapproval con una tarjeta — con las
  credenciales de Producción configuradas hoy, eso implica un cobro real (aunque
  reembolsable/cancelable), o alternativamente conseguir el token de
  **Credenciales de prueba** (sandbox) de la app "mitarjeta-suscripciones" desde
  el dashboard de Mercado Pago para usar sus usuarios y tarjetas de prueba sin
  dinero real — swap de token pendiente de que el usuario decida hacerlo.

## Flujo de compra: /planes → /crear → Mercado Pago
- **`/planes`** (`src/app/planes/page.tsx` + `src/components/planes/comparativa-planes.tsx`):
  comparativa de los 3 planes, consume la tabla `planes` real vía `src/lib/planes.ts`
  (`getPlanesActivos`) — precios y features SIEMPRE de la DB, nada hardcodeado por
  plan (las etiquetas de cada feature sí viven en código, son nombres de columnas
  del schema, no datos). Toggle mensual/anual recalcula precio + "ahorrás X%". El
  plan "Recomendado" es el de `orden` intermedio (no un slug hardcodeado). Botón
  "Continuar" → `router.push('/crear?plan=<slug>&ciclo=<mensual|anual>')`.
- **`/crear`** (`src/app/crear/page.tsx`, client component, `use(searchParams)` —
  mismo patrón que `use(params)` en `/editar/[id]`): resuelve el plan por slug
  (`getPlanPorSlug`); sin `?plan=` válido, redirige a `/planes` (no asume un
  default). Chequea sesión client-side (mismo patrón que `/editar`); **sin sesión,
  muestra `<AuthMethods>` inline con `redirectTo` = el path + query COMPLETO**
  (`/crear?plan=...&ciclo=...`), no un redirect a `/login` (esa página está
  hardcodeada para el acceso admin, no sirve como gate genérico). Con sesión,
  renderiza `<TarjetaForm plan={plan} periodicidad={periodicidad} />`.
- **Botón final de `TarjetaForm`** (modo creación): ya NO usa `/api/checkout` ni el
  modelo viejo de pago único (`configuracion`, método de pago, transferencia,
  cupón de tarjeta). Inserta la tarjeta con `user_id` real (de la sesión, no
  invitado) y `publicado: true` de entrada (se comparte al toque, el gating real
  es por `plan_id`, que arranca `null`), sin escribir `estado_pago`/`metodo_pago`/
  `precio_pagado`/`cupon_codigo` (quedan en su default, son campos del modelo
  viejo). Después llama a `POST /api/stripe/checkout` (**ya no `/api/suscripciones`
  de Mercado Pago**, ver sección "Suscripciones — MIGRADO a Stripe") con
  `{tarjetaId, planId, periodicidad, cuponCodigo, payerEmail}` (con
  `Authorization: Bearer` de la sesión) y redirige a la Checkout Session
  hosteada de Stripe (`checkoutUrl`). La sección "Tu plan" (antes "Resumen y
  pago") muestra el plan/precio real elegido + el input de cupón (preview de
  precio nada más — la combinación real de descuentos pasa server-side) + el
  campo de correo de pago (pre-llenado con el de la sesión, editable).
- **`/api/checkout` queda sin ningún caller** (confirmado: era el único usado por
  el botón de arriba). NO se borró — la función que envuelve
  (`crearPreferenciaPago` en `lib/mercadopago.ts`, Checkout Pro) sigue viva y en
  uso real por `/api/citas`. Si en el futuro no hace falta para nada más, borrar
  la ruta es un cambio de una línea, reversible y de bajo riesgo — se dejó
  explícitamente sin tocar hasta confirmarlo.

## Agenda de servicios
- Pago OPCIONAL por servicio, default = contra entrega (`requiere_pago_inmediato: false`).
- Duración variable por servicio, definida por el dueño.
- Disponibilidad híbrida: horario semanal recurrente (`disponibilidad_semanal`) +
  excepciones puntuales (`disponibilidad_excepciones`), definida en la hora LOCAL del
  dueño. `tarjetas.zona_horaria` (texto IANA, default `America/Mexico_City`) es la
  fuente de verdad para convertir esa hora local a UTC; `src/lib/agenda.ts` hace la
  conversión con `Intl.DateTimeFormat` nativo (sin librería de fechas nueva).
- Comisión modelo tipo Didi/Rappi: corte periódico MANUAL vía tabla `liquidaciones`,
  admin marca como pagado tras transferir manualmente. Sin automatización de
  transferencias aún.
- Las páginas `/pago/exito`, `/pago/pendiente` y `/pago/error` son compartidas entre
  el pago de una tarjeta y el pago opcional de una cita: bifurcan según `tipo`
  (`"tarjeta" | "cita"`, derivado del prefijo de `external_reference` en Mercado
  Pago) devuelto por `confirmarPagoDesdeRedirect`. Los datos de despliegue de la
  cita (servicio, fecha/hora en la zona horaria de la tarjeta, slug para volver a
  agendar) se leen aparte con `lib/citas.ts` (`getCitaParaConfirmacion`), una
  lectura de solo presentación con service role — no reimplementa nada de
  `confirmar-pago.ts`.
- Editor de agenda (CRUD servicios/horario/excepciones) en
  `src/components/tarjeta/agenda-servicios.tsx`, sección "Agenda" de `TarjetaForm`
  (solo visible en modo edición, una tarjeta nueva sin guardar no tiene dónde
  colgar servicios). Escribe directo a Supabase desde el cliente (RLS de owner ya
  lo permite, sin endpoint server-side) con actualización optimista de estado +
  reversión si falla. Valida `servicios_agendables_max` del plan vigente antes de
  permitir crear un servicio nuevo, con mensaje de upsell si se llegó al límite.
- Si `tarjeta.plan_id` es `null` (nunca hubo suscripción autorizada, o se
  pausó/canceló), la sección de Agenda se bloquea ENTERA con un mensaje de
  "necesitás un plan activo" — no solo el límite de servicios — y ni siquiera
  consulta Supabase.
- **Vista pública de agenda (lado visitante) implementada**: `TarjetaCard`
  (`tarjeta-card.tsx`) tiene props opcionales `permitirAgendar?`, `tarjetaId?`,
  `zonaHoraria?` (default sin uso → cero cambio de comportamiento en el
  preview del editor ni en el demo del home, que no las pasan). Cuando
  `permitirAgendar` está activo (solo `/[slug]/page.tsx` lo hace), cada fila
  de la sección "Agendar" se vuelve un trigger de `reservar-servicio.tsx`
  (nuevo, un `Dialog` de `@base-ui/react/dialog` por servicio, mismo patrón
  que `tarjeta-qr.tsx`): fecha → horarios vía `GET /api/citas/disponibilidad`
  → datos del cliente (nombre + contacto, sin cuenta) → `POST /api/citas`.
  Si no requiere pago, confirmación directa en el propio modal; si requiere
  pago, `window.location.href = initPoint` (redirect a Checkout Pro, mismo
  patrón que el resto del flujo de pagos). El 409 (alguien más tomó el
  horario) muestra un mensaje claro y vuelve a la selección de horario, sin
  perder los datos ya escritos por el visitante.
- **Bug real encontrado y corregido durante la verificación en vivo de lo de
  arriba**: `obtenerSlotsDisponibles()` (`lib/agenda.ts`) no filtraba los
  horarios de HOY que ya pasaron — los ofrecía como "disponibles" en
  `/api/citas/disponibilidad`, y recién `/api/citas` los rechazaba con un
  error genérico de "fecha inválida" que no le explicaba nada al visitante.
  Corregido: se descarta cualquier slot cuyo inicio ya sea pasado (`Date.now()`)
  antes de devolverlo, para que la lista que ve el visitante nunca incluya un
  horario que ya no puede tomar.
- `formatearFechaHoraLocal` se movió de `lib/citas.ts` a un nuevo `lib/fecha.ts`
  (sin `"server-only"`, a diferencia de `citas.ts`): la necesita tanto
  `/pago/exito`/`/pago/pendiente` (servidor) como `reservar-servicio.tsx`
  (cliente, para mostrar horarios en la zona horaria de la tarjeta, no la del
  navegador del visitante). Se agregó `formatearHoraLocal` (solo hora, para
  los botones de horario) al mismo archivo.
- **Gating por plan aplicado también a la vista pública (no solo al editor
  del dueño)**: `getServiciosAgendablesActivos()` (`lib/tarjetas.ts`) filtra
  explícitamente `tarjetas.plan_id IS NOT NULL` (join `!inner` +
  `.not("tarjetas.plan_id", "is", null)`) — una tarjeta sin suscripción
  autorizada (nunca pagó, o se le pausó/canceló) no debe seguir mostrando ni
  permitiendo agendar servicios ya creados. **Esto es un filtro de
  aplicación, no de RLS**: `servicios_agendables_select_publica` (la policy)
  todavía no exige `plan_id IS NOT NULL` por su cuenta — sigue pendiente como
  endurecimiento futuro (ver "Pendiente técnico sin resolver") migrar ese
  requisito a la policy misma, para no depender exclusivamente de que esta
  función sea el único punto de acceso.

## Patrón de UI del editor principal (TarjetaForm)
- Reescrito para seguir el patrón Linktree: en **desktop**, sin cambios (grid de 2
  columnas, formulario izquierda + preview sticky derecha, accordion de
  `@base-ui/react/accordion`). En **mobile**, el preview ocupa toda la pantalla
  (`fixed inset-0`, sin el mockup de teléfono) y los controles bajan a una barra
  fija inferior: botón "Guardar"/"Crear" siempre visible + una fila de tabs
  horizontal scrolleable (uno por sección). Tocar un tab abre un `Drawer` de
  `@base-ui/react/drawer` (bottom sheet) con los controles de esa sección sobre
  el preview — **no se agregó ninguna librería nueva**, Base UI (ya usado para
  Accordion/Dialog/Menu) trae un primitivo Drawer nativo con swipe-to-dismiss.
- El toggle viejo "Modo edición / Ver tarjeta" en mobile se eliminó (redundante
  con el preview ya siempre visible); su contenido (QR + compartir) ahora es un
  tab más, "Compartir". En desktop el toggle sigue igual que siempre.
- Cada sección define su JSX **una sola vez** (`contenidoDiseno`,
  `contenidoServicios`, etc. en `tarjeta-form.tsx`) y se reutiliza tanto en el
  `Accordion.Panel` de desktop como en el `Drawer.Popup` de mobile — nada
  duplicado entre los dos shells.
- Esta es la referencia a seguir para cualquier sección nueva del editor
  (agregar un id al array `SECCIONES`, no reinventar el patrón). "Agenda" ya se
  construyó así.

## Diferido a fase posterior (NO construir todavía salvo instrucción explícita)
- Integración con Google Calendar (OAuth + sync) — candidato a feature de plan "poder".
- Billetera nativa con ledger de comisión acumulada y solicitud de retiro de fondos.
- Migración del modelo de pago único actual de `tarjetas` a algo distinto (coexisten).
- CRUD de testimonios en admin dashboard (tabla `testimonios` ya diseñada, seed con 2
  placeholders, pendiente de construir la UI).
- Refactor del home público (secciones inspiradas en landing de Linktree, testimonios
  reales ya confirmados por el cliente aunque aún no compartidos).
- Dashboard de usuario con métricas (tablas `metricas_diarias`/`eventos_metricas` ya
  existen).

## Estado de la base de datos (aplicado en producción, sin ambiente de staging)
- Migración `20260716120000_add_planes_suscripciones_metricas.sql`: APLICADA. Tablas:
  `planes` (con seed), `tarjetas.plan_id`, `suscripciones`,
  `configuracion.descuento_tarjeta_adicional_pct`, `eventos_metricas`,
  `metricas_diarias` + trigger de rollup.
- Migración `20260717100000_add_agenda_servicios.sql` (`servicios_agendables`,
  `disponibilidad_semanal`, `disponibilidad_excepciones`, `citas`,
  `liquidaciones`): APLICADA.
- Migración `20260717180000_add_plan_default_y_zona_horaria.sql` (default de
  `tarjetas.plan_id` a "presencia" + backfill de tarjetas existentes,
  `tarjetas.zona_horaria`): APLICADA.
- Migración `20260717210000_add_suscripciones_cupon_codigo.sql`
  (`suscripciones.cupon_codigo`): APLICADA.
- Migración `20260717230000_drop_default_plan_id_tarjetas.sql` (quita el DEFAULT de
  `tarjetas.plan_id`): APLICADA.
- Migración `20260721000000_add_stripe_suscripciones.sql`
  (`suscripciones.proveedor`, `stripe_customer_id`, `stripe_subscription_id`,
  `stripe_checkout_session_id`): **APLICADA** (2026-07-21, confirmado con un
  `select` real de las 4 columnas contra producción).

## Pendiente técnico sin resolver
- `eventos_metricas` no permite insert desde authenticated/anon a propósito (por
  diseño, evita inflar métricas). Falta crear el endpoint server-side con
  `service_role_key` que inserte eventos — `citas` (`/api/citas`) y `suscripciones`
  (`/api/suscripciones`) ya tienen su endpoint propio, este es el que falta.
- `reclamo.ts` y `admin/dashboard/page.tsx` escriben directo a `tarjetas` desde rol
  `authenticated` — deuda técnica identificada, no resuelta (impide aplicar
  GRANT/REVOKE más estricto sobre esa tabla).
- `existe_solapamiento_cita()` valida disponibilidad pero NO previene condición de
  carrera entre dos inserts simultáneos del mismo horario (doble booking posible si
  dos personas agendan la misma franja al mismo instante). Hardening futuro: EXCLUDE
  constraint con extensión btree_gist. Aceptado como riesgo bajo para el volumen
  inicial, revisar si el doble booking se vuelve un problema real.
- El gating por plan de `servicios_agendables` en la vista pública (ver "Agenda
  de servicios" arriba) hoy vive SOLO en `getServiciosAgendablesActivos()`
  (filtro de aplicación), no en la policy `servicios_agendables_select_publica`.
  Hardening futuro: mover el requisito `plan_id IS NOT NULL` a la propia RLS
  (join contra `tarjetas` en la policy, como ya hace con `publicado`), para no
  depender de que esta función sea el único camino de lectura pública.

## Notas de proceso
- Proyecto de Supabase: producción única, sin staging. Antes de cualquier migración:
  backup con `pg_dump` (plan free, sin backups automáticos ni PITR).
- Convención de migraciones: `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`,
  aditivas, envueltas en `BEGIN`/`COMMIT`.
</content>
