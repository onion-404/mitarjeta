# Producto: marca, naming, OG, legal, home

> Detalle de marca/naming/OG/legal/home — referenciado desde CLAUDE.md. Actualizar acá, no ahí.

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

## Reestructuración completa del home (2026-08-17, spec "Landing Page V2")
- Rediseño integral pedido por el cliente (spec detallada tipo GoDaddy Airo/Monday/ClickUp) —
  paleta violeta/fucsia sobre `#090a0f` ya existente se mantuvo (ya cumplía el spec), foco del
  cambio fue estructura/copy/secciones nuevas.
- **Secciones nuevas**: showcase interactivo por nicho (`showcase-nichos.tsx`, `@base-ui/react/
  tabs`, 4 pestañas: Salud/Belleza/Consultores/Tiendas) con mockup de smartphone en CSS puro;
  tabla "Sin Linkard vs. con Linkard" (4 filas pareadas, borde violeta con glow en la columna
  "con"); grid "Todo lo que tu negocio necesita" (4 cards: cobro de citas, agenda, catálogo, red
  de enlaces); FAQ acordeón nuevo (`faq-acordeon.tsx`, mismo primitivo `Accordion` que ya usa
  `tarjeta-form.tsx`); `precios-destacados.tsx` ganó badge "Más popular" + glow en Growth y CTA
  outline en Connect (mismos datos reales de siempre, `getPlanesActivos`/`COPY_PLAN` — sin
  precios hardcodeados).
- **Sin capturas de pantalla reales**: el spec original pedía imágenes reales de Linkards
  existentes para el showcase por nicho — no existen como asset en el repo (`public/` solo
  tiene los SVG default de Next.js). Decisión tomada: cada pestaña renderiza la MISMA
  `<TarjetaCard>` real (mismo criterio que el abanico del hero, mockups de ejemplo — ver
  `tarjetas-demo.ts`, que ahora centraliza las 4 personas de ejemplo compartidas entre hero y
  showcase) en vez de una imagen estática — siempre en sync con el diseño real, sin asset que
  mantener. Los captions de cada nicho describen el BENEFICIO sin atribuirlo a un nombre propio
  como si fuera una reseña real (evita que se lea como testimonio fabricado).
- **3 correcciones de copy respecto al spec original, por precisión de producto** (mismo
  criterio de verificar cada claim contra el código real que ya aplica `planes-copy.ts`):
  1. El spec pedía "Crea tu Linkard Gratis" — no hay tier gratuito (los 2 planes son de pago).
     Cambiado a "Crear mi Linkard" sin la palabra "gratis".
  2. El spec pedía una FAQ "puedes conectar tu propio dominio personalizado" — esa feature no
     existe. Reemplazada por una FAQ real sobre poder editar el link más adelante.
  3. El spec pedía "conecta tus métodos de pago preferidos" — el cobro de citas usa la pasarela
     integrada de Linkard, el dueño no conecta una cuenta propia. Copy ajustado para reflejar
     eso.
- **Nueva plumbing (bajo riesgo, aditiva)**: input "Reclama tu link" en el hero
  (`reclamar-link.tsx`) — el texto que la persona escribe viaja como `?nombre=...` a través de
  `/planes` → `/crear` (mismo criterio de reenvío por query param que ya usa `?cupon=`, incluido
  el `redirectTo` de login) y `TarjetaForm` lo pre-llena como Título (`nombreInicial`, prop
  nueva, solo aplica en modo creación — nunca pisa una tarjeta existente en edición).
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (42 rutas) limpios. **Verificado en
  navegador real** (`npm run dev` + Claude in Chrome): hero, showcase por nicho (las 4 pestañas
  cambian el mockup en vivo), tabla comparativa, grid de features, precios (badge/glow/CTAs
  correctos, precios reales $199/$499 MXN), FAQ (abre/cierra con animación), CTA final — todo
  confirmado visualmente, cero errores de consola. 🔴 No verificado en un viewport mobile real
  (el resize de la herramienta de browser automation no se reflejó en la captura) — las clases
  responsive replican el patrón ya usado en el resto del home, pero sin confirmación visual
  mobile de esta sesión.

## Giro de negocio + paso inicial antes del editor (2026-08-17, mismo día)
- **Motivo real**: al construir el showcase por nicho de la sección anterior, no había forma
  de saber el rubro de una Linkard real (para elegir cuál mostrar en cada tab) — el cliente
  propuso resolverlo de raíz: que toda tarjeta tenga un "tipo de negocio" definido, capturado
  en un paso nuevo ANTES del editor completo (título + enlace + giro), que guarda la tarjeta
  de inmediato y deja retomar la edición cuando sea.
- **`tarjetas.giro`** (migración `20260817000000_add_tarjeta_giro.sql`, 🔴 sin aplicar — ver
  docs/db.md/docs/pendientes.md): texto nullable, CHECK contra 13 valores cerrados (lista
  amplia, no solo los 4 nichos del showcase — decisión del cliente: "lista más amplia").
  Fuente de verdad en TS: `src/lib/giros.ts` (`GIROS`), tipo `Giro` en `lib/types.ts` — deben
  mantenerse sincronizados a mano con el CHECK constraint, no hay un solo lugar compartido
  entre SQL y TS en este proyecto.
- **Paso inicial** (`src/components/tarjeta/paso-inicial-tarjeta.tsx`, nuevo): 3 campos —
  Título (prellenado desde `?nombre=` si viene del input "Reclama tu link" del hero),
  Enlace (slug derivado automáticamente del título mientras el dueño no lo toque a mano, con
  el mismo chequeo de disponibilidad en vivo que ya tiene el editor completo, versión
  simplificada solo-creación) y Tipo de negocio (`<select>` nativo con `GIROS`, opcional —
  "Prefiero no elegir"). Al continuar, INSERTA la tarjeta de inmediato (antes esto solo pasaba
  al terminar todo el editor).
- **Reencauzado a `/editar/[id]` en vez de un mecanismo de "borrador" nuevo**: apenas se
  inserta, redirige a `/editar/{id}?plan=...&ciclo=...&nuevo=1` — la MISMA ruta durable que ya
  existía para "reintentar pago" de una tarjeta abandonada a medio pagar (`getSuscripcionPendientePorTarjeta`).
  Como la tarjeta recién creada nunca llegó a Stripe, esa consulta no encuentra nada — se
  extendió `/editar/[id]` para aceptar `?plan=&ciclo=&cupon=` como fallback en ese caso
  (`getPlanPorSlug`, misma prioridad: una suscripción real intentada siempre gana sobre el
  query param). `?nuevo=1` dispara un banner "tu Linkard se guarda sola, retómala cuando
  quieras" en esa primera visita. Se reusa toda la infraestructura de edición/resume ya
  construida — cero mecanismo de "borrador" paralelo.
  - `TarjetaForm` ganó un fallback visual para `mostrarSeccionPago && !plan` ("Todavía no
    elegiste un plan" + link a `/planes`) — cubre el caso borde de volver mucho después a
    `/editar/[id]` sin el query param y sin ninguna suscripción intentada todavía.
  - **Consecuencia de diseño, no un bug**: `/crear` ya NO renderiza `TarjetaForm` directo —
    `<TarjetaForm>` sin prop `tarjeta` (modo creación "pura", INSERT al final) queda sin ningún
    caller real hoy. No se refactorizó/borró ese código (`!esEdicion` sigue esparcido en varios
    puntos del archivo) — dejarlo intacto evita tocar lógica de pago crítica sin necesidad;
    limpiar ese código muerto queda como deuda técnica identificada, ver docs/pendientes.md.
- **Showcase por nicho pasa a usar Linkards reales** (`showcase-nichos.tsx` +
  `getTarjetaEjemploPorGiro()` en `lib/tarjetas.ts`, resuelto server-side en `page.tsx` para 4
  giros: `salud_bienestar`, `belleza_estetica`, `legal_consultoria`, `gastronomia`): cada tab
  muestra la Linkard real más reciente de ese giro (`publicado + plan_id no nulo`) si existe;
  si no, cae al mockup de ejemplo de siempre (`tarjetas-demo.ts`) — nunca rompe la sección.
  `getTarjetaEjemploPorGiro` solo destructura `data` (mismo patrón que el resto de `lib/
  tarjetas.ts`) — un error de Postgres (ej. columna inexistente porque la migración no corrió
  todavía) cae silenciosamente a `null`, sin romper la landing.
  - **Migración APLICADA en producción** (corrida por el usuario, confirmada por consulta real
    desde esta sesión). Backfill hecho sobre las 3 Linkards reales que ya encajaban:
    `alisflow`→`salud_bienestar`, `ugartefloresabogados`→`legal_consultoria`,
    `lospastorcitosdesirloin`→`gastronomia`. Para `belleza_estetica` (ninguna de las 6
    Linkards reales publicadas encajaba) se creó una Linkard real placeholder —
    `bella-studio` ("Bella Studio", Salón de belleza y spa) — activada con plan Connect vía
    alta manual (`suscripciones.proveedor = 'manual'`, mismo mecanismo que ya usa
    `/api/admin/activar-manual`, replicado acá directo contra la DB con la service role key ya
    que fue un alta puntual sin pasar por esa UI) — `nota_manual` deja registrado que es un
    placeholder a reemplazar. 🔴 **Side-effect no buscado**: quedó bajo el mismo `user_id` que
    `mario` (cuenta interna del fundador) por conveniencia, lo que la suma a "Mis tarjetas" de
    esa cuenta y cambia el avatar que muestra `HeaderGlobal` para esa sesión — sin impacto
    funcional, pero moverla a otra cuenta requiere un UPDATE manual si se prefiere separarla.
- Verificado: `tsc --noEmit`, `eslint` y `npm run build` (42 rutas) limpios. **Confirmado
  end-to-end en navegador real contra producción** (tarjeta de prueba creada y borrada al
  terminar): paso inicial completo (título→enlace derivado en vivo, chequeo de disponibilidad,
  giro opcional) → INSERT real → redirect a `/editar/[id]?plan=&ciclo=&nuevo=1` → banner de
  bienvenida → "Tu plan" resuelve el plan/ciclo correctos vía el fallback de query param
  (`Linkard Connect`, anual, $1,999 MXN/año) → botón "Completar pago". Los 4 tabs del showcase
  de la landing confirmados mostrando Linkards reales (no mockups): `alisflow`,
  `bella-studio`, `ugartefloresabogados`, `lospastorcitosdesirloin`.

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
