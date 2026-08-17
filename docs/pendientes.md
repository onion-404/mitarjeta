# Pendiente técnico sin resolver (consolidado)

> Lista viva de 🔴 — actualizar acá directamente, nunca en CLAUDE.md. Referenciado desde el
> índice. Cuando algo se resuelve, mover a HISTORIAL.md o borrar la línea.

- ✅→ `20260817000000_add_tarjeta_giro.sql` **APLICADA en producción** (corrida por el usuario,
  confirmada por consulta real desde esta sesión). Backfill hecho: `alisflow`→
  `salud_bienestar`, `ugartefloresabogados`→`legal_consultoria`,
  `lospastorcitosdesirloin`→`gastronomia`. Placeholder real creado y activado para
  `belleza_estetica` (`bella-studio`, plan Connect manual — ver docs/producto.md) — pedido
  explícito del cliente: reemplazar por una Linkard real de ese giro cuando exista.
- ✅→ Flujo completo verificado end-to-end en navegador real contra producción (tarjeta de
  prueba creada y borrada al terminar, mismo criterio que sesiones anteriores de este
  proyecto): paso inicial → INSERT real → redirect a `/editar/[id]?plan=&ciclo=&nuevo=1` →
  banner de bienvenida → "Tu plan" muestra el plan/ciclo correctos (`Linkard Connect`, anual,
  $1,999 MXN/año) → botón "Completar pago". Los 4 tabs del showcase de la landing confirmados
  mostrando Linkards reales (no mockups) — `alisflow`, `bella-studio`,
  `ugartefloresabogados`, `lospastorcitosdesirloin`.
- 🔴 **Side-effect no buscado**: `bella-studio` (placeholder) quedó bajo el mismo `user_id` que
  `mario` (cuenta interna del fundador) por conveniencia — esto suma una tarjeta más a "Mis
  tarjetas" de esa cuenta y cambia qué avatar muestra `HeaderGlobal` (toma la tarjeta más
  reciente del usuario). Sin impacto funcional real, pero si se prefiere una cuenta separada
  para tarjetas placeholder/marketing, hay que mover `bella-studio` a otro `user_id` a mano.
- 🔴 Sin UI para editar `giro` en una tarjeta ya existente — hoy solo se puede definir en el
  paso inicial de creación (`paso-inicial-tarjeta.tsx`). Ni el editor principal
  (`TarjetaForm`) ni `/admin/tarjetas/[id]` lo exponen todavía. Deuda identificada, no resuelta
  a propósito (fuera de alcance de esta sesión) — para corregir un giro mal elegido hoy hace
  falta un UPDATE directo en Supabase (mismo mecanismo usado para el backfill de arriba).

- 🔴🔴 **Urgente — publicado en marketing sin código real todavía** (ver docs/negocio.md,
  "Copy de marketing de planes", para el detalle completo de cada uno, decisión consciente del
  cliente de publicar antes de construir): sincronización con Google Calendar (Connect);
  fuentes de tráfico/canales, analítica geográfica y de dispositivos, píxeles de seguimiento
  (Meta/GTM/TikTok), reporte mensual por correo y parámetros UTM personalizados (los 5,
  Growth). "Cero ausencias" por WhatsApp (Connect) es un caso aparte: el código real es una
  confirmación al agendar, no el recordatorio programado antes de la cita que el copy sugiere.
- 🔴 Texto enriquecido en catálogo, tipografía por botón, WhatsApp dinámico en ítems, ubicación
  centrable y fondo repetido reposicionable (2026-08-12) — solo verificado con `tsc`/`eslint`/
  `build`, sin probar en navegador real todavía (ver docs/editor.md).
- 🔴 Contenido multimedia como lista tipada (video/reels) y fix de altura del chip de catálogo
  en vista Lista (2026-08-13) — solo verificado con `tsc`/`eslint`/`build`, sin probar en
  navegador real todavía (ver docs/editor.md).
- 🔴 Posición elegible de "Contenido multimedia" (2026-08-14) — solo verificado con
  `tsc`/`eslint`/`build`, sin confirmar en navegador real.
- 🔴 Reels de Instagram retirado por completo, reemplazado por galería de imágenes/videos
  SUBIDOS (Cloudinary propio, sin marca de terceros — 2026-08-15, decisión final del cliente
  después de probar el widget oficial de Instagram y no querer su chrome de marca) — solo
  verificado con `tsc`/`eslint`/`build`, sin probar subir un archivo real todavía (ver
  docs/editor.md).
- 🔴 "Repetir fondo" reposicionable en los 2 ejes (fix del bug real de arrastre vertical) +
  Título opcional (2026-08-16) — solo verificado con `tsc`/`eslint`/`build`, sin probar en
  navegador real todavía (ver docs/editor.md).
- 🔴 Videos de la galería optimizados vía transformación de Cloudinary + poster del primer
  frame (2026-08-16) — solo verificado con `tsc`/`eslint`/`build`, sin confirmar contra la
  cuenta real de Cloudinary (posible bloqueo por "Strict transformations") ni en navegador
  real (ver docs/editor.md).
- 🔴 Botón "Solicitar información" en catálogo→WhatsApp + galería con proporción real (clamp
  9:16–16:9, sin recorte a 1:1, 2026-08-17) — solo verificado con `tsc`/`eslint`/`build`, sin
  probar en navegador real con archivos verticales/horizontales de verdad (ver docs/editor.md).
- 🔴 Preloader real de la tarjeta pública (`TarjetaPreloader`) + precarga en segundo plano de
  ítems de catálogo cerrados (2026-08-17) — solo verificado con `tsc`/`eslint`/`build`, sin
  probar en navegador real (ver docs/editor.md).
- 🔴 Tarjeta pegada al footer cuando hay imagen de fondo (mobile), sin hueco donde se viera el
  fondo repetido (2026-08-13) — solo verificado con `tsc`/`eslint`/`build`, sin probar en
  navegador real todavía (ver docs/editor.md).
- 🔴 Botón "Cancelar suscripción manual" en `/admin/tarjetas/[id]` (2026-08-13) — solo
  verificado con `tsc`/`eslint`/`build`, sin probar con una suscripción manual real todavía
  (ver docs/pagos.md).
- 🔴 Toggle mensual/anual editable en "Tu plan" antes de pagar (2026-08-13) — solo verificado
  con `tsc`/`eslint`/`build`, sin confirmar en navegador que el checkout de Stripe cobra el
  ciclo elegido en el toggle (ver docs/pagos.md).
- 🔴 Sección "Imagen OG" (tipo personalizada/avatar/ninguna + overrides de nombre/subtítulo/
  bio, 2026-08-17) — solo verificado con `tsc`/`eslint`/`build`, sin probar en navegador real
  ni contra un unfurler real (WhatsApp/Twitter Card Validator) todavía (ver docs/editor.md,
  incluye 2 limitaciones reales aceptadas de la file convention de Next.js).
- 🔴 Agenda como calendario único (duración+colchón por servicio, sin "paso" configurable,
  2026-08-10) — migración APLICADA y confirmada por consulta real desde esta sesión, código
  listo para deploy; falta la prueba en navegador con servicios reales de distinta
  duración/colchón, confirmando huecos libres calculados bien y cero choques (ver docs/agenda.md).
- 🔴 Fuente siempre visible en modo logo + Agenda como 6º tipo de botón (2026-08-10) — sin
  verificar en navegador real todavía (ver docs/editor.md).
- 🔴 Reposicionamiento de imagen de catálogo, fix del modal, posición/color del "⋮" y el
  reorder de contacto/redes (2026-08-10) — sin verificar en navegador con una tarjeta real
  salvo el fix de centrado del logo (ver docs/editor.md).
- 🔴 "Repetir fondo" (imagen de fondo, 2026-08-10) sin verificar visualmente con una imagen
  real — el CSS es estándar, pero no se confirmó en navegador (ver docs/editor.md).
- 🔴 Unificación de Botones (2026-08-09): los 5 tipos + opciones anidado + catálogo + archivo en
  Poder ya se verificaron en navegador real sobre una tarjeta real, sin guardar — falta
  todavía probar los 4 casos de migración legacy (tarjeta vieja con solo `servicios` plano, o
  con los 4 campos legacy a la vez) porque ninguna tarjeta de la cuenta usada tenía ese
  contenido guardado (ver docs/editor.md).
- 🔴 Migración `20260801000000_add_tarjeta_slug_historial.sql` sin aplicar — límite de slug
  no enforced en DB todavía (ver docs/db.md).
- 🔴 `invoice.paid` y `customer.subscription.created` faltan en el webhook LIVE de Stripe
  (dashboard) — sistema de afiliados no registra nada real en producción sin esto (ver
  docs/pagos.md, docs/afiliados.md).
- 🔴 Backfill de `afiliado_id` en cupones/cupon_usos legacy — pendiente de que existan
  afiliados reales dados de alta (ver docs/afiliados.md).
- 🔴 3 keys de Stripe (live) y `NEXT_PUBLIC_SITE_URL=https://linkard.mx` pendientes de
  confirmar en Vercel Environment Variables.
- 🔴 Customer Portal de Stripe sin configuración default en el Dashboard (Settings → Billing).
- 🔴 Cliente OAuth de Google sin publicar (pendiente TXT record del dominio + reenvío a
  revisión de marca) (ver docs/producto.md).
- 🔴 Bug sin resolver: crear suscripción para tarjeta adicional a veces falla con "no pudimos
  iniciar la suscripción con Stripe" — necesita Runtime Logs de Vercel para diagnosticar (ver
  docs/pagos.md).
- 🔴 Bug sin resolver: login con Google pierde `?plan=` en el retorno, solo con cuentas de
  Google nuevas — causa probable fuera del repo (Supabase Auth Hooks / Google Cloud Console)
  (ver docs/pagos.md).
- `reclamo.ts` y `admin/dashboard/page.tsx` escriben directo a `tarjetas` desde rol
  `authenticated` — deuda técnica identificada, impide GRANT/REVOKE más estricto sobre esa
  tabla.
- El sistema de gating por tier (`TierPersonalizacion` "basica"/"avanzada" en
  `lib/personalizacion.ts`, `<CandadoPlan>`) quedó sin refactor tras pasar a 2 planes
  (2026-08-11) — ambos otorgan `personalizacion_libre`/`personalizacion_avanzada` por
  igual, así que el candado ya nunca se dispara con un plan activo (solo sin plan). Deuda
  técnica identificada, no resuelta a propósito; un refactor futuro podría colapsarlo a un
  gate binario "¿tiene plan o no?".
- `existe_solapamiento_cita()` no previene condición de carrera entre inserts simultáneos del
  mismo horario (doble booking posible). Hardening futuro: EXCLUDE constraint con
  `btree_gist`. Riesgo aceptado para el volumen inicial.
