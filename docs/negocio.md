# Modelo de negocio, planes, copy

> Detalle de negocio/planes/copy — referenciado desde CLAUDE.md. Actualizar acá, no ahí.

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
    no es una feature construida todavía (ver "Diferido" en docs/diferido.md,
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
       código a la API de Google Calendar. Ver también docs/diferido.md,
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
    detalle completo en docs/diferido.md, "Confirmación de agenda por WhatsApp vía Make").

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
