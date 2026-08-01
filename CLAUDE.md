@AGENTS.md

# Estado del negocio y la arquitectura (mitarjeta)

> Última actualización: 2026-08-02. Este documento es la fuente de verdad para que
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

### ✅ Imagen OG dinámica por tarjeta individual — RESUELTO (2026-07-26)
- `src/app/[slug]/opengraph-image.tsx` (nuevo): genera un preview 1200×630
  propio por tarjeta con `getTarjetaPublicada(slug)` — nombre/nombreEmpresa
  según tipo, `puesto`/`giro` como subtítulo, fondo con
  `identidad_visual.colorPrimario/colorSecundario` (gradiente si hay ambos,
  sólido si solo uno, `#171717` si ninguno) y color de texto resuelto con
  `obtenerColorContraste()` (`lib/contraste.ts`, ya existía, usado por
  `TarjetaCard` para el mismo propósito). Watermark del logo (triángulo SVG +
  "Linkard", discreto, esquina inferior derecha) en vez del logo protagonista
  de la imagen genérica.
- **Avatar**: si `identidad_visual.avatarUrl` existe (Cloudinary), se
  descarga y convierte a data URI ANTES de construir el `ImageResponse`
  (`cargarImagenBase64()`, con try/catch propio) — **a propósito, no
  `<img src={avatarUrl}>` directo**: aunque Satori sí soporta fetch remoto
  por URL, esa carga ocurre de forma perezosa dentro del `ReadableStream`
  interno de `ImageResponse` (confirmado leyendo
  `next/dist/server/og/image-response.js`), fuera de cualquier try/catch
  que se escriba en la función `Image()` — una foto caída/lenta hubiera
  roto la imagen OG entera sin forma de interceptarlo. Resolviendo la
  imagen nosotros mismos, un fallo cae limpiamente a un círculo con la
  inicial del nombre (mismo criterio de fallback que ya usa `HeaderGlobal`
  para el avatar del usuario).
- **Fallback a la imagen genérica del sitio** (`renderOgImageGenerico()`,
  ver debajo) si la tarjeta no existe (`notFound`-equivalente) o
  `plan_id` es `null` (nunca pagó, o se le canceló/pausó la suscripción) —
  mismo criterio fail-closed que el resto del proyecto usa para gating por
  plan (`/[slug]/page.tsx`, agenda, RLS).
- **`src/lib/og.tsx` (nuevo)**: extrae `cargarSoraBold()` (fetch de la
  fuente Sora bold para Satori) y `renderOgImageGenerico()` (el JSX de la
  imagen OG general) de `src/app/opengraph-image.tsx` a un módulo
  compartido — ambos archivos (`opengraph-image.tsx` raíz y
  `[slug]/opengraph-image.tsx`) los importan, en vez de duplicar la lógica
  de fuente + el diseño genérico. `opengraph-image.tsx` raíz quedó como un
  wrapper delgado sobre este módulo, sin cambio visual.
- El triángulo del logo se sigue dibujando como SVG (`<polygon>`), no el
  carácter Unicode ▲ — mismo motivo ya documentado (Satori no lo resuelve
  contra la fuente Sora cargada).
- Verificado con 4 tarjetas de prueba reales (sembradas y borradas después,
  vía service role, cero rastro): avatar real de Cloudinary con gradiente
  morado, tarjeta empresarial sin foto (fallback de inicial, fondo
  amarillo/naranja con texto negro — contraste correcto), nombre largo
  (wrap a 2 líneas, tamaño de fuente reducido automáticamente si
  `nombre.length > 22`), y una tarjeta publicada pero con `plan_id: null`
  (cayó exactamente al mismo PNG — mismo tamaño en bytes — que el fallback
  genérico y que una tarjeta inexistente). Las 4 devolvieron `200` con PNG
  real de 1200×630. `npm run build` + `tsc --noEmit` + `eslint` limpios.
- **Pendiente de que el usuario lo haga manualmente (NO lo hace Claude)**:
  actualizar `NEXT_PUBLIC_SITE_URL` a `https://linkard.mx` en las Environment
  Variables del proyecto en el dashboard de Vercel (ya está actualizada en
  `.env.local` para desarrollo local, pero Vercel usa su propia configuración
  independiente) y disparar un redeploy para que tome efecto en producción —
  sin esto, las URLs absolutas de OG image siguen resolviendo mal en
  producción al compartir (mismo pendiente ya documentado arriba para la
  imagen genérica, no es nuevo de este cambio).

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
- 🔴 **Pendiente de que el usuario lo haga manualmente (2026-07-26)**: el
  endpoint live tampoco tiene suscripto `invoice.paid` — necesario para el
  sistema de afiliados (`registrarCobroDeCupon()`, ver sección "Sistema de
  afiliados" más abajo). Sin este evento en el dashboard, ninguna venta de
  afiliado se registra en producción aunque el código ya lo escuche. El
  set completo que el endpoint live debería tener (6 eventos): `checkout.
  session.completed`, `customer.subscription.created`, `customer.
  subscription.updated`, `customer.subscription.deleted`, `invoice.
  payment_failed`, `invoice.paid`. **`charge.updated` NO hace falta** —se
  consideró como respaldo para el fee real de Stripe durante el diseño,
  pero se descartó: confirmado revisando los tipos reales de `stripe`
  v22.3.2 que ni `Charge` ni `PaymentIntent` tienen ningún campo que apunte
  de vuelta al `Invoice` en esta versión de API, así que un handler de
  `charge.updated` no podría correlacionar el cobro con la suscripción de
  todos modos — la captura del fee real quedó 100% dentro del handler de
  `invoice.paid` (reintentos con backoff corto, ver esa sección).
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

## Header global + /mi-cuenta (2026-07-26)
- Alcance acotado a propósito — **no** es el rediseño completo de "Mi Cuenta"
  (viene después). Solo `<HeaderGlobal />` + una página `/mi-cuenta` básica.
- `src/components/header-global.tsx` (nuevo, client): logo a la izquierda
  (`<Logo />`, enlaza a `/`); sin sesión, botón "Iniciar sesión" que abre un
  `Dialog` (Base UI, mismo patrón de `reservar-servicio.tsx`) con
  `<AuthMethods redirectTo={pathname}>` adentro — no existe una ruta
  genérica de login reusable (`/login` está hardcodeada al acceso admin,
  `redirectTo="/admin/dashboard"`), así que el modal es la única forma de
  ofrecer login "desde cualquier lado" sin crear una ruta nueva. Con
  sesión: avatar circular (`identidad_visual.avatarUrl` de la tarjeta más
  reciente del usuario — `getTarjetasDeUsuario()`, ya devuelve ordenado por
  `created_at desc`, así que `data[0]` alcanza; si esa tarjeta no tiene
  foto, iniciales de `nombrePrincipalDeTarjeta()`; si el usuario no tiene
  ninguna tarjeta todavía, iniciales del email de la sesión) con un
  `Menu` (Base UI, mismo patrón que `compartir-tarjeta.tsx`) → "Mi Cuenta"
  (`/mi-cuenta`) / "Cerrar sesión" (`supabase.auth.signOut()` +
  `router.push("/")`).
- **Convivencia con el auth-gate inline que ya usan `/crear` y
  `/editar/[id]`** (decisión explícita, confirmada con el cliente antes de
  programar): sin esto, al estar deslogueado se verían DOS controles de
  login redundantes en pantalla (el botón compacto del header + la tarjeta
  grande de `<AuthMethods>` que la propia página ya muestra). Fix: prop
  `ocultarLoginSinSesion` en `HeaderGlobal`, que esas dos páginas pasan como
  `session === null` (su propio estado de sesión, chequeado con el mismo
  patrón `useEffect` + `getSession()`/`onAuthStateChange` que ya usaban) —
  el header sigue mostrando el logo siempre, pero suprime su propio botón
  de login mientras la página ya está mostrando el suyo. Con sesión activa
  (en cualquier estado de esas dos páginas) el header vuelve a mostrar el
  avatar normal, sin condición especial.
- Ambas páginas (`crear/page.tsx`, `editar/[id]/page.tsx`) se refactorizaron
  de "return temprano por rama" a una variable `contenido` armada por
  rama + un único `return` final que monta `<HeaderGlobal
  ocultarLoginSinSesion={session === null} />` una sola vez — mismo
  comportamiento exacto en cada rama (loading/sin sesión/sin permiso/
  formulario), solo cambia dónde vive el `HeaderGlobal`.
- **`src/app/mi-cuenta/page.tsx` (nuevo)**: el pedido original decía
  "redirige a login si no hay sesión, mismo patrón ya usado en
  `/editar/[id]`" — pero el patrón real de `/editar/[id]` es `<AuthMethods>`
  inline, no un redirect, y `/login` no sirve para esto (ver arriba).
  Se implementó con el patrón inline real (`redirectTo="/mi-cuenta"`),
  confirmado explícitamente con el cliente antes de programar. Contenido:
  email de la sesión, lista de tarjetas (`getTarjetasDeUsuario`, mismo
  patrón visual que la página `/editar` ya existente — "mis tarjetas" — que
  ya hacía casi exactamente esto; `/mi-cuenta` es un archivo nuevo, no se
  tocó `/editar/page.tsx`), cada una con link a `/editar/{id}`, botón
  "Crear nueva tarjeta" → `/planes` (no `/crear` directo, el flujo real
  arranca eligiendo plan) y botón "Cerrar sesión".
- **Integración**: `<HeaderGlobal />` agregado a `/` (home, reemplaza el
  `<Logo />` suelto que tenía el `<header>`), `/planes` (no tenía ningún
  header antes), `/crear` y `/editar/[id]` (con la prop de arriba).
  **`/[slug]` (tarjeta pública) deliberadamente sin tocar** — no debe
  aparecer ahí, confirmado explícitamente en el pedido original.
  `layout.tsx` (server component, sin chrome global hoy) se dejó sin
  tocar a propósito: si `HeaderGlobal` viviera ahí aparecería también en
  `/[slug]`, que está fuera del layout raíz compartido por las 4 páginas
  pedidas pero NO puede excluirse de un `layout.tsx` a nivel de toda la
  app sin un route group nuevo — se prefirió agregarlo página por página
  (4 líneas, cero riesgo para `/[slug]`) en vez de reestructurar rutas.
- **Verificado con datos reales, no mocks**: 2 usuarios de prueba — uno con
  2 tarjetas (la más vieja sin foto, la más nueva con `avatarUrl` real de
  Cloudinary) para probar tanto "la más reciente por `created_at`" como el
  avatar con foto real; otro sin ninguna tarjeta, para probar el fallback
  de iniciales por email. Confirmado en el navegador real (sesión inyectada
  vía localStorage, mismo mecanismo ya usado en sesiones anteriores):
  header sin sesión correcto en las 4 páginas (con el modal de login
  funcionando en `/` y `/planes`, y correctamente ausente — sin duplicar el
  `<AuthMethods>` de la página — en `/crear` y `/editar/[id]`); avatar con
  foto real de la tarjeta más reciente; dropdown "Mi Cuenta"/"Cerrar
  sesión" funcional; `/mi-cuenta` listando ambas tarjetas reales con links
  correctos a `/editar/{id}`; fallback de iniciales por email para el
  usuario sin tarjetas; logout real confirmado (token de sesión en
  `localStorage` queda `null` después, no solo la UI cambiando). Cero
  errores de consola en todo el flujo. Limpieza completa después (2
  usuarios + 2 tarjetas de prueba borrados).
- **Limitación de esta verificación, honesta**: no se pudo confirmar
  visualmente en un viewport mobile real — la herramienta de resize de
  ventana del navegador de esta sesión no cambió el viewport real de
  renderizado (`window.innerWidth` siguió en ~1470px pese al resize).
  Se verificó en su lugar por análisis estático del CSS: en mobile,
  `TarjetaForm` renderiza su preview a pantalla completa con `fixed inset-0
  z-0` (línea ~2013 de `tarjeta-form.tsx`) y la barra de controles inferior
  con `fixed inset-x-0 bottom-0 z-40` (línea ~2107) — `HeaderGlobal` usa
  `z-30`, así que en mobile quedaría **por encima** del preview a pantalla
  completa (z-0) pero por debajo de la barra inferior (z-40): el header
  flotaría como una franja angosta arriba del preview en vez de quedar
  oculto detrás — funcional (logo/avatar clickeables) pero no
  necesariamente el look pulido que tiene hoy el modo mobile inmersivo de
  `TarjetaForm`. No es un bug (nada queda invisible ni rompe), pero vale
  una revisión visual real en un dispositivo/emulador cuando se pueda.

## Rediseño de arquitectura: shell de paneles admin/mi-cuenta + sistema de
## cupones avanzado (2026-07-26)
- Reemplaza el dashboard admin de una sola página (~900 líneas) y el
  `/mi-cuenta` de una sola pantalla por un shell de navegación por pestañas
  reutilizable entre los dos paneles, patrón Vercel/Stripe Dashboard —
  rutas propias por sección (no tabs por estado de React, cada tab es una
  ruta real con back-button funcional).
- **`src/components/panel/panel-shell.tsx`** (`<PanelShell titulo tabs>`,
  presentacional puro, sin fetch de sesión propio) + **`panel-tabs.ts`**
  (`ADMIN_TABS`/`MI_CUENTA_TABS`, arrays constantes de `{href, label,
  icon}`). Desktop: sidebar izquierdo fijo. Mobile: topbar + hamburguesa
  que abre un `Drawer` de `@base-ui/react/drawer` deslizando desde la
  **izquierda** (`swipeDirection="left"`, mismo primitivo que ya usaba
  `TarjetaForm` para su bottom-sheet, configurado distinto — decisión
  explícita: un panel de navegación entre secciones necesita verse
  completo de un vistazo, a diferencia del patrón de pills horizontales de
  `TarjetaForm`, que sigue intacto y es intencionalmente distinto).
- **`/admin/layout.tsx`** (nuevo): auth-gate único para toda la sección
  (antes cada página admin repetía el chequeo de `ADMIN_EMAIL`) + monta
  `<HeaderGlobal />` + `<PanelShell tabs={ADMIN_TABS}>`. Rutas:
  `/admin/dashboard` ("Resumen", solo stat tiles — ver más abajo por qué
  cambiaron), `/admin/tarjetas` (listado global filtrable por tipo/plan/
  estado, reemplaza "Ventas recientes", + gráficos de distribución por
  plan y uso de agenda que antes vivían en el dashboard), `/admin/
  suscripciones` (listado fila-por-fila nuevo — antes solo había
  agregados — + MRR por plan + churn), `/admin/cupones` (ver sistema de
  cupones abajo), `/admin/afiliados` (nuevo, agregado el mismo
  2026-07-26 — ver sección "Sistema de afiliados con comisión
  recurrente"), `/admin/cobro-manual` (se le quitó su propio header,
  ahora vive dentro del shell), `/admin/configuracion` (nuevo: CRUD real
  de `planes.precio_mensual/anual` + editor de
  `descuento_tarjeta_adicional_pct`, pedido explícito del cliente que no
  tenía UI hasta ahora).
- **`/mi-cuenta/layout.tsx`** (nuevo): mismo patrón pero con `<AuthMethods>`
  inline si `session === null` (no redirect a `/login`, esa página está
  hardcodeada al acceso admin). Rutas: `/mi-cuenta` ("Resumen"), `/mi-
  cuenta/tarjetas` (filtrable, sin selector de plan — un usuario tiene
  pocas tarjetas), `/mi-cuenta/estadisticas` (nuevo: vista agregada de
  TODAS las tarjetas del usuario, ver abajo), `/mi-cuenta/suscripcion`
  (nuevo: botón "Administrar pago" por tarjeta vía Stripe Customer
  Portal, ver abajo), `/mi-cuenta/cuenta` (email + logout),
  `/mi-cuenta/ganancias` (nuevo, agregado el mismo 2026-07-26 —
  **pestaña condicional**, solo visible si el email de la sesión matchea
  un afiliado activo, ver sección "Sistema de afiliados con comisión
  recurrente").
- **`src/components/panel/filtro-tarjetas.tsx`** (`<FiltroTarjetas
  tarjetas mostrarFiltroPlan?>`): reutilizado entre `/admin/tarjetas`
  (con selector de plan) y `/mi-cuenta/tarjetas` (sin él). Filtro por tipo
  lee de un array constante (`TARJETA_TIPO_OPTIONS`), no de pestañas —
  agregar un tipo de tarjeta nuevo a futuro es una entrada en ese array,
  cero cambios estructurales.
- **Home page (`src/app/page.tsx`)**: se quitó la sección de precios del
  modelo viejo de pago único anual ("Un solo pago, todo un año..." con
  `configuracion.precio_regular/precio_lanzamiento/promocion_*`) —
  encontrada todavía viva ahí durante este trabajo, contradecía el modelo
  real de 3 planes por suscripción. Reemplazada por un teaser liviano sin
  precios propios (evita desincronizarse de `/planes`, la fuente real) →
  botón a `/planes`. `configuracion.precio_regular/precio_lanzamiento/
  promocion_*` quedaron huérfanas (sin ninguna UI de edición ni lectura),
  no se borraron de la tabla — sin uso real hoy. `PromoCountdown`
  (`src/components/landing/promo-countdown.tsx`) quedó sin caller, no se
  borró (mismo criterio de código muerto ya usado en el proyecto).
- **Stat tiles del Resumen admin corregidos (mismo día)**: "Ventas
  totales"/"Pagos aprobados"/"Pagos pendientes" leían `estado_pago`/
  `precio_pagado` (modelo viejo, huérfano — ver el bug de `estado_pago`
  documentado más abajo en este archivo) y ya no reflejaban nada real
  desde que el flujo de Stripe dejó de escribirlos. Reemplazados por:
  "Tarjetas con plan activo" (`tarjetas.plan_id is not null`), "Tasa de
  conversión" (% con plan / total), "Suscripciones pendientes"
  (`suscripciones.estado = 'pendiente'`, checkouts iniciados y nunca
  confirmados — señal nueva, no existía como tile en ningún lado). "MRR
  total" y "Churn (30 días)" se mantuvieron sin cambios.
- **Estadísticas agregadas (`/mi-cuenta/estadisticas`)**: extiende
  `src/lib/metricas.ts` con variantes multi-tarjeta
  (`getTotalesPorPeriodoUsuario`/`getSerieDiariaUsuario`/
  `getEventosDetalleUsuario`, todas `tarjeta_id in (...)`). Los totales y
  la tendencia se suman sin importar el plan de cada tarjeta; el desglose
  (top enlaces/servicios/productos, únicos/recurrentes) solo se calcula
  con las tarjetas que individualmente califican para
  `metricas_desglose`, con aviso explícito en la UI si el usuario tiene
  tarjetas mixtas ("Desglose disponible para N de tus M tarjetas").
- **Stripe Customer Portal (`/mi-cuenta/suscripcion`)**: el plan vive en
  la tarjeta, no en el usuario, y cada suscripción tiene su propio
  `stripe_customer_id` (Customer nuevo por Checkout, no compartido entre
  tarjetas del mismo usuario) — no existe "un portal único de la
  cuenta". Botón "Administrar pago" **por tarjeta**, deshabilitado hasta
  que esa suscripción puntual ya tenga `stripe_customer_id` (pasó por
  `checkout.session.completed`). `crearPortalSession()`
  (`lib/stripe-suscripciones.ts`) + `POST /api/stripe/portal` (Bearer
  token, verifica ownership, usa la suscripción MÁS RECIENTE con
  `stripe_customer_id` de esa tarjeta —
  `getSuscripcionesDeUsuario()` en `lib/tarjetas.ts`). **Pendiente de que
  el usuario lo haga manualmente**: configurar el "Customer portal"
  default en el Dashboard de Stripe (Settings → Billing → Customer
  portal) — sin eso, `billingPortal.sessions.create()` falla con "No
  configuration provided". Verificado en vivo contra la API real de
  Stripe con un `stripe_customer_id` inventado: `502` limpio con mensaje
  claro en la UI (`No such customer`), sin crash — confirma que el
  circuito completo (botón → fetch → ownership check → llamada a
  Stripe → error) funciona; la config del portal en sí queda pendiente
  del usuario.

### Sistema de cupones avanzado (afiliados, vencimiento, límite de usos)
- Migración `20260726000000_add_cupones_avanzado.sql`: **APLICADA y
  verificada** (columnas nuevas confirmadas con `information_schema`
  real, `cupon_usos` confirmada queryable, `fn_cupon_es_valido()`
  confirmada `true`/`false` contra cupones reales). `cupones` gana
  `afiliado_nombre`, `fecha_vencimiento`, `limite_usos` (las tres
  nullable = sin restricción). Tabla nueva `cupon_usos`: auditoría de
  cada uso exitoso, con snapshot congelado de `codigo`/`afiliado_nombre`
  al momento del uso (sobrevive el borrado del cupón padre).
- **Bug real encontrado y corregido durante el diseño de la migración**:
  el primer intento de aplicar la migración falló porque asumía
  `cupones.id uuid` — confirmado con una query real (introspección
  OpenAPI de PostgREST + `select id from cupones`) que `cupones.id` es en
  realidad **`bigint`** (a diferencia de `tarjetas.id`/`suscripciones.id`,
  que sí son `uuid` vía `gen_random_uuid()`) — no todas las tablas del
  proyecto usan el mismo tipo de PK. `cupon_usos.cupon_id` corregido a
  `bigint`.
- **Las tres FK de `cupon_usos` (`cupon_id`, `tarjeta_id`,
  `suscripcion_id`) son nullable con `on delete set null`, ninguna en
  cascada** — decisión explícita del cliente: si se borra el cupón, la
  tarjeta, o se cancela y borra la suscripción (en cualquier orden, meses
  después), la fila de auditoría sobrevive con la FK correspondiente en
  `null`, nunca se pierde el registro de que ese código generó esa venta.
  El snapshot (`codigo`, `afiliado_nombre`, `monto_descontado`,
  `precio_final`) es lo que mantiene la fila útil incluso con las tres FK
  en null a la vez.
- **`fn_cupon_es_valido(p_codigo)`** (Postgres, `security definer`, grant
  a `anon`/`authenticated`): única fuente de verdad de "¿este código
  sirve hoy?" (activo + no vencido + no alcanzó su límite de usos real,
  contado contra filas reales de `cupon_usos`, no un contador cacheado).
  Llamada tanto desde el preview del cliente (`validarCupon()` en
  `lib/cupones.ts`, usado por `TarjetaForm`) como desde la validación
  autoritativa del servidor (`/api/stripe/checkout/route.ts`, con el
  cliente admin) — una sola implementación en vez de duplicar la lógica
  de vencimiento/límite en TypeScript en dos lugares que podrían divergir.
- **Punto exacto de inserción del uso — REEMPLAZADO el 2026-07-26, ver
  sección "Sistema de afiliados con comisión recurrente" más abajo**: esto
  describía el diseño ORIGINAL (una fila de `cupon_usos` por suscripción,
  insertada una sola vez dentro de `procesarSuscripcionStripe()` al pasar
  a `'autorizada'`). Con el sistema de afiliados, la comisión se calcula
  sobre CADA cobro/renovación, no solo la venta inicial — ese diseño de
  una-fila-por-suscripción ya no aplica. Se deja este párrafo como
  registro histórico de la decisión original, pero el comportamiento real
  hoy es el de `registrarCobroDeCupon()` (dispara con `invoice.paid`, una
  fila por invoice).
- **`src/lib/cupones.ts`** (nuevo, separado de `configuracion.ts` —
  crecía demasiado): `getCupones`, `crearCupon` (objeto con los campos
  nuevos), `actualizarCupon`, `eliminarCupon` (nuevo — el `on delete set
  null` hace que sea seguro sin pasos extra), `validarCupon` (ahora llama
  a `fn_cupon_es_valido` antes del select), `getCuponesConRendimiento`
  (nuevo — agrupado por **`codigo`**, no por `cupon_id`, para que un
  cupón borrado siga apareciendo con su historial intacto: usos totales,
  ingresos generados —`sum(precio_final)`, nunca depende de las FK—, y
  tarjetas activas atribuibles —cruza `suscripcion_id` contra
  `suscripciones.estado = 'autorizada'`, **null-safe**: un uso con
  `suscripcion_id` en null simplemente no suma a "activas" pero sí sigue
  sumando a usos/ingresos—). `configuracion.ts` quedó solo con
  `getConfiguracionActiva`/`actualizarConfiguracion`.
- **UI admin (`/admin/cupones`)**: crear (código, %, afiliado opcional,
  vencimiento opcional, límite opcional) + listado expandible (click en
  una fila abre edición inline: todos los campos + toggle activo +
  Guardar + Eliminar) + sección aparte "Cupones eliminados con historial"
  (códigos que ya no existen en `cupones` pero sí tienen filas en
  `cupon_usos`, de solo lectura). Estado derivado en el cliente
  (vigente/inactivo/vencido/agotado) comparando `fecha_vencimiento`/
  `limite_usos` contra los datos ya traídos — no una columna en DB.
  Eliminar muestra un mensaje de confirmación distinto si el cupón tiene
  usos registrados ("se va a borrar el cupón, pero el historial... se
  conserva") vs. si no tiene ninguno.
- **Bug real encontrado y corregido durante la verificación en vivo**: el
  campo de vencimiento en el formulario de edición mostraba el día
  siguiente al que realmente se había elegido (ej. elegir 15 de enero
  volvía a mostrar 16 de enero al reabrir la edición). Causa: la fecha se
  guarda como `new Date("YYYY-MM-DDT23:59:59").toISOString()` (interpreta
  el string en hora LOCAL del navegador, lo convierte a UTC para guardar)
  pero se releía con `iso.slice(0, 10)` (toma el día en UTC directo, sin
  convertir de vuelta a local) — en un huso horario detrás de UTC (como
  México), 23:59:59 local cae después de medianoche UTC, así que el
  slice mostraba el día siguiente. Corregido: `paraInputDate()` ahora usa
  `new Date(iso).getFullYear()/getMonth()/getDate()` (getters locales,
  revierten exactamente la misma conversión) en vez de recortar el string
  UTC crudo.
- **Verificado de punta a punta con datos y sesiones reales** (no
  simulado): (1) a nivel DB con un script real usando el service role —
  crear cupón con `limite_usos: 1`, confirmar `fn_cupon_es_valido` en
  `true`, registrar 1 uso real en `cupon_usos`, confirmar que pasa a
  `false` (agotado) tanto con el cliente admin como con el cliente
  **anon** (mismo camino que usa `validarCupon()` del lado del cliente);
  cupón con `fecha_vencimiento` de ayer → `false` (vencido); borrar el
  cupón agotado → la fila de `cupon_usos` sigue existiendo con `cupon_id
  = null` y el snapshot de `codigo` intacto; limpieza completa después,
  cero rastro. (2) en el navegador real, con una sesión real de la cuenta
  admin (`emuna.interno@gmail.com`, inyectada vía magic link + verifyOtp
  de la Admin API — no destructivo, no cambia contraseña ni vínculo de
  Google): crear un cupón real vía el formulario de la UI (con afiliado +
  vencimiento + límite), confirmar que aparece con los datos correctos;
  expandir y editar (cambiar % de 25 a 40), confirmar que persiste;
  sembrar 2 usos reales para un segundo cupón de prueba vía service role
  (simulando pagos confirmados) y confirmar que el rendimiento se ve
  agregado correctamente en la UI (2 usos, $250 generados, 0 activas —
  correcto, sin `suscripcion_id`); eliminarlo desde la UI (con
  `window.confirm` stubbeado para no bloquear la sesión de automatización,
  nunca clickeado un diálogo nativo real) y confirmar el mensaje de
  confirmación exacto ("Este cupón tiene 2 usos registrados...") y que
  el cupón eliminado reaparece correctamente en la sección "Cupones
  eliminados con historial" con su rendimiento intacto. Limpieza completa
  después (cupones y filas de `cupon_usos` de prueba borrados,
  confirmado sin rastro). `npm run build` + `tsc --noEmit` + `eslint`
  limpios en cada paso.
- ✅ **La limitación que quedaba acá ("no se probó con un Checkout real de
  Stripe de punta a punta") se resolvió el mismo día (2026-07-26)**: se
  verificó con un cobro real de Stripe en modo test (cupón `E2EAFILMS1ARO00`,
  30% off) — ver el resumen al final de la sección "Sistema de afiliados
  con comisión recurrente" más abajo, que además extiende esa verificación
  a 2 ciclos de facturación reales (no solo la venta inicial).

## Sistema de afiliados con comisión recurrente (2026-07-26)

### Decisión de negocio, confirmada explícitamente con el cliente
- Un afiliado inicia sesión con el MISMO login de Google que ya usan los
  dueños de tarjeta — si su email matchea un registro en `afiliados`, ve
  una pestaña nueva "Ganancias" en Mi Cuenta (además de sus tabs normales
  si también es dueño de tarjeta — un usuario puede ser ambas cosas).
- **La comisión es RECURRENTE: se calcula sobre CADA cobro (venta inicial
  + cada renovación), no solo sobre la venta inicial** — esto es lo que
  obligó a cambiar el punto de captura de `cupon_usos` (ver abajo), un
  fork real de arquitectura respecto al diseño original de la Parte B de
  cupones (que solo capturaba la venta inicial, una fila por suscripción).
- Un afiliado puede tener MÚLTIPLES cupones a la vez o a lo largo del
  tiempo — el registro del afiliado es independiente de sus códigos, se
  vinculan vía `cupones.afiliado_id` (FK nueva).
- Cada afiliado tiene su PROPIO % de comisión — vive en `afiliados.
  porcentaje_comision`, no en el cupón.
- La comisión se calcula sobre el monto NETO (ya con el fee real de
  Stripe restado), nunca sobre el bruto ni con un % estimado.
- Alta de afiliados 100% manual por el admin — sin autoregistro.

### Migraciones (dos, ambas aplicadas y verificadas)
- `20260727000000_add_sistema_afiliados.sql`: tabla `afiliados` (`id uuid`,
  `nombre`, `email` con índice único case-insensitive `lower(email)`,
  `porcentaje_comision numeric(5,2)`, `activo`, `created_at`) — **sin FK a
  `auth.users`, a propósito**: el admin puede dar de alta un afiliado por
  su email antes de que esa persona haya iniciado sesión alguna vez, así
  que el matching es en tiempo de consulta vía `auth.jwt()->>'email'`
  (mismo patrón que `ADMIN_EMAIL` en RLS, usado en todo el proyecto).
  Tabla `afiliado_pagos` (registro manual de pagos ya hechos: `monto`,
  `fecha`, `nota`, `registrado_por` con `default (auth.jwt()->>'email')` —
  no se puede spoofear desde el cliente) con el mismo patrón de auditoría
  ya validado en `cupon_usos`: `afiliado_id` nullable + `on delete set
  null` + snapshot de `afiliado_nombre`, para que el historial de pagos
  sobreviva si el afiliado se borra. `cupones.afiliado_id` (FK nueva,
  nullable) — `afiliado_nombre` (texto libre) se mantiene como snapshot
  legacy/de respaldo. `cupon_usos` gana `afiliado_id`, `stripe_invoice_id`,
  `comision_stripe`, `monto_neto`.
- `20260727010000_fix_cupon_usos_stripe_invoice_id_unique.sql`: **bug real
  encontrado en la verificación en vivo, no un ajuste preventivo**. El
  diseño original de `stripe_invoice_id` era un índice ÚNICO PARCIAL
  (`where stripe_invoice_id is not null`, para permitir múltiples filas
  legacy con esa columna en null). Error real confirmado en los logs del
  dev server al ejecutar el primer `upsert(..., {onConflict:
  "stripe_invoice_id"})`: `there is no unique or exclusion constraint
  matching the ON CONFLICT specification` (código Postgres `42P10`) —
  Postgres exige que el `ON CONFLICT` incluya el mismo predicado `WHERE`
  del índice parcial, algo que `supabase-js` no permite expresar. La
  solución real es más simple que el diseño original: un `unique
  constraint` normal en Postgres YA trata cada `NULL` como distinto de
  cualquier otro `NULL` (nunca chocan entre sí) — no hacía falta el índice
  parcial para permitir múltiples filas legacy en null, un constraint sin
  condición `WHERE` ya lo permite igual, y SÍ funciona como target de
  `ON CONFLICT`. Reemplazado: `drop index ...; alter table cupon_usos add
  constraint cupon_usos_stripe_invoice_id_key unique (stripe_invoice_id)`.

### Punto de captura: `invoice.paid`, no la transición de estado de la suscripción
- **`registrarCobroDeCupon(invoice)`** (`lib/confirmar-suscripcion-stripe.ts`,
  nuevo) reemplaza a la vieja `registrarUsoDeCupon()` — ya NO se llama
  desde `procesarSuscripcionStripe()` (esa función volvió a su alcance
  original: solo sincroniza `suscripciones.estado`/`tarjetas.plan_id`).
  Se dispara con el evento `invoice.paid`, que confirma dispara igual en
  la venta inicial que en cada renovación (mismo evento, un solo handler
  cubre ambos casos) — inserta una fila de `cupon_usos` por CADA invoice
  de Stripe (`stripe_invoice_id` es la clave de idempotencia real vía
  `upsert(..., {onConflict: "stripe_invoice_id", ignoreDuplicates:
  true})`, protege contra reintentos de webhook). Esto significa que
  `cupon_usos` ya NO es "una fila por suscripción" (diseño original de la
  Parte B de cupones) sino "una fila por cobro" — una suscripción con 5
  renovaciones deja 5 filas, todas con el mismo `suscripcion_id` pero
  `stripe_invoice_id` distinto.
- **Efecto colateral en código ya shippeado, corregido en el mismo
  cambio**: `getCuponesConRendimiento()` (`lib/cupones.ts`) calculaba
  "tarjetas activas atribuibles" contando FILAS de `cupon_usos` — con
  múltiples filas por suscripción eso sobre-contaba. Corregido: ahora
  dedupea por `Set` de `suscripcion_id` antes de contar. `usosTotal`/
  `ingresosGenerados` siguen sumando todas las filas sin cambios (es
  correcto que sumen cada ciclo, no solo el primero).
- **Race condition real encontrada en la verificación en vivo**: los
  webhooks de Stripe no garantizan orden — `invoice.paid` llegó antes que
  `checkout.session.completed` (`vincularCheckoutSession`) terminara de
  escribir `stripe_subscription_id` en la primera compra, así que la
  búsqueda de la suscripción por ese campo no encontraba nada y la fila no
  se insertaba (fallaba en silencio, sin error). Corregido con el mismo
  fallback que ya usa `procesarSuscripcionStripe()`: si no se encuentra
  por `stripe_subscription_id`, cae a buscar por el `suscripcion_id` que
  viaja en `invoice.parent.subscription_details.metadata` (snapshot de
  los metadata de la suscripción al momento de finalizar el invoice,
  poblado desde el 29 de junio de 2023 — no hace falta una llamada extra
  a la API de Stripe, ya viaja en el propio invoice).

### Fee real de Stripe — investigación de la API, dos hallazgos reales
- **`intentarObtenerFeeReal()`**: el fee exacto vive en
  `BalanceTransaction.fee` (centavos), accesible vía
  `Charge.balance_transaction`. Camino real usado:
  `invoice.payments.data[0].payment.payment_intent` →
  `stripe.paymentIntents.retrieve(id, {expand:
  ["latest_charge.balance_transaction"]})`. Reintenta hasta 3 veces con
  1.5s de espera entre cada uno (Stripe: el `balance_transaction` puede
  no estar listo todavía en el instante exacto de la confirmación,
  captura asíncrona) — si nunca llega, `comision_stripe`/`monto_neto`
  quedan en `null` y `getRendimientoAfiliado()` cae a un fallback
  (`monto_neto ?? precio_final`, ligera sobreestimación temporal en vez
  de excluir la venta).
- **Hallazgo real #1**: `invoice.payments` **NO viene poblado ni siquiera
  en el objeto completo que trae el payload del webhook** — hace falta
  `expand: ["payments"]` explícito en un `stripe.invoices.retrieve()`
  aparte. Sin este fix, `obtenerPaymentIntentId()` siempre devolvía
  `null` y el fee nunca se capturaba (confirmado con una respuesta rápida
  ~5ms de más, sin ningún reintento — el código ni llegaba a intentar la
  llamada a Stripe). `obtenerPaymentIntentId()` ahora re-consulta el
  invoice por su cuenta con ese expand en vez de confiar en el objeto que
  ya tiene `registrarCobroDeCupon()`.
- **Hallazgo real #2, descartó un diseño completo de respaldo antes de
  escribir código**: el plan original (ver la propuesta previa a la
  implementación) incluía un handler de `charge.updated` como respaldo
  para el caso en que el fee no estuviera listo en el primer intento,
  correlacionando `charge.invoice` → `stripe_invoice_id`. Al revisar los
  tipos reales de `stripe` v22.3.2 instalados en el proyecto (no
  documentación, los `.d.ts` reales) se confirmó que **ni `Charge` ni
  `PaymentIntent` tienen ningún campo `invoice`** en esta versión de API
  — no hay forma de ir de un cobro hacia atrás hasta su invoice. Se
  descartó el handler de `charge.updated` por completo (no está en el
  código, no hace falta suscribirlo en el dashboard de Stripe) y se
  reemplazó por los reintentos con backoff dentro del mismo handler de
  `invoice.paid`, que sí tiene el invoice en mano desde el principio.

### `src/lib/afiliados.ts` (nuevo)
`getAfiliados`/`crearAfiliado`/`actualizarAfiliado` (admin, CRUD),
`getAfiliadoPropio` (RLS-scoped a la propia fila vía `afiliados_
select_propio`, usado tanto para el gate de la pestaña "Ganancias" como
por la propia página), `getRendimientoAfiliado(afiliadoId,
porcentajeComision)` (compartido entre la vista de detalle del admin y
"Ganancias" del afiliado — mismo cálculo, RLS ya escopea qué filas puede
leer cada uno: `ventasBrutas`/`ventasNetas` sumadas de `cupon_usos`,
`comisionGenerada = ventasNetas * pct/100`, `saldoPendiente =
comisionGenerada - sum(afiliado_pagos.monto)`), `getPagosAfiliado`,
`registrarPagoAfiliado` (admin), `getAfiliadosConResumen` (listado admin
con rendimiento agregado). Todo con el cliente `supabase` normal (no
service role) — mismo criterio que `cupones.ts`: las policies RLS ya dan
el acceso correcto a cada rol.

### UI
- **`/admin/afiliados`**: listado (nombre, email, %, cobros, netas,
  pendiente) con alta manual + detalle expandible por fila (editar
  nombre/%/activo, ventas brutas/netas/comisión/saldo, códigos vigentes +
  históricos, historial de pagos, form "Registrar pago" inline).
- **`/mi-cuenta/ganancias`**: solo lectura (ventas netas atribuidas,
  comisión, ya cobrado, saldo pendiente, historial de pagos) — la propia
  página revalida con `getAfiliadoPropio()` (fail-closed, mismo criterio
  que el gating de Agenda por `plan_id`), no confía solo en que la pestaña
  esté oculta para alguien que navegue directo a la URL.
- `mi-cuenta/layout.tsx`: `MI_CUENTA_TABS` (base, sin "Ganancias") +
  `GANANCIAS_TAB` (constante aparte en `panel-tabs.ts`) insertada
  condicionalmente vía `getAfiliadoPropio()` en un `useEffect` — la
  pestaña aparece/desaparece según el email de la sesión, sin recargar la
  página completa.
- `admin/cupones/page.tsx`: el campo de texto libre "Afiliado" se
  reemplazó por un `<select>` de afiliados activos (`getAfiliados()`), que
  setea `afiliado_id` (fuente de verdad nueva) y auto-completa
  `afiliado_nombre` (snapshot legacy) con el nombre del afiliado elegido.

### Verificación end-to-end, con Stripe test clocks (no `stripe trigger`)
- **`stripe trigger` no sirve para esto**: genera eventos de fixture
  sintéticos que no correlacionan con una suscripción real nuestra (sin
  `metadata.suscripcion_id`, sin nuestro `stripe_subscription_id`) — no
  dispara nuestro código de negocio de forma realista.
- **Test clocks sí**: se creó un `Customer` anclado a un
  `test_clock` (`stripe.testHelpers.testClocks.create()`), se le asoció a
  una Checkout Session real (replicando exactamente los params de
  `crearCheckoutSession()` + `customer: customerId`, sin tocar el código
  real de la app — el resto del flujo, webhooks incluidos, corrió 100%
  real) completada en el navegador real con `4242 4242 4242 4242`. Ciclo
  1 (venta inicial) confirmado con `cupon_usos` real: `comision_stripe:
  7.71`, `monto_neto: 81.39` (89.10 - 7.71, exacto). Se avanzó el clock
  32 días (`testClocks.advance()`, polling hasta `status: "ready"`) —
  Stripe generó y cobró una renovación real SIN intervención del
  navegador (usa el método de pago ya guardado), confirmado con
  `invoice.paid` real llegando al webhook.
- **Resultado: 2 filas distintas en `cupon_usos` para la misma
  `suscripcion_id`**, `stripe_invoice_id` distinto en cada una, mismo
  monto/fee (mismo precio cada ciclo). `getRendimientoAfiliado()`
  verificado exacto en las dos UIs reales (sesiones inyectadas, admin y
  afiliado): brutas $178.20, netas $162.78, comisión (20%) $32.56.
  Se registró un pago real de $20 desde la UI del admin → saldo pendiente
  recalculó a $12.56 en AMBAS vistas (admin y "Ganancias" del afiliado).
- Cancelación real (`testClocks.del()`, cascada: customer + subscription +
  invoices) confirmó que `customer.subscription.deleted` sincronizó
  `suscripciones.estado: 'cancelada'` / `tarjetas.plan_id: null` — mismo
  comportamiento fail-closed ya validado en sesiones anteriores. Limpieza
  completa después: todas las filas de prueba (`afiliados`,
  `afiliado_pagos`, `cupon_usos`, `cupones`, `tarjetas`, `suscripciones`,
  2 usuarios de auth) borradas y confirmadas en cero; keys de Stripe
  restauradas a live (diff byte-a-byte contra backup, confirmado
  idéntico); `npm run build` + `tsc --noEmit` + `eslint` limpios.

### Pendiente
- 🔴 **Backfill de `afiliado_id` en cupones/cupon_usos legacy**: los
  cupones que ya tenían `afiliado_nombre` (texto libre) de antes de este
  sistema NO tienen `afiliado_id` poblado — no hay ningún afiliado real
  dado de alta todavía en producción contra el cual matchear. Cuando el
  admin dé de alta afiliados reales, hace falta un backfill de una sola
  vez (`UPDATE cupones/cupon_usos SET afiliado_id = ... WHERE
  lower(trim(afiliado_nombre)) = lower(trim(afiliados.nombre))`) para que
  su historial pre-existente quede vinculado — no automático, requiere
  que primero existan las filas reales de `afiliados` para matchear.
- Ver el punto ya marcado 🔴 más arriba (sección de Stripe): agregar
  `invoice.paid` al webhook LIVE del dashboard de Stripe — sin esto el
  sistema de afiliados no registra nada en producción real todavía.

## Rediseño del home + sistema de testimonios real (2026-07-26/27)
- **Dirección visual**: vibrante/creativa (referencias Notion/Framer, no
  SaaS corporativo genérico), pensada para negocios pequeños y creadores
  de contenido por igual. Guiada por el contenido de la skill
  `frontend-design` (no instalada como plugin en este entorno — se trajo
  su `SKILL.md` directo con `curl` desde el repo de Claude Code y se usó
  igual como guía).
- **Paleta y tipografía derivadas del producto mismo, no inventadas**: la
  paleta de la landing son los banner presets reales que ya existían en
  `lib/banner-presets.ts` (Aurora/Atardecer/Cítrico) — nada de un
  gradiente índigo-fucsia nuevo. La tipografía de titulares es **Baloo 2**
  (`--font-creativa`, ya cargada en `layout.tsx` para el estilo
  "creativa" de `TarjetaCard`, sin usarse en ningún otro lado hasta
  ahora) — cuerpo en Geist Sans (ya default del sitio), números/eyebrow
  en Geist Mono. Mismo criterio que ya se documentó para el logo/OG image:
  reusar lo que el producto ya trae en vez de inventar un sistema nuevo.
- **Firma visual del hero**: abanico de 3 `<TarjetaCard>` reales (no un
  mockup de teléfono único con globos flotantes, que era el patrón
  anterior) — una creadora de contenido (preset Aurora, ya existía como
  demo) + una peluquería (preset Atardecer, tipografía "elegante") + un
  puesto de antojitos (preset Cítrico, tipografía "creativa"), mostrando
  personalización real y las dos audiencias sin necesitar texto. Las 3
  comparten un mismo punto de anclaje (`left-1/2` + `bottom` +
  `origin-bottom`) y solo se diferencian por `rotate`, igual que una mano
  de cartas — **primer intento real que no funcionó**: centrar cada
  carta con `-translate-x-1/2 -translate-y-X%` y rotarla dejaba las dos
  de atrás casi 100% ocultas detrás de la de enfrente (sin spread real);
  se corrigió anclando las 3 al mismo pivote inferior, donde la rotación
  sola ya las abre en abanico.
- **Bug real de Tailwind v4 encontrado en el camino**: no se puede aplicar
  una utilidad estática (`scale-*`, `translate-*`) Y una animación de
  keyframes que anime esa MISMA propiedad (`scale`/`translate` como
  propiedades independientes, no `transform`) sobre el mismo elemento —
  la que corre al final (la keyframe, al reproducirse) pisa el valor
  estático. Se resolvió separando cada responsabilidad (escala responsiva
  estática / entrada `fan-in` una sola vez al cargar / bobbing continuo
  del `float` en la carta de enfrente) en 3 niveles de wrapper anidados,
  cada uno tocando una única propiedad. `--animate-fan-in` nuevo en
  `globals.css`, junto a `float`/`glow` ya existentes — usa `translate`/
  `scale` como propiedades independientes (no `transform`), mismo
  criterio que ya usaba `float`.
- **Secciones**: hero (con la explicación explícita de "¿Qué es Linkard?"
  fundida en el subtítulo del hero en vez de vivir como bloque aislado —
  sigue siendo texto real, sigue cumpliendo el requisito de la
  verificación de marca de Google) → "Para quién es" (2 columnas, negocio/
  contenido, con la agitación de dolor fusionada como una línea breve en
  vez de una sección oscura propia) → "Lista en 3 pasos" (se mantiene) →
  "Tu panel, sin adivinar" (mockup ilustrativo de métricas, marcado
  explícitamente "Ejemplo ilustrativo" — vocabulario idéntico al de
  `/mi-cuenta/estadisticas`: Vistas/Clicks en enlaces/Agendamientos, **no**
  "ventas": `compra_completada` sigue sin instrumentarse a propósito) →
  testimonios (condicional) → planes (teaser, sin precios propios,
  igual que antes) → CTA final.
- **Sistema de testimonios, de verdad esta vez**: `CLAUDE.md` decía que la
  tabla `testimonios` "ya existía, seed con 2 placeholders" — se confirmó
  contra producción que nunca se creó (`PGRST205`). Migración
  `20260727020000_add_testimonios.sql` (aplicada y verificada por el
  usuario) la crea de cero: `nombre`, `rol_o_negocio`, `cita`,
  `avatar_url` (nullable), `calificacion` (smallint 1-5, nullable),
  `activo`, `orden`, `created_at`. RLS: select público sin filtrar
  `activo` (mismo criterio que `planes_select_publica` — el filtro real
  vive en la query de `getTestimoniosActivos()`), CRUD solo admin.
- **`src/lib/testimonios.ts`**: `getTestimonios`/`getTestimoniosActivos`/
  `crearTestimonio`/`actualizarTestimonio`/`eliminarTestimonio`/
  `guardarOrden` (reordena intercambiando `orden` con el vecino, sin
  librería de drag-and-drop) + `inicialesDeNombre` (compartida entre admin
  y home). `validarImagen` (antes vivía solo dentro de `tarjeta-form.tsx`)
  se extrajo a `lib/subir-imagen.ts` para que el admin de testimonios
  pudiera reusarla sin duplicar la validación de tipo/peso de imagen.
- **`/admin/testimonios`** (nuevo, agregado a `ADMIN_TABS`): mismo patrón
  visual/UX que `/admin/cupones` (fila expandible, form de creación
  arriba) + upload de avatar vía Cloudinary (carpeta nueva
  `mitarjeta/testimonios`, agregada a la whitelist `CARPETAS_PERMITIDAS`
  de `cloudinary-sign/route.ts` — sin esto la subida se rechaza con 400
  aunque el resto funcione) + reordenar con flechas ↑/↓ + toggle activo/
  inactivo + eliminar con confirmación. **Bug real encontrado y corregido
  en la verificación en vivo**: el `<input type="file">` no se limpiaba
  visualmente después de crear/guardar (el estado sí se reseteaba, pero
  el input nativo retenía el nombre del archivo ya subido) — corregido
  con un `inputKey` que fuerza remount del input (mismo patrón
  `avatarInputKey` que ya usaba `TarjetaForm`).
- **`src/components/landing/testimonios-destacados.tsx`**: grid de 1-3+
  columnas (se acomoda solo según cantidad), ícono `Quote` + acento de
  color rotando entre los 3 tonos de los banner presets del hero (mismo
  sistema, no un color nuevo), estrellas solo si `calificacion` no es
  null, avatar o iniciales. `page.tsx` no monta la sección en absoluto si
  `getTestimoniosActivos()` devuelve un array vacío — nada de placeholder.
- **Verificado de punta a punta con datos reales, sesión real de admin**
  (magic link real vía `auth.admin.generateLink` + navegación directa al
  `action_link`, mismo patrón no-destructivo ya usado en sesiones
  anteriores — no cambia contraseña ni vínculo de Google): 3 testimonios
  creados desde la UI real de `/admin/testimonios` (con foto + 5
  estrellas, sin foto + sin calificación, con foto + 4 estrellas) →
  aparecieron en el home en el orden correcto, con fallback de iniciales
  y estrellas condicionales exactos. Reordenar (flecha arriba) confirmado
  con el efecto correcto tanto en el admin como en el home. Toggle a
  "Inactivo" confirmado: desaparece del home, se mantiene visible en el
  admin. Eliminar confirmado (con `window.confirm` stubbeado en la
  sesión de automatización, nunca clickeado un diálogo nativo real).
  Limpieza completa después: los 3 testimonios de prueba borrados,
  confirmado con una lectura real (service role) que la tabla quedó en
  `[]`, y el home confirmado sin la sección de nuevo. Cero errores de
  consola en todo el flujo. `npm run build` + `tsc --noEmit` + `eslint`
  limpios.
- **Limitación honesta de esta verificación**: no se pudo confirmar el
  hero en un viewport mobile real — `resize_window` no cambia
  `window.innerWidth` en este entorno (mismo límite ya documentado para
  el header global) — el tamaño responsivo del abanico
  (`scale-[0.72] sm:scale-[0.85] lg:scale-100`) se verificó leyendo el
  CSS, no visualmente.
- **Migración aplicada por el usuario, no por esta sesión** (mismo
  protocolo que toda migración desde `20260725000000`: sin `DATABASE_URL`
  ni `supabase` CLI vinculado en este entorno, no hay forma de correr
  `pg_dump` ni DDL directo — el usuario la corrió con su propio backup
  primero).

## Sistema de personalización avanzada del editor (2026-07-27)
- **Alcance**: 6 formas de avatar (círculo/redondeado/hexágono ya
  existían o son básicas nuevas; blob/corazón/estrella son nuevas y
  avanzadas), 4 divisores banner→tarjeta (recta/onda/diagonal/zigzag),
  modo simple/avanzado de color (3 colores base + 3 overrides de texto),
  modo simple/avanzado de tipografía (título/cuerpo separados),
  glassmorfismo, gating por plan con patrón candado+upsell, y 6
  plantillas de partida. Gating: `personalizacion_libre` (ya existía)
  sigue cubriendo básicas (Alcance+); `personalizacion_avanzada` (nueva
  clave en `planes.features`, migración de datos
  `20260727030000_add_personalizacion_avanzada_feature.sql`, **aplicada**)
  cubre exóticas/divisores no-rectos/glass/modos avanzados (Poder
  exclusivo).
- **`IdentidadVisual` extendida 100% con campos opcionales** (jsonb, sin
  migración de schema): `colorBotones`/`colorBadges` (default =
  `colorPrimario`/`colorSecundario` si no están seteados — reproduce el
  look de cualquier tarjeta ya guardada sin cambios), `modoColorAvanzado`
  + 3 overrides de texto, `modoTipografiaAvanzado` + `estiloTipografiaCuerpo`,
  `divisorBanner`, `glassmorfismo`, `plantillaBase`. `AvatarForma` gana 4
  valores nuevos; **"cuadrado" (legacy) queda retirado del picker pero
  sigue renderizando igual para tarjetas que ya lo tengan guardado** — se
  eligió no migrar datos ni forzar un valor nuevo, decisión confirmada.
- **`lib/personalizacion.ts`** (nuevo): metadata de formas/divisores/
  tipografías + las 6 plantillas (`Partial<IdentidadVisual>` puro, sin
  campos bespoke — "glow"/"doble anillo" de los briefs se logran
  combinando color + la técnica de anillo, no son mecanismos aparte) +
  `estaBloqueada()`/`calcularBloqueos()`: el candado de una opción **nunca
  se muestra sobre el valor ya guardado** (compara contra
  `identidad_visual` persistida, no contra un set abstracto de
  "permitido") — así bajar de plan no bloquea ni rompe visualmente algo
  que la tarjeta ya tenía; nuevas selecciones que excedan el plan sí
  bloquean el guardado (se puede probar en vivo en el preview siempre,
  solo el guardado queda condicionado). Verificado en vivo: una tarjeta en
  plan Alcance con `divisorBanner: "onda"` ya guardado (simulando venir de
  un plan Poder anterior) mostró "Onda" seleccionada sin candado y
  "Diagonal"/"Zigzag" con candado Poder — exactamente el comportamiento
  esperado.
- **2 bugs reales encontrados y corregidos ANTES de integrar nada**,
  ambos vía un harness HTML propio renderizado y revisado con capturas
  reales antes de fijar los valores (no solo calculados a mano): el
  primer intento de "blob orgánico" renderizaba como un círculo liso,
  indistinguible de la forma "circulo" — se iteraron 4 candidatos y se
  eligió el que se ve claramente orgánico. Y el path del divisor "onda"
  tenía el borde inferior fijo en `y=100` — como el panel de contenido
  real mide varios cientos de px según el contenido (agenda, servicios,
  productos), eso hubiera recortado (invisible) todo lo que quedara
  debajo de esos primeros 100px; corregido a `y=4000` (excede cualquier
  alto real posible).
- **Técnica de "anillo" con clip-path**: un `ring-*`/box-shadow normal
  sigue el rectángulo del elemento, no la silueta — para hexágono/blob/
  corazón/estrella eso se ve como un halo rectangular roto (verificado
  renderizado antes de implementar). Solución: una segunda capa con el
  MISMO clip-path, un poco más grande, detrás de la foto — funciona para
  cualquier forma, sin casos especiales. `src/components/tarjeta/
  avatar-forma.tsx` (nuevo) encapsula las 3 estrategias de render
  (className legacy / clip-path directo porcentual / clip-path con
  wrapper+scale para path() con curvas) y esta técnica de anillo.
- **`path()` vs porcentajes**: `polygon()` escala solo con el tamaño real
  del elemento (hexágono, estrella, diagonal, zigzag); `path()` con
  curvas (blob, corazón, onda) usa píxeles literales de la caja de
  referencia — para blob/corazón (que se renderizan tanto en un swatch de
  32px como en un avatar real de 96px) hace falta un wrapper de 100×100 +
  `transform: scale()`; para el divisor "onda" (que solo varía en un
  rango angosto de 320-384px de ancho real) se verificó que un solo path
  autorado para 340px tolera bien todo el rango sin reescalar.
- **Reorganización de `TarjetaForm`**: las 2 secciones viejas ("Diseño de
  tarjeta" y "Identidad visual", contenido repartido sin un criterio
  claro entre ambas) se reemplazan por 3: "Plantillas" (nueva, primera de
  todas — disponible tanto al crear como al editar, no es un paso
  separado antes del formulario), "Colores y tipografía" (tema +
  colores + tipografía, con los toggles de modo avanzado), "Avatar y
  banner" (foto + forma + banner + divisor + efecto vidrio).
- **Gating de guardado**: requiere el plan REAL de la tarjeta, no el
  `plan` que ya recibía `TarjetaForm` (que en modo edición es sobre una
  suscripción pendiente/abandonada, un concepto distinto). Se agregó
  `planActivo` como prop nueva, resuelta en `/editar/[id]/page.tsx` vía
  `getPlanPorId(tarjeta.plan_id)` — no existía ningún punto donde el
  editor conociera las features del plan ACTIVO de la tarjeta hasta
  ahora.
- **Verificado de punta a punta con 4 tarjetas de prueba reales** (planes
  Presencia/Alcance/Poder + una de "regresión" con identidad_visual
  mínima, sesiones inyectadas vía magic link, mismo patrón no-destructivo
  ya usado en sesiones anteriores): candados correctos en los 3 niveles de
  plan — la primera verificación (Alcance/Poder) solo disparó el candado
  violeta (Poder) en vivo, así que se sembró una 4ta tarjeta en Presencia
  aparte para confirmar también el ámbar (Alcance) con evidencia real, no
  solo por código: "Redondeado"/"Hexágono" (básicas) y el label "Colores"
  mostraron el candado ámbar correcto, mientras "Estrella"/"Corazón"/
  "Blob"/"Modo avanzado" siguieron mostrando el violeta — los 2 colores
  distintos confirmados renderizados, no asumidos. Probar una opción
  bloqueada actualiza el preview en vivo
  sin bloquear nada hasta intentar guardar, el botón de guardar se
  deshabilita con la lista exacta de bloqueos y se rehabilita al revertir,
  aplicar "Aurora Creator" de punta a punta en la tarjeta Poder guardó
  exactamente los campos esperados (confirmado con una lectura real de la
  DB) y el efecto vidrio se confirmó a nivel CSS real
  (`getComputedStyle`: `rgba(99,102,241,0.8)` + `blur(12px)`), y la
  tarjeta de "regresión" (solo `colorPrimario`/`colorSecundario`, sin
  ningún campo nuevo) se ve exactamente igual que el estilo clásico
  pre-feature. Limpieza completa después: las 3 tarjetas y sus 3 usuarios
  de prueba borrados, confirmado en cero. `npm run build` + `tsc
  --noEmit` + `eslint` limpios en cada paso.

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

## Fusión visual del home + cupón de lanzamiento real (2026-07-29)
- Objetivo del cliente, explícito: fusionar el rediseño del home ya existente
  con la dirección visual de un mockup externo (violeta, glassmorfismo,
  premium) que compartió, y conectar un cupón de lanzamiento real — "que sea
  una máquina de leads, visualmente premium". Todo el copy en español de
  México. Producto tratado como **plataforma**, no "app".
- **`src/app/page.tsx` reescrito por completo** (antes: rediseño más simple
  del mismo día 2026-07-26). Estructura nueva, de arriba a abajo: header
  flotante (`<HeaderGlobal variant="flotante" nav={NAV_HOME}>`) → hero con
  tilt 3D sobre el abanico REAL de `<TarjetaCard>` (no una tarjeta genérica
  del mockup) → banner de cupón real → "Sin Linkard vs. con Linkard"
  (cualitativo, sin stats inventadas) → "Todo lo que incluye tu tarjeta" (4
  cards: personalización real, agenda con cobro opcional, venta de
  productos, panel de métricas real — reescrito para reflejar lo que
  Linkard ofrece HOY, no una lista de specs) → "Cómo funciona" (3 pasos,
  ya existía) → sección de métricas con conteo animado (números
  ilustrativos, **sin ninguna etiqueta "ejemplo"** — decisión explícita y
  repetida del cliente, no un olvido) → testimonios (reusa
  `testimonios-destacados.tsx` ya construido, datos reales de DB, oculta si
  la tabla está vacía — hoy está vacía, confirmado que la sección
  correctamente no aparece) → precios (`<PreciosDestacados>`, dato real de
  la tabla `planes`, tratamiento visual oscuro/blur) → "Próximamente en
  Linkard" (Wallet, Checkout nativo (Linkard Pago), Asistente de IA — como
  roadmap real confirmado, no relleno) → CTA final → footer.
- **Tipografía**: se agregó **Plus Jakarta Sans** (`next/font/google`,
  pesos 700/800, variable `--font-display`) en `layout.tsx` junto a las ya
  existentes (Geist Sans/Mono, Playfair Display, Baloo 2, Sora) — Baloo 2
  sigue intacta y en uso (opción "creativa" de personalización de
  `TarjetaCard`), no se tocó. Plus Jakarta Sans se usa **solo** vía
  `font-[family-name:var(--font-display)]` en los titulares de marketing
  del home nuevo — Geist Sans/Mono ya cubrían los roles de Inter/JetBrains
  Mono del mockup original, así que no hizo falta agregarlas (research
  hecho antes de implementar, aprobado implícitamente por el cliente al
  pedir continuar con la Parte 3).
- **`src/components/landing/tarjeta-tilt.tsx`** (nuevo): wrapper de tilt 3D
  con mouse move (`perspective(1200px) rotateX() rotateY()`, máx 14°),
  gateado por `prefers-reduced-motion`. Envuelve el abanico real de 3
  `<TarjetaCard>` del hero sin tocar su estructura interna (translate/
  scale/rotate del abanico siguen viviendo en sus propios elementos,
  ninguno pelea con el `transform` literal del wrapper de tilt — mismo
  principio de "no mezclar transform-como-propiedad-independiente con
  transform-literal en el mismo elemento" ya establecido en sesiones
  anteriores). Verificado con inspección JS directa (no solo visual): los
  valores de `rotateX/rotateY` cambian en tiempo real proporcionalmente a
  la posición del cursor.
- **`src/components/landing/contador-animado.tsx`** (nuevo): conteo de 0 al
  valor final una sola vez al entrar en viewport (`IntersectionObserver` +
  `requestAnimationFrame`, easing easeOutCubic), respeta
  `prefers-reduced-motion` (salta directo al valor final).
- **Sistema de cupón de lanzamiento real, no simulado**:
  - Migración `20260729000000_add_fn_cupon_usos_restantes.sql` —
    **aplicada y verificada** (confirmado con una llamada RPC real antes de
    cualquier uso: devolvía `33`, igual a `limite_usos` del cupón real
    `LINKARD15` con `cupon_usos` en cero). `fn_cupon_usos_restantes(p_codigo)`
    (`security definer`, mismo patrón que `fn_cupon_es_valido`) devuelve
    `limite_usos - count(cupon_usos)` para ese código, o `null` si el cupón
    no tiene límite — expone solo el número, sin dar acceso a la tabla.
  - `src/components/landing/cupon-lanzamiento.tsx` (nuevo): banner con el
    contador real vía `getCuponUsosRestantes()` (`lib/cupones.ts`, nuevo,
    llama al RPC de arriba) — "Quedan X cupones con 15% de descuento".
    Botón "Obtener mi descuento" → confirmación visual inmediata ("¡Cupón
    guardado!") → `router.push('/planes?cupon=LINKARD15')`.
  - **El código del cupón viaja por el mismo mecanismo de query params que
    ya usaban `plan`/`ciclo` a través de todo el embudo de login**:
    `/planes?cupon=X` (`src/app/planes/page.tsx`, banner de confirmación) →
    `<ComparativaPlanes cuponCodigo>` (nuevo prop) → `/crear?plan=Y&ciclo=Z&cupon=X`
    → si no hay sesión, `<AuthMethods redirectTo=>` incluye los 3 params
    (Google OAuth y magic link vuelven a esa URL completa) →
    `<TarjetaForm cuponInicial>` (nuevo prop): si llega un cupón por query
    param, se pre-llena el campo Y se valida de verdad contra
    `fn_cupon_es_valido` (podría haber vencido/agotado en el camino) antes
    de mostrarlo como aplicado — nunca se confía ciegamente en el query param.
  - `src/components/landing/precios-destacados.tsx` (nuevo): cards de
    precio oscuras/blur con datos reales de `planes` (mismo cálculo de
    `ahorroPct` que `comparativa-planes.tsx`), badge "Recomendado" en el
    plan de `orden` intermedio.
- **Bug real de copy encontrado y corregido**: `TarjetaForm` todavía decía
  "vas a ir a **Mercado Pago**" en la sección "Tu plan" — texto viejo de
  antes de la migración a Stripe (2026-07-21), nunca corregido hasta ahora.
  Corregido a "vas a ir a **Stripe**".
- **Bug real encontrado y corregido en `HeaderGlobal` variant="flotante"**:
  el botón "Iniciar sesión" (`buttonVariants({variant:"outline"})`) quedaba
  con texto blanco sobre fondo blanco invisible — `bg-background` no se
  sobreescribía (solo se habían redefinido `--foreground`/`--primary`/
  `--muted`/`--border` para el header oscuro, no `--background`) mientras
  el texto heredaba blanco del header. Encontrado con captura de pantalla +
  zoom, no por ningún linter. Corregido con clases explícitas
  (`border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white`)
  solo cuando `variant === "flotante"`.
- **Verificado de punta a punta con un pago real de Stripe en modo test**
  (mismo protocolo ya usado en sesiones anteriores: `stripe config --list`
  para las keys de test, `stripe listen --forward-to
  localhost:3000/api/stripe/webhook` para un webhook secret real, swap
  temporal de las 3 keys de Stripe en `.env.local`, confirmado que Next.js
  recarga `.env.local` sin reiniciar el servidor — la Checkout Session
  resultante usó `cs_test_...`, no `cs_live_...`): flujo completo botón del
  home → `/planes?cupon=LINKARD15` → `/crear?plan=alcance&ciclo=anual&cupon=LINKARD15`
  → login real (magic link, usuario de prueba) → vuelta a la misma URL con
  el cupón intacto → "Tu plan" mostró el cupón ya aplicado (15% off,
  $935.00 MXN/año) → Checkout real de Stripe (tarjeta de prueba
  `4242 4242 4242 4242`) → submit real. Confirmado con 3 fuentes
  independientes:
  1. Log de `stripe listen`: `checkout.session.completed`,
     `customer.subscription.created`, e **`invoice.paid`** — los tres en
     `200`, sin ningún error.
  2. Query real a Supabase después del pago: `suscripciones.estado =
     'autorizada'`, `tarjetas.plan_id` sincronizado, `precio_final: 935`
     (15% off de 1100, correcto) — y una fila real en `cupon_usos` con
     `comision_stripe: 47.95`/`monto_neto: 887.05` (fee real de Stripe
     capturado por el sistema de afiliados construido el 2026-07-26,
     confirma que ambos sistemas — cupón de lanzamiento y afiliados —
     conviven sin conflicto, ya que `LINKARD15` no tiene afiliado
     asignado y aun así generó su fila de auditoría correctamente con
     `afiliado_id: null`).
  3. **El contador bajó de verdad**: `fn_cupon_usos_restantes('LINKARD15')`
     pasó de `33` a `32` tras el pago real, confirmado tanto por RPC directo
     como recargando el home real (`http://localhost:3000/`) y viendo
     "Quedan 32 cupones con 15% de descuento" en pantalla.
  - Limpieza completa después: suscripción y customer de Stripe cancelados/
    borrados (test mode), fila de `cupon_usos`, `suscripciones` y la
    tarjeta de prueba (`prueba-flujo-cupon-e2e`) borradas de Supabase, el
    usuario de prueba (`prueba-flujo-cupon@example.com`) borrado de Auth,
    contador confirmado de vuelta en `33`, `.env.local` restaurado a las
    keys live (diff byte-a-byte contra el backup, confirmado idéntico),
    proceso de `stripe listen` detenido.
- **Mobile**: no se pudo verificar visualmente en un viewport real en esta
  sesión (limitación ya documentada antes: la herramienta de resize de
  ventana no cambia `window.innerWidth` real en este entorno). Verificado
  en su lugar por análisis estático de las clases responsive: el grid del
  hero es `grid-cols-1 lg:grid-cols-2` (stackea texto arriba, abanico
  abajo en mobile), el wrapper del abanico/tilt escala hacia abajo
  (`scale-[0.72]` en mobile → `sm:scale-[0.85]` → `lg:scale-100`) dentro de
  una columna `w-full` que no puede desbordar, el header flotante limita su
  ancho a `max-w-[calc(100%-2rem)]` y oculta los links de nav
  (`hidden sm:flex`, deja solo logo + avatar/login en mobile), y el banner
  de cupón pasa de `flex-col` a `flex-row` recién en `sm:`. Sin bugs
  detectables en el CSS estático, pero vale una revisión visual real en
  dispositivo/emulador cuando se pueda — misma nota de honestidad que ya se
  dejó para el header global del 2026-07-26.

## Hallazgos de una sesión de prueba del editor de personalización — 2 bugs
## reales + reposicionamiento de imágenes + fondo de tarjeta separado del
## banner (2026-07-29)
- Sin migración de DB en ninguno de estos cambios — `identidad_visual` sigue
  siendo JSONB, todos los campos nuevos son aditivos/opcionales, mismo
  criterio que toda la extensión anterior del sistema de personalización.

### Bug 1 — badge mostraba el tipo de tarjeta en vez del slug (RESUELTO)
- `TarjetaCard` no recibía el slug en absoluto — `TarjetaCardProps` ganó
  `slug?: string`, el badge (icono persona/empresa + texto) ahora muestra
  `@{slug}` en vez de "Tarjeta personal"/"Tarjeta empresarial"
  (`ETIQUETA_TIPO` eliminado, sin otros usos). Sin slug, el badge no se
  muestra (nunca pasa en producción real, solo en el instante antes de
  escribir el enlace al crear). Hilado en los 6 call-sites: `[slug]/page.tsx`
  (tarjeta pública), 2 previews de `tarjeta-form.tsx` (edición usa
  `tarjeta.slug`, creación usa `slugPersonalizado` en vivo mientras se
  escribe), y las 3 tarjetas demo del home (`sofia-martin`/`estudio-raiz`/
  `tacos-el-primo`, agregadas solo para el demo).

### Bug 2 — divisor diagonal/zigzag cortaba el contenido real (RESUELTO)
- Causa raíz confirmada renderizando una tarjeta de prueba real: `diagonal`
  y `zigzag` en `lib/personalizacion.ts` usaban `polygon()` **porcentual**
  sobre la altura TOTAL del panel de contenido (dinámica, 200-800px según
  agenda/servicios/productos) — el mismo bug de clase que ya tuvo "onda"
  (documentado en el propio archivo) antes de su fix. El "60%"/"40%"
  terminaba recortando avatar, badge y la mitad del nombre en vez de solo
  un vistazo diagonal al banner.
- Fix: mismo patrón que "onda" — `path()` en píxeles absolutos
  (`anchoDiseno: 340`), confinado a una franja angosta arriba (~40-56px) +
  rectángulo hasta y=4000 que no recorta nada del contenido real debajo.
  Cero cambios en `TarjetaCard` ni en `SwatchDivisor` (el picker) — ambos ya
  manejaban correctamente el caso `anchoDiseno`, solo se tocaron las 2
  definiciones de clip-path. Verificado renderizado con 2 tarjetas de
  prueba reales (una por divisor): avatar/badge/nombre completos, con el
  notch diagonal/zigzag confinado correctamente al borde superior.

### Componente reusable `ReposicionarImagen` (nuevo)
- `src/components/tarjeta/reposicionar-imagen.tsx`: modal Base UI Dialog
  (mismo patrón visual que `recortar-avatar.tsx`, pero **no destructivo** —
  no re-sube ni recorta el archivo, solo guarda un ancla `{x,y}` 0-100 que
  se puede reajustar cuando sea sin volver a subir nada). Arrastre 1:1 real
  con el cursor (no una aproximación): mide el tamaño real que el navegador
  le da a la imagen bajo `object-fit: cover` (naturalWidth/Height vs. el
  tamaño real de la caja) para calcular cuánto "sobra" en cada eje, y cada
  pixel de arrastre se traduce directo a ese sobrante — mismo cálculo que
  usa `object-position` internamente, así el resultado final coincide
  exactamente con lo que se vio mientras se arrastraba (confirmado
  verificando que el thumbnail y el preview en vivo coinciden tras
  "Listo"). Usado en 2 lugares:
  - **Reposicionar banner** (nuevo, sin gating — es un fix/mejora de algo
    ya gratis para cualquier plan, no una capacidad nueva): botón
    "Reposicionar" junto al banner ya subido en "Avatar y banner". Caja de
    preview con la misma proporción que el banner real (192px de alto) →
    WYSIWYG exacto. `bannerPosicion` nuevo en `IdentidadVisual`, aplicado
    en `TarjetaCard` como `objectPosition` reemplazando el `object-center`
    fijo de siempre.
  - **Reposicionar imagen de fondo de tarjeta** (ver feature de abajo).
    Caja de preview más alta (420px) — limitación honesta documentada en
    el propio componente: el panel de contenido no tiene una altura fija
    real (depende del contenido), así que no hay WYSIWYG 100% perfecto
    para "toda la tarjeta" sin conocer la altura final — la caja
    representativa da un resultado bueno en la práctica, con un margen de
    imprecisión solo en tarjetas con contenido excepcionalmente largo.

### Imagen de fondo de toda la tarjeta (nuevo, gating: Poder únicamente)
- `fondoImagenUrl`/`fondoImagenPosicion` en `IdentidadVisual`. Cloudinary:
  carpeta nueva `mitarjeta/fondos` agregada a `CARPETAS_PERMITIDAS`
  (`cloudinary-sign/route.ts`).
- **Mutuamente excluyente con el banner de color/preset/upload Y con
  "Fondo de la tarjeta" de abajo** — cuando está activa, tiene prioridad
  sobre ambos en el render de `TarjetaCard`, pero NO borra sus valores
  (siguen guardados) — desactivarla restaura todo sin reconfigurar nada.
- Render: nuevo layer `absolute inset-0 z-0` como primer hijo del
  `<article>`, con la imagen a pantalla completa (banner + detrás del
  panel). El div del banner se vuelve transparente en este modo (deja ver
  el layer de atrás). El panel de contenido pasa de su opacidad normal
  (~0.85) a ~0.55 + blur más fuerte para que la imagen se note también
  detrás del texto.
- **Los divisores (onda/diagonal/zigzag) siguen siendo útiles con este
  modo activo** — verificado renderizado: el panel translúcido (no 100%
  transparente) hace que el corte del divisor siga revelando una
  diferencia visual real (imagen "cruda" arriba del corte vs. imagen +
  panel frosted abajo), no hizo falta deshabilitarlos.
- UI: sección "Imagen de fondo de la tarjeta" en "Avatar y banner", debajo
  de "Fondo del banner" (que se atenúa visualmente — `opacity-40
  pointer-events-none` — mientras la imagen de fondo está activa, para
  reforzar la exclusión mutua sin ocultar la configuración previa).
- Gating confirmado renderizado con una tarjeta real en plan Alcance:
  candado "Poder" junto al label, y el guardado se bloquea de verdad
  (`calcularBloqueos` en `lib/personalizacion.ts` gana una entrada nueva)
  con el aviso ámbar estándar del proyecto.

### Efecto vidrio reubicado como "Sólido/Vidrio" (mismo dato, mismo gating)
- Antes: `<Switch>` "Efecto vidrio" aislado al final de "Avatar y banner",
  sin relación visual con lo que afecta (botones/badges). Ahora: segmented
  control "Sólido | Vidrio" junto a los swatches de color "Botones"/
  "Badges" en "Colores y tipografía". Mismo campo (`glassmorfismo:
  boolean`), mismo gating (`personalizacion_avanzada`/Poder) — decisión
  confirmada explícitamente: un solo control combinado (no se separó
  botones/badges en 2 controles independientes, hoy siguen compartiendo el
  mismo booleano, igual que antes).

### Fondo de la tarjeta — nuevo, separado del fondo del banner (gating:
### simple=Alcance, avanzado=Poder)
- El "Fondo" de "Colores y tipografía" en realidad siempre controló el
  degradé del BANNER (`colorPrimario`/`colorSecundario`) — renombrado a
  **"Fondo del banner"** para no repetir la confusión. Nuevo bloque
  **"Fondo de la tarjeta"** (toggle explícito `fondoTarjetaActivo`, ya que
  un `<input type="color">` siempre tiene algún valor — no alcanza con
  mirar si el campo está seteado para saber si está "activo"): modo simple
  (1 color sólido, `fondoTarjetaColor`) + modo avanzado (2 colores +
  tipo lineal/radial + dirección en grados, gating Poder, mismo patrón que
  `modoColorAvanzado` ya existente).
- **Contraste de texto automático**: cuando hay un `fondoTarjetaColor`
  custom, `esOscuro` en `TarjetaCard` (que controla el toggle `.dark` de
  TODO el texto/bordes del panel vía Tailwind `dark:`) se deriva del
  contraste real de ese color (`obtenerColorContraste(fondoTarjetaColor)
  === "#ffffff"`) en vez de `temaModo` — un solo cambio de una línea
  reutiliza TODAS las clases `dark:` ya existentes en el componente, sin
  tocar className por className. Verificado renderizado: fondo navy oscuro
  con "Tema: Claro" → nombre/badge en blanco automáticamente, legible.
  Heurística conocida: con el modo avanzado (2 colores), el contraste se
  calcula sobre el Color 1 nada más — un degradé con extremos muy
  distintos podría dejar el extremo del Color 2 con menos contraste ideal
  (aceptado, no se hizo contraste por zona).
- Gating confirmado renderizado con una tarjeta real en plan Alcance:
  simple SIN candado (Alcance ya tiene `personalizacion_libre`, igual que
  el resto de "Colores"), avanzado CON candado "Poder" apenas se activa el
  toggle — y el guardado se bloquea de verdad con el aviso ámbar
  ("Fondo de la tarjeta (Personalizado) requiere el plan Poder").

### Verificación end-to-end con datos y sesiones reales
- 2 tarjetas de prueba reales (una en plan Poder, otra en Alcance, cada una
  con su propio usuario, sesiones inyectadas vía magic link — mismo patrón
  no-destructivo ya usado en sesiones anteriores) + 2 imágenes de prueba
  generadas localmente (PNG con franjas de colores para el banner, PNG con
  degradé para la imagen de fondo — sin depender de ningún asset externo).
  En la tarjeta Poder: banner subido y repositionado (confirmado que el
  thumbnail y el preview en vivo coinciden), imagen de fondo subida,
  reposicionada y confirmada mutuamente excluyente con el banner, divisor
  diagonal confirmado revelando la imagen cruda vs. frosted, efecto Vidrio
  activado, Fondo de la tarjeta en modo avanzado (radial, navy → gris)
  guardado y confirmado con una lectura real de la DB (`bannerPosicion:
  {x:50,y:100}`, `glassmorfismo:true`, `fondoTarjetaModo:"avanzado"`,
  `fondoTarjetaTipoDegradado:"radial"`, todo exacto) — y confirmado también
  en la tarjeta pública real (`/prueba-personalizacion-poder`, badge,
  gradiente y vidrio visibles). En la tarjeta Alcance: los 4 candados
  Poder (imagen de fondo, avatar/divisor exóticos, vidrio, fondo de
  tarjeta avanzado) confirmados, fondo de tarjeta simple confirmado SIN
  candado, y el bloqueo real de guardado confirmado con el aviso ámbar
  exacto. Limpieza completa después: ambas tarjetas y sus 2 usuarios de
  prueba borrados, confirmado en cero. `npm run build` + `tsc --noEmit` +
  `eslint` limpios en cada paso.

## Notas de proceso
## Divisor onda/diagonal/zigzag: fix real #2 — mordía el banner en cualquier
## ancho >340px (2026-07-29)
- El fix anterior (mismo día) solo había resuelto que el clip-path no
  devorara el contenido real (avatar/nombre) — pero seguía roto de una
  forma distinta, reportada dos veces: en cualquier contenedor más ancho
  que 340px (confirmado con inspección real del DOM — el preview del
  editor mide 368px), quedaba una franja rectangular SIN recortar a la
  derecha, con el degradé del banner "mordiendo" la forma. Causa: `path()`
  exige TODAS sus coordenadas en píxeles absolutos (no admite `%`), y
  estaba autorado para 340px fijos — cualquier ancho real distinto expone
  el sobrante sin cortar.
- Fix real: los 3 divisores migraron de `path()` a `clip-path: polygon()`
  con **unidades mixtas por punto** — X en `%` (escala con cualquier ancho
  real) e Y en `px` fijos (el panel de contenido tiene alto dinámico según
  agenda/servicios/productos, no puede ser `%` sin recortar contenido real
  debajo — mismo motivo que ya forzó el uso de píxeles para Y desde el
  principio). CSS permite mezclar `%`/`px` por punto en `polygon()`, a
  diferencia de `path()` (todo o nada en píxeles). "Onda" se remuestreó
  punto por punto de la curva bezier original (14 puntos por tramo) para
  no cambiar el aspecto visual ya aprobado. `anchoDiseno` desapareció del
  todo (ya no hace falta, X se autoescala); `SwatchDivisor` (el picker) solo
  necesita `scaleY` ahora (nunca `scale()` uniforme) para comprimir el alto
  de referencia (`ALTO_REFERENCIA_DIVISOR = 56`, coincide con el `-mt-14`
  real) al tamaño chico del swatch — X ya viene correcto en `%`.
- Verificado con inspección real del DOM (no solo lectura de código,
  pedido explícito) + capturas reales en 2 tarjetas de prueba distintas y 2
  anchos reales distintos (~318px página pública, 368px preview del
  editor): banner rectángulo intacto (`clip-path: none` confirmado por
  computed style) en los 3 casos, forma del divisor extendida limpiamente
  de borde a borde sin remanente rectangular, picker con los 4 swatches
  bien proporcionados. Datos de prueba borrados después.

## Panel admin: alta manual de tarjetas + reasignación de dueño — COMPLETO
## (2026-07-30)
- **Migración `20260729010000_add_suscripciones_manual.sql`, aplicada por
  el cliente y confirmada** (se verificó con un select real que
  `registrado_por`/`nota_manual` ya existen antes de implementar el resto):
  agrega `'manual'` al constraint de `suscripciones.proveedor` (buscando el
  nombre real vía `pg_constraint` en vez de asumirlo — era
  `suscripciones_proveedor_check`, autogenerado por Postgres) + columnas
  `registrado_por`/`nota_manual` (nullable, mismo patrón que
  `afiliado_pagos.registrado_por`, solo se completan para `proveedor:
  'manual'`).
- **Nueva página `/admin/tarjetas/[id]` (detalle de tarjeta)**: no existía
  ninguna vista de detalle antes — `/editar/[id]` tiene un gate hardcodeado
  `tarjeta.user_id !== session.user.id` **sin bypass de admin** (a pesar de
  que la policy RLS `tarjetas_admin_todo` sí le da acceso completo al admin
  — son dos capas distintas, RLS no es lo único que bloqueaba). Se decidió
  NO tocar `/editar/[id]` (UI grande, orientada al dueño, con flujos de
  pago/upsell que no tiene sentido mezclar con herramientas admin) y en
  cambio crear una página nueva y liviana, específica para las 2 acciones
  de admin. `FiltroTarjetas` (compartido con `/mi-cuenta/tarjetas`) ganó
  una prop `hrefBase` (default `/editar`, admin pasa `/admin/tarjetas`)
  para que cada contexto enlace a su propio destino sin tocar el otro.
- **`POST /api/admin/activar-manual`**: mismo gate `ADMIN_EMAIL` que
  `/api/admin/cobro-manual`. Si ya existe una suscripción `autorizada`/
  `pausada` para la tarjeta → `409` (no pisa una suscripción real). Si
  existe una `pendiente` (checkout abandonado) → la reutiliza con
  `UPDATE` (mismo patrón que el retry-checkout de Stripe, evita chocar
  contra `suscripciones_una_activa_por_tarjeta`). `precio_base` se
  autocompleta del plan; `descuento_aplicado` se calcula y se **clampea a
  0** si el costo ingresado es mayor al precio de lista (verificado con un
  caso real: Alcance mensual $129 con costo $550 → `descuento_aplicado: 0`,
  no un número negativo). `fecha_renovacion` se calcula sumando 1 mes/año a
  la fecha de pago según periodicidad.
- **`POST /api/admin/reasignar-tarjeta`**: confirmado **contra la API
  real** (no asumido) que `GET {SUPABASE_URL}/auth/v1/admin/users?filter=<email>`
  con el service role key busca por email exacto — probado con un email
  real (lo encontró) y uno inexistente (`200` con `users: []`, no un error
  críptico). La SDK de supabase-js instalada (2.110.2) no expone filtro por
  email en `listUsers()`, así que el endpoint le pega directo a esa URL con
  `fetch` en vez de al wrapper tipado. `GET /api/admin/usuario-por-id`
  (nuevo, separado) resuelve el email del dueño ACTUAL para mostrarlo en la
  UI antes de reasignar, vía `admin.auth.admin.getUserById()` (sí soportado
  por la SDK).
- **Verificado de punta a punta con datos y sesión real de admin** (magic
  link real a `emuna.interno@gmail.com`, mismo patrón no-destructivo ya
  usado en toda la sesión): tarjeta sin plan → activar manualmente Alcance
  mensual $550 con nota → confirmado con una lectura real de la DB
  (`suscripciones.estado: 'autorizada'`, `proveedor: 'manual'`,
  `precio_base: 129`, `precio_final: 550`, `descuento_aplicado: 0`,
  `registrado_por: 'emuna.interno@gmail.com'`, `nota_manual` exacta,
  `fecha_renovacion` un mes después) y `tarjetas.plan_id` sincronizado —
  reintentar el alta en la misma tarjeta mostró correctamente el aviso de
  "ya tiene una suscripción autorizada, cancelala primero" en vez de
  duplicarla. Tarjeta sin dueño → reasignar a un email real (funcionó,
  `tarjetas.user_id` confirmado en la DB) y a un email inexistente
  (mensaje claro, no error críptico). Confirmado que `/mi-cuenta/tarjetas`
  sigue enlazando a `/editar/{id}` sin cambios (cero regresión). Limpieza
  completa después (tarjetas, suscripción y usuario de prueba borrados,
  confirmado en cero). `npm run build` + `tsc --noEmit` + `eslint` limpios.

## Acordeón "Productos" abierto por default + títulos editables de
## Servicios/Productos (2026-07-29)
- `TarjetaForm`: `Accordion.Root defaultValue={["datos", "productos"]}`
  (antes solo `["datos"]`) — Productos ya no arranca colapsado.
- Nuevos campos `tituloServicios`/`tituloProductos` en `IdentidadVisual`
  (jsonb, sin migración) — inputs "Título de la sección" al inicio de
  "Servicios"/"Productos" en el editor (placeholder = default real:
  "Servicios"/"Productos", vacío = usa ese default). `TarjetaCard` usa
  `tituloServicios?.trim() || "Servicios"` y
  `tituloProductos?.trim() || "Productos"` (este último reemplaza el
  antiguo "Nuestros Productos" hardcodeado, manteniendo el conteo
  `({productos.length})`). Verificado con una tarjeta de prueba real
  (`tituloServicios:"Lo que hacemos"`, `tituloProductos:"Mi catálogo"`):
  la tarjeta pública mostró "LO QUE HACEMOS" y "MI CATÁLOGO (1)"
  correctamente. Dato de prueba borrado después.

## Notas de proceso
- Proyecto de Supabase: producción única, sin staging. Antes de cualquier migración:
  backup con `pg_dump` (plan free, sin backups automáticos ni PITR).
- Convención de migraciones: `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`,
  aditivas, envueltas en `BEGIN`/`COMMIT`.

## 4 fixes de editor/tarjeta pública + reemplazo de "Servicios" por secciones
## tipo catálogo (2026-07-29) — código escrito directo por el usuario, sin
## pasar por Claude Code
- ✅ **Verificado de punta a punta en una sesión posterior (2026-07-30),
  antes de pushear**: `npm run build` + `tsc --noEmit` + `eslint` limpios, y
  verificación real en navegador (no solo lectura de código) de los 5
  puntos de abajo con 2 tarjetas de prueba (una plan Presencia con modelo
  LEGACY de servicios, otra plan Poder con `seccionesServicios` nuevo):
  conversión legacy→nuevo confirmada en memoria al abrir el editor (título
  custom + 2 ítems con su descripción, sin precio, exactamente como debía),
  agregar secciones hasta el tope real de Poder (3, sin candado — es el
  plan más alto) y candado real "Alcance" al tope de Presencia (1),
  folleto solo en la sección [0], modal de QR con z-index correcto (la
  primera captura que pareció "roto" era la animación de entrada a mitad
  de camino, confirmado con una segunda captura ya asentada), botones de
  compartir/QR dejando de tapar el footer al hacer scroll, y CTA del
  footer como botón píldora. La migración de datos
  `20260729020000_add_secciones_servicios_max_feature.sql` ya estaba
  aplicada (confirmado con una lectura real de `planes.features` antes de
  probar nada). Tarjetas y usuarios de prueba borrados después.
- **Acordeón "Productos" cerrado por defecto**: revertido
  `Accordion.Root defaultValue={["datos", "productos"]}` → `["datos"]` en
  `tarjeta-form.tsx` (deshace el cambio del mismo día documentado más
  arriba en "Acordeón 'Productos' abierto por default").
- **Modal de QR invisible en la tarjeta pública**: `Dialog.Backdrop`/
  `Dialog.Popup` en `tarjeta-qr.tsx` no tenían z-index explícito, mientras
  el botón trigger y el de `CompartirTarjeta` sí (`z-40`) — un elemento
  con z-index explícito pinta por encima de uno con z-index:auto sin
  importar el orden en el DOM, así que el modal quedaba tapado. Agregado
  `z-50` a ambos (mismo valor ya usado en `reservar-servicio.tsx`).
- **Botones de compartir/QR tapaban el footer**: eran `position: fixed
  bottom-6` (pegados al viewport siempre) en `[slug]/page.tsx`. Cambiados a
  `position: sticky` dentro de un contenedor nuevo que envuelve el
  contenido de la tarjeta y termina justo antes de `<footer>` — técnica
  CSS estándar sin JS: el sticky no puede salir de los límites de su
  contenedor padre, así que al llegar al final del contenido (borde
  superior del footer) deja de "flotar" solo. `TarjetaQr` ganó una prop
  `className` opcional (mismo patrón que ya tenía `CompartirTarjeta`) para
  poder pasar los estilos sin el `fixed`/`z-40` propios solo en este
  contexto — el uso de `TarjetaQr`/`CompartirTarjeta` dentro del preview
  "Ver tarjeta" de `TarjetaForm` (línea ~2689) no se tocó, sigue con su
  comportamiento `fixed` de siempre.
- **CTA "Crea tu propia tarjeta digital con Linkard" más llamativo**: pasó
  de texto chico subrayado (`text-xs`, `underline`) a un botón píldora
  (`rounded-full bg-foreground text-background`, mismo tratamiento visual
  que el CTA de folleto PDF de `TarjetaCard`) en el footer de `[slug]/page.tsx`.
- **Reemplazo del toggle "Servicios" por N secciones tipo Productos**
  (título+precio+descripción+imagen+enlace por ítem, tope 1/2/3 según plan
  Presencia/Alcance/Poder):
  - **Decisiones confirmadas explícitamente con el cliente antes de
    implementar**: se elimina la "Descripción general" (redundante con la
    descripción por ítem); el folleto PDF SE MANTIENE pero solo en la
    sección [0]; cada ítem SÍ tiene precio (paridad completa con Producto).
  - **Modelo de datos**: `DatosContacto.seccionesServicios?:
    SeccionServicios[]` (nuevo, `lib/types.ts`) — `SeccionServicios = {
    titulo, items: Producto[] }`, reusa el tipo `Producto` en vez de crear
    uno nuevo. `servicios`/`descripcionServicios` (DatosContacto) y
    `tituloServicios` (IdentidadVisual) quedan marcados `@deprecated` en el
    tipo pero **no se borran ni se migran en DB** — JSONB, sin migración de
    schema.
  - **Compatibilidad con tarjetas ya publicadas, sin migración de DB**:
    tanto `TarjetaForm` (al abrir el editor) como `TarjetaCard` (render
    público) tienen su propia lógica de fallback — si `seccionesServicios`
    no existe o está vacío, arman/muestran el modelo VIEJO exacto (una
    lista título+descripción + folleto, sin precio/imagen/enlace) a partir
    de los campos legacy. `TarjetaForm` además convierte ese legacy a la
    forma nueva EN MEMORIA apenas se abre el editor (no escribe nada hasta
    el próximo "Guardar") — la primera vez que el dueño guarda, la tarjeta
    pasa a `seccionesServicios` y `TarjetaCard` deja de usar la rama
    legacy para esa tarjeta. Ninguna tarjeta real pierde contenido por no
    haber sido regrabada.
  - **Gating por plan**: nueva clave `secciones_servicios_max` en
    `planes.features` (presencia=1, alcance=2, poder=3), migración
    data-only `20260729020000_add_secciones_servicios_max_feature.sql`
    (mismo patrón idempotente que
    `20260727030000_add_personalizacion_avanzada_feature.sql`) —
    **✅ aplicada y confirmada** (lectura real de `planes.features`:
    presencia→1, alcance→2, poder→3).
  - El tope real nunca baja de lo ya guardado (mismo principio que
    `calcularBloqueos` en `lib/personalizacion.ts`, pero implementado
    aparte porque es un tope numérico de cantidad, no un lock de
    valor/tier: no hizo falta tocar `lib/personalizacion.ts`) — bajar de
    plan no oculta ni bloquea secciones ya creadas, solo impide agregar
    una más allá del máximo actual. El botón "Agregar otra sección de
    servicios" solo aparece en la ÚLTIMA sección visible; al tope, se
    reemplaza por un aviso con `<CandadoPlan plan="alcance"|"poder">`.
    Siempre queda al menos 1 sección (no se puede eliminar la última).
  - **Subida de imágenes**: nueva carpeta Cloudinary `mitarjeta/servicios`
    (agregada a `CARPETAS_PERMITIDAS` en `cloudinary-sign/route.ts`, mismo
    motivo ya documentado para `mitarjeta/fondos`/`mitarjeta/testimonios` —
    sin esto la subida se rechaza con 400). Las subidas de imágenes de
    ítems de servicios se disparan en paralelo junto con avatar/banner/
    folleto/fotos de productos (mismo `Promise.all` ya existente, un caso
    nuevo `tipo: "servicioItem"` en el union `TareaSubida`, keyed por
    `${indiceSeccion}-${indiceItem}`).
  - **Sin instrumentación de métricas para los links de ítems de
    servicios** (a propósito, para no mezclar en el mismo bucket
    `click_producto` clicks que en realidad son de servicios, ni agregar
    un tipo de evento nuevo que requeriría tocar el CHECK constraint de
    `eventos_metricas.tipo_evento` — fuera del alcance de lo pedido). El
    link igual funciona como `<a>` normal, simplemente no genera fila en
    `eventos_metricas`.
  - Verificación end-to-end: ver la nota al principio de esta sección.

## Editor unificado (tipo único) + tipografía ampliada (9 fuentes) +
## enlace editable con límite 2/14 días (2026-08-01)

> Nota de proceso: esta sección la escribió originalmente Claude en Cowork
> (no Claude Code) — sandbox sin `git`/red real hacia `registry.npmjs.org`,
> sin `npm run build` real, sin navegador. El código se aplicó DIRECTO
> sobre los archivos del repo (pedido explícito del cliente: "en vez de
> darme prompts aplica los cambios"). **Todo lo que quedaba pendiente de
> esa sesión (`npm run build` real, verificación visual en navegador,
> aplicar la migración) se completó y confirmó en una sesión de Claude Code
> posterior (2026-08-01/02) — ver "Verificación real" al final de esta
> sección, que reemplaza a la verificación parcial original.**

### Contexto y alcance
Pedido original del cliente, 5 puntos, reagrupados en 3 bloques (1+3 eran
la misma unidad de trabajo — unificar el editor ES el renombrado de
campos; 2+4 también — ampliar tipografía ES la reubicación):
- **Bloque A**: unificar el tipo de tarjeta — "Linktree usa 1 solo tipo de
  card, así lo haremos también" — Nombre completo→Título, Empresa→Rol o
  descripción, Puesto o profesión→Bio (texto largo, tope 160 caracteres).
- **Bloque B**: sistema de tipografía ampliado — 2 fuentes (título/cuerpo)
  de un menú de al menos 9 (estilo dropdown de Linktree), + tamaño/peso de
  fuente del título con límites sensatos, + color del título — todo
  reubicado de "Colores y tipografía" a "Datos Esenciales".
- **Bloque C**: enlace (slug) siempre editable, con verificación de
  disponibilidad en vivo, límite de 2 cambios cada 14 días con alertas de
  días restantes/éxito/error.

### Bloque A — Editor unificado
- **La columna `tarjetas.tipo` en DB NO se tocó** (sigue siendo
  `"personal" | "empresarial"`, sin migración) — decisión deliberada,
  mismo criterio que "cuadrado" en `AvatarForma": no se fuerza a migrar
  datos existentes, se deja de ofrecer la elección hacia adelante nomás.
  Toda tarjeta nueva se guarda con `tipo: "personal"` (el editor ya no
  ofrece el toggle Personal/Empresarial — se eliminó por completo de
  `tarjeta-form.tsx`).
- **Campos que sobreviven, con nuevas etiquetas** (`src/lib/types.ts`,
  `DatosContacto`): `nombre` → "Título", `empresa` → "Rol o descripción"
  (línea corta bajo el título), `puesto` → "Bio" (`<textarea>`,
  `maxLength={160}`, contador de caracteres en vivo). `telefono`/
  `whatsapp`/`email`/`horarios`/`direccion`/`direccionMapsUrl` quedan
  comunes a cualquier tarjeta (antes `horarios` era exclusivo de
  "empresarial" — confirmado explícitamente con el cliente: "de
  Empresarial solo mantené Horario").
- **Campos retirados del editor**: `nombreEmpresa`, `giro`,
  `telefonoCorporativo`, `sitioWeb` — marcados `@deprecated` en
  `DatosContacto` (no borrados: `TarjetaForm` los lee como FALLBACK en la
  inicialización de estado — `nombre: datosIniciales?.nombre ??
  datosIniciales?.nombreEmpresa ?? ""`, mismo patrón para `empresa`/
  `telefono` — así una tarjeta "empresarial" vieja abre el editor con su
  contenido ya en los campos nuevos, sin perder nada, y se re-guarda en la
  forma nueva la primera vez que el dueño toca "Guardar"). `sitioWeb` no
  tiene reemplazo directo — se puede recrear como enlace "personalizado"
  en Redes sociales.
- **`TarjetaCard` (render público/preview)**: badge simplificado a un solo
  ícono (`Sparkles`, ya no alterna `Building2` según tipo). Debajo del
  nombre: `empresa` (línea corta, sin cambios de estilo) → `puesto`/Bio
  como párrafo propio nuevo (`whitespace-pre-line`, hasta 160 caracteres,
  ya no una línea de una sola línea truncada). `horarios` ahora se muestra
  siempre que haya dato (antes solo si `tipo === "empresarial"`).
  `construirVCard()` reescrita sin bifurcar por tipo: `FN` = nombre,
  `TITLE` = empresa, `NOTE` = bio (el vCard no tiene un campo natural para
  texto largo tipo bio; `NOTE` es el más parecido).
- **Otros call-sites corregidos** (grep exhaustivo de `esEmpresarial`/
  `nombreEmpresa`/`giro`/`telefonoCorporativo`/`sitioWeb` en `src/`):
  `[slug]/page.tsx` (metadata + gate de plan activo), `[slug]/
  opengraph-image.tsx` (nombre/subtítulo de la imagen OG por tarjeta),
  `lib/tarjetas.ts` (`nombrePrincipalDeTarjeta()`, usada por
  `header-global.tsx`/`mi-cuenta`), `admin/suscripciones/page.tsx`
  (`nombreTarjeta()` del listado). Las 3 tarjetas demo del home
  (`estudio-raiz`/`tacos-el-primo`, antes `tipo: "empresarial"` con los
  campos legacy) se migraron a `tipo: "personal"` con los campos nuevos —
  siguen viéndose iguales (mismos banners/tipografías), solo cambia el
  modelo de datos de origen. `admin/tarjetas/[id]/page.tsx` y
  `panel/filtro-tarjetas.tsx` siguen mostrando/filtrando por
  `tarjeta.tipo` tal cual (columna real de DB, útil para identificar
  tarjetas viejas) — no se tocaron, no leen ningún campo retirado.

### Bloque B — Tipografía ampliada + reubicación
- **9 estilos** (antes 3) en `EstiloTipografia` (`lib/types.ts`) y su
  metadata `ESTILOS_TIPOGRAFIA` (`lib/personalizacion.ts`): Moderna
  (default, sin fuente especial), Elegante (Playfair Display), Creativa
  (Baloo 2) — las 3 ya existían. Nuevas: Clásica (Lora), Geométrica
  (Poppins), Redondeada (Quicksand), Mono (Space Mono — el "mono sans"
  pedido explícitamente), Display (Bebas Neue), Manuscrita (Caveat).
  **Gating**: las 7 primeras son tier "basica" (Alcance+, mismo criterio
  que las 3 originales); Display/Manuscrita son tier "avanzada" (Poder
  exclusivo) — decisión explícita del cliente ("reservá algunas para
  Poder"), curada por Claude (fuentes de mucho carácter, upsell más que
  default razonable).
- **6 fuentes nuevas cargadas en `layout.tsx`** vía `next/font/google`,
  cada una en su propia CSS var (`--font-clasica`, `--font-geometrica`,
  `--font-redondeada`, `--font-tipografia-mono` —a propósito NO
  `--font-mono`, para no chocar conceptualmente con `--font-geist-mono`,
  la fuente de UI del propio producto—, `--font-card-display` —a propósito
  NO `--font-display`, ya usada por Plus Jakarta Sans en los titulares de
  marketing del home—, `--font-manuscrita`). Lora/Quicksand/Caveat sin
  `weight` explícito (variable fonts, next/font expone el rango completo);
  Poppins/Space Mono/Bebas Neue con `weight` explícito (fonts estáticas,
  next/font exige la lista de pesos). **Fuerte indicio de que esto está
  bien** (más allá de no poder correr `next build` real, ver nota de
  arriba): `next/font/google` genera tipos TypeScript estrictos y
  distintos según si una fuente es variable o estática — si algún `weight`
  estuviera mal puesto para su fuente, `tsc --noEmit` habría fallado, y
  corrió limpio.
- **`src/components/tarjeta/selector-tipografia.tsx` (nuevo)**: dropdown
  real (`@base-ui/react/menu`, mismo primitivo ya usado en
  `header-global.tsx`) pedido explícitamente ("como el dropdown de fuentes
  de Linktree") — reemplaza la grilla de 3 swatches vieja. Trigger y cada
  ítem del menú se renderizan EN esa tipografía (no solo el nombre en
  texto plano), con candado de plan visual donde aplica — click siempre
  selecciona (el candado es solo badge, mismo criterio que
  `OpcionPersonalizacion`). Reusado 2 veces (Título/Cuerpo, esta última
  solo si `modoTipografiaAvanzado` está activo — mecanismo que ya existía,
  no se tocó, solo se reubicó).
- **3 campos nuevos en `IdentidadVisual`**: `colorTitulo` (string vacío =
  automático/auto-contraste), `tituloTamano` (número, slider 20-40px,
  default 20 = el `text-xl` fijo de siempre), `tituloPeso` (número, slider
  400-800 paso 50, default 600 = el `font-semibold` fijo de siempre). Los
  3 solo viajan al guardar/preview cuando DIFIEREN de su default (mismo
  patrón que el resto de campos opcionales del proyecto) — así una tarjeta
  que nunca tocó estos controles se ve pixel-idéntica a como se veía antes
  de esta feature. Gating: tier "basica" (Alcance+), mismo criterio que
  los colores personalizados — `calcularBloqueos()` ganó 2 checks nuevos
  (tamaño/peso) y `colorTitulo` se sumó a `CAMPOS_COLOR_BASICOS`.
- **`TarjetaCard`**: el `<h1>` del título aplica `fontSize`/`fontWeight`
  inline (con fallback a las clases Tailwind fijas si no están seteados) y
  `color: colorTitulo` con prioridad sobre `colorTextoGeneral` (el override
  general de Poder) — un color de título elegido a propósito por el dueño
  gana sobre el override general, criterio deliberado (más específico >
  más genérico).
- **Reubicación**: la sección completa de tipografía (selector de
  fuente(s) + modo avanzado + los 3 controles nuevos) se movió de "Colores
  y tipografía" a "Datos Esenciales", justo debajo del campo Bio — pedido
  explícito del cliente. "Colores y tipografía" queda con tema/colores/
  fondo de banner/fondo de tarjeta/efecto vidrio, sin nada de tipografía.

### Bloque C — Enlace (slug) editable con límite 2 cambios / 14 días
- **Antes**: el slug solo se elegía UNA vez, al crear — en modo edición ni
  siquiera se mostraba el campo. Ahora es editable siempre, con el mismo
  chequeo de disponibilidad en vivo (debounce 500ms) que ya existía para
  creación, extendido para excluir la propia tarjeta de la búsqueda de
  colisión (`.neq("id", tarjeta.id)` — sin esto, después de cambiar el
  slug con éxito, la tarjeta se encontraría a sí misma en la siguiente
  verificación y marcaría su propio enlace nuevo como "ya en uso").
- **Migración `supabase/migrations/20260801000000_add_tarjeta_slug_historial.sql`
  — ✅ aplicada y verificada contra producción (2026-08-02)**. Agrega:
  - Tabla `tarjeta_slug_historial` (`tarjeta_id`, `slug_anterior`,
    `slug_nuevo`, `created_at`) — auditoría append-only, mismo patrón ya
    validado en el proyecto (`suscripciones_historial`, `cupon_usos`): RLS
    con `_select_propia` (el dueño puede leer su propio historial, para
    mostrar "te quedan N cambios") + `_admin_todo`, SIN policy de insert
    para anon/authenticated — solo un trigger escribe.
  - **El límite se hace cumplir A NIVEL DE TRIGGER, no solo en el
    cliente** — decisión deliberada: `TarjetaForm` actualiza `tarjetas`
    con `supabase.from("tarjetas").update(...)` DIRECTO desde el cliente
    autenticado (RLS de owner, sin endpoint server-side, mismo patrón que
    `agenda-servicios.tsx`) — sin un trigger, cualquiera podría llamar
    `.update({slug})` repetidas veces saltándose el límite de la UI por
    completo. `fn_validar_limite_cambio_slug()` (BEFORE UPDATE, `security
    definer` — necesario porque quien dispara el UPDATE es el rol
    "authenticated" del dueño, sin grant directo sobre la tabla de
    historial, mismo criterio ya usado en `fn_cupon_es_valido`) cuenta los
    cambios de los últimos 14 días y **rechaza el UPDATE ENTERO** (`raise
    exception 'limite_cambio_slug_alcanzado'`) si ya hay 2 — un intento
    bloqueado no deja rastro (ni en `tarjetas` ni en el historial).
    `fn_registrar_cambio_slug()` (AFTER UPDATE, mismo criterio) inserta la
    fila de auditoría solo cuando el cambio sí se aplicó.
- **`lib/tarjetas.ts` → `getLimiteCambioSlug(tarjetaId)`**: lee
  `tarjeta_slug_historial` (cliente `supabase` normal, la policy
  `_select_propia` ya alcanza) y devuelve `{ cambiosRestantes,
  proximaLiberacion }` — `proximaLiberacion` es la fecha en que se libera
  el próximo cambio (el más viejo de los 2 usados + 14 días), calculada
  client-side a partir de las filas reales, no vía RPC (a diferencia de
  `fn_cupon_es_valido`/`fn_cupon_usos_restantes`, que sí son `security
  definer` porque necesitan que un visitante ANÓNIMO los llame sin
  exponer la tabla — acá el dueño ya tiene su propia policy de lectura,
  no hace falta una función intermedia).
- **UI en "Datos Esenciales"**: el campo de enlace ya no está gateado por
  `!esEdicion` — siempre visible, pre-llenado con el slug actual. Debajo
  del estado de disponibilidad (ya existía: "Mínimo 4 caracteres" /
  "Verificando..." / "Enlace disponible" / "Ya está en uso", con el caso
  nuevo "Es tu enlace actual" cuando no cambió) se agregó una segunda
  línea SOLO en edición: "Te quedan N de 2 cambios de enlace disponibles
  (cada 14 días)" o, si se agotaron, "Alcanzaste el límite de cambios de
  enlace. Podés volver a cambiarlo el {fecha}." (`toLocaleDateString`
  `es-MX`). El botón de guardar se deshabilita (`slugBloqueaGuardado`) si
  el límite ya se agotó Y el slug realmente cambió — reabrir el editor sin
  tocar el enlace nunca bloquea nada, mismo criterio de "nunca romper algo
  que el dueño no tocó" que ya usa `calcularBloqueos` en
  `lib/personalizacion.ts`.
- **`slugGuardado`, estado nuevo separado del prop `tarjeta.slug`**: el
  prop queda stale hasta el próximo load de la página (mismo
  comportamiento ya aceptado en el resto del componente) — sin este
  estado propio, un segundo guardado en la misma sesión (sin recargar)
  después de cambiar el slug con éxito volvería a evaluarlo como "cambio
  pendiente" contra el valor viejo del prop, descontando el límite de
  nuevo por un guardado que en los hechos no vuelve a tocar el slug.
  `slugGuardado` se actualiza en el `then` de un guardado exitoso que sí
  cambió el enlace, y es la referencia real que usan el QR/compartir/link
  "Ver tarjeta" del propio editor (`tarjeta.slug` directo hubiera
  compartido un enlace roto/viejo justo después de cambiarlo).
- **Manejo del error del trigger**: `mensajeErrorGuardadoSlug()` (nuevo,
  función de módulo) detecta `error.message.includes
  ("limite_cambio_slug_alcanzado")` y muestra un mensaje específico en vez
  del genérico "no pudimos guardar" — cubre la carrera real (dos pestañas
  guardando casi al mismo tiempo) que el chequeo client-side previo no
  puede prevenir por sí solo, ya que el trigger es la fuente de verdad
  final.
- **Sin gating por plan**: cualquier plan puede editar su enlace — no se
  agregó ninguna restricción de `personalizacion_libre`/`_avanzada`, el
  pedido original no lo mencionaba y no hay motivo de negocio para
  restringirlo (arreglar un typo en el propio username no es una feature
  premium).

### Verificación real (Claude Code, 2026-08-01/02) — reemplaza la
### verificación parcial original de Cowork
- **Investigación previa de un error real reportado por el cliente**:
  `ERROR: 42P01: relation "public.tarjetas" does not exist` al correr una
  query contra Supabase desde el sandbox de Cowork. Descartado como
  problema real: confirmado con una query directa contra el proyecto real
  (`wsvamfgebmhrmjsiceij`) que `tarjetas` existe y es consultable, y que
  `schema.sql` ya la define con `id uuid` (coincide con lo que asume esta
  migración). Causa real: la query del sandbox no apuntaba a la base real
  (sin `supabase` CLI/`DATABASE_URL` ahí, como ya documentado para ese
  entorno) — no un problema de la migración ni de producción.
- ✅ `npm run build` real — compiló limpio, incluidas las 6 fuentes nuevas
  de `next/font/google` resueltas en build time sin error (confirma lo que
  `tsc` ya insinuaba). `eslint` también limpio.
- ✅ **Bloque A verificado con una tarjeta real tipo "empresarial" con
  datos legacy** (`nombreEmpresa`/`giro`/`telefonoCorporativo`, sin los
  campos nuevos): el editor precargó "Título"/"Rol o descripción"/teléfono
  correctamente desde el fallback legacy, sin toggle Personal/Empresarial.
  Al guardar, `datos_contacto` se reescribió al modelo nuevo
  (`nombre`/`empresa`/`telefono`) confirmado con una lectura real de la
  DB.
- ✅ **Bloque B verificado en vivo**: dropdown de 9 fuentes con preview
  real por ítem, sliders de tamaño (20-40px) y peso (600-800) moviendo el
  título del preview en tiempo real, color de título aplicándose al
  instante (probado con un color real), todo confirmado dentro de "Datos
  esenciales".
- ✅ **Bloque C verificado en 2 niveles**:
  1. **Cliente**: 2 cambios de slug seguidos en la misma sesión guardaron
     bien (confirmado contra la DB real cada vez), el contador bajó
     "2→1→0 de 2" en vivo sin recargar, y el 3er intento se bloqueó en la
     UI ("Alcanzaste el límite...") con el botón "Guardar cambios"
     realmente `disabled` (confirmado por JS, no solo visual).
  2. **Base de datos, después de aplicada la migración**: 3 UPDATEs
     directos reales (vía service role, bypassea la UI por completo) —
     los primeros 2 pasaron, el 3ro fue **rechazado por el trigger**
     (`limite_cambio_slug_alcanzado`), `tarjeta_slug_historial` quedó con
     **exactamente 2 filas** (el intento bloqueado no dejó rastro, como
     documentado arriba) y el slug final quedó en el del 2do cambio, no en
     el 3ro. Confirma que el límite ya es imposible de bypassear
     saltándose la UI, no solo decorativo.
  - Nota real encontrada en el camino (no un bug, un falso positivo de
    verificación): el primer intento de guardar pareció no hacer nada
    porque se revisó la red del navegador demasiado pronto/con el
    monitoreo activado después del click. Reintentando con la consola y
    red monitoreadas desde antes del click se confirmó el PATCH real
    (`204`) y el banner "✓ Cambios guardados." (aparece arriba de la
    página, separado del ícono ✓ que ya es parte fija de la etiqueta del
    botón — no confundir uno con otro al verificar visualmente).
  - Todos los datos de prueba (tarjetas, usuarios, filas de historial) se
    borraron después de cada verificación.
- 🔴 **Migración `20260801000000_add_tarjeta_slug_historial.sql` sin
  aplicar** — el límite de cambio de slug NO está enforced en producción
  todavía (el código del cliente sí valida, pero sin el trigger de DB
  aplicado, ese chequeo es puramente decorativo — cualquiera podría seguir
  cambiando el slug las veces que quiera hasta que se corra la
  migración). Pendiente de que el usuario la corra manualmente (backup
  primero, mismo protocolo que toda migración de esta base sin staging).
