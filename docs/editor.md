# Editor de tarjeta (TarjetaForm) — patrón + historial completo de features

> Detalle del editor — referenciado desde CLAUDE.md. Actualizar acá, no ahí. Orden cronológico,
> lo más nuevo al final. Cada sección conserva su fecha original para contexto.

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
  "Editor unificado" más abajo (feature histórica).

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
  swatch del picker (`scaleY` nomás, X ya viene en `%`).
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
- Reorganización de `TarjetaForm`: "Plantillas" (primera de todas) → "Colores y
  tipografía" (tema + colores + fondo de banner + fondo de tarjeta) → "Avatar y banner".
- Gating de guardado usa el plan REAL de la tarjeta (`planActivo`, resuelto en
  `/editar/[id]/page.tsx` vía `getPlanPorId(tarjeta.plan_id)`), no el `plan` que recibe
  `TarjetaForm` en modo edición (que es sobre una suscripción pendiente/abandonada, concepto
  distinto).

## Secciones tipo catálogo — reemplazo del toggle "Servicios" (🔴 SUPERADO, ver "Unificación de Botones")
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
- Fixes del mismo lote: acordeón "Productos" cerrado por defecto; `z-50` explícito en
  `Dialog.Backdrop`/`Dialog.Popup` de `tarjeta-qr.tsx`; botones de compartir/QR pasaron de
  `fixed` a `sticky` dentro de un contenedor que termina antes de `<footer>`; CTA del footer
  de `[slug]/page.tsx` pasó de texto subrayado a botón píldora.

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
- Otros call-sites ya corregidos: `[slug]/page.tsx`, `[slug]/opengraph-image.tsx`,
  `lib/tarjetas.ts` (`nombrePrincipalDeTarjeta()`), `admin/suscripciones/page.tsx`
  (`nombreTarjeta()`). Las 3 tarjetas demo del home migradas a `tipo: "personal"` con campos
  nuevos. `admin/tarjetas/[id]/page.tsx` y `panel/filtro-tarjetas.tsx` siguen mostrando/
  filtrando por la columna real `tarjeta.tipo` — no se tocaron.

### Bloque B — Tipografía ampliada (9 estilos) + reubicación
- `EstiloTipografia` (`lib/types.ts`) + metadata `ESTILOS_TIPOGRAFIA`
  (`lib/personalizacion.ts`): Moderna (default), Elegante (Playfair Display), Creativa (Baloo
  2), Clásica (Lora), Geométrica (Poppins), Redondeada (Quicksand), Mono (Space Mono),
  Display (Bebas Neue), Manuscrita (Caveat). Gating: 7 primeras tier "basica" (Alcance+),
  Display/Manuscrita tier "avanzada" (Poder exclusivo).
- 6 fuentes nuevas en `layout.tsx` vía `next/font/google`, cada una en su CSS var:
  `--font-clasica`, `--font-geometrica`, `--font-redondeada`, `--font-tipografia-mono`,
  `--font-card-display`, `--font-manuscrita`.
- `src/components/tarjeta/selector-tipografia.tsx`: dropdown real (`@base-ui/react/menu`) —
  trigger e ítems se renderizan EN esa tipografía. Reusado para Título/Cuerpo (Cuerpo solo si
  `modoTipografiaAvanzado`).
- 3 campos nuevos en `IdentidadVisual`: `colorTitulo` (vacío = auto-contraste), `tituloTamano`
  (20-40px, default 20), `tituloPeso` (400-800 paso 50, default 600) — solo viajan al guardar
  cuando DIFIEREN de su default. Gating: tier "basica" (Alcance+).
- `TarjetaCard`: `<h1>` aplica `fontSize`/`fontWeight` inline y `color: colorTitulo` con
  prioridad sobre `colorTextoGeneral`.
- **Reubicación**: toda la sección de tipografía se movió de "Colores y tipografía" a "Datos
  Esenciales" (debajo de Bio).

### Bloque C — Enlace (slug) editable con límite 2 cambios / 14 días
- Antes: el slug solo se elegía al crear. Ahora editable siempre, con el mismo chequeo de
  disponibilidad en vivo (debounce 500ms), extendido con `.neq("id", tarjeta.id)`.
- Migración `20260801000000_add_tarjeta_slug_historial.sql` — 🔴 SIN APLICAR todavía en
  producción (ver docs/db.md). Agrega tabla `tarjeta_slug_historial` + trigger BEFORE UPDATE
  `fn_validar_limite_cambio_slug()` (`security definer`, cuenta cambios de los últimos 14
  días, rechaza el UPDATE ENTERO si ya hay 2) + AFTER UPDATE `fn_registrar_cambio_slug()`.
- `lib/tarjetas.ts` → `getLimiteCambioSlug(tarjetaId)`: lee `tarjeta_slug_historial` y
  devuelve `{cambiosRestantes, proximaLiberacion}` (client-side, sin RPC).
- UI en "Datos Esenciales": campo de enlace siempre visible, pre-llenado. "Te quedan N de 2
  cambios de enlace disponibles (cada 14 días)" o, agotado, mensaje con fecha. Guardado
  bloqueado (`slugBloqueaGuardado`) solo si el límite se agotó Y el slug realmente cambió.
- `slugGuardado` (estado nuevo) evita descontar el límite dos veces en la misma sesión.
- `mensajeErrorGuardadoSlug()`: detecta `limite_cambio_slug_alcanzado` del trigger.
- Sin gating por plan — cualquier plan puede editar su enlace.
- Verificación: `npm run build` + `tsc --noEmit` + `eslint` limpios; confirmado en navegador
  con tarjetas de prueba; trigger de DB confirmado rechazando el 3er cambio.

## Botones CTA + orden de secciones + color de texto secundario (2026-08-05, modelo de datos superado el 2026-08-09)
- **2026-08-09**: `BotonCta` (plano, sin `tipo`) quedó `@deprecated` — reemplazado por el
  discriminated union `Boton` de 5 tipos (ver "Unificación de Botones" abajo).
- **Botones CTA** (histórico): sección "Botón" del editor — ancho completo, uno por línea,
  varios por tarjeta (tope `TOPE_BOTONES = 8`). Cada uno: título, subtítulo, ícono
  (`BOTON_ICONOS` en `lib/boton-cta.ts`) o imagen (Cloudinary, `mitarjeta/botones`), color de
  fondo/borde propios, textura de fondo prediseñada (`BOTON_TEXTURAS`, CSS puro).
  - Link de WhatsApp: helper "Crear link de WhatsApp" dentro de cada botón →
    `construirUrlWhatsapp()`.
  - `boton-cta-modal.tsx` (`<BotonCtaModal>`): trigger "⋮" abre Dialog con vista previa +
    info + compartir.
  - Evento `click_enlace` con `tipo_enlace: "boton_cta"`.
- **Orden de secciones**: `IdentidadVisual.ordenSecciones?: SeccionOrdenable[]`
  (`"servicios"|"agenda"|"productos"|"botones"`) — flechas ↑/↓, sin drag-and-drop.
  `TarjetaCard` recorre `ordenSeccionesNormalizado(ordenSecciones)` (`lib/boton-cta.ts`) —
  tolerante hacia adelante. Default (`ORDEN_SECCIONES_DEFAULT`): servicios → agenda →
  productos → botones. **Superado el 2026-08-10** cuando Agenda pasó a ser un tipo de botón
  (ver "Agenda absorbida como 6º tipo de botón" abajo) — `SeccionOrdenable` se angostó y luego
  esta sub-sección del editor quedó deprecada por completo.
- **Color de texto secundario**: `IdentidadVisual.colorTextoSecundario` (vacío = auto-
  contraste, tier "basica"/Alcance+), controla la línea "Rol o descripción" (`empresa`).
- **Fix — imagen de fondo "saltaba" al llegar al footer (mobile)**: layer `fixed` con
  `inset-0` (equivalente a `100dvh`) recalculaba al aparecer/desaparecer la barra de
  herramientas mobile. Cambiado a `h-[100svh]` (small viewport height).
- **Fix — logo del footer sin contraste cuando la imagen de fondo bleedea detrás**: `<Logo
  oscuro?: boolean>` (default `false`) fuerza `text-white`. `[slug]/page.tsx` solo pasa
  `oscuro` cuando `fondoImagenUrl` está seteado — bug real encontrado: la primera versión
  también miraba el tema de la TARJETA (helper `esTarjetaOscura()`, sin caller hoy), pero el
  `<footer>` es del SITIO con su propio fondo claro auto-adaptado al SO — forzarlo daba logo
  blanco sobre fondo claro. Único caso real: imagen de fondo bleedeando detrás → footer gana
  scrim `bg-black/45 backdrop-blur-sm`.
- Verificado: `tsc`/`eslint`/`build` limpios + navegador real (Claude Code + navegador,
  tarjetas de prueba sembradas y borradas al terminar, con permiso explícito del usuario).

## Fixes de contraste visual — Bio/dirección/horario y divisor del banner (2026-08-05)
- **Bio, dirección y horario se leían como un solo bloque de texto**: fix en `TarjetaCard` —
  dirección+horario en su propia card con borde (`rounded-xl border`), alineada a la
  izquierda, separación `mt-4` respecto a la Bio (que queda como párrafo suelto sin caja).
- **Divisor del banner (onda/diagonal/zigzag) — jerarquía de capas**: **banner atrás → tarjeta
  de contenido adelante (overlap con `-mt-14`, sin condicional) → avatar más adelante
  todavía**. El clip-path del divisor se aplica al PANEL (nunca al banner) — resultado: el
  banner se ve real (sin capa de color agregada) a través de la muesca. Iteración descartada
  en la misma sesión: sacar el overlap + capa "eco" de color — el cliente aclaró que quiere el
  banner real visible, no una copia de color.
- **Bug real de jerarquía de capas — el avatar quedaba "detrás" del banner**: `clip-path` en
  un contenedor recorta también a sus descendientes; el avatar vivía anidado dentro del panel
  con clip-path. Fix: avatar sacado a `<div>` HERMANO, `position: absolute`, `z-20`,
  `pointer-events-none`, posición calculada a mano (`top: alturaBanner - 100`). Panel ganó
  spacer `<div className="h-10" aria-hidden />` donde antes vivía el wrapper del avatar.
  Confirmado pixel-idéntico en "recta" y correcto con avatar/iniciales.

## Multilínea en dirección/horario, jerarquía de la Bio, ícono opcional del badge y más íconos de profesiones (2026-08-05)
- **Dirección/horario admiten hasta 3 líneas**: `<textarea rows={2}>` +
  `limitarLineas(valor, 3)` (corta por `\n` en el propio `onChange`). `TarjetaCard` sumó
  `whitespace-pre-line` a los `<span>` internos.
- **Jerarquía visual de la Bio**: regla corta (`h-0.5 w-8`) con `colorBotonesFinal` la
  antecede; texto sube a `text-[15px] font-medium leading-relaxed` con más contraste.
- **Ícono del badge "@enlace" opcional + elegible**: `IdentidadVisual.badgeIconoActivo`
  (default `true`) + `badgeIconoId` (reusa `BOTON_ICONOS`). Control en "Colores y tipografía".
- **18 íconos nuevos** en `BOTON_ICONOS`, foco profesiones/rubros (Car, Stethoscope, Scissors,
  Briefcase, Hammer/HardHat, ChefHat, Paintbrush, GraduationCap, Dumbbell, Palette, Home,
  Leaf, Gavel, Building2, Wrench, PawPrint, Truck). 🔴 Sin ícono de "diente" — `lucide-react`
  no lo tiene bajo ningún nombre (comprobado contra el export completo); se usó Stethoscope.
- **Bug real — la Bio no salía siempre en la miniatura OG**: `[slug]/opengraph-image.tsx`
  calculaba `subtitulo = empresa || puesto` (OR excluyente). Fix: `empresa` y `puesto` como
  dos líneas independientes, siempre que existan. Iteración descartada: truncar la Bio a 90
  caracteres — el cliente pidió el texto completo, se sacó `recortarTexto()` por completo.

## `generateMetadata` de `[slug]/page.tsx` — bug real de fondo: el copy de marketing tapaba la info de la propia tarjeta al compartir (2026-08-05)
- **Reporte del cliente**: al compartir por WhatsApp, la vista previa mostraba el copy de
  MARKETING del sitio, no la info de la tarjeta.
- **Causa real (no caché de WhatsApp, bug de metadata)**: `generateMetadata()` solo seteaba
  `title`/`description` genéricos — WhatsApp/Telegram/Twitter leen `openGraph.title/
  description` y `twitter.title/description`, que Next.js heredaba TAL CUAL del layout raíz al
  no setearse acá.
- **Fix**: `generateMetadata()` arma `titulo`/`descripcion` una sola vez y los aplica a los 3
  lugares: `title`/`description` + `openGraph.{title,description,siteName,locale,type}` +
  `twitter.{card,title,description}`.
- Verificado con `curl` real contra el HTML servido — confirmado que cambian según la tarjeta.

## Unificación de Botones/Servicios/Productos en un solo sistema de tipos (2026-08-09)
- **Motivo**: "Servicios" y "Productos" (accordions de catálogo) no funcionaban bien en
  pruebas reales; "Botones" (CTA ancho completo) sí. Se eliminan esos dos toggles — todo pasa
  a vivir en "Botones" con **5 tipos** por ítem: `enlace`, `whatsapp`, `opciones`, `catalogo`,
  `archivo`. Cero migraciones de schema.
- **Modelo de datos** (`lib/types.ts`): `Boton = BotonEnlace | BotonWhatsapp | BotonOpciones |
  BotonCatalogo | BotonArchivo` (discriminated union por `tipo`), reemplaza `BotonCta`
  (`@deprecated`, se interpreta como `"enlace"`).
  - `BotonEnlace`: el CTA de siempre, sin el mini-helper de WhatsApp.
  - `BotonWhatsapp`: `waNumero`/`waMensaje` — URL final se resuelve al renderizar/guardar,
    nunca se persiste armada.
  - `BotonArchivo`: reemplaza el folleto PDF suelto — `archivoUrl` (solo PDF), carpeta
    `mitarjeta/brochures`. **Exclusivo del plan Poder** (reusa `personalizacion_avanzada`).
  - `BotonCatalogo`: reemplaza Servicios Y Productos — `items: Producto[]` + `vista: "grid2" |
    "lista1"`. Cuenta como "sección" contra `secciones_servicios_max`.
  - `BotonOpciones`: botón padre que despliega/colapsa `hijos: BotonHijo[]` — **un solo nivel
    de anidamiento** (decisión de negocio explícita, evita menús infinitos).
  - `SeccionOrdenable` se angostó a `"agenda" | "botones"` — "servicios"/"productos" ya no son
    bloques propios, su posición la da el orden interno de la lista de botones.
- **Migración en memoria, función única** — `normalizarBotones(datosContacto, identidadVisual)`
  (`lib/boton-cta.ts`): reusada TAL CUAL por editor y render público. Resuelve: `botones`
  plano sin `tipo` → `"enlace"`; `seccionesServicios` → un `BotonCatalogo` por sección;
  `productos` → otro `BotonCatalogo`; `brochureUrl` suelto → un `BotonArchivo`. IDs
  determinísticos (`"migrado-servicios-0"`, nunca `crypto.randomUUID()`). Nunca escribe hasta
  el próximo "Guardar".
- **Editor** (`tarjeta-form.tsx`): un solo estado `botones: BotonFormState[]` (reemplaza los 3
  states separados de antes). Fila-cabecera siempre visible, colapsada por defecto si viene de
  datos guardados. `moverBotonEn`/`quitarBotonEn`/`actualizarBotonEn` direccionan por
  `UbicacionBoton = { indice; indiceHijo? }`.
  - Selector de tipo al agregar (`SelectorTipoBoton`) — 5 opciones a nivel superior, 4 dentro
    de "opciones" (sin "opciones" anidado).
  - **Tope de hijos dentro de "opciones": `TOPE_HIJOS_OPCIONES = 6`** (valor propuesto por
    Claude Code, no pedido explícito).
  - Ya no existe `waAbierto` como mini-helper dentro de "enlace" — WhatsApp es su propio tipo.
  - Regla eliminada a propósito: la sección `[0]` de Servicios ya NO se persiste siempre vacía.
- **Payload de guardado**: `TareaSubida` generalizado con `UbicacionBoton`/`claveBoton()`/
  `claveItemCatalogo()`. `construirBotonFinal()` (recursivo) / `construirBotonPreview()`.
- **Render público** (`tarjeta-card.tsx`): `renderBotones()` único, tipo-aware, sobre
  `normalizarBotones()`. Ítem de catálogo → modal de detalle nuevo (`catalogo-item-modal.tsx`,
  clon del patrón Dialog de `boton-cta-modal.tsx`, no reusado). `ContenidoBotonCta`/
  `BotonCtaModal` generalizados a un tipo `BotonVistaPrevia`.
- **Métrica de clicks**: TODO ítem de catálogo trackea `click_producto` (se pierde la
  distinción histórica Servicios/Productos, deja de existir en el modelo). `whatsapp`/
  `archivo`/hijos de "opciones" usan `click_enlace` con `metadata.tipo_enlace` (
  `"boton_whatsapp"`, `"boton_archivo"`, `"boton_opciones_hijo"` + `boton_padre`).
- **Gating de plan**: Catálogo hereda tope 1/2/3 de `secciones_servicios_max`; Opciones sin
  restricción; Archivo exclusivo de Poder. Mismo criterio fail-open de `calcularBloqueos` en
  los 3 casos.
- **Supuestos tomados por Claude Code**: vista por defecto al migrar catálogo legacy =
  `"grid2"`; tope de hijos de "opciones" = 6.
- Verificado: `tsc`/`eslint`/`build` (41 rutas) limpios. **Verificado en navegador real**
  (Claude Code + Chrome del usuario, login real Google, tarjeta real en plan Poder, sin
  guardar cambios de prueba): los 5 tipos se crean/editan correctamente; "Opciones" restringe
  a 4 tipos permitidos; "Catálogo" arma ítem + modal de detalle; reorder ↑/↓ actualiza al
  instante. Cero errores de consola. 🔴 Pendiente: no se probaron los 4 casos de migración
  legacy (ninguna tarjeta real de la cuenta tenía ese contenido viejo guardado).

## ColorPicker unificado + botón Catálogo con apariencia de CTA + fondo repetible (2026-08-10)
- **Selector de color** (`src/components/tarjeta/color-picker.tsx`): reemplaza los 13
  `<input type="color">` sueltos — popover (`@base-ui/react/popover`) con rueda nativa, campo
  hex, 3 campos RGB, fila "Tus colores" (deduplicados, `coloresPersonalizados` en
  `tarjeta-form.tsx`).
- **Botón Catálogo**: pasa a compartir cabecera con "Opciones" (`renderCabeceraToggle()`) —
  mismo CTA de ancho completo con ícono/imagen + color/borde/textura propios. Editor ganó
  "Subtítulo" + bloque ícono/color/textura para este tipo.
- **Fondo de imagen — "Repetir fondo"**: `IdentidadVisual.fondoImagenRepetir` (default false).
  Activo: `background-size: 100% auto` + `background-repeat: repeat-y` en vez de
  `object-fit:cover` — resuelto con `<div>` de `background-image` plano (`next/image` no
  soporta repetición). Mutuamente excluyente con "Reposicionar" en esta versión (superado
  después, ver 2026-08-16).
- Verificado: `tsc`/`eslint`/`build` limpios + navegador real (sin guardar). 🔴 "Repetir
  fondo" no se verificó visualmente con imagen real en esta sesión.

## Color de texto por botón + más íconos/texturas + catálogo con título de 2 líneas (2026-08-10)
- **`BotonBase.colorTexto`** (opcional, sin valor = auto-contraste), mismo patrón que
  `colorFondo`/`colorBorde`. `estiloDeBoton()` lo prioriza.
- **`BOTON_ICONOS`** sumó ~14 íconos gastronomía/comercio: `Utensils`, `Sandwich` (sin ícono
  de "taco" literal, comprobado), `CupSoda`, `Beef`, `Pizza`, `Soup`, `Salad`, `IceCreamCone`,
  `Cake`, `Fish`, `Beer`, `Wine`, `ShoppingCart`, `Store`.
- **`BOTON_TEXTURAS`** sumó 4 patrones CSS puros: `lineas`, `cruzado`, `circulos`, `cuadros`
  (`conic-gradient`).
- Título de ítem de catálogo: `truncate` → `line-clamp-2`.
- Fondo del título de ítem de catálogo adopta `colorFondo` (o `colorBotonesFinal`) del botón
  padre, con auto-contraste — "chip" en vez de texto plano.
- Verificado: `tsc`/`eslint`/`build` + navegador real (sin guardar). Cero errores de consola.

## Imagen de ítem de catálogo reposicionable, fixes de consistencia visual y título como logo (2026-08-10)
- **Ítem de catálogo — imagen reposicionable**: `Producto.imagenPosicion?: PosicionImagen`
  (mismo mecanismo `{x,y}` que avatar/banner/fondoImagen). Botón "Reposicionar" por ítem.
- **Fix — modal de detalle de catálogo tapaba el botón de cerrar**: `z-10` + fondo semi-opaco
  propio en Close + `mt-8`.
- **Consistencia del "⋮"**: se movió de izquierda a derecha (calzando con el chevron de tipos
  desplegables). Fix de color: `estiloCta?.color` explícito en vez de `text-current`.
- **Contacto y redes sociales — reordenables, siempre en una sola fila**: los ÍTEMS dentro de
  la fila se reordenan con flechas ↑/↓ (`renderContactoYRedes()`). 4 pills fijos de contacto
  usan `IdentidadVisual.ordenContacto`/`ContactoOrdenable` (`ordenContactoNormalizado()`); redes
  sociales reordenan el array `redes` directo. Sin gating de plan.
- **Título como logo**: `IdentidadVisual.tituloModo?: "texto"|"imagen"` +
  `tituloImagenUrl`/`tituloImagenAltura` (24-80px, default 32) — Poder exclusivo. Reemplaza el
  `<h1>` por un `<img>` sin recortar a ninguna forma. Carpeta Cloudinary `mitarjeta/logos`.
  **Bug real**: logo pegado a la izquierda (Tailwind Preflight `img{display:block}`) — fix con
  `mx-auto`.
- Verificado: `tsc`/`eslint`/`build` limpios. 🔴 No verificado en navegador real salvo el fix
  de centrado del logo (confirmado por el cliente en vivo).

## Fuente del título/cuerpo siempre visible + Agenda absorbida como 6º tipo de botón (2026-08-10)
- **Fix — la tipografía se ocultaba en modo "Título como logo"**: `SelectorTipografia` vivía
  dentro de la rama `tituloModo === "texto"`, pero `fuenteEncabezado`/`fuenteCuerpo` pintan más
  que el `<h1>`. Fix: ambos selectores se movieron fuera del ternario.
- **Agenda pasa a ser el 6º tipo de botón** (`BotonAgenda`, `tipo: "agenda"`) — la vieja
  sección "Agenda" (pestaña propia) desaparece; ahora es un botón más. `<AgendaServicios>` no
  cambió, solo se reubicó.
  - **Decisión de negocio confirmada**: la aparición de Agenda en la tarjeta pública sigue
    siendo 100% AUTOMÁTICA con servicios activos. `BotonAgenda` es un **singleton**:
    `normalizarBotones()` garantiza que SIEMPRE exista exactamente uno (sintetiza uno default
    si no hay ninguno) — no aparece en "+ agregar botón", su ✕ queda deshabilitado.
  - Nunca es hijo de "Opciones" (excluido de `BotonHijo`).
  - **`SeccionOrdenable`/`ordenSecciones`/"Orden de secciones" quedan deprecados por completo**
    — ya no hay más de un bloque a top-level. Se sigue leyendo el `ordenSecciones` viejo solo
    dentro de `normalizarBotones()` (para decidir posición del botón Agenda migrado).
  - Consecuencia menor: Agenda ocupa una de las `TOPE_BOTONES = 8` posiciones (antes no
    contaba, al ser pestaña aparte) — 7 lugares reales para el resto. No pedido explícito.
- Verificado: `tsc`/`eslint`/`build` limpios. 🔴 No verificado en navegador real todavía.

## Texto enriquecido en catálogo, tipografía por botón con herencia, WhatsApp dinámico en ítems, ubicación centrable y fondo repetido reposicionable (2026-08-12)
- **Descripción de ítem de catálogo — "texto enriquecido" sin HTML real**
  (`src/lib/texto-enriquecido.tsx`): `Producto.descripcion` sigue string plano — admite
  `**negrita**` y `*cursiva*`/`_cursiva_`, interpretados solo al renderizar
  (`renderizarTextoEnriquecido()`). Decisión explícita: se descartó contentEditable +
  `dangerouslySetInnerHTML` + sanitizador (superficie de XSS real contra visitantes) — parser
  propio sin API de DOM. `EditorTextoEnriquecido`: textarea + 2 botones que envuelven la
  selección. **Supuesto**: acotado a negrita/cursiva (sin listas ni links).
- **Fuente y peso por botón, con herencia** (`lib/boton-cta.ts` →
  `resolverTipografiaBoton()`/`resolverTipografiaBotonForm()`, recursiva, reusada por editor y
  render): `BotonBase` gana `fuenteBoton?`/`pesoBoton?` (sin valor = hereda). Regla: hijo de
  "opciones" hereda del padre; top-level no-primero hereda del primero; sin nada de qué
  colgarse → tipografía general de la tarjeta + peso 600 (fijo de antes, cero regresión).
  Sin gating de plan a propósito (mismo criterio que color/textura). `fontFamily` al
  contenedor entero; `fontWeight` solo al título.
- **Link de WhatsApp dinámico en ítems de catálogo**: helper "Crear link de WhatsApp" debajo
  del campo Enlace de cada ítem — número + mensaje (default con título del ítem) →
  `construirUrlWhatsapp()`. 100% efímero, nunca persiste el helper, solo `enlaceUrl` final.
- **Ubicación/horario centrable** (`IdentidadVisual.ubicacionCentrada?: boolean`, default
  `false`). Sin gating de plan.
- **Fondo de imagen repetido — reposicionable/redimensionable**: `fondoImagenPosicion`
  reinterpretado como `background-position`/`background-size` en modo repetido. **Nota real**:
  el modal `ReposicionarImagen` mostraba preview tipo "cover" (no tileada) — los valores sí
  afectaban bien el resultado final, pero la vista previa del modal no era 1:1 (superado
  2026-08-16). Default de "Repetir fondo" sin tocar pasó de `top center` a `50% 50%`.
- **Fix — fondo del título de ítem de catálogo en vista "Lista" se veía como subrayado**:
  `line-clamp-2` fuerza `display: -webkit-box`, que no respeta `flex-1`. Fix: fondo/color a un
  `<div>` contenedor normal, con `<p className="line-clamp-2">` sin fondo propio adentro.
- Verificado: `tsc`/`eslint`/`build` limpios. 🔴 No verificado en navegador real ninguno de los
  5 ítems de esta sesión.
- **Deploy de este commit falló, diagnosticado y resuelto desde una sesión**: build de Vercel
  (`11209ae`) tiró "Module not found" resolviendo Plus Jakarta Sans — 404 real de
  `fonts.gstatic.com` durante el build, no un bug de código (confirmado con `git diff`, cero
  cambios en `layout.tsx`). Producción nunca quedó caída. Se entró al dashboard de Vercel vía
  Claude in Chrome (sesión ya logueada del usuario) y se disparó un Redeploy sin caché, Ready
  en 1m10s. Antecedente: mismo síntoma → mismo diagnóstico (revisar si `layout.tsx` cambió
  antes de asumir bug real).

## Contenido multimedia como lista tipada (video + reels de Instagram) y fix de fondo de ítem de catálogo en vista Lista (2026-08-13)
- **"Contenido multimedia" pasa de un campo único (`videoUrl`, solo YouTube) a una lista
  tipada**: `MultimediaItem` = `MultimediaVideo | MultimediaReels` (`lib/types.ts`).
  `videoUrl` queda `@deprecated`, leído solo dentro de `normalizarMultimedia()`
  (`lib/multimedia.ts`, migración en memoria como `normalizarBotones()`).
  - **Tipo "Video"**: URL YouTube o Vimeo, auto-detectado (`resolverEmbedVideo()`). Vimeo
    nuevo — ID = último segmento numérico del path.
  - **Tipo "Reels de Instagram"** (🔴→✅ descartado al día siguiente, ver sección de
    2026-08-14/15 abajo): primera versión con iframe directo a `/embed`, hasta
    `TOPE_REELS_POR_BLOQUE = 5` URLs por ítem.
  - **Render público**: "Reels" con scroll-snap CSS nativo (`snap-x snap-mandatory` +
    `.scrollbar-hide`), sin librería de carrusel. Cards `aspect-[9/16]`.
  - **Editor**: mismo patrón de fila colapsable que Botones. Tope
    `TOPE_MULTIMEDIA = 4` ítems totales (supuesto, no pedido palabra por palabra). Ícono
    Instagram reusa `SOCIAL_ICONS.instagram` (no existe en lucide-react).
- **Fix — fondo del chip de título de ítem de catálogo en vista "Lista" no cubría toda la
  altura** (iteración 2 del mismo problema de 2026-08-12): fix anterior resolvió ancho pero no
  altura — el `<div flex-1>` tomaba altura de su propio contenido porque la fila tenía
  `items-center` en vez de `items-stretch`. Fix: `items-center` → `items-stretch`.
- Verificado: `tsc`/`eslint`/`build` limpios. Sin verificar en navegador real — el cliente
  probó los reels al día siguiente y confirmó un bug real (ver sección siguiente).

## Reels de Instagram: fix de reproducción + posición elegible de "Contenido multimedia" (2026-08-14)
- **🔴→✅ Bug real**: los reels no reproducían — redirigía a Instagram. Causa: el iframe
  directo a `/embed` **no es un embed reproducible sin el script oficial de Instagram** — no
  existe forma de reproducir sin ese script.
  - **Fix**: `instagram-reel-embed.tsx` (borrado después, ver 2026-08-15) — widget oficial
    (`<blockquote class="instagram-media">` + `embed.js`), script cargado una vez y reusado.
    **Contrapartida aceptada**: esto SÍ carga JS de un tercero en la tarjeta pública.
  - `normalizarInstagramReelUrl()` reemplazó `obtenerInstagramReelEmbedUrl()` — necesita el
    permalink real, no una URL de embed.
  - Tamaño de card ya no controlable por CSS al 100% — el widget decide su propio tamaño.
- **Posición de "Contenido multimedia" elegible**: `IdentidadVisual.multimediaAlFinal?:
  boolean` — `false` deja el bloque donde siempre estuvo, `true` lo corre al final (después de
  Botones/Agenda). Segmented pill nuevo en el editor.
- Verificado: `tsc`/`eslint`/`build` limpios.
- **Bug real, día siguiente, en `/limpio`**: reels seguían recortados/rotos —
  `w-[328px]` es el ancho mínimo real que Instagram exige (documentado), el wrapper estaba por
  debajo (280/236px). Fix: wrapper y blockquote ambos a `328px`.
- **Límite real, no bug**: encabezado y pie del widget oficial (marca Instagram) **no se
  pueden quitar por ningún medio** (iframe de otro origen). Se presentaron 3 opciones al
  cliente — eligió dejarlo así en un primer momento, pero al probarlo en vivo no le gustó (ver
  sección siguiente: reemplazado por completo).

## "Reels de Instagram" reemplazado por galería de imágenes/videos SUBIDOS (2026-08-15)
- **Decisión final del cliente**: reemplazar por una galería de imágenes/videos que el dueño
  SUBE directo — resuelve de raíz el problema del widget: archivo propio en Cloudinary =
  `<video>`/`<Image>` nativo, cero marca de terceros.
- **Tipo "reels" retirado por completo** (no quedó `@deprecated`): `MultimediaReels` →
  `MultimediaGaleria` (`items: GaleriaItem[]`, `{url, tipo: "imagen"|"video"}`).
  `normalizarMultimedia()` filtra defensivamente cualquier ítem con `tipo` desconocido (cubre
  `/limpio`, que tenía ítems viejos `tipo: "reels"`). `instagram-reel-embed.tsx` borrado.
- **Subida a Cloudinary**: carpeta nueva `mitarjeta/multimedia`. `subirImagenCloudinary()`
  ganó `resourceType: "video"`. `lib/subir-imagen.ts` ganó `validarVideo()` — **límite 30MB**
  (supuesto, no un número pedido).
- **Editor**: 2 botones de subida (Imagen/Video) + grilla de miniaturas (`size-16`, badge
  "Foto"/"Video"). Tope `TOPE_GALERIA_ITEMS = 8` (reemplaza `TOPE_REELS_POR_BLOQUE = 5`).
- **Render público**: slide horizontal con scroll-snap, cards `aspect-square` 220px (superado
  después, ver 2026-08-17). Imágenes vía `next/image`, videos vía `<video controls playsInline
  preload="metadata">` nativo, sin autoplay.
- Verificado: `tsc`/`eslint`/`build` limpios.

## "Repetir fondo" reposicionable de verdad en los 2 ejes + Título opcional (2026-08-16)
- **🔴→✅ Bug real**: en "Repetir fondo", el reposicionamiento solo funcionaba en X. Causa:
  con `repeat-y`, un `background-position` en % se calcula contra el ALTO TOTAL del
  contenedor (hasta 3000px), no contra el alto de una baldosa — el mismo % producía un
  desplazamiento gigante que caía en un punto casi arbitrario del patrón repetido. En X no
  pasaba porque no hay `repeat-x` (el ancho de baldosa se fija contra ese mismo contenedor).
  - **Fix**: offset de Y en **píxeles absolutos relativos a UNA baldosa**
    (`offsetYBaldosaRepetida`/`porcentajeYDesdeOffsetBaldosa`/`altoBaldosaRepetida`,
    `lib/imagen-posicion.ts`), medido con `useAltoBaldosaRepetida` (`ResizeObserver` + `new
    Image()` para proporción natural). Eje X sigue en %.
  - **Componente único reusado en los 3 lugares** (`<FondoImagenRepetido>`): tarjeta real,
    miniatura del editor, y el cálculo de `ReposicionarImagen` — nunca vuelven a
    desincronizarse. `ReposicionarImagen` ganó prop `repetir?: boolean` (solo para el modal de
    imagen de fondo) — preview del modal pasa a ser el mismo fondo tileado real, arrastre con
    módulo (sin `clamp`, "gira" el patrón).
  - **Segundo bug real, mismo día**: con posición sin tocar, la imagen se veía centrada en la
    baldosa en vez de pegada arriba (pedido explícito: "top con top"). Causa:
    `fondoImagenPosicion` es campo compartido con modo sin repetir, donde `{x:50,y:50}` =
    centrado — ese mismo 50 alimentaba el offset. Fix: `yEfectivaRepetida()` — mientras el
    dueño no tocó el eje Y (sigue en 50 default), se interpreta como 0 (tope); si ya lo movió,
    se respeta tal cual.
  - Verificado: `tsc`/`eslint`/`build` limpios. 🔴 No verificado en navegador real.
- **Título ("nombre") pasa a ser opcional**: se sacó `required` + la validación que bloqueaba
  "Guardar". `<h1>` en `TarjetaCard` (rama texto) condicional a que el nombre tenga contenido
  — sin hueco reservado si está vacío. Fallbacks a "Sin nombre" en otros contextos
  (`nombrePrincipalDeTarjeta()`, vCard `FN:`, `<title>`/OG) NO se tocaron a propósito. "Título
  como logo" no depende del nombre. 🔴 No verificado en navegador real.

## Videos de la galería optimizados por Cloudinary + poster del primer frame (2026-08-16)
- **Reporte del cliente**: videos verticales pesaban de más (tile 220px a resolución
  completa), sin miniatura mientras cargaban.
- **`src/lib/cloudinary-media.ts`** (nuevo, cliente — transformaciones "on the fly" en la URL
  de entrega, sin firma):
  - `videoOptimizadoGaleria(url)`: inserta `f_auto,q_auto,c_fill,w_440,h_440`.
  - `posterVideoGaleria(url)`: mismo recorte pidiendo un JPG del offset `so_0` (primer frame),
    usado como `poster`, habilita `preload="none"`.
  - Ambas devuelven la URL sin tocar si no es optimizable (cubre preview local `blob:`).
  - Aplicado en render público y miniatura chica del editor.
- 🔴 **Caveat no verificable desde acá**: requiere que "Strict transformations" esté
  desactivado en Cloudinary (Settings → Security) — si está activo, 401 en vez de optimizar.
- **🔴→✅ El tile se mantuvo `aspect-square` en esta sesión — superado al día siguiente** (ver
  sección de 2026-08-17, "galería con proporción real").
- Verificado: `tsc`/`eslint`/`build` limpios. 🔴 No verificado en navegador real ni contra la
  cuenta real de Cloudinary.

## Botón "Solicitar información" para catálogo→WhatsApp + galería con proporción real (2026-08-17)
- **Botón del modal de detalle de un ítem de catálogo dice "Solicitar información"** cuando el
  enlace es de WhatsApp (antes siempre "Ver más") — `esEnlaceWhatsapp()` (`lib/boton-cta.ts`)
  matchea `wa.me`/`api.whatsapp.com`.
- **🔴→✅ Galería con proporción REAL en vez de forzada a 1:1** (pedido explícito, revierte lo
  dejado sin tocar el día anterior): vertical se ve alto, horizontal se ve más bajo.
  - `GaleriaTile` (`components/tarjeta/galeria-tile.tsx`) reemplaza el bloque inline de
    `renderMultimedia()`.
  - **Sin cambio de schema**: proporción MEDIDA en cliente (`useProporcionMedia`, dentro de
    `galeria-tile.tsx`) — `Image()`/`<video>` desconectado del DOM resuelve `naturalWidth/
    Height`/`videoWidth/Height`, tile aplica `style={{aspectRatio}}`. Funciona igual para
    contenido subido antes de esta feature, sin backfill.
  - **Clamp 9:16 – 16:9** (valor propuesto por Claude Code, no pedido en números exactos).
  - Fallback 1:1 mientras se mide (sin salto — "ajustar estado durante el render", no efecto).
  - Ancho del tile sigue fijo en 220px, solo el alto varía.
  - Miniatura chica del editor (64px) sin tocar a propósito.
  - **Fuera de alcance a propósito**: ítems de "Catálogo" (`Producto`) no se tocaron.
- Verificado: `tsc`/`eslint`/`build` limpios. 🔴 No verificado en navegador real con archivos
  verticales/horizontales reales.

## Preloader real (no cosmético) + ítems de catálogo precargados en segundo plano (2026-08-17)
- **Pedido explícito**: preloader que refleje la carga REAL (no fijo/decorativo) + carga
  óptima de imágenes/videos siempre — ejemplo puntual: imágenes de ítems de catálogo cargaban
  recién DESPUÉS de desplegar la lista.
- **Preloader real** (`TarjetaPreloader`, `components/tarjeta/tarjeta-preloader.tsx`, solo
  desde `TarjetaPublica`): distinto de `[slug]/loading.tsx` (solo el round-trip de datos) —
  cubre lo que pasa DESPUÉS del HTML, mientras avatar/banner (o imagen de fondo)/título-logo
  todavía bajan.
  - **La tarjeta real se renderiza SIEMPRE de entrada** (nunca se retrasa el montaje ni se
    saca del DOM) — clave para SEO. El preloader tapa visualmente con un overlay (mismo
    `TarjetaSkeleton` de `loading.tsx`) `position:absolute` encima, `pointer-events`
    bloqueados mientras tapa.
  - **Carga real, no fake**: precarga cada URL crítica con `Image()` desconectado del DOM,
    revela (fade 300ms) cuando TODAS resolvieron (cargada o fallada) o al timeout de seguridad
    (4s). El navegador cachea esas URLs, así que `TarjetaCard` las sirve de cache al pedirlas
    de nuevo.
  - `TarjetaPublica` decide qué URLs son críticas: imagen de fondo (si activa, prioridad sobre
    banner) → avatar → logo del título (si `tituloModo: "imagen"`).
  - Avatar ganó `priority` en su `<Image>` (el banner ya lo tenía).
- **Ítems de catálogo precargados en segundo plano**: mientras el toggle de "Catálogo" está
  cerrado, sus ítems no están montados (`{abierta && ...}`) — el navegador ni se entera de
  esas imágenes. Fix: `recopilarUrlsCatalogo()` (`lib/boton-cta.ts`, recorre top-level + un
  nivel de "opciones") + `useEffect` en `TarjetaCard` que precarga con `Image()` apenas monta,
  sin importar el toggle.
  - **Mismo problema que los videos de galería**: `next/image` arma una URL dependiente del
    `sizes` resuelto, imposible de predecir para precargar con garantía de cache-hit. Fix:
    `imagenOptimizadaCuadrada()` (`lib/cloudinary-media.ts`, mismo patrón que
    `videoOptimizadoGaleria`) transforma del lado de Cloudinary
    (`f_auto,q_auto,c_fill,w_320,h_320`) a una URL FINAL predecible — `<Image>` real pasa a
    `unoptimized` siempre y usa esa MISMA URL. 320px fijo para grid y lista (supuesto).
- Verificado: `tsc`/`eslint`/`build` limpios. 🔴 No verificado en navegador real.

## Sección "Imagen OG" — datos y tipo de imagen editables sin afectar la tarjeta (2026-08-17)
- **Pedido explícito, caso real**: título omitido EN LA TARJETA (logo ya lo tiene) pero la
  miniatura compartida seguía sin nombre porque leía el mismo dato. Nueva sección para editar
  esos datos aparte + elegir el TIPO de imagen (personalizada / solo avatar / ninguna).
- **Nueva sección del editor** ("Imagen OG", `contenidoImagenOg`, al final de `SECCIONES`
  antes de "Estadísticas"): pill de 3 opciones + 3 campos opcionales (Nombre/Subtítulo/Bio "en
  la imagen OG", con placeholder mostrando el dato real). Link "Ver imagen OG actual ↗" (solo
  edición, abre `/{slug}/opengraph-image`).
- **Modelo de datos** (`IdentidadVisual`, sin migración): `ogTipo?: "personalizada" |
  "avatar" | "ninguna"` (default `"personalizada"`) + `ogNombre`/`ogSubtitulo`/`ogBio`
  (overrides, caen a `datos_contacto.nombre/empresa/puesto` si vacíos — NUNCA tocan la
  tarjeta).
- **`[slug]/opengraph-image.tsx`** bifurca en 3 ramas:
  - `"ninguna"` → `Response(null, {status: 404})`. 🔴 **Limitación real de Next.js**: el
    archivo de convención `opengraph-image.tsx` SIEMPRE tiene prioridad sobre `images` de
    `generateMetadata` (confirmado contra la doc de Next). El 404 logra el resultado VISUAL
    (unfurlers omiten el recuadro) aunque la metadata cruda técnicamente siga mencionando la
    URL.
  - `"avatar"` → `ImageResponse` propio cuadrado (600×600, sin texto), dimensiones DISTINTAS
    al `size` de módulo (1200×630, fijo). 🔴 **Mismatch aceptado a propósito**: el
    `og:image:width/height` declarado sigue diciendo 1200×630 aunque el archivo real sea
    600×600 — se acepta porque plataformas grandes leen las dimensiones REALES del archivo
    para decidir el layout, no solo el hint.
  - default (`"personalizada"`): mismo banner 1200×630, con `nombre`/`subtitulo`/`bio`
    resueltos `ogX?.trim() || datosReales`.
- **`twitter.card`** (`generateMetadata`, `[slug]/page.tsx`, no bloqueado por la file
  convention): `"summary_large_image"` solo para `"personalizada"`, `"summary"` para
  `"avatar"`/`"ninguna"`.
- **🔴→✅ Bug real, mismo día**: "Solo avatar" con Nombre cargado seguía mostrando el título
  genérico en WhatsApp — `ogNombre`/`ogSubtitulo`/`ogBio` solo alimentaban los píxeles de
  `opengraph-image.tsx`, `generateMetadata` seguía mirando solo `datos_contacto` (en blanco a
  propósito por "Título opcional"). Fix: `generateMetadata` resuelve `nombre`/`descripcion`
  con el mismo criterio `ogX?.trim() || datosReales` — el override cubre la vista previa
  COMPLETA (imagen + título + descripción), no solo los píxeles.
- **Subtítulo/Bio habilitados también en "Solo avatar"** (2026-08-13, pedido explícito):
  estaban ocultos detrás de `ogTipo === "personalizada"` en el editor aunque
  `generateMetadata` ya los soportaba sin bifurcar por tipo. Fix de UI: visibles siempre que
  `ogTipo !== "ninguna"` + nota aclaratoria en modo "Solo avatar".
- Verificado: `tsc`/`eslint` (2 warnings preexistentes de `<img>` en Satori, no evitables) y
  `build` (41 rutas) limpios. 🔴 No verificado en navegador real ni contra un unfurler real
  (WhatsApp/Twitter Card Validator).

## Tarjeta pegada al footer cuando hay imagen de fondo (mobile) — sin hueco (2026-08-13)
- **🔴→✅ Bug real**: con imagen de fondo activa (sobre todo "Repetir fondo"), quedaba un
  hueco visible entre la tarjeta y el `<footer>` mostrando el fondo "cortado" sin transición.
- **Causa**: el layer `fixed` a pantalla completa de `TarjetaCard` cubre todo el viewport
  detrás, pero `TarjetaPublica` tenía `pb-6` + esquinas redondeadas del `<article>` sin fondo
  propio ahí — se veía el fondo directo, sin el scrim que protege al `<footer>` mismo.
- **Fix** (`tarjeta-publica.tsx`, sin tocar `TarjetaCard` ni footer): con imagen de fondo
  activa, `pb-6` → `pb-0` + esquinas de abajo del `<article>` → `rounded-b-none` (arriba
  intactas). Sin efecto para tarjetas sin imagen de fondo ni en desktop.
- Verificado: `tsc`/`eslint`/`build` limpios. 🔴 No verificado en navegador real.

## Convenciones de UI
- Todo elemento clickeable (`button`/`[role="button"]`) tiene `cursor: pointer` vía una regla
  global en `globals.css` (`@layer base`) — no se setea por className individual. Excepción a
  propósito: `Menu.Item` en `compartir-tarjeta.tsx` usa `cursor-default` (convención shadcn/ui
  para ítems de menú).
