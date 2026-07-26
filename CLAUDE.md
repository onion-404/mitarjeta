@AGENTS.md

# Estado del negocio y la arquitectura (mitarjeta)

> Última actualización: 2026-07-25. Este documento es la fuente de verdad para que
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
- **Keys de producción (2026-07-22/23)**: `.env.local` ya tiene las 3 keys de
  Stripe en modo **LIVE** (`sk_live_`/`pk_live_`/`whsec_`), confirmadas contra
  la API real (`GET /v1/account`: cuenta `acct_1TvfXG1jsNdj9fiJ`,
  `business_profile.name: "Linkard"`, `charges_enabled`/`payouts_enabled` en
  `true`) y contra `GET /v1/webhook_endpoints` (el endpoint live
  `https://linkard.mx/api/stripe/webhook` existe y está `enabled`). Ojo: el
  identificador de cuenta después de `sk_live_`/`pk_live_` es distinto al de
  las keys de test que se usaron para verificar el flujo (`XG1jsNdj9fiJ` vs
  `XuP0kbhBNzAr`) — se confirmó que es la cuenta correcta, no es un error.
  **El endpoint live no tiene suscripto `customer.subscription.created`**
  (solo `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`) — el código sí
  escucha ese evento. En la práctica `checkout.session.completed` +
  `customer.subscription.updated` deberían cubrir el mismo caso igual, pero
  sigue pendiente que el usuario agregue `customer.subscription.created` a
  la lista de eventos del endpoint en el dashboard de Stripe para que quede
  exactamente alineado con lo que el código espera.
- **Pendiente de que el usuario lo haga manualmente**: agregar las mismas 3
  keys (ahora live) a las Environment Variables de Vercel — siguen sin estar
  ahí, ver nota de arriba sobre `NEXT_PUBLIC_SITE_URL` para el mismo problema
  recurrente.
- **Validación de monto mínimo de Stripe para MXN (2026-07-23)**: confirmado
  contra la tabla oficial "Importe mínimo del cargo por moneda" en
  docs.stripe.com/currencies — **MXN 10** (o sea $10.00 MXN / 1000 en
  centavos, la unidad que usa `unit_amount`). Mismo tipo de bug real que ya
  había pasado con Mercado Pago: un cupón agresivo (o el descuento de tarjeta
  adicional) puede dejar `precioFinal` por debajo de eso, y sin chequeo previo
  Stripe rechazaría la Checkout Session con un error críptico del lado del
  cliente. `app/api/stripe/checkout/route.ts` ahora valida esto ANTES de
  insertar la fila en `suscripciones` (no queda huérfana) — si
  `0 < precioFinal < 10`, responde `400` con el motivo exacto en texto plano.
  `precioFinal === 0` (cupón de 100%) queda afuera a propósito: la doc de
  Stripe confirma que las suscripciones sí admiten cargos en $0 para cupones/
  pruebas gratis, el mínimo solo aplica a montos no-cero. `TarjetaForm` ahora
  muestra el `error` real que devuelve el backend en vez de un mensaje
  genérico fijo (mismo criterio que el error de cupón inválido). Verificado
  con una prueba real de punta a punta vía Playwright (cupón real `PRUEBA95`,
  95% off sobre Presencia mensual $149 → $7.45): `400` real, sin redirigir a
  Stripe, sin fila huérfana en `suscripciones`, mensaje visible confirmado por
  captura de pantalla en la UI.
- **Bug real encontrado de paso (2026-07-23) y corregido**: el texto de ayuda
  del campo de correo de pago en `TarjetaForm` todavía decía "Usaremos este
  correo para tu suscripción **en Mercado Pago**" — quedó así desde antes de
  la migración a Stripe. Corregido a "en Stripe" (y luego el campo entero se
  quitó del todo, ver el punto siguiente).
- **Campo de correo de pago ELIMINADO (2026-07-23)**: era redundante con
  Stripe Checkout, que ya pide el email directamente en su propio checkout
  hosteado. Se sacó de `TarjetaForm` (estado, efecto de pre-llenado,
  validación, input) y del body que se manda a `POST /api/stripe/checkout`
  (`payerEmail` ya no existe en `BodyCrearSuscripcion`). Como consecuencia,
  `crearCheckoutSession()` (`lib/stripe-suscripciones.ts`) **ya no crea el
  Customer de antemano** (antes lo creaba con ese email para dejarlo fijo en
  el checkout) — ahora no pasa `customer` a la Checkout Session, Stripe crea
  el Customer solo al completar el checkout con el email que la persona
  ingresa ahí (vuelve a quedar editable, a diferencia de antes).
  `stripe_customer_id` en `suscripciones` ya no se completa al crear la
  sesión — se sigue completando igual, pero después, vía el webhook
  (`checkout.session.completed` → `vincularCheckoutSession`), que ya
  escribía ese campo de todas formas. **Esto NO afecta al flujo viejo de
  Mercado Pago** (`/api/suscripciones`, código muerto) ni a Checkout Pro
  (`/admin/cobro-manual`, `lib/mercadopago.ts`), que tienen su propio
  `payerEmail` totalmente independiente — no se tocaron.
- **Formato de moneda + idioma del Checkout arreglado (2026-07-23)**: el
  Checkout mostraba los montos en formato europeo ("14,90" con coma) y en
  inglés, en vez de formato/idioma mexicano. Causa confirmada contra la
  referencia oficial de la API (`api/checkout/sessions/create`): sin
  `locale` explícito Stripe autodetecta del navegador, y `crearCheckoutSession()`
  no lo seteaba. `es` (español de España) y `es-419` (español
  latinoamericano) son dos valores de `locale` DISTINTOS en el enum oficial
  de Stripe — se agregó `locale: "es-419"` a `stripe.checkout.sessions.create()`.
  Verificado contra el Checkout real (modo test): ahora muestra "MXN 14.90"
  (punto decimal, correcto) y toda la página en español ("Suscríbete a...",
  "Información de contacto", "Suscribirse", etc.) — antes salía en inglés
  por completo, no solo el número.
- Ambos cambios verificados juntos con una prueba real de punta a punta vía
  Playwright, en modo test (para no gastar dinero): `/crear` con Presencia
  mensual, cero inputs de email en la UI (confirmado por conteo, no solo
  visual), cupón real `PR90` (90% off, $149 → $14.90) aplicado, submit real
  → Checkout real de Stripe con el monto y el idioma correctos, confirmado
  por captura de pantalla. Las keys se volvieron a test temporalmente para
  la prueba y se restauraron a live al terminar (confirmado con `grep` line
  a line contra `.env.local`, no solo de memoria).
- **Bug de decimales en "Tu plan" corregido (2026-07-23)**: el precio con
  descuento mostraba "$14.9" en vez de "$14.90" — `precioFinal.toLocaleString("es-MX")`
  sin forzar decimales, `toLocaleString` recorta el cero final. Se le agregó
  `{ minimumFractionDigits: 2, maximumFractionDigits: 2 }`. Cambio puramente
  visual: este `precioFinal` local de `TarjetaForm` ya era solo un preview
  (confirmado revisando todos sus usos — no se manda al backend, el precio
  real y autoritativo se recalcula server-side en `/api/stripe/checkout` a
  partir de `cuponCodigo`), así que no hay riesgo de que el fix afecte el
  monto real cobrado. Verificado con una prueba real (cupón `PR90`, mismo
  caso que reportó el bug): pasó de mostrar "$14.9" a "$14.90". Encontré el
  mismo patrón (`toLocaleString("es-MX")` sin decimales forzados) en
  `comparativa-planes.tsx` (`/planes`) — hoy no es un bug visible porque los
  precios de `planes` son todos enteros, pero queda como el mismo punto
  ciego latente si algún plan alguna vez tiene centavos — no se tocó, fuera
  del alcance de lo pedido.
- 🔴 **Investigando (2026-07-23), sin resolver todavía**: reporte real de
  producción — crear una suscripción para una tarjeta adicional (usuario con
  otra tarjeta ya con plan activo) devolvió "no pudimos iniciar la
  suscripción con Stripe". Hipótesis principal (cupón 100% dejando
  `precioFinal = 0`) **descartada con evidencia real**: se replicó el
  payload exacto (`unit_amount: 0`, recurring, mismo `price_data`) contra la
  API real de Stripe en modo LIVE y la aceptó sin problema
  (`cs_live_a1CHXL2T...`). Tampoco se reprodujo con el caso más simple
  (tarjeta adicional, sin cupón, Presencia mensual — `200` real, `checkoutUrl`
  real). En la tabla `tarjetas` quedaron 2 pares de intentos fallidos reales
  sin fila en `suscripciones` (`nn-fad95a`/`nn-e53fe6` y
  `prueba-22-ac6c4f`/`prueba-22-1fcdb8`, todos 2026-07-23 ~21:11-21:14) —
  como el `crearCheckoutSession` fallido borra la fila (best-effort cleanup),
  no quedó registro de qué cupón/descuento se usó en esos intentos
  puntuales. **Sin acceso a los Runtime Logs de Vercel desde acá** (no hay
  `vercel` CLI vinculado ni token) — necesito que el usuario pegue el log
  real de esos minutos, o un Personal Access Token de Vercel, antes de poder
  confirmar la causa real. No se aplicó ningún fix todavía, a propósito.
- **Tarjeta atorada tras cancelar el Checkout de Stripe — corregido
  (2026-07-23)**: cancelar en Stripe y volver a `/editar/{id}` dejaba la
  tarjeta sin forma de reintentar el pago — la sección "Tu plan" desaparecía
  (porque `TarjetaForm` en modo edición solo la mostraba cuando
  `tarjeta.plan_id` existía) y el botón decía "Guardar cambios" como si la
  edición ya estuviera completa. Fix con dos partes:
  - `TarjetaForm`: nuevos derivados `tienePlanActivo`/`mostrarSeccionPago`
    (antes la condición era `!esEdicion`, ahora `mostrarSeccionPago` — la
    sección de pago se muestra en edición también cuando no hay plan
    activo). Botón de guardar con 3 estados: "Guardar cambios" (edición con
    plan activo), "Completar pago" (edición sin plan — reintento), "Crear e
    ir a pagar" (creación). `getPlanPorId` (`lib/planes.ts`) y
    `getSuscripcionPendientePorTarjeta` (`lib/tarjetas.ts`) recuperan qué
    plan/periodicidad intentaba comprar la tarjeta atorada, resueltas en
    `/editar/[id]/page.tsx` y pasadas como props a `TarjetaForm`.
  - `POST /api/stripe/checkout`: bug adicional encontrado durante el
    análisis — reintentar el pago hacía un INSERT nuevo en `suscripciones`,
    que chocaba contra el índice único `suscripciones_una_activa_por_tarjeta`
    (ya existía una fila `pendiente` del intento cancelado) devolviendo un
    409 engañoso ("ya tenés una suscripción en curso", cuando en realidad
    era el propio intento abandonado). Ahora, si ya existe una fila
    `pendiente` para la tarjeta, se reutiliza con UPDATE (recalculando
    montos/cupón, limpiando `stripe_checkout_session_id`/
    `stripe_subscription_id`/`stripe_customer_id` a null) en vez de
    insertar. `autorizada`/`pausada` (los otros dos estados que cubre el
    índice) siguen sin tocarse — esos sí son una suscripción real y deben
    seguir bloqueando con el 409 de siempre. Verificado con una integración
    Playwright real de punta a punta contra Stripe en modo live (crear →
    Stripe → cancelar → volver a `/editar/{id}` → "Tu plan" reaparece →
    reintentar → llega a Stripe de nuevo sin 409), no solo piezas sueltas.
- 🔴 **Investigando (2026-07-23), sin resolver todavía**: login con Google
  perdiendo el `?plan=` de la URL de retorno, pero **solo con cuentas de
  Google nuevas** — confirmado por el usuario en Chrome normal, incógnito y
  con varias cuentas nuevas distintas; cuentas existentes siempre llegan
  bien a Stripe. Se descartó con evidencia dura la hipótesis de un trigger
  de Postgres o Auth Hook en `auth.users`: cero `CREATE TRIGGER` en las 6
  migraciones y en `schema.sql` completo, no existe `supabase/config.toml`
  en el repo. El código de la app (`auth-methods.tsx`, `crear/page.tsx`,
  `editar/[id]/page.tsx`) es idéntico para cuenta nueva o existente, sin
  rama condicional por antigüedad de cuenta, sin ruta `/auth/callback`
  propia (Supabase resuelve la sesión client-side vía
  `detectSessionInUrl`). O sea: la causa no está en este repo — tiene que
  estar en la config del Dashboard de Supabase (Authentication → Hooks,
  Authentication → URL Configuration) o en Google Cloud Console
  (OAuth consent screen / publishing status), ninguno de los dos accesible
  desde acá (no hay `supabase` CLI vinculado ni Management API token).
  Hipótesis principal: la pantalla "Google no verificó esta app" que Google
  muestra solo la primera vez que una cuenta autoriza la app (cuentas que ya
  autorizaron antes la saltan) — es el único paso real del flujo que
  difiere solo para cuentas nuevas. El usuario va a reproducir de nuevo
  prestando atención a si aparece esa pantalla antes de confirmar/aplicar
  un fix.

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
- **Enlace personalizado (slug) obligatorio, mínimo 4 caracteres
  (2026-07-23)**: antes era opcional — si se dejaba vacío, se autogeneraba
  uno a partir del nombre (`generarSlug`, con sufijo random). Ahora es
  obligatorio al crear: `handleGuardar` valida presencia y longitud mínima
  antes de `setSaving(true)` (mismo patrón que la validación de `nombre`), y
  `slugBloqueaGuardado` deshabilita el botón de guardar mientras el slug
  esté vacío, tenga menos de 4 caracteres, se esté verificando, o ya esté
  tomado. Se eliminó `generarSlug` (quedó sin otros usos) y el loop de
  reintento de INSERT con slug autogenerado en `handleGuardar` — ya no hace
  falta, el slug siempre llega validado desde el input. Verificado con
  Playwright real (sesión inyectada, no mock): sin slug → botón
  deshabilitado; slug de 2 caracteres → mensaje "Mínimo 4 caracteres" +
  deshabilitado; slug válido único → "Enlace disponible" + habilitado.

## Cursor pointer en elementos clickeables (2026-07-23)
- Ningún botón del proyecto tenía `cursor: pointer` — ni `buttonVariants`
  (`components/ui/button.tsx`) ni los `<button>` crudos repartidos por el
  código lo seteaban, y el default de los navegadores para `<button>` es
  `cursor: default`, no `pointer` (a diferencia de `<a>`). Se relevaron
  todos los `onClick` del proyecto (11 archivos) y confirmó que **todos**
  están en elementos `<button>`/`<Button>` (Base UI, que renderiza un
  `<button>` real) — ninguno en un `<div>`/`<span>` clickeable sin rol. La
  única excepción encontrada, `Menu.Item` en `compartir-tarjeta.tsx`, ya
  trae `cursor-default` explícito a propósito (convención estándar de
  shadcn/ui para ítems de menú, imita el comportamiento de menús nativos del
  SO) — no se tocó. Fix: una sola regla global en `globals.css`
  (`@layer base`): `button:not(:disabled), [role="button"]:not([aria-disabled="true"])
  { cursor: pointer }`, en vez de tocar el className de cada botón
  individualmente. Verificado con Playwright real (`getComputedStyle`) en
  `/planes` y `/crear`: 6/6 botones con `cursor: pointer` en ambas.

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
- Migración `20260725000000_endurecer_rls_servicios_agendables_plan.sql`
  (endurece `servicios_agendables_select_publica`,
  `disponibilidad_semanal_select_publica` y
  `disponibilidad_excepciones_select_publica` para exigir también
  `plan_id IS NOT NULL`, no solo `publicado = true`): **APLICADA** (2026-07-25,
  corrida manualmente por el usuario contra producción — a diferencia de las
  migraciones anteriores, esta confirmación es la palabra del usuario, no una
  consulta de verificación corrida desde esta sesión, porque no hay `supabase`
  CLI vinculado en este entorno).
- Migración `20260725010000_add_suscripciones_historial.sql` (tabla nueva
  `suscripciones_historial` + trigger `trg_suscripciones_historial` AFTER
  UPDATE en `suscripciones` que registra cada transición de `estado` +
  backfill de un punto de anclaje por suscripción existente): **APLICADA**
  (2026-07-25, corrida y verificada manualmente por el usuario contra
  producción — misma limitación de esta sesión que las anteriores, sin
  `supabase` CLI vinculado, confirmación es la palabra del usuario). Parte
  del trabajo de dashboards de métricas (ver sección nueva más abajo).
  - **Limitación aceptada de churn, explícita**: el churn (tasa de
    cancelación de suscripciones) que va a mostrar el dashboard admin solo
    es preciso **desde el momento en que esta migración se aplicó en
    producción (2026-07-25), no es retroactivo**. Antes de esta tabla,
    `suscripciones` era `estado` last-write-wins sin ningún historial — las
    transiciones de estado que ya ocurrieron antes de aplicar la migración
    no dejaron rastro y no se pueden reconstruir con precisión. El backfill
    que trae la migración insertó un punto de anclaje (estado de cada
    suscripción al momento de aplicarla), no una reconstrucción de
    transiciones pasadas reales — es la base de comparación a partir de la
    cual el churn futuro sí es exacto.
- Migración `20260725020000_add_eventos_metricas_visitante_hash.sql`
  (columna nueva `eventos_metricas.visitante_hash`, nullable, + índice
  `(tarjeta_id, visitante_hash)` para distinguir visitantes únicos de
  recurrentes sin guardar IP/user-agent en crudo): **APLICADA** (2026-07-25,
  corrida y verificada manualmente por el usuario contra producción, mismo
  protocolo que las anteriores).

## Dashboards de métricas (vistas/clicks/conversión + MRR/churn admin) — COMPLETO
- Motivación: `eventos_metricas`/`metricas_diarias` existían desde
  `20260716120000_add_planes_suscripciones_metricas.sql` (con el rollup ya
  armado) pero sin ningún endpoint que insertara en `eventos_metricas` (sin
  policy de insert para anon/authenticated a propósito) ni ningún dashboard
  que leyera de ninguna de las dos — deuda técnica documentada desde el
  inicio del proyecto (ver "Pendiente técnico sin resolver"). Instrumentado
  a partir de 2026-07-25, en curso.
- **`compra_completada` queda sin instrumentar por ahora, a propósito**:
  los productos (`datos_contacto.productos[].enlaceUrl`) son links de salida
  a un destino externo (WhatsApp, tienda externa, etc.) — no hay checkout
  propio de productos en la plataforma, así que no existe ninguna señal de
  que la venta se completó del otro lado. `click_producto` (el click de
  salida, real y observable) es la métrica que sí se instrumenta y se
  muestra como proxy de interés/conversión. `compra_completada` sigue
  existiendo en el check constraint de `eventos_metricas.tipo_evento` y en
  el dashboard está listo para conectarse el día que exista un flujo de
  compra de productos propio — decisión explícita del cliente, no un
  olvido.
- **Churn de suscripciones**: ver la nota de limitación aceptada en la
  migración `20260725010000_add_suscripciones_historial.sql` arriba.
- ✅ **`POST /api/eventos` + instrumentación pública, implementado y
  verificado end-to-end (2026-07-25)**:
  - `src/lib/eventos.ts` (server-only): `TIPOS_EVENTO`/`esTipoEvento`
    (deben coincidir con el check constraint de
    `eventos_metricas.tipo_evento`), `hashVisitante(ip, userAgent)` (sha256
    de `ip|user-agent|fecha-UTC|pepper`, rota diario; el pepper reusa
    `SUPABASE_SERVICE_ROLE_KEY` en vez de pedir una env var nueva solo para
    esto — sin pepper el hash sería trivialmente reversible por fuerza
    bruta de IPs conocidas) y `registrarEventoServidor()` (insert
    compartido, usado tanto por el endpoint como por `confirmar-pago.ts`).
  - `src/app/api/eventos/route.ts`: sin auth (guest-facing, mismo patrón
    que `/api/citas`), rate-limit 60/min por IP vía `lib/rate-limit.ts` ya
    existente, valida `tipo_evento` contra el enum real y que `tarjeta_id`
    sea una tarjeta real y `publicado = true` antes de insertar. Devuelve
    `{ok:true}` incluso sin `SUPABASE_SERVICE_ROLE_KEY` configurada — un
    problema de config propio no debe romper la experiencia del visitante.
  - `src/lib/track-evento.ts` (sin `"server-only"`, es cliente):
    `registrarEvento()` fire-and-forget con `fetch(..., {keepalive:true})`,
    nunca lanza ni bloquea. Deliberadamente sin `"compra_completada"` en su
    tipo (ver punto de arriba).
  - `tarjeta-card.tsx`: `vista_tarjeta` en un `useEffect` al montar (gateado
    a que `tarjetaId` esté presente — así el preview del editor y el demo
    del home, que no lo pasan, no generan tráfico a `/api/eventos`);
    `click_enlace` (con `metadata.tipo_enlace`: tel/whatsapp/email/
    sitio_web/ubicacion/red_social) en cada link de contacto/redes;
    `click_producto` en "Ver producto".
  - `reservar-servicio.tsx`: `click_agendar` en el `onClick` de
    `Dialog.Trigger` (Base UI reenvía/mergea `onClick` sin romper su propio
    toggle de apertura — verificado); `agenda_completada` solo en la rama
    SIN pago (`setPaso({tipo:"confirmado"})`).
  - `confirmar-pago.ts` (`confirmarPagoCita`): dispara `agenda_completada`
    server-side cuando una cita CON pago queda `pagada` — es el único lugar
    que sabe que el pago se confirmó de verdad; el visitante nunca vuelve a
    cargar la tarjeta pública en ese momento (viene del redirect/webhook de
    Mercado Pago), así que ningún componente cliente podría dispararlo.
  - **Verificado de punta a punta con una tarjeta de prueba real**
    (`prueba-e2e-metricas-*`, con plan activo + 1 servicio agendable +
    disponibilidad completa, creada con service role, borrada por completo
    al terminar — cascada real vía `on delete cascade`, confirmado que no
    quedó ninguna fila en `eventos_metricas`/`metricas_diarias` ni en
    ninguna tabla de agenda): carga real de `/[slug]` → `vista_tarjeta`;
    click en "Cómo llegar"/"Instagram" (`target="_blank"`, confirmado que
    siguen abriendo pestaña nueva sin que el `onClick` interfiera) →
    `click_enlace`; click en "Ver producto" → `click_producto`; abrir el
    diálogo de agendar → `click_agendar`; completar una reserva real sin
    pago → `agenda_completada`. Las 6 filas resultantes en
    `eventos_metricas` y su rollup en `metricas_diarias` se confirmaron con
    una lectura real (service role), no solo por el `200` del network tab.
    También se validó `POST /api/eventos` directo con `curl`: `tipo_evento`
    inválido → `400`, `tarjeta_id` faltante → `400`, tarjeta inexistente →
    `400`, y el rate-limit de 60/min sí corta (65 requests seguidos: ~55
    con `200`, el resto `429`). Cero errores de consola en todo el flujo.
  - **Hallazgo real no relacionado, encontrado en el camino**: `/[slug]`
    gateaba con `tarjeta.estado_pago !== "aprobado"`, un campo huérfano del
    modelo viejo — **RESUELTO el mismo día, ver sección dedicada más abajo**.
  - Dashboard del dueño (consume `visitante_hash` + toda esta instrumentación):
    **implementado, ver sección dedicada más abajo.**

## 🔴→✅ Bug crítico real: `/[slug]` gateaba con `estado_pago`, un campo
## huérfano del modelo viejo — RESUELTO (2026-07-25)
- **Encontrado como efecto colateral de la prueba de instrumentación de
  arriba** (hubo que setear `estado_pago: "aprobado"` a mano para que la
  tarjeta de prueba dejara de mostrarse como inactiva) — se investigó a
  fondo y se confirmó que era un bug real de producción, no solo una
  rareza de la tarjeta de prueba.
- **Causa raíz, confirmada con evidencia exacta**:
  - `src/app/[slug]/page.tsx:42` (antes del fix): `if (tarjeta.estado_pago
    !== "aprobado") { ... }` — el bloque JSX de "Tarjeta temporalmente
    inactiva" está inline ahí mismo (líneas 43-73 de la versión vieja), no
    es un componente aparte.
  - `estado_pago` es un campo 100% huérfano del modelo viejo de pago único
    de tarjeta (Mercado Pago Checkout Pro, previo a la migración a planes/
    suscripciones). Confirmado con grep exhaustivo: **cero referencias** a
    `estado_pago` en `lib/stripe.ts`, `lib/stripe-suscripciones.ts`,
    `lib/confirmar-suscripcion-stripe.ts`, ni en ninguna ruta de
    `app/api/stripe/`. El flujo actual de suscripciones (Checkout de
    Stripe → webhook → `procesarSuscripcionStripe()`) nunca lo toca, solo
    escribe/lee `suscripciones.estado` y sincroniza `tarjetas.plan_id`.
  - Todas las referencias reales a `estado_pago` en el código (grep
    completo de `src/`): (1) `src/app/admin/dashboard/page.tsx` — el
    toggle manual admin y la lista "Ventas recientes" del modelo viejo de
    ventas (`precio_pagado`/`estado_pago`), una feature de bookkeeping
    separada, no un gate de acceso — **no se tocó, sigue siendo válida
    para las tarjetas viejas que sí pasaron por ese modelo**; (2)
    `src/lib/confirmar-pago.ts:251` — el branch `tipo: "tarjeta"` de
    `actualizarEstadoPagoTarjeta`, que solo se alcanza si
    `external_reference` viene de una preferencia creada por
    `/api/checkout` — confirmado con grep que **`/api/checkout` no tiene
    ningún caller real hoy** (cero `fetch("/api/checkout"...)` en todo
    `src/`, coincide con lo ya documentado arriba en "Flujo de compra") —
    o sea, código 100% muerto para cualquier tarjeta nueva, no se tocó;
    (3) `src/lib/types.ts` — solo el tipo, sin lógica. **El único gate de
    acceso real que dependía de `estado_pago` era la línea 42 de
    `[slug]/page.tsx`** — ya arreglada, no hay ningún otro lugar
    equivalente pendiente.
  - Confirmado con una consulta real a producción (antes del fix): los 15
    tarjetas más recientes (2026-07-23 a 2026-07-25) tienen **todas**
    `estado_pago: "pendiente"` — ninguna llega nunca a `"aprobado"` por sí
    sola. Cualquier tarjeta nueva creada por el flujo actual, aunque
    consiga una suscripción de Stripe `autorizada` real (`plan_id`
    seteado), se hubiera seguido mostrando "Tarjeta temporalmente
    inactiva" a **todo el mundo** — rompiendo el único canal real de
    crecimiento del producto (compartir el link) para cualquier cliente
    pagador nuevo. Verificado también que **cero riesgo de regresión**:
    consulta real confirmó 0 tarjetas publicadas con `estado_pago =
    'aprobado' AND plan_id IS NULL` (ninguna tarjeta viva depende hoy
    exclusivamente del gate viejo) y 0 tarjetas publicadas con `plan_id`
    seteado y `estado_pago != 'aprobado'` (nadie tiene hoy una suscripción
    activa real todavía — el bug no había afectado a ningún cliente real
    aún, pero iba a afectar al primero que se suscribiera).
- **Fix**: `src/app/[slug]/page.tsx:42` cambiado a `if (!tarjeta.plan_id)`
  — la misma fuente de verdad que ya usan las policies RLS de agenda
  (`servicios_agendables_select_publica` etc., ver migración
  `20260725000000_...`) y toda la documentación de arriba sobre
  "`tarjetas.plan_id` es la fuente de verdad de si tiene un plan activo
  hoy". Una sola línea, sin tocar el resto del archivo ni el mensaje de
  "Tarjeta temporalmente inactiva" (el copy sigue siendo válido para
  "sin plan activo").
- **Verificado de punta a punta con Stripe en modo test real** (no
  simulado): login real vía `stripe login` (CLI, cuenta
  `acct_1TvfXG1jsNdj9fiJ`, misma cuenta que ya se usa en live), keys de
  test obtenidas del propio `stripe config --list` (sin pedirle al
  usuario que las pegue a mano), `stripe listen --forward-to
  localhost:3000/api/stripe/webhook` para el webhook real. Se creó un
  usuario real de Supabase Auth + una tarjeta real (sin `plan_id`, con
  `estado_pago` en su default `"pendiente"`, igual que cualquier tarjeta
  real hoy) → `POST /api/stripe/checkout` real (con el Bearer token real
  de la sesión) → Checkout real de Stripe (`cs_test_...`) completado con
  la tarjeta de prueba pública `4242 4242 4242 4242` → webhook real
  recibido (`checkout.session.completed` + `customer.subscription.created`,
  ambos `200`). Confirmado con una lectura real de Supabase después:
  `tarjetas.plan_id` quedó seteado, `suscripciones.estado = "autorizada"`,
  y **`estado_pago` se quedó en `"pendiente"` — confirma la causa raíz
  exacta**. `/[slug]` de esa tarjeta ya NO mostraba "inactiva" (confirmado
  con `curl` crudo + captura de pantalla real). El caso contrario (tarjeta
  sin `plan_id`) se verificó ANTES del pago, contra la misma tarjeta real:
  sí mostraba "inactiva" correctamente. Limpieza completa después:
  suscripción cancelada y customer borrado en Stripe test (ambos webhooks
  de cancelación también `200`), tarjeta+suscripción+usuario de prueba
  borrados de Supabase (cascada confirmada, cero filas huérfanas), keys
  de Stripe devueltas a live en `.env.local` (diff byte-a-byte contra el
  backup previo, confirmado idéntico).

## Dashboard del dueño — sección "Estadísticas" en TarjetaForm (2026-07-25)
- Implementado siguiendo exactamente el patrón ya establecido por "Agenda":
  nueva entrada en el array `SECCIONES` de `tarjeta-form.tsx`
  (`{ id: "metricas", titulo: "Estadísticas", contenido: contenidoMetricas }`),
  condicionada a `esEdicion && tarjeta` — se renderiza sola en el accordion
  desktop y el drawer/tab mobile (cero cambios en esa mecánica, ya
  genérica sobre `SECCIONES`).
- `src/components/tarjeta/estadisticas-tarjeta.tsx` (nuevo,
  `<EstadisticasTarjeta tarjetaId planId />`): mismo patrón exacto que
  `AgendaServicios` — recibe `planId` (no el objeto `Plan` completo, que
  `TarjetaForm` no tiene en modo edición) y resuelve el plan él mismo
  con `getPlanPorId` (reusa `lib/planes.ts`, no duplica la query como sí
  hace `AgendaServicios` con un `.from("planes")` inline). Bloqueo total
  con `if (!planId)` (mismo mensaje ámbar "Necesitás un plan activo...")
  antes de consultar nada — mismo criterio fail-closed que Agenda.
- `src/lib/metricas.ts` (nuevo): `getTotalesPorPeriodo`/`getSerieDiaria`
  leen `metricas_diarias` (disponible a TODOS los planes, son totales, no
  desglose); `getEventosDetalle` lee `eventos_metricas` crudo (solo se
  llama si `plan.features.metricas_desglose`). Los tres con el cliente
  `supabase` normal (no service role) — las policies `_select_propia` ya
  alcanzan, mismo criterio ya documentado en el research previo a esta
  implementación.
- Gating por `planes.features` (valores reales sembrados, no hardcodeados):
  `metricas_desglose` (alcance+poder) habilita desglose por enlace/servicio/
  producto (top 5 c/u, `BarChart` horizontal de una sola serie) + donut de
  único/recurrente (via `visitante_hash`: recurrente = mismo hash en más de
  un día distinto dentro del período); `metricas_rango_custom` (solo poder)
  habilita el tab "Rango personalizado" con dos `<input type="date">`;
  `metricas_exportacion` (solo poder) habilita "Exportar CSV" (cliente-side,
  mismo patrón `Blob`+`URL.createObjectURL` que ya usa `handleGuardarContacto`
  en `tarjeta-card.tsx`, sin endpoint nuevo). Presencia ve 4 stat tiles
  (vistas/clicks/agendamientos/clicks a productos, con % conversión desde
  vistas donde aplica) + el gráfico de tendencia + comparativa vs. período
  anterior — nada de esto depende de `metricas_desglose`, son totales.
- **`compra_completada` deliberadamente ausente de toda la UI** (ni tile, ni
  tipo en `TipoEventoCliente` del lado cliente) — coherente con la decisión
  ya documentada arriba de no fabricar esa métrica.
- **Paleta de charts**: se repurificaron los tokens `--chart-1..5` de
  `globals.css` (antes placeholders grises de shadcn sin usar en ningún
  lado, confirmado con grep) con la paleta categórica validada de la skill
  `dataviz` — 6 checks corridos con `scripts/validate_palette.js` contra
  las superficies real del proyecto (light `#fcfcfb`-equivalente y dark),
  todos en PASS (el único WARN, contraste de 3 colores en modo claro, está
  mitigado por leyenda + tooltip visibles, no color solo). Los 5 `<Line>`
  del gráfico de tendencia y el donut de único/recurrente usan
  `var(--chart-1)`...`var(--chart-5)`, así que responden sin JS extra al
  toggle de tema (`.dark`) ya existente en la app.
- **Bug real encontrado y corregido durante la verificación en vivo**: la
  fila donut+leyenda de "único vs. recurrente" desbordaba su card
  (`scrollWidth` 286px vs. `clientWidth` 225px reales, confirmado con
  `getBoundingClientRect`) en el ancho real de la columna del accordion
  desktop — el número aparecía recortado ("Nuevos:" sin el valor visible).
  Corregido: `flex items-center gap-4` → `flex flex-wrap items-center
  gap-4` + donut de 144px a 112px + `min-w-0` en la columna de texto.
  Verificado de nuevo tras el fix: "Nuevos: 2", "Recurrentes: 1", "3
  visitantes únicos en total" totalmente visibles.
- **Segundo ajuste real encontrado en la misma verificación**:
  `metricas_diarias` no guarda filas en cero (solo días con actividad
  real) — graficar la serie cruda producía una línea recta entre los 2
  únicos puntos con datos en un rango de 30 días, insinuando falsamente una
  tendencia continua. Se agregó `rellenarSerie()` (capa de presentación,
  no toca `lib/metricas.ts`) que completa cada día del rango elegido con
  cero explícito antes de pasarle los datos a `recharts` — el gráfico
  ahora muestra correctamente una base plana en cero con picos solo donde
  hubo actividad real. `interval="preserveStartEnd"` + `minTickGap={24}`
  en el `XAxis` para que el eje no se sature de etiquetas en el rango de
  30 días.
- `npm install recharts` (confirmado que NO estaba instalado pese a que el
  pedido original asumía que sí — instalado como dependencia nueva,
  `^3.10.1`).
- **Verificado de punta a punta con datos reales, dos tarjetas de prueba**
  (una por tier, `plan_id` seteado directo con service role — simula el
  estado real post-Stripe ya verificado en la sección anterior — con
  eventos reales sembrados vía `eventos_metricas`, incluyendo un período
  "anterior" a ~10 días para probar la comparativa, y visitantes con
  `visitante_hash` repetido en 2 días distintos para probar recurrencia):
  login inyectado en el navegador real (localStorage con una sesión real
  de Supabase Auth de un usuario de prueba, mismo `storageKey` que usa el
  cliente de la app) → `/editar/[id]` real → tab "Estadísticas". Presencia:
  4 tiles + deltas + gráfico, SIN ningún bloque de desglose, con el mensaje
  de upsell correcto — todos los números coincidieron exactamente con los
  datos sembrados (incluyendo el caso "Nuevo" cuando el período anterior
  era 0, y el % de conversión). Poder: mismos tiles + "Rango personalizado"
  + "Exportar CSV" visibles (ausentes en Presencia, confirmado), desglose
  de enlaces/servicios/productos y donut único/recurrente con conteos
  exactos, cambio de período (Hoy/7 días/30 días) recalculando todo
  correctamente, CSV descargado y verificado con contenido real. Cero
  errores de consola en todo el flujo. Limpieza completa después: ambas
  tarjetas de prueba y sus 2 usuarios de prueba borrados (cascada
  confirmada, cero filas huérfanas).
- Dashboard admin (MRR, churn, distribución por plan, uso de features):
  **implementado, ver sección dedicada más abajo.** Con esto, el plan
  original de dashboards de métricas queda completo (los 4 pasos).

## Dashboard admin — MRR, churn, distribución y uso de features (2026-07-25/26)
- Extiende `src/app/admin/dashboard/page.tsx` (no crea página nueva) con una
  sección nueva "Suscripciones y planes", entre los 4 stat tiles existentes
  (Ventas totales/Tarjetas creadas/Pagos aprobados/Pagos pendientes, sin
  tocar) y "Precios y promoción" — mismo patrón visual de stat tile
  (`rounded-3xl`, blob de gradiente, ícono) y de card de sección
  (`rounded-3xl border border-black/5 bg-white p-6 shadow-sm`) ya usados en
  el resto del archivo, cero componentes ni librerías de UI nuevas.
- `src/lib/admin-metricas.ts` (nuevo): `getSuscripcionesAutorizadas()`,
  `getTarjetaIdsConAgendaActiva()`, `getSuscripcionesHistorial()` — las
  tres con el cliente `supabase` plain (no service role), mismo criterio
  que el resto del archivo: las policies `_admin_todo` ya le dan acceso
  completo al admin vía su propio JWT. `calcularChurn(historial, desde,
  hasta)` es una función pura (sin I/O) que reconstruye, para cada
  `suscripcion_id`, cuál era su estado en `desde` (última fila de
  `suscripciones_historial` con `created_at <= desde`) y si transicionó a
  un estado terminal (`cancelada`/`vencida`) dentro de `(desde, hasta]`.
  Churn = solo cuenta suscripciones que estaban `autorizada` en `desde` —
  mirar el `estado` actual de `suscripciones` no alcanza (last-write-wins,
  no dice nada del pasado), por eso hace falta reconstruir desde el
  historial fila por fila. Período fijo usado: últimos 30 días (sin
  selector de rango en el admin, a diferencia del dashboard del dueño — no
  se pidió, se puede agregar después si hace falta).
- **Cálculos, todos derivados en el cuerpo del render** (mismo estilo que
  `aprobadas`/`pendientes`/`totalVentas` ya existentes, sin `useMemo` —
  consistente con el resto del archivo):
  - **MRR**: normaliza `periodicidad === "anual"` dividiendo `precio_final`
    entre 12 antes de sumar — así todas las suscripciones autorizadas
    (mensuales y anuales mezcladas) quedan en la misma unidad. `mrrTotal` +
    `mrrPorPlan` (agrupado por `plan_id`).
  - **Distribución de tarjetas por plan**: agrupa `tarjetas.plan_id`,
    incluye una categoría **"Sin plan"** (nunca pagó, o se le canceló/
    pausó la suscripción) para dar el panorama completo, no solo las
    monetizadas — sin esto, tarjetas realmente en su mayoría no
    monetizadas hoy (confirmado: 0 de 23 tarjetas reales tienen `plan_id`
    activo, ver el bug de `estado_pago` de más arriba) se verían invisibles
    en el gráfico.
  - **Uso de agenda por plan**: cruza el `Set` de `getTarjetaIdsConAgendaActiva()`
    con `tarjetas.plan_id` — **solo para tarjetas CON plan** (sin plan la
    agenda ya está bloqueada por completo, cruzarlas no aporta nada).
- **Visualizaciones con recharts**, reusando los mismos tokens
  `var(--chart-1)`...`var(--chart-4)` ya validados y repurificados para el
  dashboard del dueño (ver sección de arriba) — ninguna paleta nueva:
  - Distribución de tarjetas por plan → donut (`PieChart`, hasta 4
    categorías: 3 planes + "Sin plan" — dentro del cap de "primeros 3-4
    slots validan all-pairs" que documenta la skill `dataviz`), leyenda de
    texto al lado (mismo patrón que el donut único/recurrente del
    dashboard del dueño, con el fix de `flex-wrap` + `min-w-0` ya aplicado
    desde el vamos para no repetir el bug de overflow encontrado ahí).
  - MRR por plan → `BarChart` de una sola serie (magnitud, no identidad —
    todas las barras del mismo color `chart-1`, mismo criterio que
    `BloqueTopN` del dashboard del dueño), eje Y formateado en MXN.
  - Uso de agenda por plan → `BarChart` agrupado de 2 series ("Con agenda
    activa" `chart-1` / "Solo perfil" `chart-2`) con `Legend` (regla de la
    skill: ≥2 series siempre necesitan leyenda).
- **Verificado con datos de prueba reales, no simulados**: se sembraron 6
  tarjetas + 5 suscripciones (4 `autorizada` con precios/periodicidades
  mixtas + 1 `cancelada` con su transición real en `suscripciones_historial`
  fechada retroactivamente para caer dentro de la ventana de 30 días) +
  servicios agendables activos en 2 de ellas, vía service role — sesión
  real del admin (`emuna.interno@gmail.com`) inyectada en el navegador sin
  tocar su contraseña (`admin.auth.admin.generateLink` + `verifyOtp` con
  `token_hash`, 100% no destructivo). **Cada número mostrado coincidió
  exactamente con el cálculo hecho a mano antes de sembrar los datos**: MRR
  total $1,296 (149 + 299 + 2990/12 + 599), churn 20.0% ("1 de 5 canceló"),
  4 tarjetas con plan activo, 25 sin plan, distribución 1/2/1/25 por plan,
  MRR por plan y uso de agenda por plan (Presencia 1 con agenda/0 sin,
  Alcance 1/1, Poder 0/1) todos exactos. Cero errores de consola. Las
  secciones ya existentes (Ventas totales, Precios y promoción, Ventas
  recientes) siguieron funcionando sin cambios. Limpieza completa después:
  las 6 tarjetas de prueba se borraron (cascada confirmada hasta
  suscripciones/historial/servicios) y se verificó que la base volvió
  exactamente al baseline previo (23 tarjetas, 0 con plan, 0 autorizadas,
  13 filas de historial — mismos números que antes de sembrar).

## Páginas legales (privacidad / condiciones de servicio) — 2026-07-25
- Creadas para cumplir el requisito mínimo de operar cobrando dinero real y
  poder publicar un cliente OAuth propio de Google (ver el punto pendiente
  justo abajo — la creación de estas páginas NO implica que el cliente OAuth
  ya esté publicado, son dos pasos independientes).
- `/politica-privacidad` (`src/app/politica-privacidad/page.tsx`) y
  `/condiciones-servicio` (`src/app/condiciones-servicio/page.tsx`): server
  components estáticos, mismo patrón visual que `/login` (`<Logo />` +
  tokens de color ya existentes, sin librería nueva). Enlazadas desde el
  footer del home (`src/app/page.tsx`).
- Contenido específico del negocio real, no genérico: datos recopilados vía
  Google OAuth (nombre/email/foto), Stripe (suscripciones) y Mercado Pago
  (citas/cobro manual), Supabase (hosting en EE.UU. — transferencia
  internacional de datos declarada), Cloudinary (imágenes); derechos ARCO
  con referencia a la LFPDPPP (México); y una aclaración honesta de que la
  **cancelación de suscripción hoy se gestiona solo por contacto directo**,
  no hay autogestión todavía en la plataforma (coincide con la realidad
  descrita en la sección de Suscripciones más arriba).
- Ambas páginas terminan con el mismo aviso breve: "Este documento es un
  borrador inicial y será revisado con asesoría legal profesional
  próximamente" — a propósito no escondido, pero de tono bajo.
- **Email de contacto usado es un placeholder temporal**:
  `emuna.interno@gmail.com` (el mismo `ADMIN_EMAIL` de `lib/admin.ts`) — no
  existe todavía un email de soporte público dedicado. Reemplazar en ambas
  páginas el día que exista uno.
- Verificado con Playwright real contra el dev server (no solo visual):
  ambas rutas devuelven `200`, título/`h1` correctos, disclaimer presente en
  las dos.
- **Sin commitear todavía** (`git status` las muestra como untracked):
  `src/app/politica-privacidad/page.tsx`,
  `src/app/condiciones-servicio/page.tsx`, y el cambio de footer en
  `src/app/page.tsx`.
- 🔴 **Cliente OAuth propio de Google: PENDIENTE, no configurado todavía**
  (confirmado explícitamente por el usuario el 2026-07-25, no asumido) —
  falta hacerlo en Google Cloud Console (pantalla de consentimiento OAuth,
  publicar la app) y/o en el dashboard de Supabase
  (Authentication → Providers). Fuera del alcance de este repo, no hay nada
  que verificar desde el código para confirmar su estado.
- 🔴 **Google Cloud rechazó la primera verificación de marca del OAuth
  (2026-07-25)** con 3 problemas, 2 sobre el contenido del home
  (`src/app/page.tsx`): (1) "no se explica el propósito de la app", (2) "el
  nombre de la app 'Linkard' no coincide con el nombre de la app de tu
  página principal". Ambos corregidos en el mismo `src/app/page.tsx`:
  - Nueva sección **"¿Qué es Linkard?"** justo después del hero: un `<h2>` +
    párrafo con texto real y explícito del propósito ("Linkard es la
    tarjeta digital todo-en-uno para negocios y creadores: perfil, agenda
    de servicios y venta de productos, todo en un solo link"). Antes el
    único texto con propósito real era el hero, que es solo un gancho de
    marketing ("No más tarjetas de papel...") sin mencionar el nombre ni
    describir la función de la app.
  - La etiqueta ("eyebrow") sobre el H1 ahora arranca con "**Linkard**: tu
    contacto, siempre en su celular" en vez de solo el texto sin marca —
    refuerza el nombre bien arriba, cerca del H1.
  - Verificado con `curl` contra el HTML crudo devuelto por el servidor
    (sin ejecutar JS): el `<h2>` y el párrafo aparecen como texto real en
    el DOM (`<h2>¿Qué es Linkard?</h2>`, `<strong>Linkard</strong> es la
    tarjeta digital...`), no dentro de una imagen/canvas — confirma que un
    revisor automatizado (o humano viendo el código fuente) puede
    extraerlo como texto plano.
  - **Se quitó el punto final del wordmark** ("Linkard." → "Linkard") en
    `src/components/logo.tsx` (`<Logo />`, usado en home/login/admin/footer
    de tarjeta pública) **y también en `src/app/opengraph-image.tsx`**
    (la imagen OG general del sitio tiene su propio render del wordmark
    con Satori porque no puede reusar el componente `<Logo />` — se
    encontró la misma "Linkard." con punto ahí y se corrigió igual, por
    consistencia de marca). Razón: si el nombre registrado en el cliente
    OAuth de Google es exactamente "Linkard" sin punto, esa diferencia
    textual podía ser parte de por qué el revisor marcó "no coincide".
    Verificado visualmente (zoom de captura en `/`, `/opengraph-image` y
    `/login` con `<Logo size="lg" />`): sin problemas de espaciado al
    quitar el punto, no hizo falta ningún ajuste adicional de layout.
  - **Todavía no reenviado a revisión de Google** — estos son los cambios
    de código; falta que el usuario vuelva a solicitar la verificación de
    marca en Google Cloud Console.
- 🔴 **Estado real de la verificación de Google (2026-07-25, según el
  usuario — no verificable desde este repo)**: sigue **pendiente por el
  registro TXT del dominio** (verificación de propiedad de `linkard.mx` que
  Google exige antes de aprobar el cliente OAuth) — no es algo que se
  resuelva con código, es un registro DNS que el usuario debe agregar en
  el proveedor de dominio. **Plan de contingencia mientras tanto**: agregar
  usuarios de prueba manualmente en la pantalla de consentimiento OAuth de
  Google Cloud Console (una app en modo "Testing" permite login con Google
  para una lista explícita de correos sin necesitar la verificación de
  marca completa) — así se puede seguir operando/probando el login real
  mientras se resuelve el TXT record, en vez de bloquear todo el flujo de
  autenticación hasta que Google apruebe.

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
- ✅ **RESUELTO (2026-07-25)**: el gating por plan de `servicios_agendables`
  en la vista pública ya no depende solo del filtro de aplicación en
  `getServiciosAgendablesActivos()`. Migración
  `supabase/migrations/20260725000000_endurecer_rls_servicios_agendables_plan.sql`
  (commiteada) mueve el requisito `plan_id IS NOT NULL` a las tres policies
  `servicios_agendables_select_publica`, `disponibilidad_semanal_select_publica`
  y `disponibilidad_excepciones_select_publica` (mismo patrón que ya usan con
  `publicado`), sin tocar las policies `_owner_todo`/`_admin_todo` (el dueño
  y el admin siguen viendo su agenda aunque el plan esté vencido). **Aplicada
  y confirmada por el usuario contra producción** (corrida manualmente, ver
  nota abajo) — no verificado desde este entorno de sesión (sin `supabase`
  CLI vinculado ni acceso directo a la base para correr una consulta de
  confirmación propia). El filtro de aplicación en `getServiciosAgendablesActivos()`
  sigue existiendo igual (no se quitó, es defensa en profundidad), ya no es
  la única protección.

## Notas de proceso
- Proyecto de Supabase: producción única, sin staging. Antes de cualquier migración:
  backup con `pg_dump` (plan free, sin backups automáticos ni PITR).
- Convención de migraciones: `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`,
  aditivas, envueltas en `BEGIN`/`COMMIT`.
</content>
