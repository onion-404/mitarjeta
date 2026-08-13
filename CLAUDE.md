@AGENTS.md

# Estado del negocio y la arquitectura (mitarjeta)

> Última actualización: 2026-08-16. Fuente de verdad para que una sesión nueva entienda el
> estado real del proyecto sin releer el historial de chat. Actualizar cuando cambie algo de
> lo que describe. **Para el detalle histórico de verificaciones, bugs encontrados en el
> camino, capturas de pantalla y logs de sesiones anteriores, ver [HISTORIAL.md](HISTORIAL.md)
> — este archivo se mantiene compacto a propósito.**

## Nombre del producto: "Linkard" (linkard.mx)
- Marca visible: **Linkard**, dominio real **linkard.mx** (conectado en Vercel).
  "mitarjeta"/"Mi Tarjeta" era el nombre interno original, ya no aparece en UI/metadata/copy.
- **La carpeta del repo, nombre técnico y todo identificador interno siguen siendo
  "mitarjeta" A PROPÓSITO** (decisión explícita del cliente) — no renombrar. Incluye
  deliberadamente sin cambiar:
  - Tablas/columnas de Supabase.
  - Carpetas de Cloudinary (`mitarjeta/avatars`, `/banners`, `/productos`, `/brochures`,
    `/fondos`, `/testimonios`, `/servicios` en `cloudinary-sign/route.ts` y `tarjeta-form.tsx`).
  - Nombres reales de las apps en Mercado Pago: "mitarjeta" y "mitarjeta-suscripciones".
  - `PENDIENTE_KEY = "mitarjeta_pendiente"` en `reclamo.ts` (clave de `localStorage`).
  - `package.json` → `"name": "linkard"` sí se cambió (metadata de build, sin referencias).
- **Logo**: `src/components/logo.tsx` (`<Logo />`) — triángulo `▲` Unicode en `text-primary` +
  "Linkard" (sin punto final — se quitó por la verificación de marca de Google, ver abajo) en
  Sora bold 700 (`--font-logo`, cargada en `layout.tsx`). Reutilizado en header/footer/login/
  admin/OG images.
- **Favicon**: `src/app/icon.tsx` + `apple-icon.tsx` (nativo de Next.js, `ImageResponse`, sin
  dependencias nuevas) — triángulo solo sobre `#171717`.
- **OG / Twitter Card**: `src/app/opengraph-image.tsx` (imagen genérica del sitio) +
  `src/app/[slug]/opengraph-image.tsx` (imagen dinámica por tarjeta — usa
  `identidad_visual.colorPrimario/colorSecundario`, avatar de Cloudinary convertido a data URI
  antes de renderizar, fallback a iniciales si falla, fallback a la imagen genérica si la
  tarjeta no existe o `plan_id` es null). Lógica compartida en `src/lib/og.tsx`
  (`cargarSoraBold()`, `renderOgImageGenerico()`). `layout.tsx` define `metadataBase` con
  `NEXT_PUBLIC_SITE_URL`.
- 🔴 **Pendiente manual**: confirmar que `NEXT_PUBLIC_SITE_URL=https://linkard.mx` esté
  seteada en Vercel (Environment Variables) y redeploy — sin esto las URLs absolutas de OG
  resuelven mal en producción.

## Modelo de negocio
- Link-in-bio + agenda de servicios + venta de productos.
- El plan vive en la TARJETA, no en el usuario — un usuario puede tener varias tarjetas, cada
  una con su plan/suscripción independiente.
- **2 planes de pago en tabla `planes` (2026-08-11, reemplaza el modelo anterior de 3
  tiers)**: `connect` ("Linkard Connect") y `growth` ("Linkard Growth") — no hay tier
  gratuito. Ya no es una escalera de tiers (más caro = más funciones): **ambos planes
  otorgan exactamente las mismas features/límites de personalización y funciones del
  editor** (`personalizacion_libre`, `personalizacion_avanzada`, `secciones_servicios_max`,
  `servicios_agendables_max`, `marca_plataforma_oculta`, `comision_venta_pct` — todos
  idénticos en ambos) — **la única diferencia real es que Growth incluye estadísticas
  (`metricas_activas`+desglose+rango custom+exportación, las 4 juntas) y Connect no incluye
  ninguna** (ni siquiera los tiles básicos — bloqueo total, no parcial). Los 2 planes están
  pensados para audiencias distintas, no para niveles de un mismo escalón: Connect
  (servicios profesionales, salud/belleza/bienestar, comercios locales) vs. Growth
  (creadores/influencers, empresas/agencias, e-commerce con pauta paga) — copy de marketing
  completo en `src/lib/planes-copy.ts` (`COPY_PLAN`, usado por `ComparativaPlanes` en
  `/planes` y por el teaser `PreciosDestacados` del home).
  - Migración `20260811000000_planes_connect_growth.sql` — **APLICADA en producción** (el
    usuario la corrió y esta sesión confirmó por consulta real: `planes` tiene exactamente
    `connect`/`growth` con las features esperadas). Verificado antes de escribirla que
    `presencia`/`alcance` no tenían ninguna tarjeta ni suscripción real apuntándoles — se
    reutilizaron los `id` de `alcance`→`connect` y `poder`→`growth` (rename in-place, cero
    impacto en FKs) y se borró `presencia`; las 4 suscripciones reales que ya existían
    (estado `autorizada`, proveedor `manual`, todas en `poder`) quedaron mapeadas a `growth`
    sin tocar ninguna fila de `tarjetas`/`suscripciones`. Precios: se conservaron los que ya
    estaban vigentes en Alcance/Poder (no fue un pedido de este cambio ajustar precios) —
    editables en `/admin/configuracion`.
  - `recordatorios_automaticos` se sacó del comparador público (`comparativa-planes.tsx`):
    no es una feature construida todavía (ver "Diferido a fase posterior" más abajo,
    confirmación por WhatsApp vía Make) — mostrarla habría sido una promesa falsa a
    cualquiera de los 2 planes.
  - El sistema de gating por tier (`TierPersonalizacion` "basica"/"avanzada",
    `calcularBloqueos`/`estaBloqueada` en `lib/personalizacion.ts`, `<CandadoPlan>`) se
    mantuvo sin refactor grande — solo se renombraron los literales `"alcance"|"poder"` a
    `"connect"|"growth"` donde aparecían (tipos, labels, comentarios). Como ambos planes
    reales otorgan `personalizacion_libre`/`personalizacion_avanzada` por igual, el candado
    ya NUNCA se dispara para una tarjeta con cualquiera de los 2 planes activos — sigue
    disparándose solo para una tarjeta SIN plan (antes de suscribirse). Queda como deuda
    técnica identificada (no resuelta a propósito, fuera de alcance de este cambio): el
    sistema de 2 tiers "basica"/"avanzada" ya no tiene sentido real con solo 2 planes que
    valen lo mismo en este eje — un refactor futuro podría colapsarlo a un solo gate binario
    "¿tiene plan activo o no?".
- Descuento para tarjetas adicionales del mismo usuario:
  `configuracion.descuento_tarjeta_adicional_pct`, aplicado vía
  `posicion_tarjeta_para_usuario()`.
- `tarjetas.plan_id` **sin DEFAULT** — una tarjeta nace con `plan_id = null` hasta tener una
  suscripción `'autorizada'` real. `plan_id_por_defecto()` existe sin uso como default.
- **No existe creación como invitado** — `/crear` exige sesión antes de mostrar el formulario.
  `reclamo.ts` (reclamar tarjeta de invitado por `localStorage`) sigue existiendo solo para
  tarjetas viejas con `user_id null` creadas antes de este cambio — no conectado al flujo
  nuevo. `<ReclamarTarjeta>` sigue en `/pago/exito`/`/pago/pendiente` por lo mismo.

## Copy de marketing de planes: "Lo que incluye" + ahorro en pesos (2026-08-11)
- `src/lib/planes-copy.ts` (`COPY_PLAN`) ganó `incluye: ItemIncluye[]` — lista curada a mano
  por el cliente (no auto-generada desde `planes.features`, a diferencia del comparador
  anterior) con lo que muestra cada plan en `/planes` (`ComparativaPlanes`, reemplaza la vieja
  tabla genérica de `plan.features`) y en el teaser del home (`PreciosDestacados`, mismo
  contenido, estilo oscuro). `comision_venta_pct`/`marca_plataforma_oculta` (0%/oculta en
  ambos planes) ya no se muestran en ningún comparador — el cliente dio una lista cerrada de
  ítems y no pidió sumar esos dos, se dejaron fuera a propósito.
- **Ahorro anual mostrado en pesos, no en %** (pedido explícito, "más atractivo visualmente"):
  `Math.round(plan.precio_mensual * 12 - plan.precio_anual)` en vez del cálculo de porcentaje
  de antes, en los 2 lugares (`ComparativaPlanes` con toggle mensual/anual, `PreciosDestacados`
  siempre contra el anual).
- **Verificación real de cada ítem contra el código antes de publicarlo** (pedido explícito
  del cliente) — de los 17 ítems totales (7 Connect + 10 Growth) se encontraron **7 que no
  tienen código real detrás todavía**. Decisión del cliente, con el riesgo asumido
  conscientemente: publicarlos igual, tal cual, sin marca de "Próximamente". Quedan
  documentados acá como los próximos ítems a construir, por orden de aparición en el copy:
  - ✅ **Reales y verificados hoy**: visitas/clics ilimitados (sin tope de plan), QR dinámico
    (apunta a la URL de la tarjeta, no a contenido fijo — igual ver caveat abajo), cobro de
    citas online (Mercado Pago Checkout Pro), personalización avanzada (ambos planes desde la
    migración de 2 planes), desglose de clics por enlace/botón, rango de fechas
    personalizado y tasa de conversión de agenda (estos 2 solo existen en `EstadisticasTarjeta`
    — la vista POR TARJETA del editor — no en el dashboard agregado `/mi-cuenta/estadisticas`,
    que no tiene selector de rango custom ni calcula conversión; no es un ítem falso, es un
    ítem real con alcance más angosto de lo que un lector podría asumir), exportación CSV
    (mismo caveat: solo en la vista por tarjeta, no en el agregado).
  - 🔴 **Publicados sin tener código real — pendiente construir "en el próximo paso" (mandato
    explícito del cliente, no un olvido)**:
    1. **Sincronización de agenda con Google Calendar** (Connect) — cero referencias en el
       código a la API de Google Calendar. Ver también "Diferido a fase posterior" más abajo,
       donde ya estaba anotado como candidato a feature futura.
    2. **Fuentes de tráfico y canales de procedencia** (Growth) — requiere capturar
       UTM/referrer al momento de `vista_tarjeta` (`lib/eventos.ts`) y agregarlo por canal.
    3. **Analítica geográfica y de dispositivos** (Growth) — requiere geoIP (por IP del
       request) + parseo de User-Agent, ninguno de los dos existe hoy.
    4. **Integración de píxeles de seguimiento** (Meta Pixel, Google Tag Manager, TikTok
       Pixel) (Growth) — requiere que el dueño pueda pegar sus propios IDs de píxel (campo
       nuevo en `IdentidadVisual` o similar) + inyectar los scripts correspondientes en
       `[slug]/page.tsx`.
    5. **Reporte mensual automatizado a tu correo** (Growth) — requiere un proveedor de envío
       de emails (no hay ninguno integrado hoy, ni Resend ni SMTP ni similar) + un cron/job
       mensual que arme y envíe el resumen.
    6. **Parámetros UTM personalizados** (Growth) — requiere que el dueño pueda definir UTMs
       propios por enlace/botón y que el click los preserve hacia la URL de destino.
  - **Recordatorio programado por WhatsApp** ("Cero ausencias", Connect) es un caso intermedio,
    no está en la lista de 6 arriba porque SÍ hay código real funcionando — pero es una
    confirmación al momento de agendar, no un recordatorio programado antes de la cita (ver
    detalle completo en "Confirmación de agenda por WhatsApp vía Make" más abajo).

## Voseo → tuteo (español de México), barrido completo del sitio (2026-08-11)
- **Hallazgo real**: parte del copy (marketing y producto) se había escrito en voseo
  rioplatense ("tenés", "podés", "elegí", "vos", "sos", "Iniciá sesión", "Cancelala",
  "Probá", etc.) en vez de tú/español de México — reportado por el cliente encontrando un
  caso puntual en el home (`precios-destacados.tsx`, "elegí el que se ajuste a vos hoy").
  Al auditar para corregir ESE caso se confirmó que el patrón era transversal a todo el
  sitio, no solo el home — decisión del cliente: corregirlo en todos lados, no solo ahí.
- **Método**: grep iterativo con distintas familias de patrones de voseo (pronombre `vos`/
  `sos`, presente indicativo 2ª persona `-és`/`-ís` de verbos irregulares como
  tener/poder/querer/saber, imperativo con tilde en la última sílaba `-á`/-é`/`-í` tanto en
  minúscula media-frase como con mayúscula inicial de oración, imperativo reflexivo con
  enclítico tipo "Cancelala"/"Suscribite") — cada ronda de grep encontraba instancias nuevas
  que la ronda anterior no cubría (los verbos irregulares no siguen un patrón de sufijo
  único), así que se repitió hasta 2 rondas consecutivas sin hallazgos nuevos. Falsos
  positivos descartados a mano en cada ronda (palabras que terminan en -ás/-és/-ís sin ser
  verbos: "después", "detrás", "través", "además", "demás", "Café").
  También se corrigió 1 caso de "acá" (regionalismo, no error gramatical) en
  `admin/configuracion/page.tsx` → "aquí" — el resto de las ~45 apariciones de "acá" en el
  código son comentarios de desarrollo (no visibles al usuario), no se tocaron.
- **Alcance real corregido**: ~47 strings de cara al usuario en 32 archivos — mensajes de
  error de rutas API (`/api/citas`, `/api/stripe/*`, `/api/suscripciones`, `/api/admin/*`,
  `/api/checkout`, `/api/eventos`, `/api/cloudinary-sign`), páginas completas
  (`/mi-cuenta/*`, `/editar/*`, `/admin/tarjetas/[id]`, `/crear`, `/pago/error`, `/planes`),
  y el editor de tarjeta (`tarjeta-form.tsx`, `agenda-servicios.tsx`, `reservar-servicio.tsx`,
  `plantillas-galeria.tsx`, `recortar-avatar.tsx`, `estadisticas-tarjeta.tsx`, etc.).
  Criterio de traducción: verbos irregulares con la conjugación correcta de tú (no un
  simple cambio de sufijo — "podés"→"puedes", "querés"→"quieres", no "podes"/"queres").
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios tras el barrido
  completo — sin cambios de lógica, solo texto literal dentro de strings/JSX existentes.
- 🔴 **No es una garantía absoluta de cero voseo restante** — el barrido fue exhaustivo
  (múltiples rondas de grep con patrones distintos hasta agotar hallazgos) pero manual sobre
  ~47 instancias reales; contenido dinámico de la DB (testimonios, nombres de cupones,
  texto libre que un dueño de tarjeta escriba en su propia Bio/servicios) queda
  deliberadamente fuera de este alcance — no es código de la plataforma.

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
  (dispara `registrarCobroDeCupon`, ver sistema de afiliados) — todos re-consultan el objeto
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

## Agenda de servicios
- Pago OPCIONAL por servicio, default contra entrega (`requiere_pago_inmediato: false`).
  Duración variable por servicio.
- Disponibilidad híbrida: `disponibilidad_semanal` (recurrente) + `disponibilidad_excepciones`
  (puntual), en hora LOCAL del dueño (`tarjetas.zona_horaria`, default
  `America/Mexico_City`). Conversión a UTC con `Intl.DateTimeFormat` nativo en `lib/agenda.ts`
  (sin librería de fechas nueva).
- Comisión modelo Didi/Rappi: corte manual vía tabla `liquidaciones`, admin marca pagado tras
  transferir — sin automatización de transferencias.
- `/pago/exito`, `/pago/pendiente`, `/pago/error` bifurcan por `tipo` (`"tarjeta"|"cita"`,
  del prefijo de `external_reference`). Datos de cita leídos con `lib/citas.ts`
  (`getCitaParaConfirmacion`, service role, solo presentación).
- Editor de agenda: `src/components/tarjeta/agenda-servicios.tsx`, sección "Agenda" de
  `TarjetaForm` (solo en edición). Escribe directo a Supabase (RLS de owner) con optimistic
  update + reversión si falla. Valida `servicios_agendables_max` del plan antes de crear.
- Si `tarjeta.plan_id` es `null`, la sección Agenda se bloquea ENTERA (mensaje de upsell), sin
  consultar Supabase.
- **Vista pública**: `TarjetaCard` con props `permitirAgendar`/`tarjetaId`/`zonaHoraria` (solo
  `/[slug]/page.tsx` las pasa). Cada servicio abre `reservar-servicio.tsx` (Dialog Base UI) →
  fecha → `GET /api/citas/disponibilidad` → datos del cliente → `POST /api/citas`. Sin pago:
  confirmación en el modal. Con pago: redirect a `initPoint`. 409 (horario tomado) muestra
  mensaje claro sin perder datos ya escritos.
- `obtenerSlotsDisponibles()` filtra horarios de HOY ya pasados (`Date.now()`) antes de
  devolverlos.
- `formatearFechaHoraLocal`/`formatearHoraLocal` viven en `lib/fecha.ts` (sin `"server-only"`,
  usado tanto en servidor como cliente).
- **Gating por plan en la vista pública, doble capa**: `getServiciosAgendablesActivos()`
  (`lib/tarjetas.ts`) filtra `plan_id IS NOT NULL` a nivel de aplicación; las policies
  `servicios_agendables_select_publica`, `disponibilidad_semanal_select_publica`,
  `disponibilidad_excepciones_select_publica` también lo exigen a nivel RLS (migración
  `20260725000000_endurecer_rls_servicios_agendables_plan.sql`, aplicada) — no depende de un
  solo punto de acceso.

## Patrón de UI del editor principal (TarjetaForm)
- Patrón Linktree: **desktop** sin cambios (grid 2 columnas, accordion
  `@base-ui/react/accordion`). **Mobile**: preview a pantalla completa (`fixed inset-0`) +
  barra fija inferior (botón Guardar/Crear + tabs horizontales scrolleables). Tocar un tab
  abre un `Drawer` de `@base-ui/react/drawer` (bottom sheet) sobre el preview.
- Cada sección define su JSX una sola vez (`contenidoDiseno`, etc.) y se reutiliza tanto en
  el `Accordion.Panel` desktop como en el `Drawer.Popup` mobile.
- Referencia a seguir para cualquier sección nueva del editor (agregar id al array
  `SECCIONES`, no reinventar el patrón).
- **Enlace (slug) siempre editable, con verificación en vivo y límite 2 cambios/14 días** — ver
  sección "Editor unificado" más abajo (feature más reciente).

## Convenciones de UI
- Todo elemento clickeable (`button`/`[role="button"]`) tiene `cursor: pointer` vía una regla
  global en `globals.css` (`@layer base`) — no se setea por className individual. Excepción a
  propósito: `Menu.Item` en `compartir-tarjeta.tsx` usa `cursor-default` (convención shadcn/ui
  para ítems de menú).

## Diferido a fase posterior (NO construir salvo instrucción explícita)
- Integración Google Calendar (candidato a feature de plan "poder").
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
- **🔴→✅ Confirmación de agenda por WhatsApp vía Make — YA CONSTRUIDA (2026-08-11), pendiente
  de commitear.** Lo que decía esta sección hasta la sesión anterior ("en otro paso, sin
  diseñar ni construir") quedó desactualizado — hay código real funcionando en el working
  tree (`src/lib/notificaciones-agenda.ts`, nuevo, sin trackear en git + cambios sin commitear
  en `src/app/api/citas/route.ts`, `src/lib/confirmar-pago.ts`, `src/components/tarjeta/
  reservar-servicio.tsx`). `notificarNuevaCita(citaId)` dispara un `POST` server-side a
  `MAKE_WEBHOOK_AGENDA_URL` (seteada en `.env.local` con una URL real) con los datos de la
  cita (tarjeta, cliente, cita) — Make arma los 2 mensajes (uno al cliente, uno al dueño) del
  lado de su propio conector de WhatsApp Business API, este proyecto no sabe nada de
  templates/Meta. Se llama desde 2 puntos (mismo criterio que `agenda_completada` en
  `eventos_metricas`): `/api/citas/route.ts` cuando la cita queda `'confirmada'` sin pago
  inmediato, `confirmar-pago.ts` cuando el pago se confirma y queda `'pagada'` — nunca antes de
  que la cita esté de verdad confirmada. Tolerante a fallos a propósito (si Make está caído o
  la env var no está seteada, solo loguea y sigue, nunca rompe el flujo real de agendar/pagar).
  El campo de contacto del cliente en `reservar-servicio.tsx` pasó de "Teléfono o email" a
  exigir teléfono (`TELEFONO_REGEX`, validación liviana) — Make necesita un número real, un
  email ya no alcanza.
  - **Es una CONFIRMACIÓN al momento de agendar, no un recordatorio programado antes de la
    cita** — importante para el copy de marketing: "Recordatorios y notificaciones... Cero
    ausencias" (ver `lib/planes-copy.ts`) describe una función de reducción de no-shows más
    amplia (recordatorio la víspera/el día de la cita) que todavía no existe — hoy es un solo
    mensaje disparado en el momento de la reserva/pago. Publicado igual en el comparador por
    decisión explícita del cliente (2026-08-11) — 🔴 pendiente real: construir el recordatorio
    programado (no solo la confirmación) para que el copy sea 100% preciso.
  - 🔴 **Pendiente**: commitear estos 4 archivos (hoy sin commit). Sin explorar todavía: si
    Make dispara el mensaje él mismo o hace falta algo más de nuestro lado — parece que no,
    ya está funcionando end-to-end con la URL real configurada.

## Estado de la base de datos (producción, sin ambiente de staging)
Todas las migraciones siguientes están **APLICADAS** en producción (confirmadas por consulta
real desde esta sesión salvo que se indique lo contrario):
- `20260716120000_add_planes_suscripciones_metricas.sql` — `planes` (seed), `tarjetas.plan_id`,
  `suscripciones`, `configuracion.descuento_tarjeta_adicional_pct`, `eventos_metricas`,
  `metricas_diarias` + trigger de rollup.
- `20260717100000_add_agenda_servicios.sql` — `servicios_agendables`,
  `disponibilidad_semanal`, `disponibilidad_excepciones`, `citas`, `liquidaciones`.
- `20260717180000_add_plan_default_y_zona_horaria.sql` — default de `plan_id` (después
  revertido) + `tarjetas.zona_horaria`.
- `20260717210000_add_suscripciones_cupon_codigo.sql` — `suscripciones.cupon_codigo`.
- `20260717230000_drop_default_plan_id_tarjetas.sql` — quita el DEFAULT de `plan_id`.
- `20260721000000_add_stripe_suscripciones.sql` — `suscripciones.proveedor`,
  `stripe_customer_id`, `stripe_subscription_id`, `stripe_checkout_session_id`.
- `20260725000000_endurecer_rls_servicios_agendables_plan.sql` — exige `plan_id IS NOT NULL`
  en las 3 policies públicas de agenda (confirmado por el usuario, no verificado desde esta
  sesión — sin `supabase` CLI vinculado).
- `20260725010000_add_suscripciones_historial.sql` — tabla `suscripciones_historial` +
  trigger AFTER UPDATE en `suscripciones` + backfill de un punto de anclaje. **Limitación
  aceptada**: el churn que muestra el dashboard admin solo es preciso desde 2026-07-25 en
  adelante (no retroactivo — el backfill es un ancla, no una reconstrucción del pasado).
  Confirmado por el usuario, no verificado desde esta sesión.
- `20260725020000_add_eventos_metricas_visitante_hash.sql` — `eventos_metricas.visitante_hash`
  + índice `(tarjeta_id, visitante_hash)`. Confirmado por el usuario.
- `20260726000000_add_cupones_avanzado.sql` — `cupones.afiliado_nombre/fecha_vencimiento/
  limite_usos`, tabla `cupon_usos`, función `fn_cupon_es_valido()`.
- `20260727000000_add_sistema_afiliados.sql` — tablas `afiliados`, `afiliado_pagos`,
  `cupones.afiliado_id`, `cupon_usos.afiliado_id/stripe_invoice_id/comision_stripe/
  monto_neto`.
- `20260727010000_fix_cupon_usos_stripe_invoice_id_unique.sql` — fix de constraint único (ver
  nota técnica en la sección de afiliados abajo).
- `20260727020000_add_secciones_servicios_max_feature.sql` — `planes.features.
  secciones_servicios_max` (presencia=1, alcance=2, poder=3).
- `20260727030000_add_personalizacion_avanzada_feature.sql` — `planes.features.
  personalizacion_avanzada`.
- `20260729000000_add_fn_cupon_usos_restantes.sql` — función `fn_cupon_usos_restantes()`.
- `20260729010000_add_suscripciones_manual.sql` — agrega `'manual'` al constraint de
  `suscripciones.proveedor` + columnas `registrado_por`/`nota_manual`.
- 🔴 **`20260801000000_add_tarjeta_slug_historial.sql` — SIN APLICAR en producción** (ver
  sección "Editor unificado" abajo). El límite de 2 cambios/14 días de slug NO está enforced
  todavía a nivel de DB — el chequeo del cliente es puramente decorativo hasta que se corra.
  Pendiente de que el usuario la corra manualmente (backup primero).
- `20260810000000_add_agenda_intervalo_colchon.sql` — `tarjetas.intervalo_agenda_minutos`,
  `servicios_agendables.colchon_minutos`, `existe_solapamiento_cita()` actualizada con
  `p_colchon_minutos`. Confirmada aplicada por consulta real desde esta sesión (columnas +
  RPC responden sin error).
- `20260811000000_planes_connect_growth.sql` — 3 planes → 2 (`connect`/`growth`, ver "Modelo
  de negocio" arriba). **APLICADA en producción**, corrida por el usuario y confirmada por
  consulta real desde esta sesión (`planes` devuelve exactamente esas 2 filas con las
  features esperadas).

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

## Páginas legales
- `/politica-privacidad` y `/condiciones-servicio` — server components estáticos, mismo
  patrón visual que `/login`. Contenido específico: datos vía Google OAuth/Stripe/Mercado
  Pago/Supabase (hosting EE.UU.)/Cloudinary, derechos ARCO (LFPDPPP México), aclaración de que
  cancelar suscripción hoy es solo por contacto directo (sin autogestión). Ambas terminan con
  disclaimer de "borrador inicial, revisión legal pendiente". Email de contacto usado:
  `emuna.interno@gmail.com` (placeholder temporal — reemplazar cuando exista soporte
  dedicado). Enlazadas desde el footer del home.
- 🔴 **Cliente OAuth propio de Google: PENDIENTE** — falta configurar en Google Cloud Console
  (pantalla de consentimiento, publicar la app) y/o Supabase (Authentication → Providers).
  Fuera del alcance del repo.
- 🔴 **Verificación de marca de Google, primer intento rechazado** — 2 problemas de contenido
  ya corregidos en `page.tsx` (sección "¿Qué es Linkard?" con propósito explícito, eyebrow con
  el nombre de marca) y en `logo.tsx`/`opengraph-image.tsx` (se quitó el punto final del
  wordmark). **No reenviado todavía** a revisión de Google.
- 🔴 **Estado real según el usuario**: sigue pendiente por el registro TXT del dominio
  (verificación de propiedad de `linkard.mx`) — DNS, no código. **Contingencia mientras
  tanto**: agregar usuarios de prueba manualmente en la pantalla de consentimiento OAuth
  (modo "Testing" de Google permite login sin verificación completa para una lista de
  correos).

## Header global + /mi-cuenta
- `src/components/header-global.tsx` (`<HeaderGlobal />`, client): logo a la izquierda; sin
  sesión, botón que abre un `Dialog` con `<AuthMethods redirectTo={pathname}>` (no hay ruta
  genérica de login reusable, `/login` es solo admin); con sesión, avatar (foto de la tarjeta
  más reciente del usuario, o iniciales) con `Menu` → "Mi Cuenta"/"Cerrar sesión". Variant
  `"flotante"` (usada en el home) redefine `--foreground`/`--primary`/`--muted`/`--border` y
  usa clases explícitas para el botón outline (blanco sobre fondo oscuro).
- Prop `ocultarLoginSinSesion` (pasada por `/crear` y `/editar/[id]` como
  `session === null`): evita el login duplicado en páginas que ya muestran su propio
  `<AuthMethods>` inline.
- `/mi-cuenta/page.tsx`: gate con `<AuthMethods redirectTo="/mi-cuenta">` inline (no redirect a
  `/login`). Contenido: email de sesión, lista de tarjetas, "Crear nueva tarjeta" → `/planes`,
  logout.
- `layout.tsx` (raíz) deliberadamente sin `<HeaderGlobal>` global — se agrega página por
  página para no afectar `/[slug]` (tarjeta pública), que NO debe llevarlo.

## Shell de paneles admin/mi-cuenta (rediseño completo, reemplaza dashboards de una sola página)
- Patrón Vercel/Stripe Dashboard: rutas propias por sección (no tabs de estado React).
- `src/components/panel/panel-shell.tsx` (`<PanelShell titulo tabs>`) + `panel-tabs.ts`
  (`ADMIN_TABS`/`MI_CUENTA_TABS`/`GANANCIAS_TAB` condicional). Desktop: sidebar fijo. Mobile:
  topbar + hamburguesa → `Drawer` desde la izquierda (`swipeDirection="left"`, mismo
  primitivo que el bottom-sheet de `TarjetaForm`, configurado distinto a propósito).
- `/admin/layout.tsx`: auth-gate único (`ADMIN_EMAIL`) + `<HeaderGlobal />` + `<PanelShell>`.
  Rutas: `/admin/dashboard` (Resumen, stat tiles), `/admin/tarjetas` (listado filtrable +
  gráficos de distribución por plan/uso de agenda), `/admin/suscripciones` (listado +
  MRR/churn), `/admin/cupones`, `/admin/afiliados`, `/admin/testimonios`,
  `/admin/cobro-manual`, `/admin/configuracion` (CRUD de `planes.precio_mensual/anual` +
  `descuento_tarjeta_adicional_pct`).
- `/mi-cuenta/layout.tsx`: mismo patrón con `<AuthMethods>` inline si `session === null`.
  Rutas: `/mi-cuenta` (Resumen), `/tarjetas`, `/estadisticas` (agregado multi-tarjeta),
  `/suscripcion` (Stripe Customer Portal), `/cuenta`, `/ganancias` (condicional, solo si el
  email matchea un afiliado activo).
- `src/components/panel/filtro-tarjetas.tsx` (`<FiltroTarjetas tarjetas mostrarFiltroPlan?
  hrefBase?>`) reutilizado entre `/admin/tarjetas` (con plan, `hrefBase="/admin/tarjetas"`) y
  `/mi-cuenta/tarjetas` (sin plan, `hrefBase="/editar"` default).
- Home: se quitó la sección de precios del modelo viejo de pago único anual (`configuracion.
  precio_regular/precio_lanzamiento/promocion_*` — columnas huérfanas, no borradas de la
  tabla; `PromoCountdown` sin caller, no borrado).

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
  en la URL a través de todo el embudo de login (ver "Flujo de compra" arriba).

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
- 🔴 **Pendiente — falta `invoice.paid` en el webhook LIVE de Stripe** (ya notado arriba) —
  sin esto, ninguna venta de afiliado se registra en producción real.

## Home + testimonios + tilt 3D (rediseño más reciente del home)
- Dirección visual: vibrante/creativa (Notion/Framer), violeta/glassmorfismo premium. Paleta =
  banner presets reales de `lib/banner-presets.ts` (Aurora/Atardecer/Cítrico), no un gradiente
  inventado. Tipografía: **Plus Jakarta Sans** (`--font-display`, pesos 700/800) para
  titulares de marketing únicamente; Baloo 2 (`--font-creativa`) sigue siendo la de la opción
  "creativa" de personalización de tarjetas, sin relación.
- Estructura de `src/app/page.tsx`: header flotante → hero (tilt 3D sobre abanico real de 3
  `<TarjetaCard>`, explicación "¿Qué es Linkard?" fundida en el subtítulo) → banner de cupón
  → comparación cualitativa sin/con Linkard → 4 cards de lo que incluye (personalización,
  agenda, productos, métricas) → "Cómo funciona" (3 pasos) → métricas con conteo animado
  (números ilustrativos, **sin etiqueta "ejemplo"** — decisión explícita repetida del cliente)
  → testimonios (condicional, oculto si la tabla está vacía) → precios (teaser, dato real de
  `planes`, sin precios propios hardcodeados) → roadmap "Próximamente" (Wallet, Checkout
  nativo/Linkard Pago, Asistente IA) → CTA final → footer.
- `src/components/landing/tarjeta-tilt.tsx`: tilt 3D con mouse move (`perspective(1200px)
  rotateX() rotateY()`, máx 14°), gateado por `prefers-reduced-motion`.
- `src/components/landing/contador-animado.tsx`: conteo 0→valor una vez al entrar en
  viewport (`IntersectionObserver` + `requestAnimationFrame`), respeta reduced-motion.
- `src/components/landing/precios-destacados.tsx`: cards oscuras/blur con datos reales de
  `planes`, badge "Recomendado" en el de `orden` intermedio.
- **Sistema de testimonios real**: tabla `testimonios` (`nombre`, `rol_o_negocio`, `cita`,
  `avatar_url` nullable, `calificacion` smallint 1-5 nullable, `activo`, `orden`) — migración
  `20260727020000_add_testimonios.sql` aplicada. RLS: select público sin filtrar `activo`
  (el filtro real vive en `getTestimoniosActivos()`), CRUD solo admin.
  `src/lib/testimonios.ts` (CRUD + `guardarOrden`, intercambia `orden` con el vecino, sin
  librería de drag-and-drop) + `inicialesDeNombre` compartida. `validarImagen` extraída a
  `lib/subir-imagen.ts` (compartida entre `TarjetaForm` y admin de testimonios).
  `/admin/testimonios`: mismo patrón que `/admin/cupones`, upload a Cloudinary
  (`mitarjeta/testimonios`), reordenar con flechas ↑/↓.
  `src/components/landing/testimonios-destacados.tsx`: grid 1-3+ columnas, acento rotando
  entre los 3 tonos de banner presets, estrellas solo si `calificacion` no es null.

## Sistema de personalización avanzada del editor
- **6 formas de avatar** (círculo/redondeado/hexágono básicas; blob/corazón/estrella
  avanzadas — "cuadrado" legacy retirado del picker pero sigue renderizando para tarjetas que
  ya lo tengan), **4 divisores banner→tarjeta** (recta/onda/diagonal/zigzag), modo simple/
  avanzado de color (3 colores base + 3 overrides de texto), modo simple/avanzado de
  tipografía, glassmorfismo, 6 plantillas de partida.
- Gating: `personalizacion_libre` (ya existía, Alcance+) cubre básicas; `personalizacion_
  avanzada` (nueva, Poder exclusivo) cubre exóticas/divisores no-rectos/glass/modos avanzados.
- `IdentidadVisual` extendida 100% con campos opcionales (jsonb, sin migración de schema):
  `colorBotones`/`colorBadges` (default = `colorPrimario`/`colorSecundario` si no seteados),
  `modoColorAvanzado` + 3 overrides de texto, `modoTipografiaAvanzado` +
  `estiloTipografiaCuerpo`, `divisorBanner`, `glassmorfismo`, `plantillaBase`,
  `fondoImagenUrl`/`fondoImagenPosicion`, `fondoTarjetaActivo`/`fondoTarjetaColor`/
  `fondoTarjetaModo`/`fondoTarjetaTipoDegradado`, `bannerPosicion`.
- `lib/personalizacion.ts`: metadata de formas/divisores/tipografías + 6 plantillas +
  `estaBloqueada()`/`calcularBloqueos()` — **el candado nunca se muestra sobre un valor ya
  guardado** (compara contra `identidad_visual` persistida, no contra un set abstracto) —
  bajar de plan no rompe nada ya guardado, solo bloquea NUEVAS selecciones que excedan el
  plan al momento de guardar (se puede probar en el preview siempre).
- Técnica de "anillo" con `clip-path` (una segunda capa con el mismo clip-path, más grande,
  detrás de la foto) — funciona para cualquier forma exótica, sin casos especiales.
  `src/components/tarjeta/avatar-forma.tsx` encapsula 3 estrategias de render (className
  legacy / clip-path porcentual / clip-path con wrapper+scale para `path()` con curvas).
- **Divisores onda/diagonal/zigzag: `clip-path: polygon()` con unidades MIXTAS por punto** (X
  en `%`, Y en `px` fijos) — no `path()` (que exige todo en px absolutos y se rompe en
  cualquier ancho real distinto al autorado). `ALTO_REFERENCIA_DIVISOR = 56` para escalar el
  swatch del picker (`scaleY` nomás, X ya viene en `%`). Este es el fix final tras 2
  iteraciones previas — detalle en HISTORIAL.md.
- **Imagen de fondo de toda la tarjeta** (Poder exclusivo): `fondoImagenUrl`/
  `fondoImagenPosicion`, carpeta Cloudinary `mitarjeta/fondos`. Mutuamente excluyente con el
  banner de color/preset/upload Y con "Fondo de la tarjeta" (tiene prioridad en el render,
  pero no borra los valores de ninguno de los dos — desactivarla restaura sin reconfigurar).
  Los divisores siguen siendo útiles con este modo activo (el panel translúcido revela el
  corte igual).
- **"Sólido/Vidrio"** (segmented control junto a los swatches de color Botones/Badges en
  "Colores y tipografía", mismo campo `glassmorfismo` que antes vivía aislado al final de
  "Avatar y banner").
- **"Fondo de la tarjeta"** (separado del "Fondo del banner", que es como se llamaba antes el
  degradé de `colorPrimario`/`colorSecundario`): toggle `fondoTarjetaActivo` + modo simple (1
  color, gating Alcance) / avanzado (2 colores + tipo lineal/radial + dirección, gating
  Poder). Contraste de texto automático: `esOscuro` en `TarjetaCard` se deriva del contraste
  real de `fondoTarjetaColor` (`obtenerColorContraste()`) en vez de `temaModo` cuando hay un
  color custom — reutiliza todas las clases `dark:` existentes sin tocarlas una por una.
  Heurística conocida: en modo avanzado el contraste se calcula solo sobre el Color 1
  (aceptado, no hay contraste por zona).
- `ReposicionarImagen` (`src/components/tarjeta/reposicionar-imagen.tsx`): modal no
  destructivo (guarda solo un ancla `{x,y}` 0-100, no re-sube ni recorta el archivo), usado
  para reposicionar banner (sin gating) e imagen de fondo (Poder).
- Reorganización de `TarjetaForm`: "Plantillas" (nueva, primera de todas) → "Colores y
  tipografía" (tema + colores + fondo de banner + fondo de tarjeta — la tipografía se movió
  después a "Datos Esenciales", ver "Editor unificado" abajo) → "Avatar y banner".
- Gating de guardado usa el plan REAL de la tarjeta (`planActivo`, resuelto en
  `/editar/[id]/page.tsx` vía `getPlanPorId(tarjeta.plan_id)`), no el `plan` que recibe
  `TarjetaForm` en modo edición (que es sobre una suscripción pendiente/abandonada, concepto
  distinto).

## Panel admin: alta manual de tarjetas + reasignación de dueño
- Nueva página `/admin/tarjetas/[id]` (detalle) — no se tocó `/editar/[id]` (gate hardcodeado
  `user_id !== session.user.id` sin bypass de admin, UI orientada al dueño, no se mezcla con
  herramientas admin). `FiltroTarjetas` ganó prop `hrefBase`.
- `POST /api/admin/activar-manual` (gate `ADMIN_EMAIL`): si ya existe suscripción `autorizada`/
  `pausada` → `409`. Si existe `pendiente` → la reutiliza con `UPDATE`. `descuento_aplicado`
  se clampea a 0 si el costo ingresado supera el precio de lista. `fecha_renovacion` = fecha
  de pago + 1 mes/año según periodicidad. Requiere migración `20260729010000_add_
  suscripciones_manual.sql` (aplicada, agrega `'manual'` al constraint de `proveedor` +
  `registrado_por`/`nota_manual`).
- `POST /api/admin/reasignar-tarjeta`: busca usuario por email exacto contra
  `{SUPABASE_URL}/auth/v1/admin/users?filter=<email>` con `fetch` directo (la SDK instalada,
  2.110.2, no expone filtro por email en `listUsers()`). `GET /api/admin/usuario-por-id`
  resuelve el email del dueño actual para mostrarlo antes de reasignar.

## Secciones tipo catálogo — reemplazo del toggle "Servicios" (🔴 SUPERADO, ver "Unificación de Botones" más abajo)
- **2026-08-09**: `seccionesServicios`/`productos` (y el folleto PDF suelto) descritos en esta
  sección quedaron `@deprecated` — absorbidos por botones `tipo: "catalogo"`/`tipo: "archivo"`
  del sistema unificado de Botones. Esta sección se deja tal cual para contexto histórico del
  modelo intermedio, no describe el estado actual del código — ver "Unificación de Botones/
  Servicios/Productos en un solo sistema de tipos" más abajo.
- Reemplaza el modelo viejo (toggle Servicios: título+descripción general+lista simple+
  folleto) por N secciones tipo Productos (título+precio+descripción+imagen+enlace por ítem),
  tope 1/2/3 según plan Presencia/Alcance/Poder (`planes.features.secciones_servicios_max`).
- Decisiones confirmadas: se elimina la "Descripción general" (redundante); el folleto PDF se
  mantiene pero SOLO en la sección `[0]`; cada ítem tiene precio (paridad con Producto).
- **Modelo de datos**: `DatosContacto.seccionesServicios?: SeccionServicios[]` —
  `SeccionServicios = { titulo, items: Producto[] }` (reusa el tipo `Producto`).
  `servicios`/`descripcionServicios`/`tituloServicios` quedan `@deprecated` en el tipo, sin
  borrar ni migrar en DB (JSONB, sin migración de schema).
- **Compatibilidad sin migración**: tanto `TarjetaForm` como `TarjetaCard` tienen su propio
  fallback — si `seccionesServicios` está vacío/no existe, arman/muestran el modelo viejo
  desde los campos legacy. `TarjetaForm` convierte legacy→nuevo EN MEMORIA al abrir el editor
  (no escribe nada hasta el próximo "Guardar") — ninguna tarjeta pierde contenido por no
  regrabarse.
- El tope real nunca baja de lo ya guardado (mismo principio que `calcularBloqueos`, pero
  implementado aparte por ser un tope numérico, no un lock de valor). Botón "Agregar otra
  sección" solo en la última sección visible; al tope, `<CandadoPlan plan="alcance"|"poder">`.
  Siempre queda al menos 1 sección.
- Subida de imágenes: carpeta Cloudinary `mitarjeta/servicios`, caso `tipo: "servicioItem"` en
  el union `TareaSubida` (mismo `Promise.all` que avatar/banner/folleto/productos).
- **Sin instrumentación de métricas para links de ítems de servicios** (a propósito, para no
  mezclar en `click_producto` ni agregar un tipo de evento nuevo al CHECK constraint).
- Fixes del mismo lote (aplicados por el usuario directo, verificados por Claude Code
  después): acordeón "Productos" cerrado por defecto (revertido el cambio de abrirlo);
  `z-50` explícito en `Dialog.Backdrop`/`Dialog.Popup` de `tarjeta-qr.tsx` (estaba invisible,
  tapado por elementos con z-index explícito); botones de compartir/QR pasaron de `fixed` a
  `sticky` dentro de un contenedor que termina antes de `<footer>` (ya no lo tapan al hacer
  scroll — `TarjetaQr` ganó prop `className` opcional para esto, sin afectar su uso dentro del
  preview de `TarjetaForm`, que sigue `fixed`); CTA del footer de `[slug]/page.tsx` pasó de
  texto subrayado a botón píldora.

## Editor unificado (tipo único) + tipografía ampliada (9 fuentes) + enlace editable
### Bloque A — Editor unificado (Linktree-style, un solo tipo de tarjeta)
- `tarjetas.tipo` en DB **no se tocó** (sigue `"personal"|"empresarial"`, sin migración) —
  toda tarjeta nueva se guarda como `"personal"`, el editor ya no ofrece el toggle.
- Campos que sobreviven con nuevas etiquetas (`DatosContacto`): `nombre`→"Título",
  `empresa`→"Rol o descripción", `puesto`→"Bio" (`<textarea>`, `maxLength={160}`, contador en
  vivo). `telefono`/`whatsapp`/`email`/`horarios`/`direccion`/`direccionMapsUrl` ahora comunes
  a cualquier tarjeta (antes `horarios` era exclusivo de "empresarial").
- Campos retirados del editor (marcados `@deprecated`, no borrados): `nombreEmpresa`, `giro`,
  `telefonoCorporativo`, `sitioWeb` — `TarjetaForm` los lee como FALLBACK al inicializar
  estado (`nombre: datosIniciales?.nombre ?? datosIniciales?.nombreEmpresa ?? ""`, etc.), se
  re-guardan en la forma nueva al primer "Guardar". `sitioWeb` sin reemplazo directo (se
  puede recrear como enlace personalizado en Redes sociales).
- `TarjetaCard`: badge con un solo ícono (`Sparkles`, ya no alterna por tipo). Bio como
  párrafo propio (`whitespace-pre-line`, hasta 160 caracteres). `horarios` visible siempre que
  haya dato. `construirVCard()` sin bifurcar por tipo (`NOTE` = bio).
- Otros call-sites ya corregidos (grep confirmado limpio): `[slug]/page.tsx`,
  `[slug]/opengraph-image.tsx`, `lib/tarjetas.ts` (`nombrePrincipalDeTarjeta()`),
  `admin/suscripciones/page.tsx` (`nombreTarjeta()`). Las 3 tarjetas demo del home migradas a
  `tipo: "personal"` con campos nuevos. `admin/tarjetas/[id]/page.tsx` y
  `panel/filtro-tarjetas.tsx` siguen mostrando/filtrando por la columna real `tarjeta.tipo` —
  no se tocaron.

### Bloque B — Tipografía ampliada (9 estilos) + reubicación
- `EstiloTipografia` (`lib/types.ts`) + metadata `ESTILOS_TIPOGRAFIA`
  (`lib/personalizacion.ts`): Moderna (default), Elegante (Playfair Display), Creativa (Baloo
  2), Clásica (Lora), Geométrica (Poppins), Redondeada (Quicksand), Mono (Space Mono),
  Display (Bebas Neue), Manuscrita (Caveat). Gating: 7 primeras tier "basica" (Alcance+),
  Display/Manuscrita tier "avanzada" (Poder exclusivo, curado por Claude a pedido del
  cliente).
- 6 fuentes nuevas en `layout.tsx` vía `next/font/google`, cada una en su CSS var:
  `--font-clasica`, `--font-geometrica`, `--font-redondeada`, `--font-tipografia-mono` (a
  propósito distinto de `--font-geist-mono`), `--font-card-display` (a propósito distinto de
  `--font-display`, ya usada por Plus Jakarta Sans en el home), `--font-manuscrita`.
- `src/components/tarjeta/selector-tipografia.tsx` (nuevo): dropdown real
  (`@base-ui/react/menu`) — trigger e ítems se renderizan EN esa tipografía. Reusado para
  Título/Cuerpo (Cuerpo solo si `modoTipografiaAvanzado`).
- 3 campos nuevos en `IdentidadVisual`: `colorTitulo` (vacío = auto-contraste), `tituloTamano`
  (20-40px, default 20), `tituloPeso` (400-800 paso 50, default 600) — solo viajan al guardar
  cuando DIFIEREN de su default (tarjetas viejas quedan pixel-idénticas). Gating: tier
  "basica" (Alcance+), `colorTitulo` sumado a `CAMPOS_COLOR_BASICOS`.
- `TarjetaCard`: `<h1>` aplica `fontSize`/`fontWeight` inline (fallback a clases fijas) y
  `color: colorTitulo` con prioridad sobre `colorTextoGeneral` (más específico gana).
- **Reubicación**: toda la sección de tipografía se movió de "Colores y tipografía" a "Datos
  Esenciales" (debajo de Bio). "Colores y tipografía" queda con tema/colores/fondo de banner/
  fondo de tarjeta/efecto vidrio, sin nada de tipografía.

### Bloque C — Enlace (slug) editable con límite 2 cambios / 14 días
- Antes: el slug solo se elegía al crear. Ahora editable siempre, con el mismo chequeo de
  disponibilidad en vivo (debounce 500ms), extendido con `.neq("id", tarjeta.id)` para excluir
  la propia tarjeta de la búsqueda de colisión.
- Migración `20260801000000_add_tarjeta_slug_historial.sql` — 🔴 **SIN APLICAR todavía en
  producción** (ver "Estado de la base de datos" arriba). Agrega tabla
  `tarjeta_slug_historial` (`tarjeta_id`, `slug_anterior`, `slug_nuevo`, `created_at`, RLS
  `_select_propia`/`_admin_todo`, sin insert para anon/authenticated) + **el límite se hace
  cumplir a nivel de TRIGGER, no solo en el cliente** (crítico: sin trigger, el límite de la
  UI es bypasseable llamando `.update({slug})` directo): `fn_validar_limite_cambio_slug()`
  (BEFORE UPDATE, `security definer`, cuenta cambios de los últimos 14 días, rechaza el UPDATE
  ENTERO con `raise exception 'limite_cambio_slug_alcanzado'` si ya hay 2 — un intento
  bloqueado no deja rastro) + `fn_registrar_cambio_slug()` (AFTER UPDATE, inserta la auditoría
  solo si el cambio se aplicó).
- `lib/tarjetas.ts` → `getLimiteCambioSlug(tarjetaId)`: lee `tarjeta_slug_historial` (cliente
  normal, la policy ya alcanza) y devuelve `{cambiosRestantes, proximaLiberacion}` (calculado
  client-side, sin RPC — a diferencia de `fn_cupon_es_valido`, que sí necesita ser
  `security definer` porque lo llama un visitante anónimo).
- UI en "Datos Esenciales": campo de enlace siempre visible, pre-llenado. Debajo del estado de
  disponibilidad, línea nueva solo en edición: "Te quedan N de 2 cambios de enlace disponibles
  (cada 14 días)" o, agotado, "Alcanzaste el límite... Podés volver a cambiarlo el {fecha}".
  Guardado bloqueado (`slugBloqueaGuardado`) solo si el límite se agotó Y el slug realmente
  cambió (reabrir sin tocar el enlace nunca bloquea nada).
- `slugGuardado` (estado nuevo, separado del prop `tarjeta.slug` que queda stale hasta el
  próximo load) — evita descontar el límite dos veces en la misma sesión sin recargar.
- `mensajeErrorGuardadoSlug()`: detecta `error.message.includes("limite_cambio_slug_alcanzado")`
  del trigger y muestra mensaje específico (cubre la carrera real de dos pestañas guardando
  casi simultáneo).
- **Sin gating por plan** — cualquier plan puede editar su enlace (arreglar un typo no es
  premium).
- Verificación real (Claude Code, post-aplicación de código por Cowork): `npm run build` +
  `tsc --noEmit` + `eslint` limpios; Bloque A/B/C confirmados en navegador con tarjetas de
  prueba reales; el trigger de DB confirmado rechazando el 3er cambio con
  `tarjeta_slug_historial` quedando en exactamente 2 filas. Detalle completo en HISTORIAL.md.

## Botones CTA + orden de secciones + color de texto secundario (2026-08-05, 🔴 modelo de datos superado el 2026-08-09)
- **2026-08-09**: `BotonCta` (plano, sin `tipo`, sin WhatsApp/opciones/catálogo/archivo) quedó
  `@deprecated` — reemplazado por el discriminated union `Boton` de 5 tipos. El resto de esta
  sección (íconos curados, texturas, `ordenSecciones`) sigue vigente conceptualmente, solo
  cambió el modelo de datos y la UI del editor — ver "Unificación de Botones/Servicios/
  Productos en un solo sistema de tipos" más abajo para el estado actual.
- **Botones CTA**: nueva sección "Botón" del editor — `DatosContacto.botones?: BotonCta[]`
  (jsonb, sin migración). Ancho completo, uno por línea, varios por tarjeta (tope
  `TOPE_BOTONES = 8` en `tarjeta-form.tsx`). Cada uno: título, subtítulo, ícono (curado,
  `BOTON_ICONOS` en `lib/boton-cta.ts`, ~21 lucide genéricos) O imagen (Cloudinary,
  `mitarjeta/botones`) a la izquierda, color de fondo/borde propios (default: `colorBotones`),
  textura de fondo prediseñada (`BOTON_TEXTURAS` — patrones CSS puros, blanco translúcido a
  bajo alfa sobre el color elegido, sin subir assets).
  - **Link de WhatsApp**: helper sutil ("Crear link de WhatsApp", texto con subrayado, no un
    botón grande) dentro de cada botón — número (con atajo "usar el mismo de Canales de
    contacto" si hay uno) + mensaje → `construirUrlWhatsapp()` arma el `wa.me/...?text=...` y
    lo vuelca al campo Enlace del botón.
  - **3 puntos → modal**: `src/components/tarjeta/boton-cta-modal.tsx` (`<BotonCtaModal>`) —
    trigger "⋮" a la izquierda del botón real (hermano del `<a>`, NO anidado — un `<button>`
    dentro de un `<a>` es HTML inválido), abre un Dialog con vista previa idéntica al CTA real,
    info (título/subtítulo/url) y compartir (copiar enlace, share nativo o WhatsApp, abrir
    enlace) — todo apuntando a la URL de ESE botón, no a la tarjeta.
  - Evento `click_enlace` con `tipo_enlace: "boton_cta"` (mismo tipo de evento que el resto de
    enlaces, sin sumar un tipo nuevo al CHECK constraint de `eventos_metricas`).
- **Orden de secciones**: `IdentidadVisual.ordenSecciones?: SeccionOrdenable[]`
  (`"servicios"|"agenda"|"productos"|"botones"`) — nueva sub-sección "Orden de secciones" en
  el editor con flechas ↑/↓ (mismo patrón que `guardarOrden` de testimonios, sin
  drag-and-drop). `TarjetaCard` refactorizado: los 4 bloques pasaron de JSX embebido fijo a
  funciones (`renderServicios/Agenda/Productos/Botones`) recorridas según
  `ordenSeccionesNormalizado(ordenSecciones)` (`lib/boton-cta.ts`) — tolerante hacia adelante:
  una tarjeta que ya tenía un orden guardado ANTES de que existiera "botones" lo agrega al
  final en vez de perderlo. Default (`ORDEN_SECCIONES_DEFAULT`) reproduce el orden fijo de
  siempre: servicios → agenda → productos → botones.
- **Color de texto secundario**: `IdentidadVisual.colorTextoSecundario` — mismo criterio que
  `colorTitulo` (vacío = auto-contraste, tier "basica"/Alcance+, sumado a
  `CAMPOS_COLOR_BASICOS` en `lib/personalizacion.ts`), controla la línea "Rol o descripción"
  (`empresa`) en vez del `<h1>`. Control ubicado junto a "Color del título" en "Datos
  esenciales" (mismo bloque de tipografía reubicado, ver Bloque B de la sección anterior).
- **Fix — imagen de fondo "saltaba" al llegar al footer (mobile)**: el layer `fixed` de fondo
  a pantalla completa (`tarjeta-card.tsx`) usaba `inset-0` (alto dinámico, equivalente a
  `100dvh`) — al llegar al final del scroll el navegador mobile suele reaparecer su barra de
  herramientas, lo que recalculaba el alto al vuelo y hacía "saltar" la imagen. Cambiado a
  altura explícita `h-[100svh]` (small viewport height, no cambia con ese reflow).
- **Fix — logo del footer sin contraste cuando la imagen de fondo bleedea detrás**: `<Logo
  oscuro?: boolean>` (prop nueva, default `false`, sin tocar ningún otro consumidor) fuerza
  triángulo + wordmark a `text-white` con un ternario (no clases apiladas — dos utilities para
  el mismo color no tienen un orden de "gana la última" confiable en Tailwind). `[slug]/
  page.tsx` solo pasa `oscuro` cuando `fondoImagenUrl` está seteado — **bug real encontrado en
  la verificación visual de esta sesión**: la primera versión también miraba el `temaModo`/
  `fondoTarjetaColor` de la TARJETA (vía un helper `esTarjetaOscura()` que se llegó a agregar
  a `lib/personalizacion.ts`), pero ese tema solo aplica al panel de la card (el toggle
  `.dark` vive adentro de `TarjetaCard`) — el `<footer>` es del SITIO, con su propio fondo
  claro que ya se auto-adapta al modo del sistema operativo vía CSS; forzarlo a blanco por el
  tema de la tarjeta daba logo blanco sobre fondo claro, invisible. Se sacó ese criterio del
  cálculo — el helper sigue existiendo en `lib/personalizacion.ts` por si hace falta a futuro,
  pero HOY no tiene caller. El único caso real en que el footer deja de tener su fondo claro
  de siempre es cuando la imagen de fondo de la tarjeta bleedea detrás — ahí sí, footer gana
  un scrim (`bg-black/45 backdrop-blur-sm`) para legibilidad
  garantizada sin importar el contenido de la foto.
- Verificado desde esta sesión: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas, una vez
  agregado `.env.local`) limpios. Verificado también EN VIVO (Claude Code + navegador,
  `npm run dev` + 2 tarjetas de prueba sembradas y borradas al terminar, con permiso explícito
  del usuario para escribir en producción sin ambiente de staging): botones CTA con las 3
  texturas, modal de "⋮", orden de secciones custom, color de texto secundario, bleed de
  imagen de fondo detrás del footer con logo blanco + scrim — todo confirmado visualmente. 🔴
  Sin probar en un dispositivo mobile real todavía (el fix del salto del fondo al llegar al
  footer depende del comportamiento de la barra de herramientas del navegador mobile, no
  reproducible con un resize de ventana de escritorio).
- **Bug real encontrado y corregido en esa verificación visual**: la primera versión del logo
  del footer también miraba el tema de la TARJETA (ver nota de "Fix — logo del footer" arriba,
  ya corregida) — quedaba blanco sobre blanco cuando la tarjeta era oscura pero no tenía
  imagen de fondo. Confirmado el fix con captura real.

## Fixes de contraste visual — Bio/dirección/horario y divisor del banner (2026-08-05, feedback del cliente tras la sesión anterior)
- **Bio, dirección y horario se leían como un solo bloque de texto**: los 3 eran párrafos
  grises centrados apilados con poco espacio entre sí, sin ningún límite visual — visualmente
  indistinguibles como "3 cosas diferentes" (título del hallazgo del cliente). Fix en
  `TarjetaCard`: dirección+horario ahora viven en su propia card con borde
  (`rounded-xl border ... bg-[rgba(0,0,0,0.02)]`, mismo lenguaje visual que las cards de
  agenda/servicios/productos del resto de la tarjeta), alineada a la izquierda en vez de
  centrada, con más separación (`mt-4` en vez de `mt-3`) respecto a la Bio — la Bio queda como
  párrafo suelto (sin caja), la dirección/horario quedan claramente agrupados y delimitados
  como un dato estructurado aparte.
- **Divisor del banner (onda/diagonal/zigzag) — jerarquía de capas aclarada por el cliente
  tras dos idas y vueltas** (dejar registrado el resultado final, no las iteraciones
  intermedias que se revirtieron): la jerarquía correcta, confirmada, es **banner atrás →
  tarjeta de contenido adelante (se superpone al banner) → avatar más adelante todavía**. El
  panel de contenido SIEMPRE overlapea el banner con `-mt-14` (56px, sin condicional — esto NO
  cambió de cómo estaba antes de esta sesión), y el clip-path del divisor se aplica al panel
  (nunca al banner en sí, que no lleva clip-path en ningún caso) — el resultado correcto es
  que el banner se vea DE VERDAD (sin ninguna capa de color agregada encima, "sin colores,
  solo la forma") a través de la muesca del borde superior del panel. Iteración intermedia
  descartada en esta misma sesión: se probó sacar el overlap (`mt-0`) para que el clip-path
  "no tocara" el banner, más una capa "eco" de color detrás para que la muesca no quedara
  lavada blanco-sobre-blanco — el cliente aclaró que NO es lo que pidió: quiere el banner real
  visible detrás a través de la forma (posible gracias al overlap + z-order correcto), no una
  copia de color. Se revirtió por completo esa iteración (sin `ALTO_REFERENCIA_DIVISOR` extra
  importado en `tarjeta-card.tsx`, sin capa `absolute` nueva).
  - Verificado en navegador real (ambas iteraciones, la revertida y la final) con los 3
    divisores + recta + banner de foto real + tema oscuro + banner de gradiente. `tsc
    --noEmit`/`eslint` limpios en el estado final.
- **Bug real de la jerarquía de capas, encontrado por el cliente probando el fix anterior en
  vivo — el avatar quedaba "detrás" del banner**: `clip-path` en un contenedor recorta TAMBIÉN
  a sus descendientes — el avatar vivía anidado adentro del panel de contenido (que lleva el
  clip-path del divisor), así que quedaba recortado exactamente donde coincidía con la muesca
  de la forma (onda/diagonal/zigzag), dejando ver el banner "por encima" del avatar ahí. Fix:
  el avatar se sacó de adentro del panel — ahora es un `<div>` HERMANO, `position: absolute`,
  `z-20` (por encima del banner y del panel, ambos `z-10`), `pointer-events-none` (decorativo,
  nunca fue clickeable, evita que su caja invisible de ancho completo tape clicks en
  badge/botones de abajo). Posición calculada a mano para no mover nada más:
  `top: alturaBanner - 100` (mismo resultado visual que el `-mt-14` doble anidado que tenía
  antes: -56px de superponerse al banner + 12px del padding-top del panel + -56px propios). El
  panel de contenido ganó un spacer (`<div className="h-10" aria-hidden />`) donde antes vivía
  el wrapper del avatar, para que el badge/nombre/etc. no se corran ni un píxel — verificado
  en navegador que el layout de "recta" (sin clip-path, donde este bug no pasaba) es pixel-
  idéntico a como estaba. Confirmado también con avatar real (foto) e iniciales (sin foto):
  ambos casos quedan completos y al frente de todo, nunca recortados.

## Multilínea en dirección/horario, jerarquía de la Bio, ícono opcional del badge y más íconos de profesiones (2026-08-05, mismo día)
- **Dirección/horario admiten hasta 3 líneas**: en el editor pasaron de `<input>` a
  `<textarea rows={2}>`, con `limitarLineas(valor, 3)` (helper nuevo en `tarjeta-form.tsx`,
  corta por `\n` en el propio `onChange` — imposible escribir una 4ª línea, no es solo un
  aviso posterior). `TarjetaCard` ya tenía `whitespace-pre-line` en el contenedor de la card
  de ubicación; le faltaba en los `<span>` internos de cada valor (dirección/horario) — sin
  eso el salto de línea se guardaba pero se renderizaba todo en una sola línea larga.
- **Jerarquía visual de la Bio**: se veía como texto de relleno, con MENOS peso que la propia
  dirección/horario (raro para el texto de presentación del dueño). Fix en `TarjetaCard`: una
  regla corta (`h-0.5 w-8`) con el color de acento de la tarjeta (`colorBotonesFinal`, siempre
  coherente con la identidad elegida) la antecede como elemento de diseño deliberado, y el
  texto subió de `text-sm` gris claro a `text-[15px] font-medium leading-relaxed` con mucho
  más contraste (`#3f3f46`/`#e4e4e7` en vez de `#52525b`/`#a1a1aa`). Sin agregar ningún campo
  nuevo de personalización — reutiliza el color de botones que ya existía.
- **Ícono del badge "@enlace" opcional + elegible**: `IdentidadVisual.badgeIconoActivo`
  (default `true` — compatibilidad, toda tarjeta vieja se veía siempre con Sparkles puesto) +
  `badgeIconoId` (reusa el mismo set curado que los botones CTA, `BOTON_ICONOS` en
  `lib/boton-cta.ts` — un solo picker de íconos para todo el producto, no uno distinto por
  feature). Control nuevo en "Colores y tipografía" del editor, junto al color de Badges:
  `Switch` + grilla de íconos (mismo patrón visual que el picker de ícono de los botones CTA).
  `TarjetaCard` calcula `IconoBadge` una sola vez (`badgeIconoActivo === false ? null :
  obtenerBotonIcono(badgeIconoId)?.Icono ?? Sparkles`) y lo reusa en el único lugar donde se
  renderiza el badge.
- **Más íconos curados, con foco en profesiones/rubros** (pedido explícito): 18 nuevos en
  `BOTON_ICONOS` — automotriz (Car), salud (Stethoscope), peluquería (Scissors), negocios
  (Briefcase), construcción (Hammer/HardHat), gastronomía (ChefHat), arte (Paintbrush),
  educación (GraduationCap), entrenamiento (Dumbbell), diseño (Palette), inmobiliaria (Home),
  jardinería (Leaf), legal (Gavel), arquitectura (Building2), plomería (Wrench), veterinaria
  (PawPrint), mudanzas (Truck). 🔴 **Nota real**: se pidió explícitamente un ícono de "diente"
  (dentista) — `lucide-react` (versión instalada) NO tiene ningún ícono de diente bajo ningún
  nombre (se comprobó programáticamente contra el export completo del paquete, el único match
  para "tooth" es "Bluetooth"). Se usó Stethoscope como el más cercano disponible para salud/
  consultorio en general — si hace falta un diente literal, la única vía es un ícono custom
  (SVG propio o subir como imagen, ya soportado por el picker imagen/ícono de los botones).
- Verificado en navegador real: tarjeta con dirección/horario de 3 líneas cada uno, Bio larga
  con la nueva jerarquía, badge con ícono de salud custom, botones con íconos de salud/auto —
  y confirmado que desactivar el ícono del badge lo saca por completo (queda solo `@slug`).
  `tsc --noEmit`/`eslint` limpios.
- **Bug real reportado por el cliente probando el share en vivo — la Bio no salía siempre en
  la miniatura (imagen OG) al compartir el link**: `[slug]/opengraph-image.tsx` calculaba
  `subtitulo = empresa || puesto` — un OR excluyente. Con `empresa` Y `puesto` cargados (el
  caso más común), la miniatura solo mostraba `empresa`, la Bio nunca aparecía; una tarjeta
  con SOLO `puesto` (sin `empresa`) sí la mostraba vía el fallback — de ahí la inconsistencia
  reportada ("en una sale, en otra no"). Fix: `empresa` y `puesto` ahora son dos líneas
  independientes, ambas se muestran siempre que existan (ya no es un fallback exclusivo).
  **Iteración descartada en la misma sesión**: primero se truncó la Bio a 90 caracteres con
  "…" (por las dudas de que un párrafo largo desbordara el lienzo de 630px de alto) — el
  cliente probó y pidió el texto COMPLETO, sin cortar. Se sacó el truncado por completo (no
  se subió el límite, se eliminó la función `recortarTexto()` entera): la Bio se muestra tal
  cual (`whiteSpace` normal, wrap natural dentro del `maxWidth` de la columna,
  `lineHeight: 1.35`). El editor ya limita la Bio a 160 caracteres (`TarjetaForm`), así que el
  peor caso real es ~3 líneas envueltas, que entran cómodas en el lienzo sin desbordar —
  confirmado generando la imagen real con nombre largo + rol largo + Bio en el límite de 160
  caracteres a la vez (el combo más exigente posible).
  - `generateMetadata()` en `[slug]/page.tsx` en ese momento seguía con el mismo patrón
    `empresa || puesto` para el `<meta name="description">` — arreglado en la iteración
    siguiente (ver bullet de abajo), no quedó así.

## `generateMetadata` de `[slug]/page.tsx` — bug real de fondo: el copy de marketing de Linkard tapaba la info de la propia tarjeta al compartir (2026-08-05, mismo día)
- **Reporte del cliente**: al compartir el link por WhatsApp, la vista previa mostraba
  "Linkard · Tarjeta digital en segundos" / "Crea tu tarjeta de presentación..." — el copy de
  MARKETING del sitio, no la info de la tarjeta — sobre una tarjeta con un plan pago. Pidió
  que el texto debajo de la imagen se arme con título + rol + bio (cuando existan).
- **Causa real (no era caché de WhatsApp, era un bug de metadata)**: `generateMetadata()` acá
  solo seteaba `title`/`description` (los tags genéricos, `<title>`/`<meta name="description">`).
  Pero WhatsApp/Telegram/Twitter/iMessage — los que arman la vista previa de un link
  compartido — leen `og:title`/`og:description` (del objeto `openGraph`) y `twitter:title`/
  `twitter:description` (del objeto `twitter`), NUNCA `title`/`description` a secas. Como acá
  nunca se seteaban esos dos objetos, Next.js los heredaba TAL CUAL del layout raíz
  (`src/app/layout.tsx`, que sí trae `openGraph`/`twitter` con el copy de marketing del
  sitio) — sin importar qué dijera el `description` de la tarjeta.
- **Fix**: `generateMetadata()` arma un `titulo` (`"${nombre} · Linkard"`) y una `descripcion`
  (`[empresa, puesto].filter(Boolean).join(" — ")`, con fallback a `"Tarjeta digital de
  {nombre} en Linkard."` — nunca copy de marketing, ni siquiera sin rol/bio) UNA sola vez, y
  los aplica a los 3 lugares: `title`/`description` de siempre, MÁS `openGraph.{title,
  description, siteName, locale, type}` y `twitter.{card, title, description}` explícitos
  (replican el resto de esos objetos tal cual el layout raíz — `siteName: "Linkard"`,
  `locale: "es_MX"`, `type: "website"`, `card: "summary_large_image"` — para no perder esos
  campos al dejar de heredarlos).
- Verificado con `curl` real contra el HTML servido (no una suposición): confirmado que
  `og:title`/`og:description`/`twitter:title`/`twitter:description` cambian según la tarjeta
  (rol + bio combinados) y que el fallback sin rol/bio usa el nombre de la persona, nunca
  marketing. `tsc --noEmit`/`eslint` limpios.

## Unificación de Botones/Servicios/Productos en un solo sistema de tipos (2026-08-09)
- **Motivo**: pruebas con usuarios reales mostraron que "Servicios" y "Productos" (accordions
  de catálogo, grid fijo de 3 columnas) no funcionaban bien para el usuario, mientras que
  "Botones" (CTA de ancho completo) sí. Se eliminan esos dos toggles y todo el contenido pasa a
  vivir en un solo sistema de "Botones" con **5 tipos** elegibles por ítem: `enlace`,
  `whatsapp`, `opciones`, `catalogo`, `archivo`. Cero migraciones de schema — todo sigue en el
  jsonb `datos_contacto`/`identidad_visual`.
- **Modelo de datos** (`lib/types.ts`): `Boton = BotonEnlace | BotonWhatsapp | BotonOpciones |
  BotonCatalogo | BotonArchivo` (discriminated union por `tipo`), reemplaza `BotonCta` (queda
  `@deprecated`, sin `tipo` — se interpreta como `"enlace"` al leerlo).
  - `BotonEnlace`: el CTA de siempre, SIN el mini-helper de armar link de WhatsApp (ver abajo).
  - `BotonWhatsapp`: mismo look que enlace, pero `waNumero`/`waMensaje` en vez de `url` — la
    URL final (`wa.me/...`) se resuelve recién al renderizar/guardar con `construirUrlWhatsapp()`
    (`lib/boton-cta.ts`), nunca se persiste armada.
  - `BotonArchivo`: reemplaza al folleto PDF suelto que colgaba de la sección `[0]` de
    Servicios — `archivoUrl` (solo PDF, reusa `validarPdf`), carpeta Cloudinary
    `mitarjeta/brochures` (ya whitelisteada, no se tocó el endpoint). **Exclusivo del plan
    Poder** — reusa el feature flag `personalizacion_avanzada` que ya existía (Poder-exclusivo
    desde antes), no se sumó un flag nuevo ni una migración.
  - `BotonCatalogo`: reemplaza a "Servicios" Y "Productos" — `items: Producto[]` (mismo tipo de
    siempre, sin cambios) + `vista: "grid2" | "lista1"` (elegida por el dueño; reemplaza el grid
    fijo de 3 columnas de antes). Cuenta como "sección" contra
    `planes.features.secciones_servicios_max` (1/2/3 según plan, mismo criterio que ya tenía
    Servicios) — sea top-level o anidado dentro de un "opciones".
  - `BotonOpciones`: botón padre que despliega/colapsa (toggle inline, NO modal) una lista de
    `hijos: BotonHijo[]` — **un solo nivel de anidamiento** (`BotonHijo` excluye "opciones" a
    propósito, decisión de negocio explícita: evita menús infinitos). Sin restricción de plan
    propia (es organización visual, no contenido extra) — los hijos sí heredan la de su tipo
    (ej. un hijo catálogo sigue contando contra el tope de secciones).
  - `SeccionOrdenable` se angostó a `"agenda" | "botones"` — "servicios"/"productos" dejaron de
    ser bloques propios, su posición ahora la da el orden INTERNO de la lista de botones
    (reorden individual ↑/↓, ver abajo). `ordenSeccionesNormalizado()` ya era tolerante hacia
    valores desconocidos, así que un `ordenSecciones` viejo con esos ids simplemente los ignora.
- **Migración en memoria, función única** — `normalizarBotones(datosContacto, identidadVisual)`
  (`lib/boton-cta.ts`): reusada TAL CUAL por el editor (`tarjeta-form.tsx`) y por el render
  público (`tarjeta-card.tsx`), así ambos nunca pueden divergir en qué significa el contenido
  legacy de una tarjeta. Resuelve: `botones` plano sin `tipo` → `"enlace"`; `seccionesServicios`
  (con su propio fallback legacy de `servicios`/`tituloServicios`) → un `BotonCatalogo` por
  sección; `productos` → un `BotonCatalogo` más; `brochureUrl` suelto → un `BotonArchivo`. IDs
  determinísticos (`"migrado-servicios-0"`, etc., NUNCA `crypto.randomUUID()` para no romper
  memoización entre renders). Nunca escribe — recién el próximo "Guardar" persiste en la forma
  nueva. Orden relativo: si la tarjeta ya tenía un `ordenSecciones` guardado que ponía "botones"
  antes de "servicios"/"productos", los botones planos van primero; si no, los catálogos/
  archivo migrados van primero (mismo orden fijo de siempre).
- **Editor** (`tarjeta-form.tsx`): un solo estado `botones: BotonFormState[]` (reemplaza los 3
  states separados que había antes — `seccionesServicios`, `productos`, `botones` — y sus ~20
  funciones CRUD). `BotonFormState` es plano (no discriminado), mismo criterio que ya usaba
  `SeccionServiciosFormState` reusando `ProductoFormState` tal cual — evita narrowing/casteos en
  cada `setState`; los campos no aplicables al `tipo` actual simplemente no se leen.
  - **Fila-cabecera SIEMPRE visible, colapsada por defecto** si viene de datos ya guardados (un
    botón agregado en la sesión arranca expandido): ícono/imagen chica + título + badge de tipo
    + mover ↑/↓ + eliminar + chevron expandir/colapsar — pedido explícito del cliente, no
    existía antes (todo el formulario de cada botón se veía siempre, sin colapsar ni reordenar
    individualmente). `moverBotonEn`/`quitarBotonEn`/`actualizarBotonEn` direccionan por
    `UbicacionBoton = { indice; indiceHijo? }` — mismo mecanismo sirve para el nivel superior y
    para los hijos de un "opciones", sin duplicar funciones.
  - Selector de tipo al agregar (`SelectorTipoBoton`, pills con candado si corresponde) — 5
    opciones a nivel superior, 4 dentro de un "opciones" (sin "opciones").
  - Panel expandido específico por tipo — enlace/whatsapp/archivo/opciones comparten el bloque
    de ícono-imagen+color+textura (`contenidoIconoYColorBoton`, extraído para no repetirlo 4
    veces); catálogo NO lo muestra (su tile público no usa esos campos). Copys de resolución de
    imagen agregados a pedido: "Imagen cuadrada (1:1), mínimo 200×200px" (ícono/imagen de
    botón), "...mínimo 600×600px" (imagen de ítem de catálogo).
  - **Tope de hijos dentro de "opciones": `TOPE_HIJOS_OPCIONES = 6`** (valor propuesto por
    Claude Code, no una cifra pedida explícitamente por el cliente — ajustar si hace falta).
  - Ya NO existe `waAbierto`/"Crear link de WhatsApp" como mini-helper dentro de "enlace" — es
    exactamente el pedido: WhatsApp pasa a ser su propio tipo, con número/mensaje siempre
    visibles en su panel.
  - **Regla eliminada a propósito**: la sección `[0]` de Servicios ya NO se persiste siempre
    (antes se guardaba aunque estuviera vacía) — en una lista plana de botones todo sigue la
    única regla `titulo.trim()`. Impacto esperado nulo (una sección vacía no tenía contenido
    visible).
- **Payload de guardado**: `TareaSubida` generalizado con `UbicacionBoton`/`claveBoton()`/
  `claveItemCatalogo()` (extiende el patrón de clave compuesta que ya usaba
  `imagenesServicioItemPorClave` a hasta 2 niveles: botón → \[hijo\] → \[ítem de catálogo\]).
  `construirBotonFinal()` (recursivo, closure sobre los 3 Maps de URLs subidas) arma el `Boton`
  final; `construirBotonPreview()` (función pura, sin Maps/índices) arma la vista previa en vivo
  reusando el mismo criterio.
- **Render público** (`tarjeta-card.tsx`): `renderServicios`/`renderProductos`/`renderBotones`
  (3 funciones) colapsan en un único `renderBotones()` tipo-aware sobre
  `normalizarBotones(datosContacto, identidadVisual)`. Un solo `Set<string>` de ids abiertos
  (reemplaza 3 estados de toggle separados) + `itemCatalogoAbierto` para el modal de detalle.
  - Ítem de catálogo → **modal de detalle nuevo** (`catalogo-item-modal.tsx`, clona el patrón
    `Dialog.Root > Dialog.Portal > Dialog.Backdrop + Dialog.Popup` de `boton-cta-modal.tsx` en
    vez de reusarlo — ese está acoplado a `BotonCta`/`BotonVistaPrevia`, no a `Producto`):
    imagen grande, título, descripción completa, precio, botón "Ver más" (dispara
    `click_producto`). El tile del grid/lista ya NO muestra descripción/precio/enlace inline
    (antes iban los 4 datos apretados en un tile de ~110px) — solo imagen + título, el resto
    vive en el modal.
  - `ContenidoBotonCta`/`BotonCtaModal` (`boton-cta-modal.tsx`) generalizados a un tipo
    `BotonVistaPrevia` (título/subtítulo/ícono/imagen/`url` ya resuelto) en vez de `BotonCta`
    crudo — mismo patrón ad-hoc que el editor ya armaba en su preview, formalizado.
  - `esUrlOptimizable` extraída de `tarjeta-card.tsx` a `lib/imagen-posicion.ts` (el modal de
    catálogo también la necesita).
- **Métrica de clicks** (decisión de negocio confirmada): TODO ítem de catálogo (venga
  conceptualmente de "servicios" o "productos") trackea `click_producto`, igual que ya hacía
  Productos — se pierde la distinción histórica de no medir Servicios, pero esa distinción deja
  de existir en el modelo. `whatsapp`/`archivo`/hijos de "opciones" usan `click_enlace` con
  `metadata.tipo_enlace` (`"boton_whatsapp"`, `"boton_archivo"`, `"boton_opciones_hijo"` +
  `boton_padre`) — mismo patrón de discriminar por `metadata` que ya usaba `"boton_cta"`, sin
  agregar ningún valor nuevo al CHECK constraint de `eventos_metricas.tipo_evento`.
- **Gating de plan** (decisiones de negocio confirmadas): Catálogo hereda el tope 1/2/3 de
  `secciones_servicios_max`; Opciones sin restricción; Archivo exclusivo de Poder (reusa
  `personalizacion_avanzada`). Mismo criterio fail-open que `calcularBloqueos` en los 3 casos:
  bajar de plan NUNCA oculta/rompe contenido ya guardado, solo bloquea agregar uno nuevo.
- **Supuestos tomados por Claude Code** (bajo impacto, reversibles, no pedidos explícitamente
  palabra por palabra — ajustar si el cliente los prueba y no le calzan): vista por defecto al
  migrar un catálogo legacy = `"grid2"`; tope de hijos de "opciones" = 6.
- Verificado desde esta sesión: `tsc --noEmit`, `eslint` (proyecto completo) y
  `npm run build` (41 rutas) limpios — incluyó instalar `recharts`/`stripe` en `node_modules`
  (estaban en `package.json` pero no instalados en este entorno, gap preexistente sin relación
  con este cambio).
- **Verificado en navegador real** (Claude Code + Chrome del usuario, `npm run dev`, con permiso
  explícito, login real con Google sobre una tarjeta real en plan Poder — sin guardar ningún
  cambio de prueba, todo probado en la vista previa en vivo del editor, que corre el mismo
  render que la tarjeta pública; confirmado después que la tarjeta real no cambió): los 5 tipos
  de botón se crean y editan correctamente (WhatsApp autocompleta el número de "Canales de
  contacto"; Archivo aparece disponible sin candado en plan Poder con ícono "descarga" por
  defecto); "Opciones" restringe el selector de hijos a los 4 tipos permitidos (sin "Opciones",
  confirmando el límite de un solo nivel) y el toggle expandir/colapsar revela el hijo anidado
  tanto en el editor como en el modo "Ver tarjeta" a pantalla completa; "Catálogo" arma el ítem,
  el tile del grid muestra solo imagen+título, y el click abre el modal de detalle nuevo con el
  título correcto; colapsar/expandir y mover ↑/↓ una fila actualizan el editor y la vista previa
  al instante. Cero errores de consola en todo el proceso. 🔴 Pendiente todavía: no se probaron
  los 4 casos de migración legacy (tarjeta con solo `servicios` plano, con los 4 campos legacy a
  la vez, sin tocar nunca) porque ninguna tarjeta real de esta cuenta tenía ese contenido viejo
  guardado — si aparece una, vale la pena confirmarlo.

## ColorPicker unificado + botón Catálogo con apariencia de CTA + fondo repetible (2026-08-10)
- **Selector de color** (`src/components/tarjeta/color-picker.tsx`, nuevo): reemplaza los 13
  `<input type="color">` sueltos de todo `tarjeta-form.tsx` — feedback del cliente ("la
  experiencia con los selectores de color es muy mala"). Swatch que abre un popover
  (`@base-ui/react/popover`) con: rueda nativa, campo hex, 3 campos RGB, y una fila "Tus
  colores" con los colores ya usados en cualquier parte de la tarjeta (banner, botones,
  badges, fondo de tarjeta, título, y colores de cada botón/hijo incluido) — deduplicados,
  calculados en `coloresPersonalizados` (tarjeta-form.tsx). No reemplaza el patrón "activo"/
  "Quitar" que ya tenían varios campos, solo el mecanismo de elegir el color.
- **Botón Catálogo**: pasa a compartir cabecera con "Opciones" (`renderCabeceraToggle()` en
  `tarjeta-card.tsx`, factorizada de lo que antes era código separado) — mismo CTA de ancho
  completo con ícono/imagen + color/borde/textura propios, en vez del título chico en
  mayúsculas + contador que tenía antes. `BotonCatalogo` ya traía esos campos en el tipo (nunca
  se usaban en el render); ahora sí. El editor ganó el campo "Subtítulo" y el bloque de ícono/
  color/textura para este tipo (antes solo tenía título+vista+ítems). El grid/lista de ítems y
  el modal de detalle no cambiaron.
- **Fondo de imagen — "Repetir fondo"**: `IdentidadVisual.fondoImagenRepetir` (boolean, default
  false). Activo: la imagen se muestra a 100% de ancho (alto proporcional, `background-size:
  100% auto`) y se repite verticalmente (`background-repeat: repeat-y`) en vez de recortarse
  con `object-fit:cover` — se resuelve con un `<div>` de `background-image` plano en vez de
  `next/image` (no soporta repetición). Mutuamente excluyente con "Reposicionar" (sin posición
  que anclar en este modo: siempre ancho completo, siempre arranca arriba) — el botón
  "Reposicionar" se oculta cuando el toggle está activo.
- Verificado: `tsc --noEmit`/`eslint`/`npm run build` limpios. Probado en navegador real (misma
  cuenta/tarjeta que la sesión anterior, sin guardar): el ColorPicker abre, el hex escribe y
  actualiza el swatch/preview en vivo, "Tus colores" se puebla con los colores reales ya en uso;
  el botón Catálogo se ve idéntico a un CTA normal (ícono + título + chevron) con su propio
  color. 🔴 "Repetir fondo" no se verificó visualmente con una imagen real en esta sesión (el
  patrón CSS es estándar y de bajo riesgo, pero no se confirmó con los ojos).

## Color de texto por botón + más íconos/texturas + catálogo con título de 2 líneas (2026-08-10, mismo día)
- **`BotonBase.colorTexto`** (nuevo, opcional): mismo patrón "activo"/`ColorPicker` que
  `colorFondo`/`colorBorde` — sin valor, auto-contraste como siempre. `estiloDeBoton()`
  (tarjeta-card.tsx) lo prioriza sobre el auto-contraste. Editor: 3er `ColorPicker` en
  `contenidoIconoYColorBoton()`.
- **`BOTON_ICONOS`** sumó ~14 íconos de gastronomía/comercio (pedido explícito: tenedor, taco,
  bebida, carne) — `Utensils`, `Sandwich` (sin ícono de "taco" literal en lucide-react,
  comprobado contra el export completo), `CupSoda`, `Beef`, `Pizza`, `Soup`, `Salad`,
  `IceCreamCone`, `Cake`, `Fish`, `Beer`, `Wine`, `ShoppingCart`, `Store`.
- **`BOTON_TEXTURAS`** sumó 4 patrones CSS puros (mismo criterio que los 6 existentes, sin
  assets): `lineas` (rayas verticales), `cruzado` (crosshatch diagonal), `circulos` (anillos),
  `cuadros` (checkerboard vía `conic-gradient`, sin necesitar `background-position`).
- **Título de ítem de catálogo**: `truncate` (1 línea) → `line-clamp-2` (hasta 2 líneas).
- **Fondo del título de ítem de catálogo**: adopta `colorFondo` (o `colorBotonesFinal`) del
  botón catálogo padre, con auto-contraste — antes el texto iba sobre el fondo plano de la
  card, ahora es un "chip" con el color de identidad del catálogo.
- Verificado: `tsc`/`eslint`/`build` limpios + navegador real (sin guardar): los 3 color
  pickers (texto/fondo/borde) presentes, grid de íconos con las nuevas opciones de comida, los
  10 valores de textura confirmados en el `<select>` y "Cuadros" renderizando en vivo, ítem de
  catálogo con título largo envolviendo a 2 líneas sobre fondo negro (heredado del botón
  padre). Cero errores de consola.

## Imagen de ítem de catálogo reposicionable, fixes de consistencia visual y título como logo (2026-08-10, mismo día)
- **Ítem de catálogo — imagen reposicionable**: `Producto.imagenPosicion?: PosicionImagen`
  (mismo mecanismo `{x,y}` que avatar/banner/fondoImagen). El tile del grid/lista ahora cubre
  el contenedor completo (`estiloImagenPosicionada`, antes no se usaba) y el editor ganó un
  botón "Reposicionar" (mismo `<ReposicionarImagen>` reusado, sin componente nuevo) junto a la
  imagen de cada ítem.
- **Fix — modal de detalle de catálogo tapaba el botón de cerrar**: el Close y la imagen son
  ambos elementos posicionados sin `z-index` explícito, pintando en orden de DOM — la imagen
  (más abajo en el DOM) quedaba encima. Fix: `z-10` + fondo semi-opaco propio en el botón
  Close, más `mt-8` de separación.
- **Consistencia del "⋮" (opciones de un botón CTA) entre tipos**: se movió de la izquierda a
  la derecha, calzando con la posición del chevron de los tipos desplegables (catálogo/
  opciones) — todos los tipos de botón se ven en la misma posición ahora. También se corrigió
  su color: `text-current` heredaba de un ancestro del DOM, no del `<a>` hermano que tiene el
  color real (custom o auto-contraste) — se pasa `estiloCta?.color` explícito.
- **Contacto y redes sociales — reordenables, siempre en una sola fila**: pedido inicial mal
  interpretado como reposicionar la SECCIÓN completa (revertido tras corrección del cliente:
  la sección va donde siempre fue). Lo correcto: los ÍTEMS dentro de esa fila única se
  reordenan con flechas ↑/↓ en el editor, sin separar visualmente contacto de redes en dos
  bloques apilados — `renderContactoYRedes()` (`tarjeta-card.tsx`) envuelve ambos grupos en el
  mismo contenedor `flex flex-wrap`. Los 4 pills fijos de contacto (Llamar/WhatsApp/Email/Cómo
  llegar) usan el nuevo `IdentidadVisual.ordenContacto`/`ContactoOrdenable`
  (`ordenContactoNormalizado()`, `lib/boton-cta.ts` — mismo criterio tolerante que
  `ordenSeccionesNormalizado`); las redes sociales reordenan el array `redes` directo (mismo
  `moverEnArray` que ya usaba Botones). Sin gating de plan (es organización, no contenido).
- **Título como logo**: `IdentidadVisual.tituloModo?: "texto"|"imagen"` +
  `tituloImagenUrl`/`tituloImagenAltura` (24-80px, default 32) — Poder exclusivo
  (`personalizacion_avanzada`, mismo criterio que imagen de fondo). Reemplaza el `<h1>` por un
  `<img>` SIN recortar a ninguna forma (a diferencia del avatar) — ancho libre, alto fijo,
  "como si fuera texto". Carpeta Cloudinary nueva `mitarjeta/logos` (whitelisteada en
  `cloudinary-sign/route.ts`). Toggle Texto/Logo en el bloque de tipografía de "Datos
  Esenciales" — en modo Logo se oculta el resto de los controles de tipografía (no aplican).
  **Bug real encontrado por el cliente probando en vivo**: el logo quedaba pegado a la
  izquierda en vez de centrado — Tailwind Preflight pone `img { display: block }` por defecto,
  así que el `text-center` del panel (que sí centra el `<h1>` de texto, contenido inline) no
  alcanza para centrar un elemento block; fix con `mx-auto` explícito.
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios en cada paso. 🔴 No
  verificado todavía en navegador real (solo chequeos estáticos) salvo el fix de centrado del
  logo, confirmado por el cliente en vivo.

## Agenda: horarios calculados como un solo calendario compartido, colchón por servicio, sin "paso" configurable (2026-08-10, mismo día, iterado varias veces)
- **Modelo de negocio confirmado explícitamente con el cliente**: un solo proveedor (una
  persona) atiende TODOS los servicios agendables de la tarjeta — no hay "un calendario por
  servicio", es un único horario compartido. Distintos servicios pueden tener distinta
  duración Y distinto colchón (uno puede necesitar más espacio de preparación/traslado que
  otro), pero nunca pueden chocar entre sí.
- **Iteración de diseño** (registrado para no repetir el camino): primero se agregó un
  `PASO_MINUTOS` configurable POR TARJETA (`tarjetas.intervalo_agenda_minutos`, "cada cuánto
  ofrecer un horario") — el cliente hizo notar que, si duración+colchón de cada servicio ya
  determinan huecos válidos y sin choques, ese campo aparte sobraba y solo agregaba una
  configuración más para explicar. Se sacó por completo del código (`tarjetas.
  intervalo_agenda_minutos` sigue @deprecated en la columna de DB — no se borra, mismo criterio
  que el resto de columnas huérfanas del proyecto — pero no queda ningún caller ni UI).
- **`servicios_agendables.colchon_minutos`** (migración `20260810000000_add_agenda_intervalo_
  colchon.sql`, default 0) — por SERVICIO, no por tarjeta. `<select>` "Colchón" (0-60 min) junto
  a "Duración"/"Precio" en cada servicio de `agenda-servicios.tsx`.
- **Algoritmo final de `obtenerSlotsDisponibles()`** (lib/agenda.ts, reemplaza por completo el
  paso fijo/configurable de antes): para cada día, arranca de las ventanas de disponibilidad
  (horario semanal + excepciones, igual que siempre) convertidas a instantes UTC absolutos, y le
  RESTA cada cita ya ocupada de la tarjeta (`restarIntervalo()`, la misma función que ya usaba
  `construirVentanasDelDia` para bloqueos — funciona igual con milisegundos que con minutos, es
  aritmética de intervalos pura) expandida por el colchón que corresponda (`Math.max` entre el
  colchón de esa cita y el del servicio que se está consultando, mismo criterio que
  `existe_solapamiento_cita`). Sobre cada hueco REALMENTE libre que queda, ofrece horarios
  back-to-back espaciados por `duración + colchón` del servicio consultado — así nunca se
  pierde un hueco real (a diferencia de un paso fijo arbitrario, que podía saltearse un hueco
  que no calzara con ese paso) ni se ofrece algo que choque, sea del mismo servicio o de otro.
  Restar en instantes UTC absolutos (no en minutos-del-día locales) evita cualquier problema de
  un colchón empujando el bloqueo cruzando la medianoche local.
- **Anti-choque entre servicios distintos de la misma tarjeta** (confirmado con el cliente —
  ya era el diseño correcto desde la migración original de agenda, 2026-07-17, no hizo falta
  cambiar nada ahí): tanto `obtenerSlotsDisponibles()` como `existe_solapamiento_cita()` filtran
  las citas ocupadas por `tarjeta_id`, **nunca por `servicio_id`** — si el Servicio 1 está
  agendado de 10:00 a 11:00, esa franja queda bloqueada para CUALQUIER otro servicio de la misma
  tarjeta (un solo proveedor no puede atender dos cosas a la vez).
  - `existe_solapamiento_cita()` (SQL, `create or replace function`) gana `p_colchon_minutos`
    (el colchón del servicio que se está por agendar, ya en mano de `/api/citas/route.ts` —
    único caller, actualizado en el mismo commit). Para cada cita YA ocupada, hace `join` contra
    `servicios_agendables` para saber SU colchón y usa el mayor entre ambos (`greatest()`).
  - `obtenerSlotsDisponibles()`: la consulta de `citas` ocupadas embebe
    `servicios_agendables(colchon_minutos)` (relación FK ya existente, embed automático de
    PostgREST) para saber el colchón de CADA cita ya tomada.
  - 🔴 **Orden de deploy** (ya no crítico — la migración está aplicada, ver abajo): igual, toda
    migración futura de este tipo debe correr antes que el código que depende de sus columnas.
- **Validación de ventanas cortas** (`agenda-servicios.tsx`): por cada servicio activo, compara su
  `duracion_minutos` contra cada rango de "Horario semanal" y cada excepción "apertura_extra" —
  si alguno es más corto, muestra un aviso inline ("Este servicio (60 min) no entra en Martes
  10:00–10:30 (30 min)...") justo debajo de la duración del servicio, en vez de que el dueño lo
  descubra con una lista vacía sin explicación.
- **Preview de próximos horarios reales**: botón "Ver próximos horarios" por servicio — reusa el
  endpoint público existente `GET /api/citas/disponibilidad` (mismo que ya consume
  `reservar-servicio.tsx` al agendar) en vez de duplicar el cálculo de `lib/agenda.ts` (server-only)
  en un componente cliente. Sin caché a propósito (se vuelve a pedir cada vez que se abre, así
  nunca muestra algo desactualizado tras editar horario/colchón).
- Migración `20260810000000_add_agenda_intervalo_colchon.sql` **APLICADA en producción**
  (confirmado desde esta sesión con una consulta real: `servicios_agendables.colchon_minutos`
  existe con su default, `existe_solapamiento_cita` acepta `p_colchon_minutos`;
  `tarjetas.intervalo_agenda_minutos` también existe pero quedó sin caller, ver arriba).
  Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. 🔴 Sin verificar en
  navegador real todavía — pendiente probar con servicios de distinta duración/colchón reales,
  confirmando que los huecos libres se calculan bien y que ningún horario ofrecido choca.

## Fuente del título/cuerpo siempre visible + Agenda absorbida como 6º tipo de botón (2026-08-10, mismo día)
- **Fix — la tipografía se ocultaba en modo "Título como logo"**: `SelectorTipografia` (título Y
  cuerpo) vivía dentro de la rama `tituloModo === "texto"` del bloque de tipografía — pero
  `fuenteEncabezado`/`fuenteCuerpo` pintan MÁS que el `<h1>` (también "Agendar", bio, etc. en
  todo `TarjetaCard`), así que en modo logo el dueño perdía la posibilidad de elegir esas
  fuentes para el resto de la tarjeta. Fix: ambos `SelectorTipografia` se movieron fuera del
  ternario (siempre visibles); solo tamaño/peso/color DEL título (que no aplican a una imagen)
  siguen ocultos en modo logo.
- **Agenda pasa a ser el 6º tipo de botón** (`BotonAgenda`, `tipo: "agenda"`) — la vieja sección
  "Agenda" (siempre visible, sin colapsar, en su propia pestaña del editor) desaparece; ahora es
  un botón más dentro de "Botones", con la misma cabecera de ícono/color/textura y toggle
  colapsable que Catálogo/Opciones. El componente `<AgendaServicios>` (horarios + CRUD de
  servicios agendables, escritura directa a Supabase) NO cambió — solo se reubicó, ahora vive
  dentro del panel expandido de ESE botón en vez de en su propia pestaña.
  - **Decisión de negocio confirmada con el cliente** (preguntado explícitamente antes de
    tocar código): la aparición de Agenda en la tarjeta pública sigue siendo 100% AUTOMÁTICA
    en cuanto hay servicios agendables activos — no depende de que el dueño se acuerde de
    agregar el botón. Por eso `BotonAgenda` es un **singleton**: `normalizarBotones()`
    (lib/boton-cta.ts) garantiza que SIEMPRE exista exactamente uno (se sintetiza uno default
    si no hay ninguno explícito todavía); el botón "Agenda" NO aparece en el selector "+
    agregar botón" (nunca se agrega manualmente, ya está ahí siempre) y su ✕/eliminar queda
    deshabilitado en el editor (`quitarBotonEn` lo ignora) — el dueño solo puede
    reordenarlo/personalizarlo (título/ícono/color/posición) como a cualquier otro botón.
    Sin servicios activos (o sin plan que los habilite), el botón entero sigue sin renderizarse
    en la tarjeta pública — mismo criterio de siempre, ahora aplicado al botón completo.
  - Nunca es hijo de "Opciones" (excluido de `BotonHijo`, igual criterio que "opciones" mismo
    — no tendría sentido duplicado ni anidado).
  - **`SeccionOrdenable`/`ordenSecciones`/"Orden de secciones" (editor) quedan deprecados por
    completo** — ya no queda más de un bloque a top-level (Agenda se mudó adentro de
    "Botones"), así que no hay nada que reordenar ENTRE secciones. Se sigue leyendo el
    `ordenSecciones` viejo, pero solo dentro de `normalizarBotones()`, para decidir si el botón
    Agenda migrado de una tarjeta vieja va antes o después de sus botones planos ya existentes
    (reproduce el orden que esa tarjeta ya mostraba). `RENDER_SECCION`/`ordenFinal`
    (tarjeta-card.tsx) se eliminaron — `renderBotones()` se llama directo.
  - Consecuencia menor aceptada: Agenda ahora ocupa una de las `TOPE_BOTONES = 8` posiciones
    del editor (antes no contaba contra ningún tope, al ser una pestaña aparte) — deja 7
    lugares reales para el resto de los tipos en vez de 8. No pedido explícito, cambio de
    comportamiento menor y de bajo impacto.
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. 🔴 No verificado
  todavía en navegador real (fix de tipografía ni Agenda-como-botón) — pendiente probar con una
  tarjeta real que ya tenga servicios agendables activos, confirmando que el botón sigue
  apareciendo automático, se puede reordenar/personalizar, y que el editor de horarios/
  servicios sigue funcionando igual dentro de su panel expandido.

## Texto enriquecido en catálogo, tipografía por botón con herencia, WhatsApp dinámico en ítems, ubicación centrable y fondo repetido reposicionable (2026-08-12)
- **Descripción de ítem de catálogo — "texto enriquecido" sin HTML real**
  (`src/lib/texto-enriquecido.tsx`): `Producto.descripcion` sigue siendo un string plano (cero
  migración) — admite `**negrita**` y `*cursiva*`/`_cursiva_` como marcadores, interpretados
  SOLO al renderizar (`renderizarTextoEnriquecido()`, usado en `catalogo-item-modal.tsx`).
  Decisión explícita: se descartó contentEditable + `dangerouslySetInnerHTML` + sanitizador de
  HTML (superficie de XSS real, ver contexto: `cupon_usos`/`descripcion` la escribe el DUEÑO de
  la tarjeta con su propia sesión vía RLS, así que un HTML mal sanitizado sería XSS contra los
  VISITANTES de esa tarjeta) — en vez de eso, un parser propio, sin ninguna API de DOM (isomorfo
  server+cliente), que nunca acepta HTML, solo 2 marcadores de texto. `EditorTextoEnriquecido`
  (`components/tarjeta/editor-texto-enriquecido.tsx`): textarea + 2 botones que envuelven la
  selección (`envolverSeleccion()`, toggle si ya está envuelta) — sin `document.execCommand`.
  **Supuesto tomado, no pedido palabra por palabra**: se acotó a negrita/cursiva (sin listas ni
  links) por ser una "descripción CORTA" — ajustar si el cliente pide más.
- **Fuente y peso por botón, con herencia** (`lib/boton-cta.ts` →
  `resolverTipografiaBoton()`/`TipografiaBoton`, única función recursiva reusada TAL CUAL por el
  editor —`resolverTipografiaBotonForm()`, gemela sobre `BotonFormState`— y el render público):
  `BotonBase` gana `fuenteBoton?`/`pesoBoton?` (sin valor = hereda). Regla de herencia
  (pedida explícita): un hijo de "opciones" hereda la EFECTIVA de su botón padre; un botón
  top-level que no es el primero de la lista hereda la del primero; sin nada de qué colgarse
  (el primer botón top-level, o un padre/primero sin valor propio), cae a la tipografía general
  de la tarjeta (`estiloTipografia`) y peso 600 (el mismo fijo que tenían TODOS los botones
  antes de esta feature — cero regresión visual para tarjetas que nunca toquen esto).
  - **Sin gating de plan a propósito**: los demás campos de `BotonBase` (color/textura) tampoco
    lo tienen — se le pasa a `SelectorTipografia` (reusado tal cual, mismo dropdown con cada
    opción en su propia fuente) un `features` fijo en `{true, true}` para que nunca muestre
    `CandadoPlan`, en vez de replicar su lógica de gating (pensada para `IdentidadVisual`, no
    para botones).
  - `fontFamily` se aplica al CONTENEDOR entero del botón (cascada también al subtítulo, deseado);
    `fontWeight` se aplica SOLO al título (`BotonVistaPrevia.estiloTitulo`, nuevo prop) — el
    subtítulo mantiene su peso liviano de siempre, mismo alcance que tenía la clase
    `font-semibold` hardcodeada que este cambio reemplaza. `estiloDeBoton()` (tarjeta-card.tsx)
    ahora devuelve `{contenedor, titulo}` en vez de un solo `CSSProperties` — los 2 call sites
    (`renderBotonSimple`, `renderCabeceraToggle`) y sus llamadores (`renderBotonOpciones`,
    `renderBotonCatalogo`) se actualizaron para pasar/reenviar el `padre` cuando corresponde.
- **Link de WhatsApp dinámico en ítems de catálogo** (pedido explícito, mismo criterio que ya
  tenía `BotonCta` antes de la unificación de tipos de botón): helper "Crear link de WhatsApp"
  debajo del campo Enlace de cada ítem — número (con atajo "usar el mismo de Canales de
  contacto") + mensaje (default `"Hola, quiero más información sobre {título del ítem}"`,
  editable) → `construirUrlWhatsapp()` arma el link en vivo y lo vuelca a `enlaceUrl`. 100%
  efímero (`waAbierto`/`waNumero`/`waMensaje` en `ProductoFormState`, nunca en `Producto`/DB) —
  el campo real que se persiste sigue siendo `enlaceUrl`, un string común y corriente.
- **Ubicación/horario centrable** (`IdentidadVisual.ubicacionCentrada?: boolean`, default
  `false` = izquierda, sin cambios): switch nuevo en "Ubicación y negocio". Sin gating de plan
  (organización visual, mismo criterio que `ordenContacto`).
- **Fondo de imagen repetido — ahora reposicionable/redimensionable** (antes el botón
  "Reposicionar" se ocultaba por completo en modo "Repetir fondo"): `fondoImagenPosicion`
  (mismo campo `{x, y, escala}` de siempre) ahora también se usa en modo repetido,
  reinterpretado como `background-position`/`background-size` en vez de `object-position`/
  `transform` (`escala` ensancha el ancho más allá del 100%, simulando el mismo "acercar" que
  ya hacía el modo sin repetir). **Nota real**: el modal `ReposicionarImagen` sigue mostrando
  una vista previa tipo "cover" (recorte único) en vez de una vista previa tileada — los
  valores que produce SÍ afectan bien el resultado final repetido, pero la vista previa DEL
  MODAL no es 1:1 con el resultado tileado real (decisión consciente de no duplicar el modal
  con un segundo modo de preview, desproporcionado para esta combinación de features) — el
  dueño puede ajustar y mirar la vista previa real de la tarjeta (que si renderiza el tileado
  correcto) para calibrar. **Cambio de default menor, no pedido**: el punto de partida de
  "Repetir fondo" sin tocar nunca la posición pasó de arriba-centro (`top center` hardcodeado)
  a centro (`50% 50%`, el default que ya tenía `fondoImagenPosicion` para el modo normal, ahora
  compartido) — impacto bajo, la feature en sí "no se verificó visualmente" todavía según la
  sesión anterior.
- **Fix — fondo del título de ítem de catálogo en vista "Lista" se veía como un subrayado, no
  un chip** (bug real reportado): `line-clamp-2` fuerza `display: -webkit-box` (modo de caja
  legacy) en el mismo elemento que tenía el `background-color` — ese modo no siempre respeta
  `flex-1`/ancho completo, así que el fondo quedaba encogido al ancho real del texto en vez de
  llenar la fila. Fix: el fondo/color pasó a un `<div>` contenedor normal (que si respeta
  `flex-1`), con el `<p className="line-clamp-2">` (sin fondo propio) adentro — mismo criterio
  en vista "Grid".
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios en cada paso. 🔴 No
  verificado todavía en navegador real (ninguno de los 5 ítems de esta sesión) — pendiente
  probar: negrita/cursiva en una descripción real, herencia de tipografía padre→hijo y
  primero→subsecuentes con una tarjeta de varios botones, el link de WhatsApp generándose bien
  con caracteres especiales en el título, centrado de ubicación/horario, y el fondo repetido
  con zoom/posición custom.
- **Deploy de este commit a producción falló, diagnosticado y resuelto desde esta sesión**:
  el build de Vercel (commit `11209ae`) tiró "Turbopack build failed with 8 errors" — todos
  `Module not found` resolviendo la fuente Plus Jakarta Sans (`next/font/google`), un 404 real
  pidiendo el archivo a `fonts.gstatic.com` durante el build. Confirmado que NO era un bug de
  código (`git diff` entre el último deploy bueno y este, cero cambios en `layout.tsx`, donde
  se cargan las fuentes) — problema transitorio de red/caché de build. Producción nunca quedó
  caída (Vercel no promueve un build roto, `linkard.mx` siguió sirviendo el commit anterior
  todo el tiempo). Se entró al dashboard de Vercel vía Claude in Chrome (browser automation,
  reusando la sesión ya logueada del usuario — sin credenciales propias de Vercel en este
  entorno) para leer el log del build y disparar un Redeploy sin caché, que terminó en 1m10s
  con estado Ready — confirmado visitando `linkard.mx` directo después. Sin acción de código
  necesaria; queda como antecedente por si vuelve a pasar (mismo síntoma → mismo diagnóstico:
  revisar si layout.tsx cambió antes de asumir que es un bug real).

## Contenido multimedia como lista tipada (video + reels de Instagram) y fix de fondo de ítem de catálogo en vista Lista (2026-08-13)
- **"Contenido multimedia" pasa de un campo único (`videoUrl`, solo YouTube) a una lista
  tipada** — mismo patrón que la unificación de Botones (2026-08-09): el dueño agrega N ítems,
  cada uno de un tipo con su propio shape (`MultimediaItem` = `MultimediaVideo | 
  MultimediaReels`, lib/types.ts). `videoUrl` queda `@deprecated` (JSONB, sin migración de
  schema) — se sigue leyendo solo dentro de `normalizarMultimedia()` (lib/multimedia.ts,
  mismo criterio que `normalizarBotones()`: migración en memoria, nunca escribe hasta el
  próximo "Guardar").
  - **Tipo "Video"**: un campo de URL — YouTube o Vimeo, **auto-detectado**
    (`resolverEmbedVideo()`, el dueño no elige el proveedor a mano). YouTube reusa
    `obtenerYoutubeEmbedUrl()` (lib/youtube.ts, sin cambios); Vimeo es nuevo (mismo archivo,
    `lib/multimedia.ts`) — el ID es el último segmento puramente numérico del path, cubre
    `vimeo.com/123`, `player.vimeo.com/video/123` y las variantes `/channels/`/`/groups/`.
  - **Tipo "Reels de Instagram"**: un solo ítem agrupa hasta `TOPE_REELS_POR_BLOQUE = 5` URLs
    (no un ítem por reel — a diferencia de Botones, acá no hace falta título/ícono/color por
    reel individual). 🔴→✅ **La primera versión de esta sección describía un embed directo por
    iframe a `/embed`, a propósito sin el script oficial — quedó DESCARTADO al día siguiente
    por un bug real (no reproducía, redirigía a Instagram), ver la sección "Reels de Instagram:
    fix de reproducción + posición elegible" más abajo para el estado real.**
  - **Render público** (`renderMultimedia()`, tarjeta-card.tsx): "Video" mantiene el mismo
    embed `aspect-video` de siempre; "Reels" es un slide horizontal con **scroll-snap nativo
    de CSS** (`snap-x snap-mandatory` + `.scrollbar-hide`, clase nueva en `globals.css`) —
    sin librería de carrusel (Embla/Swiper/etc. no estaban instaladas, mismo criterio de "sin
    dependencia nueva si CSS alcanza" que el resto del proyecto). Cards `aspect-[9/16]`
    (proporción real de un reel), 62% del ancho en mobile / 45% en `sm:` (deja asomar la
    siguiente card, hint visual de que se puede seguir deslizando — el efecto "cool" pedido).
  - **Editor** (`tarjeta-form.tsx`): mismo patrón de fila colapsable que Botones
    (`renderMultimediaFila`) — ícono/badge de tipo + mover ↑/↓ + eliminar + expandir, sin
    anidar (a diferencia de Botones, acá no hay "opciones"/hijos). Tope
    `TOPE_MULTIMEDIA = 4` ítems totales (video+reels combinados) — **supuesto tomado por
    Claude Code, no pedido palabra por palabra**, ajustar si hace falta más. Ícono de
    Instagram: no existe en `lucide-react` (repo no lo tiene) — se reusa
    `SOCIAL_ICONS.instagram` (`social-icons.tsx`, el mismo SVG curado que ya usan las redes
    sociales del editor), no se agregó ningún ícono nuevo.
- **Fix — fondo del chip de título de ítem de catálogo en vista "Lista" no cubría toda la
  altura de la fila** (bug real reportado, iteración 2 del mismo problema visual de
  2026-08-12): el fix anterior (mover el fondo del `<p>` a un `<div>` contenedor) resolvió el
  ancho pero no la altura — el `<div>` con `flex-1` seguía tomando la altura de SU PROPIO
  contenido (angosto, centrado verticalmente en medio de la fila) en vez de estirarse a la
  altura real de la imagen (`size-16`, 64px), porque la fila (`<button>`) tenía
  `items-center` en vez de `items-stretch`. Fix: `items-center` → `items-stretch` en la fila
  de vista "Lista" — la imagen (altura fija explícita, no afectada por `align-items`) y el
  chip de fondo (ahora sí estirado a esa altura) quedan parejos.
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. Sin verificar en
  navegador real en el momento de escribir esto — el cliente probó los reels al día siguiente
  en una tarjeta real y confirmó el bug de arriba (🔴→✅, ver sección siguiente para el fix).

## Reels de Instagram: fix de reproducción + posición elegible de "Contenido multimedia" (2026-08-14)
- **🔴→✅ Bug real reportado por el cliente probando en una tarjeta real**: los reels no se
  reproducían — al tocarlos, redirigía a Instagram en vez de reproducir ahí mismo. Causa: el
  iframe directo a `https://www.instagram.com/reel/{codigo}/embed` (la primera versión de esta
  feature, día anterior) **no es un embed reproducible sin el script oficial de Instagram** —
  sin `embed.js`, esa URL sirve una tarjeta estática con nada más que un link de salida. No
  existe una forma de reproducir un reel embebido de verdad sin ese script — no es una opción
  entre varias, es la única soportada por Instagram.
  - **Fix**: `src/components/tarjeta/instagram-reel-embed.tsx` (nuevo) — el widget oficial
    (`<blockquote class="instagram-media" data-instgrm-permalink="...">` + `<script
    src="https://www.instagram.com/embed.js">`, exactamente lo que da el botón "Insertar" de
    Instagram). El script se carga UNA sola vez de forma compartida (`let promesaScript`,
    módulo-level) y se reusa entre reels; cada `<InstagramReelEmbed>` llama
    `window.instgrm.Embeds.process()` en su propio mount — Instagram ignora los blockquotes
    que ya procesó, seguro de llamar más de una vez con varios reels en la misma página (el
    slide). **Contrapartida aceptada conscientemente** (no había alternativa): esto SÍ carga y
    ejecuta JS de un tercero (instagram.com) en la tarjeta pública — se había evitado a
    propósito en la primera versión, pero sin eso no hay reproducción real, y el pedido
    explícito era "que la reproducción sea desde la Linkard, tal cual lo haría un video".
  - `lib/multimedia.ts`: `obtenerInstagramReelEmbedUrl()` (armaba una URL de `/embed`) pasó a
    `normalizarInstagramReelUrl()` — el widget oficial necesita el PERMALINK real del reel
    (`https://www.instagram.com/reel/{codigo}/`), no una URL de embed; la función cambió de
    "armar el embed" a "validar y normalizar el link tal cual lo pegó el dueño".
  - **Tamaño de card ya no es 100% controlable por CSS**: a diferencia del iframe directo (que
    sí se podía forzar a `aspect-[9/16]` completo), el widget oficial decide su propio tamaño
    internamente (responsive dentro de un rango, `minWidth`/`maxWidth` seteados en el
    `<blockquote>`) — la card del slide pasó de "ancho % + aspect-ratio forzado" a un ancho
    fijo (`w-[280px]`) con `overflow-hidden` de contención, sin forzar alto. Ligero downgrade
    de control visual, aceptado porque no hay forma de tener reproducción real Y control
    pixel-perfect al mismo tiempo con este widget.
- **Posición de "Contenido multimedia" elegible** (pedido explícito, mismo día):
  `IdentidadVisual.multimediaAlFinal?: boolean` — `false`/sin valor (default, sin cambios) deja
  el bloque donde siempre estuvo (después de Canales de contacto/redes, antes de Botones);
  `true` lo corre al final de la tarjeta, después de Botones/Agenda. Control nuevo (segmented
  pill, mismo patrón que "Texto/Logo" del título) arriba de la lista de ítems en "Contenido
  multimedia". Render: `tarjeta-card.tsx` llama `renderMultimedia()` en 2 puntos posibles del
  JSX (antes o después de `renderBotones()`), gateados por el mismo booleano — sin duplicar la
  función de render, solo el PUNTO donde se invoca cambia.
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. 🔴 No verificado
  todavía en navegador real — pendiente confirmar con el cliente que ahora sí reproduce inline
  (no redirige) y que la posición "al final" se ve bien con una tarjeta real que tenga
  Botones + Agenda + multimedia a la vez.
- **Bug real encontrado por el cliente probando en `/limpio` al día siguiente**: los reels
  seguían viéndose mal (recortados/rotos). Causa: `w-[328px]` — el ancho que le había puesto
  al wrapper/blockquote (280px/236px) estaba POR DEBAJO del ancho mínimo real que Instagram
  exige para este widget (**328px** — no es un número inventado, es lo que Instagram
  documenta como mínimo soportado) — Instagram igual intentaba renderizar a su ancho mínimo
  real y quedaba recortado por nuestro `overflow-hidden` más angosto. Fix: wrapper y
  blockquote ambos a `328px` fijo (antes eran anchos distintos entre sí, ninguno correcto).
- **Límite real explicado y confirmado con el cliente, no un bug**: el encabezado
  (foto+usuario) y pie (íconos + "Ver en Instagram") del widget oficial **no se pueden quitar
  por ningún medio** — es contenido de un iframe de `instagram.com` (otro origen), ningún CSS
  nuestro llega ahí adentro, y es intencional de parte de Instagram (su marca siempre visible
  en cualquier embed). Ya se había sacado la descripción del post (sin
  `data-instgrm-captioned`, la variante más compacta que existe) — no hay forma de achicarlo
  más sin perder la reproducción inline. Se le presentaron 3 opciones al cliente (dejarlo así
  con la marca de Instagram visible / volver a una tarjeta propia sin marca pero que redirige
  al tocar / sacar reels de la feature por ahora) — 🔴→✅ **eligió dejarlo así en un primer
  momento, pero al probarlo de verdad en `/limpio` no le gustó** (ver sección siguiente: se
  terminó sacando por completo, reemplazado por una galería de archivos propios).

## "Reels de Instagram" reemplazado por galería de imágenes/videos SUBIDOS (2026-08-15, mismo día)
- **Decisión final del cliente, probando en vivo**: después de ver el widget oficial de
  Instagram funcionando (reproduce, pero con su encabezado/pie de marca) dijo "no me gusta,
  hay que quitarlo" — pidió reemplazarlo por una galería de imágenes/videos que el dueño SUBE
  directo (no un link a otro lado). Esto resuelve de raíz el problema que perseguía toda la
  sesión: al ser un archivo propio en nuestro Cloudinary, se reproduce con un `<video>`/
  `<Image>` nativo — CERO marca de terceros, control total de tamaño/proporción, sin
  depender de ningún widget externo.
- **Tipo "reels" retirado por completo** (no quedó como `@deprecated` legacy — es una feature
  de 2 días de vida, sin uso real fuera de una tarjeta de prueba): `MultimediaReels` →
  `MultimediaGaleria` en `lib/types.ts` (`items: GaleriaItem[]`, cada uno
  `{url, tipo: "imagen"|"video"}`). `normalizarMultimedia()` filtra defensivamente cualquier
  ítem con un `tipo` desconocido (cubre el caso real de que `/limpio`, la tarjeta de prueba,
  todavía tuviera ítems `tipo: "reels"` guardados de la versión anterior — no rompe, solo deja
  de mostrarlos). `src/components/tarjeta/instagram-reel-embed.tsx` se borró (sin caller).
- **Subida real a Cloudinary** (mismo patrón que avatar/banner/ítems de catálogo —
  `subirImagenCloudinary()`, ya existente): carpeta nueva `mitarjeta/multimedia` (whitelisteada
  en `cloudinary-sign/route.ts`). `subirImagenCloudinary()` ganó un 3er `resourceType` posible
  (`"video"`, antes solo `"image"|"raw"`) — no hizo falta tocar la firma (`firmarSubidaCloudinary()`
  solo firma `folder`+`timestamp`, `resource_type` es parte de la URL de Cloudinary, no un
  parámetro firmado). `lib/subir-imagen.ts` ganó `validarVideo()` (mismo criterio que
  `validarImagen()`/`validarPdf()`) — **límite 30MB, supuesto tomado por Claude Code, no un
  número pedido explícitamente** (bien por encima del límite de 5MB de imágenes: un clip corto
  ya pesa varios MB); ajustar si en la práctica queda corto o largo.
- **Editor**: cada ítem "galeria" tiene 2 botones de subida (Imagen/Video, inputs de archivo
  ocultos tipo `<label>`) + grilla de miniaturas (`size-16`, con badge "Foto"/"Video" y botón
  quitar) — mismo patrón visual que ítems de catálogo. Tope `TOPE_GALERIA_ITEMS = 8`
  (reemplaza `TOPE_REELS_POR_BLOQUE = 5` — más alto porque una galería de fotos propias
  razonablemente tiene más ítems que una curaduría de reels ajenos, supuesto tomado por
  Claude Code). Subida orquestada junto con el resto (`TareaSubida` ganó el caso
  `"galeriaItem"`, direccionado por `claveGaleriaItem(indiceMultimedia, indiceItem)` — mismo
  criterio de clave compuesta que `claveItemCatalogo`). `construirMultimediaFinal()` (para
  guardar, usa las URLs recién subidas) y `construirMultimediaPreview()` (para la vista previa
  en vivo, usa el preview local `URL.createObjectURL`) quedaron separadas — mismo criterio que
  `construirBotonFinal`/`construirBotonPreview`.
- **Render público**: mismo slide horizontal con scroll-snap de antes, ahora con cards
  `aspect-square` de 220px — imágenes vía `next/image` (mismo criterio `esUrlOptimizable` que
  el resto de imágenes de Cloudinary de la tarjeta), videos vía `<video controls playsInline
  preload="metadata">` nativo, sin autoplay (el dueño/visitante lo reproduce con el control
  real del navegador, "tal cual lo haría un video" — pedido explícito).
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. 🔴 No verificado
  todavía en navegador real — pendiente probar: subir una imagen y un video reales a una
  galería, confirmar que el video reproduce con los controles nativos (sin ninguna marca de
  terceros) y que el límite de 8 ítems/30MB por video se siente razonable en la práctica.

## "Repetir fondo" reposicionable de verdad en los 2 ejes + Título opcional (2026-08-16)
- **🔴→✅ Bug real reportado por el cliente**: en modo "Repetir fondo" (imagen de fondo de
  toda la tarjeta, ver sección anterior), el reposicionamiento solo funcionaba en el eje
  horizontal — el vertical no tenía ningún efecto visible real, y la vista previa (miniatura
  del editor y modal de arrastre) no coincidía con lo que terminaba viéndose en la tarjeta.
  - **Causa real**: con `background-repeat: repeat-y`, un `background-position` en
    PORCENTAJE se calcula contra el **alto total del contenedor** (`(altoContenedor -
    altoBaldosa) * pct`) — nunca contra el alto de UNA baldosa del patrón. El contenedor real
    mide hasta 3000px (`ALTO_FONDO_IMAGEN`) o `100svh` en pantalla completa, muchísimo más
    que una baldosa (unas pocas decenas/cientos de px) — el mismo % de Y guardado producía un
    desplazamiento en píxeles gigantesco que, al repetirse la imagen, terminaba en un punto
    casi arbitrario del patrón (a veces indistinguible del original). En X no pasaba porque
    no hay `repeat-x`: el ancho de la baldosa se fija en `contenedor × escala`, el mismo
    contenedor contra el que se calcula el %, así que ahí el % sí es válido — de ahí que el
    bug fuera "solo en vertical".
  - **Fix**: el offset de Y se expresa ahora en **píxeles absolutos relativos a UNA baldosa**
    (`offsetYBaldosaRepetida`/`porcentajeYDesdeOffsetBaldosa`/`altoBaldosaRepetida`, funciones
    puras nuevas en `lib/imagen-posicion.ts`), en vez de en % del contenedor — el eje X sigue
    en % (siempre fue correcto ahí). El alto real de una baldosa se mide con un hook nuevo
    (`useAltoBaldosaRepetida`, `fondo-imagen-repetido.tsx`): ancho del contenedor vía
    `ResizeObserver` (cambia entre mobile/desktop/miniatura) × proporción natural del archivo
    (`naturalWidth/Height`, cargado una vez por URL vía `new Image()`, sin depender de un
    `<img>` visible).
  - **Un solo componente reusado en los 3 lugares que renderizan el patrón repetido**
    (`<FondoImagenRepetido>`, nuevo) — la tarjeta real (pantalla completa y contenida, en
    `tarjeta-card.tsx`), la miniatura del editor (`tarjeta-form.tsx`) y, para el arrastre en
    vivo, el propio cálculo de fondo dentro de `ReposicionarImagen` — los 3 nunca pueden
    volver a desincronizarse entre sí, que era la otra mitad del reporte ("la vista previa
    también se debe visualizar correctamente siempre").
  - **`ReposicionarImagen` ganó un prop `repetir?: boolean`** (pasado solo desde la invocación
    del modal para la imagen de fondo, `fondoImagenRepetir` — el banner normal y el resto de
    invocaciones del modal, avatar/ítems de catálogo/logo del título, no lo usan y siguen con
    el comportamiento de siempre): en este modo, la vista previa del modal deja de ser un
    recorte tipo `object-fit:cover` (limitación aceptada en la sesión anterior) y pasa a ser
    el mismo fondo tileado real, con arrastre directo sobre ese `div` (sin `<img>` de por
    medio). Matemática de arrastre distinta a la de siempre en el eje Y: sin `clamp` (el
    patrón se repite infinito, no hay límite real) — se normaliza con módulo, así arrastrar
    sin soltar "gira" el patrón en vez de trabarse en un extremo, igual sensación que un
    fondo repetido de verdad. El eje X sigue acotado (overflow real: `contenedor ×
    (escala-1)`, mismo criterio que el render final).
  - **🔴→✅ Segundo bug real, mismo día, reportado apenas se probó el fix de arriba**: con la
    posición SIN tocar (default recién descrito), la imagen se veía centrada dentro de cada
    baldosa en vez de arrancar con su tope pegado al tope del banner — pedido explícito del
    cliente: "al repetirla, la imagen debe quedar el top de la imagen y el top del banner".
    Causa: `fondoImagenPosicion` es un campo COMPARTIDO con el modo sin repetir (cover), donde
    el default `{x:50, y:50}` significa "centrado" — ese mismo `y:50` alimentaba
    `offsetYBaldosaRepetida` tal cual, dando un offset de medio tile (visualmente "centrado"
    dentro de la baldosa) en vez de 0 (tope). Fix: `yEfectivaRepetida()` (nueva, `lib/imagen-
    posicion.ts`) — mientras el dueño no arrastró el eje Y a mano (sigue en el 50 default
    compartido), se interpreta como 0 (tope); si ya lo movió a cualquier otro valor, se
    respeta tal cual. No reescribe el dato guardado, solo cambia cómo se INTERPRETA ese
    sentinel compartido cuando el modo es Repetir — aplicado en los 3 lugares que leen
    `posicion.y` en este modo (`FondoImagenRepetido`, y las 2 lecturas de
    `ReposicionarImagen`: el preview del modal y el arranque del arrastre).
  - Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. 🔴 No
    verificado todavía en navegador real — pendiente confirmar con el cliente que el
    arrastre vertical ahora se siente 1:1, que arranca alineado arriba por default, y que la
    miniatura/modal/tarjeta real coinciden con una imagen real, sobre todo en los extremos
    (imagen muy panorámica vs. muy vertical, con y sin zoom).
- **Título ("nombre") pasa a ser opcional** (pedido explícito del cliente): se sacó el
  `required` del input y la validación que bloqueaba "Guardar" con
  `"Ingresa un título para continuar."` en `tarjeta-form.tsx`. En `TarjetaCard`, el `<h1>` del
  título (rama de texto, no la de "Título como logo") ahora es condicional a que el nombre
  tenga contenido — en blanco no se reserva ningún hueco (ni el texto ni su `mt-2`), como si
  el elemento no existiera, en vez de mostrar el placeholder `"Sin nombre"` de antes. Los
  fallbacks a `"Sin nombre"` que ya existían en otros lugares NO se tocaron a propósito, son
  contextos distintos al elemento visual de la tarjeta: `nombrePrincipalDeTarjeta()`
  (listados internos de admin/`mi-cuenta`), el `FN:` del vCard exportable (`exportar-
  tarjeta.ts`, el campo es obligatorio en la spec de vCard) y el `<title>`/OG de `[slug]/
  page.tsx` (ya tenía su propio fallback `"Tarjeta digital"`, sin cambios). "Título como logo"
  (`tituloModo: "imagen"`) no depende del nombre en absoluto, sin cambios ahí.
  - Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. 🔴 No
    verificado todavía en navegador real.

## Videos de la galería optimizados por Cloudinary + poster del primer frame (2026-08-16, mismo día)
- **Reporte del cliente**: videos verticales subidos a la galería de "Contenido multimedia"
  pesaban de más (tile de 220px mostrando el archivo a resolución completa) y no había ninguna
  miniatura mientras cargaban — pantalla negra/vacía hasta tocar play. Pidió optimizar la
  carga y usar el primer frame del video como "cubierta".
- **`src/lib/cloudinary-media.ts`** (nuevo, cliente — a diferencia de `lib/cloudinary.ts`, que
  es server-only porque firma la SUBIDA con el API secret, esto son transformaciones "on the
  fly" en la URL de ENTREGA, pura manipulación de string, sin necesitar ninguna firma):
  - `videoOptimizadoGaleria(url)`: inserta `f_auto,q_auto,c_fill,w_440,h_440` en la URL del
    video — Cloudinary sirve el códec/calidad más liviano que soporte el navegador, ya
    recortado al mismo cuadrado que el tile (`object-cover` en CSS pasa a ser redundante con
    esto pero se dejó como fallback) en vez de bajar el archivo a resolución completa (1080×1920
    de un clip vertical de celular) para mostrarlo en 220px. 440 = 2x el tile real, nítido en
    retina.
  - `posterVideoGaleria(url)`: mismo recorte pero pide un JPG del frame en el offset `so_0`
    (el primer frame) en vez del video — usado como `poster` del `<video>`, habilita
    `preload="none"` (cero descarga de video hasta que el visitante toca play; antes era
    `preload="metadata"`, que igual pedía algo de data al servidor).
  - Ambas devuelven la URL sin tocar si no es optimizable (`esUrlOptimizable`, `lib/imagen-
    posicion.ts`) — cubre el preview local `blob:` de un video recién elegido en el editor,
    todavía sin subir, donde no hay nada que Cloudinary pueda transformar.
  - Aplicado en el render público (`tarjeta-card.tsx`) y también en la miniatura chica
    (64px→pide 128px) del editor (`tarjeta-form.tsx`) para consistencia, aunque ahí el ahorro
    de peso importa menos que en la tarjeta pública.
- 🔴 **Caveat no verificable desde acá**: las transformaciones "on the fly" en la URL de
  entrega requieren que la cuenta de Cloudinary NO tenga activado "Strict transformations"
  (Settings → Security) — si está activado, Cloudinary devuelve un 401 para cualquier
  combinación de parámetros que no haya sido pre-autorizada, y estos videos se romperían en
  vez de optimizarse. La mayoría de las cuentas lo tienen desactivado por default (nuestra
  firma de subida tampoco lo requeriría si estuviera activo, así que no hay señal indirecta
  de que esté prendido) — pendiente confirmar en el dashboard de Cloudinary si algo se ve
  roto.
- **Alcance NO tocado a propósito**: el tile se mantuvo `aspect-square` (mismo criterio que
  las imágenes de la galería, uniformidad del grid) — un video vertical sigue recortándose
  arriba/abajo con `object-cover` dentro del cuadrado, ahora ya recortado del lado de
  Cloudinary. No se cambió a un tile más alto para video porque no fue un pedido explícito
  (el cliente mencionó la proporción 1:1 como contexto de la pregunta de carga, no como algo a
  cambiar) — avisar si en la práctica se prefiere un tile propio para video vertical.
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (41 rutas) limpios. 🔴 No verificado
  todavía en navegador real ni contra la cuenta real de Cloudinary — pendiente confirmar que
  las URLs transformadas cargan (no 401) y que el poster se ve como el primer frame real.

## Pendiente técnico sin resolver (consolidado)
- 🔴🔴 **Urgente — publicado en marketing sin código real todavía** (ver "Copy de marketing de
  planes" arriba para el detalle completo de cada uno, decisión consciente del cliente de
  publicar antes de construir): sincronización con Google Calendar (Connect); fuentes de
  tráfico/canales, analítica geográfica y de dispositivos, píxeles de seguimiento (Meta/GTM/
  TikTok), reporte mensual por correo y parámetros UTM personalizados (los 5, Growth). "Cero
  ausencias" por WhatsApp (Connect) es un caso aparte: el código real es una confirmación al
  agendar, no el recordatorio programado antes de la cita que el copy sugiere.
- 🔴 Texto enriquecido en catálogo, tipografía por botón, WhatsApp dinámico en ítems, ubicación
  centrable y fondo repetido reposicionable (2026-08-12) — solo verificado con `tsc`/`eslint`/
  `build`, sin probar en navegador real todavía (ver esa sección para el detalle completo).
- 🔴 Contenido multimedia como lista tipada (video/reels) y fix de altura del chip de catálogo
  en vista Lista (2026-08-13) — solo verificado con `tsc`/`eslint`/`build`, sin probar en
  navegador real todavía (ver esa sección para el detalle completo).
- 🔴 Posición elegible de "Contenido multimedia" (2026-08-14) — solo verificado con
  `tsc`/`eslint`/`build`, sin confirmar en navegador real.
- 🔴 Reels de Instagram retirado por completo, reemplazado por galería de imágenes/videos
  SUBIDOS (Cloudinary propio, sin marca de terceros — 2026-08-15, decisión final del cliente
  después de probar el widget oficial de Instagram y no querer su chrome de marca) — solo
  verificado con `tsc`/`eslint`/`build`, sin probar subir un archivo real todavía (ver esa
  sección para el detalle completo).
- 🔴 "Repetir fondo" reposicionable en los 2 ejes (fix del bug real de arrastre vertical) +
  Título opcional (2026-08-16) — solo verificado con `tsc`/`eslint`/`build`, sin probar en
  navegador real todavía (ver esa sección para el detalle completo).
- 🔴 Videos de la galería optimizados vía transformación de Cloudinary + poster del primer
  frame (2026-08-16) — solo verificado con `tsc`/`eslint`/`build`, sin confirmar contra la
  cuenta real de Cloudinary (posible bloqueo por "Strict transformations") ni en navegador
  real (ver esa sección para el detalle completo).
- 🔴 Agenda como calendario único (duración+colchón por servicio, sin "paso" configurable,
  2026-08-10) — migración APLICADA y confirmada por consulta real desde esta sesión, código
  listo para deploy; falta la prueba en navegador con servicios reales de distinta
  duración/colchón, confirmando huecos libres calculados bien y cero choques.
- 🔴 Fuente siempre visible en modo logo + Agenda como 6º tipo de botón (2026-08-10, ítem de
  arriba) — sin verificar en navegador real todavía.
- 🔴 Lo de esta sesión (2026-08-10, ítem de arriba) sin verificar en navegador salvo el fix de
  centrado del logo — pendiente probar reposicionamiento de imagen de catálogo, fix del modal,
  posición/color del "⋮" y el reorder de contacto/redes con una tarjeta real.
- 🔴 "Repetir fondo" (imagen de fondo, 2026-08-10) sin verificar visualmente con una imagen
  real — el CSS (`background-repeat`/`background-size`) es estándar, pero no se confirmó en
  navegador.
- 🔴 Unificación de Botones (2026-08-09): los 5 tipos + opciones anidado + catálogo + archivo en
  Poder ya se verificaron en navegador real sobre una tarjeta real, sin guardar (ver esa
  sección) — falta todavía probar los 4 casos de migración legacy (tarjeta vieja con solo
  `servicios` plano, o con los 4 campos legacy a la vez) porque ninguna tarjeta de la cuenta
  usada tenía ese contenido guardado.
- 🔴 Migración `20260801000000_add_tarjeta_slug_historial.sql` sin aplicar — límite de slug
  no enforced en DB todavía.
- 🔴 `invoice.paid` y `customer.subscription.created` faltan en el webhook LIVE de Stripe
  (dashboard) — sistema de afiliados no registra nada real en producción sin esto.
- 🔴 Backfill de `afiliado_id` en cupones/cupon_usos legacy — pendiente de que existan
  afiliados reales dados de alta.
- 🔴 3 keys de Stripe (live) y `NEXT_PUBLIC_SITE_URL=https://linkard.mx` pendientes de
  confirmar en Vercel Environment Variables.
- 🔴 Customer Portal de Stripe sin configuración default en el Dashboard (Settings → Billing).
- 🔴 Cliente OAuth de Google sin publicar (pendiente TXT record del dominio + reenvío a
  revisión de marca).
- 🔴 Bug sin resolver: crear suscripción para tarjeta adicional a veces falla con "no pudimos
  iniciar la suscripción con Stripe" — necesita Runtime Logs de Vercel para diagnosticar.
- 🔴 Bug sin resolver: login con Google pierde `?plan=` en el retorno, solo con cuentas de
  Google nuevas — causa probable fuera del repo (Supabase Auth Hooks / Google Cloud Console).
- `reclamo.ts` y `admin/dashboard/page.tsx` escriben directo a `tarjetas` desde rol
  `authenticated` — deuda técnica identificada, impide GRANT/REVOKE más estricto sobre esa
  tabla.
- El sistema de gating por tier (`TierPersonalizacion` "basica"/"avanzada" en
  `lib/personalizacion.ts`, `<CandadoPlan>`) quedó sin refactor tras pasar a 2 planes
  (2026-08-11) — ambos otorgan `personalizacion_libre`/`personalizacion_avanzada` por
  igual, así que el candado ya nunca se dispara con un plan activo (solo sin plan). Deuda
  técnica identificada, no resuelta a propósito (fuera de alcance de ese cambio); un
  refactor futuro podría colapsarlo a un gate binario "¿tiene plan o no?".
- `existe_solapamiento_cita()` no previene condición de carrera entre inserts simultáneos del
  mismo horario (doble booking posible). Hardening futuro: EXCLUDE constraint con
  `btree_gist`. Riesgo aceptado para el volumen inicial.

## Notas de proceso
- Proyecto de Supabase: producción única, sin staging. Antes de cualquier migración: backup
  con `pg_dump` (plan free, sin backups automáticos ni PITR).
- Convención de migraciones: `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`, aditivas,
  envueltas en `BEGIN`/`COMMIT`.
- Sin `supabase` CLI ni `DATABASE_URL` vinculados en el entorno de Claude Code — las
  migraciones más recientes las corre el usuario manualmente contra producción; su
  confirmación se toma como palabra salvo que esta sesión pueda verificar con una consulta
  propia (se distingue explícitamente en cada caso arriba).
- Para el detalle histórico completo de cómo se verificó cada feature (capturas de pantalla,
  logs de Stripe CLI, test clocks, queries de confirmación, bugs encontrados y corregidos en
  el camino), ver **HISTORIAL.md**.
