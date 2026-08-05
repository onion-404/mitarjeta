# Historial de sesiones — bitácora de verificaciones (mitarjeta / Linkard)

> Este archivo complementa a `CLAUDE.md` (estado actual, compacto). Acá vive el detalle
> histórico: cómo se verificó cada feature paso a paso, capturas de pantalla descritas, logs
> de Stripe CLI/test clocks, queries de confirmación contra producción, y bugs reales
> encontrados y corregidos en el camino. No hace falta leer esto para trabajar en el proyecto
> hoy — es la bitácora de por qué las cosas quedaron como quedaron. Separado de `CLAUDE.md`
> el 2026-08-04 porque ese archivo había superado los 190k caracteres.

## Logo / Favicon / OG image (2026-07-18/26)
- El logo (`<Logo />`) reemplazó cualquier mención de "Linkard" como texto plano en header
  público, footer de tarjeta pública, login y admin dashboard. Sora se carga con
  `next/font/google` en `layout.tsx`, expuesta como `--font-logo`.
- Favicon: se borró el `favicon.ico` genérico de `create-next-app`, reemplazado por
  `icon.tsx`/`apple-icon.tsx` con `ImageResponse` de `next/og`, sin agregar dependencias de
  conversión SVG→ICO. `public/` conserva los SVGs default de Next.js (`next.svg`, etc.), no
  referenciados en ninguna página.
- OG genérica: `opengraph-image.tsx` (1200×630, fondo `#171717`, logo + tagline "Tu tarjeta
  digital en segundos"), Sora bold cargada vía fetch a la API de Google Fonts (patrón estándar
  para `next/og`, que no puede usar `next/font/google` directamente).
- **OG dinámica por tarjeta** (`[slug]/opengraph-image.tsx`): usa `getTarjetaPublicada(slug)`,
  gradiente con `identidad_visual.colorPrimario/colorSecundario` (sólido si solo hay uno,
  `#171717` si ninguno), color de texto con `obtenerColorContraste()`. Avatar: si existe
  `avatarUrl` de Cloudinary, se descarga y convierte a data URI ANTES de construir el
  `ImageResponse` (`cargarImagenBase64()`, try/catch propio) — a propósito, NO `<img src=...>`
  directo: aunque Satori soporta fetch remoto por URL, esa carga ocurre perezosamente dentro
  del `ReadableStream` interno de `ImageResponse` (confirmado leyendo
  `next/dist/server/og/image-response.js`), fuera de cualquier try/catch propio — una foto
  caída/lenta hubiera roto la imagen OG entera sin forma de interceptarlo. Fallback a la OG
  genérica si la tarjeta no existe o `plan_id` es null (mismo criterio fail-closed que el
  resto del proyecto). El triángulo se dibuja como SVG `<polygon>`, no el carácter Unicode ▲
  (Satori no lo resuelve contra la fuente Sora cargada).
- `src/lib/og.tsx` extrae `cargarSoraBold()` y `renderOgImageGenerico()` a un módulo
  compartido entre ambos archivos de OG image.
- **Verificación real**: 4 tarjetas de prueba sembradas y borradas después vía service role —
  avatar real de Cloudinary con gradiente morado, tarjeta sin foto (fallback de inicial, fondo
  amarillo/naranja con texto negro, contraste correcto), nombre largo (wrap a 2 líneas, tamaño
  reducido si `nombre.length > 22`), tarjeta con `plan_id: null` (cayó al mismo PNG —mismo
  tamaño en bytes— que el fallback genérico y que una tarjeta inexistente). Las 4 devolvieron
  `200` con PNG real de 1200×630. `npm run build` + `tsc --noEmit` + `eslint` limpios.
- **Verificación de marca de Google — cambios de contenido**: se agregó sección "¿Qué es
  Linkard?" al home y se reforzó el eyebrow del hero con el nombre de marca, tras el primer
  rechazo de Google Cloud (2 problemas: "no se explica el propósito de la app" y "el nombre no
  coincide con el nombre de la página principal"). Verificado con `curl` contra el HTML crudo
  (sin JS): el `<h2>¿Qué es Linkard?</h2>` y el párrafo aparecen como texto real en el DOM, no
  dentro de imagen/canvas. Se quitó el punto final del wordmark ("Linkard." → "Linkard") en
  `logo.tsx` y en `opengraph-image.tsx` (que tiene su propio render con Satori, no puede reusar
  `<Logo />`) — verificado visualmente sin problemas de espaciado.

## Suscripciones — Mercado Pago (histórico completo)
- **Bloqueante inicial resuelto (2026-07-18)**: la cuenta "mitarjeta" (Checkout Pro) no podía
  crear preapprovals "sin plan asociado" (401/500). Causa: MP exige una aplicación SEPARADA
  para Suscripciones — se creó "mitarjeta-suscripciones" con su propio token
  (`MERCADO_PAGO_ACCESS_TOKEN_SUSCRIPCIONES`).
- **2 bugs reales encontrados y corregidos, confirmados contra la API real de MP antes de
  tocar código**:
  1. `back_url` se armaba con `NEXT_PUBLIC_SITE_URL`, no definida en `.env.local` → caía a
     `http://localhost:3000`, rechazado por MP (`400 Invalid value for back_url`). Corregido
     con `NEXT_PUBLIC_SITE_URL=https://mitarjeta-delta.vercel.app` (dominio real confirmado
     por el cliente — un valor anterior, `mitarjeta.app`, había sido solo una inferencia y
     quedó descartado). Se unificó `const APP_URL` (antes duplicada en `mercadopago.ts` y
     `mercadopago-suscripciones.ts`) en `lib/site-url.ts`.
  2. `payer_email` con "+tag" (ej. `usuario+algo@gmail.com`) hacía que la API de preapproval
     devolviera `500` genérico — confirmado en pruebas controladas (mismo correo sin "+tag":
     `201`; con "+tag": `500`, dos veces). Se normaliza en `normalizarPayerEmail()`.
  - Con ambos fixes, `POST /api/suscripciones` verificado de punta a punta con datos reales:
    `200` y un `initPoint` real de MP, cero errores de consola. El preapproval de prueba se
    canceló (`PUT /preapproval/{id}` `status:"cancelled"`) y todos los datos de prueba se
    borraron.
- **Email de pago confirmable (2026-07-20)**: antes `payerEmail` se tomaba ciegamente de
  `userData.user.email` (sesión de Supabase/Google) — bug real: MP rechaza el pago con "Tu
  e-mail no coincide con el de la suscripción" si la persona autoriza con una cuenta de MP
  distinta. Se agregó un input editable pre-llenado con el de la sesión. Limitación conocida y
  documentada: si igual hay mismatch (edita el campo pero autoriza con otra cuenta), no hay
  forma de detectarlo desde nuestro lado — el preapproval se queda `pending`, no dispara
  webhook, y `back_url` no trae ningún query param de error.
- **Pendiente que quedó sin resolver cuando se migró a Stripe**: nunca se probó el flujo hasta
  el webhook real (`subscription_preapproval`) por falta de URL pública HTTPS o de
  credenciales de sandbox — quedó sin resolver, ya no es relevante porque MP dejó de ser el
  proveedor activo.

## Suscripciones — Stripe (verificaciones end-to-end completas)
- **Verificación inicial de punta a punta (2026-07-21)**, con Stripe CLI
  (`stripe listen --forward-to localhost:3000/api/stripe/webhook`, autenticado vía
  `--api-key`): flujo real completo vía Playwright — `/planes` → `/crear` → submit real → 
  Checkout real de Stripe (tarjeta de prueba `4242 4242 4242 4242`) → pago → webhook recibido
  y verificado. Confirmado con 3 fuentes: (1) log de `stripe listen` con
  `checkout.session.completed` y `customer.subscription.created` en `200`; (2) query directa a
  Supabase (`suscripciones.estado = 'autorizada'`, ids poblados, `tarjetas.plan_id`
  sincronizado); (3) capturas del Checkout real. Se confirmó también `customer.
  subscription.deleted` al cancelar la prueba: `200`, no-op correcto porque la fila ya no
  existía en Supabase (no crashea). Todos los datos de prueba se cancelaron/borraron después.
  Dato de color: el "Card information" de Stripe Checkout no está en un iframe con nombre
  propio — vive directo en el documento de `checkout.stripe.com`, porque la página entera ya
  es 100% de Stripe.
- **Detalle de entorno**: `.env.local` tiene CRLF, no LF — no afecta a Next.js, pero rompe
  parseo manual ingenuo (`split("\n")` sin `.trim()`) en scripts de una sola línea.
- **Paso a keys de producción (2026-07-22/23)**: confirmadas contra la API real (`GET
  /v1/account`: `acct_1TvfXG1jsNdj9fiJ`, `business_profile.name: "Linkard"`,
  `charges_enabled`/`payouts_enabled` en `true`) y contra `GET /v1/webhook_endpoints` (el
  endpoint live existe y está `enabled`). El identificador de cuenta después de `sk_live_`/
  `pk_live_` es distinto al de las keys de test usadas para verificar el flujo (confirmado que
  es la cuenta correcta, no un error).
- **Validación de monto mínimo MXN (2026-07-23)**: confirmado contra la tabla oficial de
  Stripe (MXN 10). Verificado con Playwright real: cupón `PRUEBA95` (95% off, $149 → $7.45) →
  `400` real, sin redirigir a Stripe, sin fila huérfana, mensaje visible en la UI.
- **Bug de copy encontrado y corregido**: texto de ayuda del campo de correo de pago decía "en
  Mercado Pago" tras la migración a Stripe — corregido, y luego el campo se eliminó del todo
  (2026-07-23) por ser redundante con el checkout de Stripe (que ya pide el email). Como
  consecuencia, `crearCheckoutSession()` ya no crea el Customer de antemano.
- **Formato de moneda/idioma (2026-07-23)**: el Checkout mostraba montos en formato europeo
  ("14,90") y en inglés — causa: sin `locale` explícito, Stripe autodetecta del navegador.
  Se agregó `locale: "es-419"`. Verificado: "MXN 14.90" y toda la página en español.
  Verificado junto con el punto anterior vía Playwright real en modo test: `/crear` con
  Presencia mensual, cero inputs de email, cupón `PR90` (90% off, $149 → $14.90) aplicado,
  Checkout con monto e idioma correctos.
- **Bug de decimales en "Tu plan" (2026-07-23)**: `precioFinal.toLocaleString("es-MX")`
  recortaba el cero final ("$14.9" en vez de "$14.90") — corregido con
  `minimumFractionDigits`/`maximumFractionDigits: 2`. Cambio puramente visual (preview local,
  el monto real se recalcula server-side). Mismo patrón encontrado en
  `comparativa-planes.tsx` — no es bug visible hoy (precios enteros), no se tocó.
- 🔴 **Investigado sin resolver (2026-07-23)**: crear suscripción para tarjeta adicional
  devolvió "no pudimos iniciar la suscripción con Stripe" en producción real. Hipótesis de
  cupón 100% descartada con evidencia real (mismo payload aceptado sin problema en modo LIVE,
  `cs_live_a1CHXL2T...`). Tampoco se reprodujo con el caso más simple. 2 pares de intentos
  fallidos reales quedaron en `tarjetas` sin fila en `suscripciones`
  (`nn-fad95a`/`nn-e53fe6`, `prueba-22-ac6c4f`/`prueba-22-1fcdb8`, 2026-07-23 ~21:11-21:14) —
  el cleanup best-effort borró la fila de `suscripciones`, así que no quedó registro de qué
  cupón/descuento se usó. Sin acceso a Runtime Logs de Vercel desde este entorno.
- **Tarjeta atorada tras cancelar el Checkout — corregido (2026-07-23)**: cancelar en Stripe y
  volver a `/editar/{id}` dejaba la tarjeta sin forma de reintentar el pago (la sección "Tu
  plan" desaparecía). Fix con 2 partes: `TarjetaForm` con derivados
  `tienePlanActivo`/`mostrarSeccionPago` y botón de 3 estados ("Guardar cambios"/"Completar
  pago"/"Crear e ir a pagar"); `POST /api/stripe/checkout` reutiliza con `UPDATE` una fila
  `pendiente` existente en vez de insertar (evitaba un 409 engañoso contra
  `suscripciones_una_activa_por_tarjeta`). Verificado con Playwright real de punta a punta
  contra Stripe live: crear → Stripe → cancelar → volver → "Tu plan" reaparece → reintentar →
  llega a Stripe de nuevo sin 409.
- 🔴 **Investigado sin resolver (2026-07-23)**: login con Google perdiendo `?plan=` en la URL
  de retorno, **solo con cuentas de Google nuevas** — confirmado por el usuario en Chrome
  normal, incógnito y varias cuentas nuevas; cuentas existentes siempre llegan bien. Se
  descartó con evidencia dura: cero `CREATE TRIGGER` en las migraciones/`schema.sql`, sin
  `supabase/config.toml`, código de la app idéntico para cuenta nueva/existente, sin ruta
  `/auth/callback` propia. Hipótesis principal: la pantalla "Google no verificó esta app" que
  aparece solo la primera vez que una cuenta autoriza (cuentas que ya autorizaron la saltan).
- **Bug crítico `/[slug]` con `estado_pago` — verificación completa (2026-07-25)**: encontrado
  como efecto colateral de probar instrumentación de métricas. Confirmado con consulta real:
  los 15 tarjetas más recientes (2026-07-23 a 25) tenían TODAS `estado_pago: "pendiente"` —
  ninguna llega nunca a `"aprobado"` por sí sola. Confirmado cero riesgo de regresión: 0
  tarjetas publicadas con `estado_pago = 'aprobado' AND plan_id IS NULL`, y 0 con `plan_id`
  seteado y `estado_pago != 'aprobado'`. Verificado de punta a punta con Stripe test real
  (login vía `stripe login`, keys de `stripe config --list`, `stripe listen`): usuario +
  tarjeta real (sin `plan_id`) → `POST /api/stripe/checkout` real → Checkout real completado
  con `4242 4242 4242 4242` → webhook real recibido, ambos `200`. Lectura real de Supabase
  después: `plan_id` seteado, `suscripciones.estado = "autorizada"`, y **`estado_pago` se
  quedó en `"pendiente"`** — confirma la causa raíz exacta. `/[slug]` ya no mostraba
  "inactiva" (confirmado con `curl` + captura). El caso contrario (sin `plan_id`) se verificó
  antes del pago contra la misma tarjeta: sí mostraba "inactiva". Limpieza completa después
  (suscripción cancelada, customer borrado, filas de Supabase borradas, keys devueltas a
  live, diff byte-a-byte confirmado idéntico).
- **Sistema de cupones avanzado — verificación (2026-07-26)**: (1) a nivel DB con service
  role — cupón con `limite_usos: 1`, `fn_cupon_es_valido` en `true`, 1 uso real registrado →
  `false` (agotado) tanto con cliente admin como **anon**; cupón vencido → `false`; borrar
  cupón agotado → la fila de `cupon_usos` sigue con `cupon_id = null` y snapshot intacto. (2)
  en el navegador real con sesión admin (magic link + `verifyOtp`, no destructivo): crear
  cupón real vía UI, editar (25%→40%), sembrar 2 usos reales para un segundo cupón y confirmar
  rendimiento agregado en la UI (2 usos, $250, 0 activas — correcto sin `suscripcion_id`),
  eliminar y confirmar mensaje + reaparición en "Cupones eliminados con historial". Limpieza
  completa después. `npm run build` + `tsc --noEmit` + `eslint` limpios en cada paso.
- **Bug real de fecha en edición de cupón**: el campo de vencimiento mostraba el día
  siguiente al elegido (ej. 15 de enero → 16 de enero al reabrir). Causa: se guardaba con
  `new Date("YYYY-MM-DDT23:59:59").toISOString()` (interpreta en hora LOCAL, convierte a UTC)
  pero se releía con `iso.slice(0, 10)` (toma el día en UTC directo) — en huso horario detrás
  de UTC (México), 23:59:59 local cae después de medianoche UTC. Corregido: `paraInputDate()`
  usa getters locales (`getFullYear()/getMonth()/getDate()` de `new Date(iso)`).
- ✅ **Checkout real con cupón de afiliado, resuelto el mismo día (2026-07-26)**: verificado con
  cupón `E2EAFILMS1ARO00` (30% off) — ver el resumen de test clocks en la sección de afiliados
  abajo, que extiende la verificación a 2 ciclos de facturación reales.

## Sistema de afiliados — verificación con Stripe test clocks
- **`stripe trigger` no sirve para esto** (genera eventos sintéticos sin
  `metadata.suscripcion_id` real) — se usaron **test clocks**: `Customer` anclado a un
  `test_clock`, asociado a una Checkout Session real (replicando los params de
  `crearCheckoutSession()` + `customer: customerId`, sin tocar el código real — el resto del
  flujo, webhooks incluidos, corrió 100% real), completada en el navegador real con
  `4242 4242 4242 4242`.
- Ciclo 1 (venta inicial) confirmado con `cupon_usos` real: `comision_stripe: 7.71`,
  `monto_neto: 81.39` (89.10 - 7.71, exacto). Se avanzó el clock 32 días
  (`testClocks.advance()`, polling hasta `status: "ready"`) — Stripe generó y cobró una
  renovación real SIN intervención del navegador, confirmado con `invoice.paid` real llegando
  al webhook.
- **Resultado**: 2 filas distintas en `cupon_usos` para la misma `suscripcion_id`,
  `stripe_invoice_id` distinto en cada una. `getRendimientoAfiliado()` verificado exacto en
  ambas UIs reales (admin y afiliado): brutas $178.20, netas $162.78, comisión (20%) $32.56.
  Se registró un pago real de $20 desde la UI del admin → saldo pendiente recalculó a $12.56
  en ambas vistas.
- Cancelación real (`testClocks.del()`, cascada customer+subscription+invoices) confirmó que
  `customer.subscription.deleted` sincronizó `suscripciones.estado: 'cancelada'` /
  `tarjetas.plan_id: null`. Limpieza completa: todas las filas de prueba (`afiliados`,
  `afiliado_pagos`, `cupon_usos`, `cupones`, `tarjetas`, `suscripciones`, 2 usuarios de auth)
  borradas y confirmadas en cero; keys de Stripe restauradas a live (diff byte-a-byte
  confirmado idéntico); `npm run build` + `tsc --noEmit` + `eslint` limpios.
- **Race condition real encontrada**: los webhooks de Stripe no garantizan orden —
  `invoice.paid` llegó antes que `checkout.session.completed` terminara de escribir
  `stripe_subscription_id` en la primera compra, así que la búsqueda por ese campo no
  encontraba nada y la fila no se insertaba (fallaba en silencio). Corregido con el mismo
  fallback que ya usa `procesarSuscripcionStripe()`: cae a buscar por `suscripcion_id` en
  `invoice.parent.subscription_details.metadata`.
- **Hallazgo real #1 sobre el fee**: `invoice.payments` NO viene poblado ni en el payload
  completo del webhook — hace falta `expand: ["payments"]` explícito en un
  `stripe.invoices.retrieve()` aparte. Sin este fix, `obtenerPaymentIntentId()` siempre
  devolvía `null` (confirmado con una respuesta ~5ms de más, sin ningún reintento — el código
  ni llegaba a intentar la llamada a Stripe).
- **Hallazgo real #2**: se descartó un handler de `charge.updated` de respaldo (estaba en el
  diseño original) al revisar los tipos reales de `stripe` v22.3.2 instalados: ni `Charge` ni
  `PaymentIntent` tienen campo `invoice` en esta versión — no hay forma de ir de un cobro hacia
  atrás hasta su invoice. Reemplazado por reintentos con backoff dentro del mismo handler de
  `invoice.paid`.

## Cursor pointer en elementos clickeables (2026-07-23)
- Se relevaron los 11 archivos con `onClick` del proyecto y se confirmó que todos están en
  elementos `<button>`/`<Button>` (Base UI, renderiza `<button>` real) — ninguno en un
  `<div>`/`<span>` clickeable sin rol. Única excepción: `Menu.Item` en `compartir-tarjeta.tsx`,
  que ya trae `cursor-default` a propósito (convención shadcn/ui para ítems de menú). Fix: una
  regla global en `globals.css`. Verificado con Playwright real (`getComputedStyle`) en
  `/planes` y `/crear`: 6/6 botones con `cursor: pointer` en ambas.

## Dashboards de métricas — verificación end-to-end
- **Instrumentación** (`POST /api/eventos`, 2026-07-25): verificado con una tarjeta de prueba
  real (`prueba-e2e-metricas-*`, plan activo + 1 servicio agendable + disponibilidad
  completa, creada con service role, borrada por completo al terminar — cascada confirmada
  vía `on delete cascade`): carga real de `/[slug]` → `vista_tarjeta`; clicks en enlaces
  (`target="_blank"` confirmado que sigue abriendo pestaña nueva) → `click_enlace`; "Ver
  producto" → `click_producto`; abrir diálogo de agendar → `click_agendar`; reserva real sin
  pago → `agenda_completada`. Las 6 filas resultantes confirmadas con lectura real (service
  role), no solo por el `200` del network tab. `POST /api/eventos` validado con `curl`:
  `tipo_evento` inválido → `400`, `tarjeta_id` faltante → `400`, tarjeta inexistente → `400`,
  rate-limit de 60/min confirmado cortando (65 requests: ~55 con `200`, resto `429`).
- **Dashboard del dueño (2026-07-25)**: verificado con 2 tarjetas de prueba reales (una por
  tier, `plan_id` seteado directo con service role, eventos reales sembrados incluyendo un
  período "anterior" ~10 días para la comparativa, visitantes con `visitante_hash` repetido en
  2 días distintos para recurrencia). Login inyectado (localStorage con sesión real de
  Supabase Auth, mismo `storageKey` que usa la app). Presencia: 4 tiles + deltas + gráfico sin
  desglose, mensaje de upsell correcto, todos los números coincidieron exactamente con los
  datos sembrados. Poder: mismos tiles + "Rango personalizado" + "Exportar CSV", desglose y
  donut con conteos exactos, CSV descargado y verificado con contenido real. Cero errores de
  consola. Limpieza completa después (2 tarjetas + 2 usuarios borrados, cascada confirmada).
- **Bug real de overflow encontrado**: la fila donut+leyenda de "único vs. recurrente"
  desbordaba su card (`scrollWidth` 286px vs. `clientWidth` 225px reales) en el ancho real de
  la columna del accordion desktop — el número aparecía recortado. Corregido: `flex-wrap` +
  donut de 144px a 112px + `min-w-0`. Verificado tras el fix: "Nuevos: 2", "Recurrentes: 1",
  "3 visitantes únicos en total" totalmente visibles.
- **Bug real de serie plana**: `metricas_diarias` no guarda filas en cero — graficar la serie
  cruda producía una línea recta entre los 2 únicos puntos con datos en 30 días, insinuando
  falsamente una tendencia continua. Se agregó `rellenarSerie()` (capa de presentación) que
  completa cada día con cero explícito antes de pasarlo a `recharts`.
- `npm install recharts` (`^3.10.1`, no estaba instalado pese a que el pedido original
  asumía que sí).
- **Dashboard admin (2026-07-25/26)**: verificado con 6 tarjetas + 5 suscripciones (4
  `autorizada` con precios/periodicidades mixtas + 1 `cancelada` con transición real en
  `suscripciones_historial` fechada retroactivamente) + servicios activos en 2, sembradas vía
  service role, sesión real del admin inyectada (`generateLink` + `verifyOtp` con
  `token_hash`, no destructivo). Cada número coincidió exactamente con el cálculo hecho a mano
  antes de sembrar: MRR total $1,296 (149+299+2990/12+599), churn 20.0% ("1 de 5 canceló"), 4
  tarjetas con plan activo, 25 sin plan, distribución 1/2/1/25 por plan, MRR por plan y uso de
  agenda por plan todos exactos. Limpieza completa después, base verificada de vuelta al
  baseline previo (23 tarjetas, 0 con plan, 0 autorizadas, 13 filas de historial).

## Páginas legales — verificación (2026-07-25)
- Verificado con Playwright real contra el dev server: ambas rutas devuelven `200`,
  título/`h1` correctos, disclaimer presente en las dos.
- Estado al momento de escribirse: sin commitear todavía (`git status` las mostraba como
  untracked) — confirmar en una sesión futura si ya se commitearon.

## Header global + /mi-cuenta — verificación (2026-07-26)
- Verificado con datos reales: 2 usuarios de prueba — uno con 2 tarjetas (la más vieja sin
  foto, la más nueva con `avatarUrl` real de Cloudinary) para probar "la más reciente por
  `created_at`" y el avatar con foto real; otro sin ninguna tarjeta, para el fallback de
  iniciales por email. Confirmado en navegador real (sesión inyectada vía localStorage):
  header sin sesión correcto en las 4 páginas (modal de login funcionando en `/` y `/planes`,
  correctamente ausente en `/crear` y `/editar/[id]`); avatar con foto real; dropdown
  funcional; `/mi-cuenta` listando ambas tarjetas con links correctos; fallback de iniciales
  para el usuario sin tarjetas; logout real confirmado (token en `localStorage` queda `null`
  después). Cero errores de consola. Limpieza completa después.
- **Limitación honesta**: no se pudo confirmar visualmente en viewport mobile real — la
  herramienta de resize de ventana de esa sesión no cambiaba `window.innerWidth` real (mismo
  límite documentado en varias sesiones posteriores). Se verificó por análisis estático del
  CSS: en mobile, `HeaderGlobal` (`z-30`) quedaría por encima del preview a pantalla completa
  de `TarjetaForm` (`z-0`) pero por debajo de la barra inferior (`z-40`) — funcional pero no
  necesariamente el look pulido del modo mobile inmersivo. No es un bug, vale revisión visual
  real cuando se pueda.

## Home + testimonios + tilt 3D — verificaciones y bugs (2026-07-26/29)
- **Bug real de Tailwind v4**: no se puede aplicar una utilidad estática (`scale-*`,
  `translate-*`) Y una animación de keyframes que anime esa MISMA propiedad sobre el mismo
  elemento — la keyframe pisa el valor estático al reproducirse. Resuelto separando cada
  responsabilidad (escala responsiva estática / entrada `fan-in` una sola vez / bobbing
  continuo) en 3 niveles de wrapper anidados, cada uno tocando una única propiedad.
  `--animate-fan-in` nuevo en `globals.css`.
- **Primer intento del abanico de cartas que no funcionó**: centrar cada carta con
  `-translate-x-1/2 -translate-y-X%` y rotarla dejaba las dos de atrás casi 100% ocultas
  detrás de la de enfrente. Corregido anclando las 3 al mismo pivote inferior
  (`left-1/2` + `bottom` + `origin-bottom`), donde la rotación sola ya las abre en abanico.
- **Testimonios**: `CLAUDE.md` decía que la tabla ya existía con seed de 2 placeholders — se
  confirmó contra producción que nunca se había creado (`PGRST205`). Migración
  `20260727020000_add_testimonios.sql` la creó de cero, aplicada y verificada por el usuario.
- **Verificado de punta a punta**: sesión real de admin (magic link real, no destructivo), 3
  testimonios creados desde la UI real (con foto + 5 estrellas, sin foto + sin calificación,
  con foto + 4 estrellas) → aparecieron en el home en orden correcto con fallback de
  iniciales/estrellas condicionales exactos. Reordenar (flecha arriba) confirmado en admin y
  home. Toggle "Inactivo" confirmado desapareciendo del home. Eliminar confirmado (con
  `window.confirm` stubbeado, nunca clickeado un diálogo nativo real). Limpieza completa
  después, tabla confirmada en `[]` con lectura real (service role), home confirmado sin la
  sección de nuevo.
- **Bug real en admin de testimonios**: el `<input type="file">` no se limpiaba visualmente
  tras crear/guardar (el estado sí se reseteaba, pero el input retenía el nombre del archivo).
  Corregido con `inputKey` que fuerza remount (mismo patrón `avatarInputKey` de `TarjetaForm`).
- **Verificación del cupón de lanzamiento + Stripe test (2026-07-29)**: mismo protocolo de
  swap temporal de keys — flujo completo botón del home → `/planes?cupon=LINKARD15` →
  `/crear?plan=alcance&ciclo=anual&cupon=LINKARD15` → login real (magic link) → vuelta a la
  URL con el cupón intacto → "Tu plan" mostró 15% off ($935.00 MXN/año) → Checkout real →
  submit real. Confirmado con 3 fuentes: (1) log de `stripe listen` con
  `checkout.session.completed`, `customer.subscription.created`, `invoice.paid`, los tres
  `200`; (2) query real a Supabase: `estado = 'autorizada'`, `plan_id` sincronizado,
  `precio_final: 935`, fila real en `cupon_usos` (`comision_stripe: 47.95`/`monto_neto:
  887.05`, `afiliado_id: null` — confirma que cupón de lanzamiento y sistema de afiliados
  conviven sin conflicto); (3) el contador bajó de verdad: `fn_cupon_usos_restantes` pasó de
  `33` a `32`, confirmado por RPC directo y recargando el home real. Limpieza completa
  después (Stripe test cancelado/borrado, filas de Supabase borradas, usuario de prueba
  borrado, contador de vuelta en `33`, `.env.local` restaurado a live con diff byte-a-byte).
- **Bug real de header flotante**: el botón "Iniciar sesión" quedaba con texto blanco sobre
  fondo blanco invisible (`bg-background` no se sobreescribía en el header oscuro, solo
  `--foreground`/`--primary`/`--muted`/`--border`). Encontrado con captura + zoom, no por
  linter. Corregido con clases explícitas solo para `variant === "flotante"`.
- **Limitación honesta de mobile**: mismo límite de resize de ventana ya documentado —
  verificado por análisis estático de clases responsive (grid `grid-cols-1 lg:grid-cols-2`,
  abanico escalando `scale-[0.72]`→`sm:scale-[0.85]`→`lg:scale-100`, header limitando ancho y
  ocultando nav en mobile). Sin bugs detectables en el CSS estático, vale revisión real en
  dispositivo cuando se pueda.

## Sistema de personalización avanzada — bugs encontrados y verificación (2026-07-27)
- **2 bugs reales encontrados ANTES de integrar nada**, vía un harness HTML propio con
  capturas reales: el primer intento de "blob orgánico" renderizaba como un círculo liso,
  indistinguible de "circulo" — se iteraron 4 candidatos y se eligió el que se ve claramente
  orgánico. El path del divisor "onda" tenía el borde inferior fijo en `y=100` — como el panel
  de contenido real mide varios cientos de px, eso hubiera recortado (invisible) todo lo que
  quedara debajo; corregido a `y=4000`.
- **`path()` vs porcentajes**: `polygon()` escala solo con el tamaño real del elemento
  (hexágono, estrella, diagonal, zigzag); `path()` con curvas (blob, corazón, onda) usa
  píxeles literales de la caja de referencia — para blob/corazón (renderizados tanto en un
  swatch de 32px como en un avatar de 96px) hace falta un wrapper de 100×100 +
  `transform: scale()`.
- **Verificado con 4 tarjetas de prueba reales** (Presencia/Alcance/Poder + una de
  "regresión" con `identidad_visual` mínima, sesiones inyectadas vía magic link): candados
  correctos en los 3 niveles de plan — la primera verificación (Alcance/Poder) solo disparó el
  candado violeta, así que se sembró una 4ta tarjeta en Presencia para confirmar también el
  ámbar con evidencia real (no solo por código). Probar una opción bloqueada actualiza el
  preview en vivo sin bloquear nada hasta guardar. Aplicar "Aurora Creator" de punta a punta en
  la tarjeta Poder guardó exactamente los campos esperados (confirmado con lectura real de la
  DB) y el efecto vidrio se confirmó a nivel CSS real (`getComputedStyle`:
  `rgba(99,102,241,0.8)` + `blur(12px)`). La tarjeta de "regresión" se ve exactamente igual al
  estilo clásico pre-feature. Limpieza completa después.

## Divisor onda/diagonal/zigzag — historia completa de 2 iteraciones de fix (2026-07-29)
- **Bug 2 del día (primer fix)**: el divisor diagonal/zigzag cortaba avatar/badge/nombre real
  porque `polygon()` porcentual se calculaba sobre la altura TOTAL del panel de contenido
  (dinámica, 200-800px según agenda/servicios/productos). Fix con el mismo patrón que ya tuvo
  "onda": `path()` en píxeles absolutos (`anchoDiseno: 340`), confinado a una franja angosta
  arriba (~40-56px) + rectángulo hasta y=4000. Verificado renderizado con 2 tarjetas de
  prueba: avatar/badge/nombre completos, notch confinado correctamente al borde superior.
- **Fix real #2, mismo día**: el fix anterior seguía roto de una forma distinta, reportada dos
  veces: en cualquier contenedor más ancho que 340px (confirmado con inspección real del
  DOM — el preview del editor mide 368px), quedaba una franja rectangular SIN recortar a la
  derecha, con el degradé del banner "mordiendo" la forma. Causa: `path()` exige TODAS sus
  coordenadas en píxeles absolutos, autorado para 340px fijos — cualquier ancho real distinto
  expone el sobrante.
- **Fix definitivo**: los 3 divisores migraron a `clip-path: polygon()` con unidades MIXTAS
  por punto — X en `%` (escala con cualquier ancho), Y en `px` fijos (el panel tiene alto
  dinámico, no puede ser `%` sin recortar contenido real debajo). CSS permite mezclar `%`/`px`
  por punto en `polygon()`, a diferencia de `path()` (todo o nada en píxeles). "Onda" se
  remuestreó punto por punto de la curva bezier original (14 puntos por tramo) para no cambiar
  el aspecto visual ya aprobado. `anchoDiseno` desapareció; `SwatchDivisor` solo necesita
  `scaleY` (`ALTO_REFERENCIA_DIVISOR = 56`, coincide con `-mt-14`).
- Verificado con inspección real del DOM (pedido explícito, no solo lectura de código) +
  capturas reales en 2 tarjetas distintas y 2 anchos reales distintos (~318px página pública,
  368px preview del editor): banner rectángulo intacto (`clip-path: none` confirmado por
  computed style) en los 3 casos, forma extendida limpiamente de borde a borde sin remanente
  rectangular, picker con los 4 swatches bien proporcionados. Datos de prueba borrados
  después.

## Imagen de fondo / fondo de tarjeta / reposicionar imagen — verificación completa (2026-07-29)
- 2 tarjetas de prueba reales (una Poder, otra Alcance, cada una con su propio usuario,
  sesiones inyectadas vía magic link) + 2 imágenes de prueba generadas localmente (PNG con
  franjas de color para banner, PNG con degradé para imagen de fondo).
- Tarjeta Poder: banner subido y repositionado (thumbnail y preview en vivo coinciden),
  imagen de fondo subida/repositionada/confirmada mutuamente excluyente con el banner,
  divisor diagonal confirmado revelando imagen cruda vs. frosted, efecto Vidrio activado,
  Fondo de la tarjeta en modo avanzado (radial, navy → gris) guardado y confirmado con lectura
  real de la DB (`bannerPosicion: {x:50,y:100}`, `glassmorfismo:true`,
  `fondoTarjetaModo:"avanzado"`, `fondoTarjetaTipoDegradado:"radial"`, todo exacto) —
  confirmado también en la tarjeta pública real (`/prueba-personalizacion-poder`).
- Tarjeta Alcance: los 4 candados Poder (imagen de fondo, avatar/divisor exóticos, vidrio,
  fondo de tarjeta avanzado) confirmados, fondo de tarjeta simple sin candado, bloqueo real de
  guardado confirmado con el aviso ámbar exacto. Limpieza completa después: ambas tarjetas y
  sus 2 usuarios de prueba borrados. `npm run build` + `tsc --noEmit` + `eslint` limpios en
  cada paso.

## Panel admin: alta manual + reasignación — verificación (2026-07-30)
- Migración `20260729010000_add_suscripciones_manual.sql` — se verificó con un select real que
  `registrado_por`/`nota_manual` ya existían antes de implementar el resto. El nombre del
  constraint de `proveedor` se buscó vía `pg_constraint` en vez de asumirlo (era
  `suscripciones_proveedor_check`, autogenerado por Postgres).
- Confirmado contra la API real (no asumido) que `GET {SUPABASE_URL}/auth/v1/admin/
  users?filter=<email>` con el service role key busca por email exacto — probado con un email
  real (lo encontró) y uno inexistente (`200` con `users: []`).
- **Verificado de punta a punta con sesión real de admin** (magic link a
  `emuna.interno@gmail.com`): tarjeta sin plan → activar manualmente Alcance mensual $550 con
  nota → confirmado con lectura real de la DB (`estado: 'autorizada'`, `proveedor: 'manual'`,
  `precio_base: 129`, `precio_final: 550`, `descuento_aplicado: 0` —clampeado correctamente
  porque el costo superaba el precio de lista—, `registrado_por` y `nota_manual` exactos,
  `fecha_renovacion` un mes después) y `tarjetas.plan_id` sincronizado. Reintentar el alta en
  la misma tarjeta mostró el aviso correcto de "ya tiene una suscripción autorizada" en vez de
  duplicarla. Tarjeta sin dueño → reasignar a un email real (funcionó, confirmado en DB) y a
  un email inexistente (mensaje claro). Confirmado que `/mi-cuenta/tarjetas` sigue enlazando a
  `/editar/{id}` sin cambios. Limpieza completa después. `npm run build` + `tsc --noEmit` +
  `eslint` limpios.

## Secciones tipo catálogo — verificación (reemplazo de "Servicios", 2026-07-29/30)
- Verificado de punta a punta en una sesión posterior (2026-07-30), antes de pushear: `npm run
  build` + `tsc --noEmit` + `eslint` limpios, y verificación real en navegador con 2 tarjetas
  de prueba (una Presencia con modelo LEGACY de servicios, otra Poder con
  `seccionesServicios` nuevo): conversión legacy→nuevo confirmada en memoria al abrir el
  editor (título custom + 2 ítems con su descripción, sin precio, exactamente como debía),
  agregar secciones hasta el tope real de Poder (3, sin candado — es el plan más alto) y
  candado real "Alcance" al tope de Presencia (1), folleto solo en la sección [0], modal de QR
  con z-index correcto (la primera captura que pareció "roto" era la animación de entrada a
  mitad de camino, confirmado con una segunda captura ya asentada), botones de compartir/QR
  dejando de tapar el footer al hacer scroll, y CTA del footer como botón píldora. La
  migración de datos `20260729020000_add_secciones_servicios_max_feature.sql` ya estaba
  aplicada (confirmado con lectura real de `planes.features` antes de probar nada). Tarjetas y
  usuarios de prueba borrados después.

## Editor unificado + tipografía ampliada + slug editable — verificación completa (2026-08-01/02)
> Nota de proceso: el código de esta feature lo escribió originalmente Claude en Cowork (no
> Claude Code) — sandbox sin `git`/red real hacia `registry.npmjs.org`, sin `npm run build`
> real, sin navegador. Se aplicó directo sobre los archivos del repo (pedido explícito del
> cliente). Todo lo que quedaba pendiente de esa sesión se completó y confirmó en una sesión
> de Claude Code posterior (2026-08-01/02), que es lo que sigue.
- **Investigación previa de un error reportado por el cliente**: `ERROR: 42P01: relation
  "public.tarjetas" does not exist` al correr una query desde el sandbox de Cowork.
  Descartado como problema real: confirmado con una query directa contra el proyecto real
  (`wsvamfgebmhrmjsiceij`) que `tarjetas` existe y es consultable, y que `schema.sql` ya la
  define con `id uuid`. Causa real: la query del sandbox no apuntaba a la base real (sin
  `supabase` CLI/`DATABASE_URL` ahí) — no un problema de la migración ni de producción.
- ✅ `npm run build` real — compiló limpio, incluidas las 6 fuentes nuevas de
  `next/font/google` resueltas en build time sin error. `eslint` también limpio. Fuerte
  indicio adicional de que los `weight` de cada fuente están bien puestos: `next/font/google`
  genera tipos TypeScript estrictos y distintos según si una fuente es variable o estática —
  si algún `weight` estuviera mal, `tsc --noEmit` habría fallado, y corrió limpio.
- ✅ **Bloque A verificado con una tarjeta real tipo "empresarial" con datos legacy**
  (`nombreEmpresa`/`giro`/`telefonoCorporativo`, sin los campos nuevos): el editor precargó
  "Título"/"Rol o descripción"/teléfono correctamente desde el fallback legacy, sin toggle
  Personal/Empresarial. Al guardar, `datos_contacto` se reescribió al modelo nuevo, confirmado
  con lectura real de la DB.
- ✅ **Bloque B verificado en vivo**: dropdown de 9 fuentes con preview real por ítem, sliders
  de tamaño (20-40px) y peso (600-800) moviendo el título del preview en tiempo real, color de
  título aplicándose al instante (color real probado), todo dentro de "Datos esenciales".
- ✅ **Bloque C verificado en 2 niveles**:
  1. **Cliente**: 2 cambios de slug seguidos en la misma sesión guardaron bien (confirmado
     contra la DB real cada vez), el contador bajó "2→1→0 de 2" en vivo sin recargar, y el 3er
     intento se bloqueó en la UI con el botón "Guardar cambios" realmente `disabled`
     (confirmado por JS, no solo visual).
  2. **Base de datos, después de aplicada la migración**: 3 UPDATEs directos reales (vía
     service role, bypassea la UI por completo) — los primeros 2 pasaron, el 3ro fue
     **rechazado por el trigger** (`limite_cambio_slug_alcanzado`), `tarjeta_slug_historial`
     quedó con exactamente 2 filas (el intento bloqueado no dejó rastro) y el slug final
     quedó en el del 2do cambio, no en el 3ro. Confirma que el límite ya es imposible de
     bypassear saltándose la UI, no solo decorativo.
  - Nota real encontrada en el camino (falso positivo de verificación, no un bug): el primer
    intento de guardar pareció no hacer nada porque se revisó la red del navegador demasiado
    pronto/con el monitoreo activado después del click. Reintentando con la consola y red
    monitoreadas desde antes del click se confirmó el PATCH real (`204`) y el banner "✓
    Cambios guardados." (aparece arriba de la página, separado del ícono ✓ que ya es parte
    fija de la etiqueta del botón — no confundir uno con otro al verificar visualmente).
  - Todos los datos de prueba (tarjetas, usuarios, filas de historial) se borraron después de
    cada verificación.
