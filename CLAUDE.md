@AGENTS.md

# Estado del negocio y la arquitectura (mitarjeta)

> Última actualización: 2026-08-09. Fuente de verdad para que una sesión nueva entienda el
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
- 3 planes de pago en tabla `planes`: `presencia`, `alcance`, `poder` (slugs sin acentos) — no
  hay tier gratuito. Precios: placeholder, pendiente ajustar.
- Descuento para tarjetas adicionales del mismo usuario:
  `configuracion.descuento_tarjeta_adicional_pct`, aplicado vía
  `posicion_tarjeta_para_usuario()`.
- `tarjetas.plan_id` **sin DEFAULT** — una tarjeta nace con `plan_id = null` hasta tener una
  suscripción `'autorizada'` real. `plan_id_por_defecto()` existe sin uso como default.
- **No existe creación como invitado** — `/crear` exige sesión antes de mostrar el formulario.
  `reclamo.ts` (reclamar tarjeta de invitado por `localStorage`) sigue existiendo solo para
  tarjetas viejas con `user_id null` creadas antes de este cambio — no conectado al flujo
  nuevo. `<ReclamarTarjeta>` sigue en `/pago/exito`/`/pago/pendiente` por lo mismo.

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
  en modo edición): `src/lib/metricas.ts` — `getTotalesPorPeriodo`/`getSerieDiaria` (todos los
  planes, desde `metricas_diarias`), `getEventosDetalle` (solo si
  `plan.features.metricas_desglose`, desde `eventos_metricas` crudo). Gating por
  `planes.features`: `metricas_desglose` (alcance+poder, desglose top 5 por enlace/servicio/
  producto + donut único/recurrente vía `visitante_hash`), `metricas_rango_custom` (poder,
  rango de fechas custom), `metricas_exportacion` (poder, CSV client-side). Presencia ve 4
  tiles + tendencia + comparativa vs. período anterior. Variantes multi-tarjeta
  (`getTotalesPorPeriodoUsuario` etc.) para la vista agregada de todas las tarjetas del
  usuario, con aviso si hay tarjetas mixtas de plan.
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

## Pendiente técnico sin resolver (consolidado)
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
