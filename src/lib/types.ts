export type TarjetaTipo = "personal" | "empresarial"

export type PlataformaRed =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "whatsapp"
  | "x"
  | "personalizado"

export interface RedSocial {
  plataforma: PlataformaRed
  label: string
  url: string
}

export interface Servicio {
  titulo: string
  descripcion?: string
}

export type TemaModo = "claro" | "oscuro"
// "cuadrado" queda solo por compatibilidad con tarjetas ya guardadas con ese
// valor (border-radius chico) — el picker del editor ya no la ofrece, la
// reemplaza "suave" ("Redondeado" en la UI). Las 4 nuevas (hexagono/blob/
// corazon/estrella) usan clip-path, ver lib/personalizacion.ts.
export type AvatarForma =
  | "circulo"
  | "suave"
  | "cuadrado"
  | "hexagono"
  | "blob"
  | "corazon"
  | "estrella"
// 9 estilos (2026-08-01, ampliado desde los 3 originales) — 7 disponibles con
// personalizacion_libre, 2 con personalizacion_avanzada ("display" y
// "manuscrita"). Desde 2026-08-11 ambos planes reales (Connect/Growth)
// otorgan las dos features por igual, así que en la práctica cualquier plan
// activo desbloquea las 9 — el tier queda solo como mecanismo de gating
// genérico (ver ESTILOS_TIPOGRAFIA en lib/personalizacion.ts).
export type EstiloTipografia =
  | "moderna"
  | "elegante"
  | "creativa"
  | "clasica"
  | "geometrica"
  | "redondeada"
  | "mono"
  | "display"
  | "manuscrita"
// "recta" = el rounded-t-[2rem] que ya existe hoy, sin cambios. Las otras 3
// usan clip-path, ver lib/personalizacion.ts.
export type DivisorBanner = "recta" | "onda" | "diagonal" | "zigzag"

export interface Producto {
  titulo: string
  /** Admite **negrita** y *cursiva* (o _cursiva_) como marcadores de texto
   *  — NUNCA HTML real, ver `lib/texto-enriquecido.tsx` (interpretado solo
   *  al renderizar, el dato guardado sigue siendo un string plano). Texto
   *  sin marcadores (todo lo guardado antes de esta feature) se ve
   *  idéntico a como se veía siempre. */
  descripcion?: string
  imagenUrl?: string
  /** Ancla de reposicionamiento de `imagenUrl` (mismo mecanismo que avatar/
   *  banner/fondo, ver `PosicionImagen` más abajo) — sin valor, se asume
   *  50/50 (comportamiento de siempre, object-fit:cover centrado). */
  imagenPosicion?: PosicionImagen
  precio?: string
  enlaceUrl?: string
}

/** Una sección de "Servicios" — mismos 5 campos por ítem que Producto (se
 *  reusa el tipo). Reemplaza al modelo viejo (Servicio[] + descripcionServicios
 *  + identidad_visual.tituloServicios, una sola lista sin precio/imagen/
 *  enlace). Tope de secciones por tarjeta según
 *  planes.features.secciones_servicios_max (mismo tope en Connect y Growth
 *  desde 2026-08-11). */
export interface SeccionServicios {
  titulo: string
  items: Producto[]
}

/** "imagen" = `imagenUrl` (subida a Cloudinary), "icono" = `iconoId` (uno
 *  de BOTON_ICONOS, lib/boton-cta.ts) — mutuamente excluyentes, elegidos
 *  por el dueño en el editor. */
export type BotonCtaIconoTipo = "imagen" | "icono"

/** @deprecated Modelo viejo (plano, sin `tipo` — implícitamente "enlace")
 *  de la sección "Botón" del editor, previo a la unificación de Botones/
 *  Servicios/Productos (2026-08-09, ver CLAUDE.md). Se sigue leyendo tal
 *  cual está grabado en `datos_contacto.botones` de tarjetas viejas, pero
 *  SOLO a través de `normalizarBotones()` (lib/boton-cta.ts) — nunca se
 *  asume este shape directo en ningún componente. Reemplazado por `Boton`. */
export interface BotonCta {
  id: string
  titulo: string
  subtitulo?: string
  url: string
  iconoTipo?: BotonCtaIconoTipo
  imagenUrl?: string
  iconoId?: string
  /** Sin valor: usa colorBotones (mismo default que el resto de los CTA). */
  colorFondo?: string
  /** id de BOTON_TEXTURAS — "ninguna"/undefined = sin textura. */
  textura?: string
  colorBorde?: string
}

/** 6 tipos de botón (2026-08-09, + "agenda" 2026-08-10) — reemplaza el
 *  modelo plano de `BotonCta` Y absorbe "Servicios"/"Productos" (ahora
 *  `tipo: "catalogo"`), el folleto PDF suelto (ahora `tipo: "archivo"`) y
 *  la sección "Agenda" (ahora `tipo: "agenda"`) en un solo sistema. Ver
 *  `normalizarBotones()` en lib/boton-cta.ts para la migración en memoria
 *  de tarjetas viejas (nunca escribe hasta el próximo guardado) y CLAUDE.md
 *  para el detalle de negocio (gating por plan, límites, etc.). */
export type BotonTipo = "enlace" | "whatsapp" | "opciones" | "catalogo" | "archivo" | "agenda"

/** Vista de un botón "catalogo" — reemplaza el grid fijo de 3 columnas que
 *  tenían Servicios/Productos: el dueño elige entre grid de 2 columnas o
 *  lista de 1 por línea (mismo ancho que el resto de los botones). */
export type CatalogoVista = "grid2" | "lista1"

/** Campos comunes a cualquier tipo de botón — ícono/imagen a la izquierda
 *  + color/borde/textura de fondo, mismos campos que ya tenía `BotonCta`. */
interface BotonBase {
  id: string
  titulo: string
  subtitulo?: string
  iconoTipo?: BotonCtaIconoTipo
  imagenUrl?: string
  iconoId?: string
  /** Sin valor: usa colorBotones (mismo default que el resto de los CTA). */
  colorFondo?: string
  /** id de BOTON_TEXTURAS — "ninguna"/undefined = sin textura. */
  textura?: string
  colorBorde?: string
  /** Sin valor: auto-contraste contra el fondo (mismo criterio que el resto
   *  de los colores de texto de la tarjeta). */
  colorTexto?: string
  /** Fuente del título del botón — sin valor: hereda (nunca cae directo al
   *  default de la tarjeta salvo que también sea el primer botón). Un hijo
   *  de "opciones" hereda la fuente EFECTIVA de su botón padre; un botón
   *  top-level que no sea el primero de la lista hereda la del primero;
   *  el primer botón top-level, sin valor propio, usa la tipografía
   *  general de la tarjeta (`estiloTipografia`). Ver `resolverTipografiaBoton`
   *  en lib/boton-cta.ts (única fuente de esta regla, reusada por el editor
   *  y el render público). Sin gating de plan a propósito — mismo criterio
   *  que el resto de los campos de `BotonBase` (color/textura), que tampoco
   *  lo tienen. */
  fuenteBoton?: EstiloTipografia
  /** Peso del título del botón (400-800, paso 50) — misma regla de
   *  herencia que `fuenteBoton`, default efectivo 600 (el mismo peso fijo
   *  que tenían todos los botones antes de esta feature). */
  pesoBoton?: number
}

/** El botón de ancho completo de siempre — mismo comportamiento que
 *  `BotonCta`, pero SIN el mini-helper de armar un link de WhatsApp (ese
 *  helper es ahora exclusivo de `BotonWhatsapp`). */
export interface BotonEnlace extends BotonBase {
  tipo: "enlace"
  url: string
}

/** Mismo look/estructura visual que `BotonEnlace` — en vez de un campo url
 *  libre, número + mensaje; la URL final (`wa.me/...`) se resuelve recién
 *  al momento de guardar/renderizar con `construirUrlWhatsapp()`
 *  (lib/boton-cta.ts), nunca se persiste el link armado. */
export interface BotonWhatsapp extends BotonBase {
  tipo: "whatsapp"
  waNumero: string
  waMensaje?: string
}

/** Archivo descargable (reemplaza al folleto PDF suelto que colgaba de la
 *  sección [0] de Servicios) — gating vía `planes.features.
 *  personalizacion_avanzada` (reusa el flag que ya existe en vez de sumar
 *  uno nuevo; disponible en cualquier plan activo desde 2026-08-11). Solo
 *  PDF, mismo criterio que `validarPdf` ya usaba para el folleto. */
export interface BotonArchivo extends BotonBase {
  tipo: "archivo"
  archivoUrl: string
  nombreArchivo?: string
}

/** Reemplaza a "Servicios" (`SeccionServicios`) y "Productos" (`Producto[]`
 *  suelto) — un botón "catalogo" trae su propia lista de ítems (mismo tipo
 *  `Producto`, sin cambios) y una vista elegida por el dueño. Cada ítem
 *  abre un modal de detalle en vez de mostrar todo apretado en el tile.
 *  Gating: cuenta como "sección" contra `planes.features.
 *  secciones_servicios_max` (1/2/3 según plan), mismo criterio que hoy
 *  tiene Servicios — un botón "opciones" NO tiene este límite. */
export interface BotonCatalogo extends BotonBase {
  tipo: "catalogo"
  vista: CatalogoVista
  items: Producto[]
}

/** Un botón "opciones" admite un solo nivel de anidamiento — un hijo nunca
 *  puede ser a su vez "opciones" (decisión de negocio explícita, evita
 *  menús infinitos). "agenda" tampoco es hijo válido: es un singleton por
 *  tarjeta (ver `BotonAgenda`), no tendría sentido duplicado ni anidado. */
export type BotonHijo = BotonEnlace | BotonWhatsapp | BotonCatalogo | BotonArchivo

/** Botón "padre" que despliega/colapsa (toggle inline, no modal) una lista
 *  de botones hijos — organización visual pura, sin restricción de plan
 *  propia (los hijos individuales sí heredan la de su propio tipo, ej. un
 *  hijo "catalogo" sigue contando contra el tope de secciones). */
export interface BotonOpciones extends BotonBase {
  tipo: "opciones"
  hijos: BotonHijo[]
}

/** Reemplaza la sección "Agenda" de siempre (2026-08-10) — SIN campos
 *  propios: los horarios/servicios agendables viven en las tablas
 *  `servicios_agendables`/`disponibilidad_*` (por `tarjeta_id`, sin
 *  relación con este objeto), este botón solo aporta título/ícono/color/
 *  posición como cualquier otro. Singleton: `normalizarBotones()` asegura
 *  que exista SIEMPRE exactamente uno (top-level, nunca dentro de
 *  "opciones") — el dueño lo reordena/personaliza como a cualquier botón,
 *  pero no puede eliminarlo del todo (decisión de negocio explícita: la
 *  aparición de Agenda sigue siendo automática en cuanto hay servicios
 *  agendables activos, igual que antes de esta unificación — no depende
 *  de que el dueño se acuerde de agregarlo). Sin servicios activos (o sin
 *  plan que los habilite), el botón entero no se renderiza — mismo
 *  criterio de siempre. */
export interface BotonAgenda extends BotonBase {
  tipo: "agenda"
}

export type Boton =
  | BotonEnlace
  | BotonWhatsapp
  | BotonOpciones
  | BotonCatalogo
  | BotonArchivo
  | BotonAgenda

/** @deprecated Superado por la unificación de Agenda como `tipo: "agenda"`
 *  dentro de "Botones" (2026-08-10) — ya no queda más de un bloque
 *  reordenable a este nivel, así que no tiene sentido elegir un orden
 *  ENTRE secciones. Se sigue leyendo (nunca se escribe en un guardado
 *  nuevo) solo dentro de `normalizarBotones()`, para decidir si el botón
 *  Agenda migrado de una tarjeta vieja va antes o después de sus botones
 *  planos ya existentes, reproduciendo el orden que esa tarjeta ya tenía. */
export type SeccionOrdenable = "agenda" | "botones"

/** Los 4 pills fijos de "Datos de contacto" (teléfono/WhatsApp/email/cómo
 *  llegar) — el dueño reordena ENTRE ELLOS con ↑/↓ (mismo patrón que
 *  `SeccionOrdenable`, pero acotado a estos 4 en vez de mover toda la
 *  sección respecto de otras). Sin este campo, se usa el orden fijo de
 *  siempre. */
export type ContactoOrdenable = "telefono" | "whatsapp" | "email" | "ubicacion"

// Tipo único de tarjeta (2026-08-01): el editor ya no distingue
// personal/empresarial (ver tarjeta-form.tsx) — todos estos campos son
// comunes a cualquier tarjeta. `nombre` = "Título", `empresa` = "Rol o
// descripción" (línea corta), `puesto` = "Bio" (párrafo largo, tope 160
// caracteres en el editor). La columna `tarjetas.tipo` en DB no se tocó
// (sigue existiendo "personal"/"empresarial"), pero ya no gatea ningún
// campo del formulario ni del render.
export interface DatosContacto {
  nombre?: string
  empresa?: string
  puesto?: string
  telefono?: string
  whatsapp?: string
  email?: string
  horarios?: string
  /** @deprecated Modelo viejo (tipo "empresarial") — reemplazado por `nombre`.
   *  Se sigue leyendo solo como fallback en memoria para pre-llenar el editor
   *  de tarjetas viejas no regrabadas (ver tarjeta-form.tsx). */
  nombreEmpresa?: string
  /** @deprecated Ver nota de `nombreEmpresa` — reemplazado por `empresa`. */
  giro?: string
  /** @deprecated Ver nota de `nombreEmpresa` — reemplazado por `telefono`. */
  telefonoCorporativo?: string
  /** @deprecated Campo eliminado del editor unificado (2026-08-01), sin
   *  reemplazo directo — se puede recrear como un enlace "personalizado" en
   *  `redes`. Se sigue leyendo por si alguna tarjeta vieja lo necesitara para
   *  otro propósito en el futuro; no se muestra en ningún lado hoy. */
  sitioWeb?: string
  // Común a ambos
  direccion?: string
  direccionMapsUrl?: string
  videoUrl?: string
  /** @deprecated Modelo viejo de "Servicios" (una sola lista, sin precio/
   *  imagen/enlace) — reemplazado primero por `seccionesServicios`, y esa a
   *  su vez absorbida por botones `tipo: "catalogo"` (2026-08-09). Se sigue
   *  leyendo (no se borra de tarjetas viejas no regrabadas) solo para
   *  `normalizarBotones()` (lib/boton-cta.ts); ya no se escribe. */
  descripcionServicios?: string
  /** @deprecated Ver nota de `descripcionServicios`. */
  servicios?: Servicio[]
  /** @deprecated Reemplazaba al modelo de arriba — ahora absorbido por
   *  botones `tipo: "catalogo"` (ver `Boton`/`BotonCatalogo` y
   *  `normalizarBotones()`, lib/boton-cta.ts). Se sigue leyendo solo para
   *  esa migración en memoria; ya no se escribe. */
  seccionesServicios?: SeccionServicios[]
  /** @deprecated Ver nota de `seccionesServicios` — mismo criterio, ahora
   *  absorbido por botones `tipo: "catalogo"`. */
  productos?: Producto[]
  redes?: RedSocial[]
  /** Botones de ancho completo, uno por línea — 5 tipos posibles (ver
   *  `Boton`, lib/types.ts). Puede contener el shape viejo y plano de
   *  `BotonCta` (tarjetas no regrabadas desde la unificación de
   *  2026-08-09) — nunca se consume directo, siempre a través de
   *  `normalizarBotones()` (lib/boton-cta.ts). */
  botones?: (Boton | BotonCta)[]
}

/** Ancla de reposicionamiento + zoom de una imagen recortable (avatar,
 *  banner, imagen de fondo) — 0-100 cada eje, `escala` opcional (1 = sin
 *  zoom extra sobre el object-fit:cover de base, hasta 2.5). Sin `escala`
 *  se asume 1, así una tarjeta que nunca usó el zoom se ve exactamente
 *  igual que antes de agregarlo. */
export interface PosicionImagen {
  x: number
  y: number
  escala?: number
}

export interface IdentidadVisual {
  colorPrimario?: string
  colorSecundario?: string
  avatarUrl?: string
  bannerUrl?: string
  bannerPreset?: string
  /** @deprecated Folleto PDF suelto del modelo viejo (colgaba de la
   *  sección [0] de Servicios) — absorbido por botones `tipo: "archivo"`
   *  (2026-08-09, ver `Boton`/`BotonArchivo` y `normalizarBotones()`). Se
   *  sigue leyendo solo para esa migración en memoria; ya no se escribe. */
  brochureUrl?: string
  temaModo?: TemaModo
  avatarForma?: AvatarForma
  /** Ancla de reposicionamiento + zoom del avatar (mismo mecanismo que
   *  bannerPosicion/fondoImagenPosicion) — reemplaza el recorte
   *  destructivo que hacía RecortarAvatar: la foto se sube completa y se
   *  encuadra por CSS, así se puede reabrir y reajustar en cualquier
   *  momento sin volver a subir el archivo. Sin gating (la posición nunca
   *  fue una feature paga). */
  avatarPosicion?: PosicionImagen
  estiloTipografia?: EstiloTipografia
  // --- Personalización avanzada (gating por plan, ver lib/personalizacion.ts) ---
  /** Color de botones — default: colorPrimario (reproduce el look actual si no está seteado). */
  colorBotones?: string
  /** Color de badges — default: colorSecundario (reproduce el look actual si no está seteado). */
  colorBadges?: string
  /** Modo avanzado de color: desbloquea los 3 overrides de texto de abajo. Sin esto, todo es auto-contraste. */
  modoColorAvanzado?: boolean
  colorTextoBotones?: string
  colorTextoBadges?: string
  colorTextoGeneral?: string
  /** Modo avanzado de tipografía: fuente de cuerpo separada de la de títulos (estiloTipografia). */
  modoTipografiaAvanzado?: boolean
  estiloTipografiaCuerpo?: EstiloTipografia
  divisorBanner?: DivisorBanner
  glassmorfismo?: boolean
  /** Trazabilidad de qué plantilla se usó como base, si alguna — no afecta el render. */
  plantillaBase?: string | null
  /** Ancla de reposicionamiento del banner (0-100 cada eje), tipo "reposicionar
   *  foto de portada" — reemplaza el object-position fijo (50%,50%) de
   *  siempre. Sin este campo, el banner se sigue viendo exactamente igual
   *  que antes (fallback a 50/50). */
  bannerPosicion?: PosicionImagen
  /** Alto del banner en px — rango sugerido en el editor 140-320, default
   *  192 (equivalente al `h-48` fijo de siempre) si no está seteado.
   *  Gating: personalizacion_libre, mismo criterio que tituloTamano. */
  bannerAltura?: number
  /** Imagen de fondo de TODA la tarjeta (banner + detrás del panel de
   *  contenido) — mutuamente excluyente con bannerUrl/bannerPreset/degradé
   *  de banner Y con fondoTarjeta* de abajo: si está seteada, tiene
   *  prioridad sobre ambos en el render (gating: personalizacion_avanzada).
   *  El layer que la dibuja usa una altura FIJA (constante, no `inset-0`
   *  atado al alto dinámico del panel) para que `object-fit:cover` calcule
   *  su escala una sola vez contra esa referencia estable — con `inset-0`
   *  (alto = el del panel, que crece con agenda/servicios/productos) el
   *  encuadre se recalculaba en cada guardado según cuánto contenido
   *  hubiera, "moviendo" la imagen sin que el dueño la haya tocado. */
  fondoImagenUrl?: string
  fondoImagenPosicion?: PosicionImagen
  /** true = la imagen se muestra a 100% de ancho (alto proporcional) y se
   *  repite verticalmente para llenar la pantalla, en vez de recortarse con
   *  object-fit:cover. `fondoImagenPosicion` SÍ aplica en este modo
   *  (2026-08-12) — se reinterpreta como background-position/
   *  background-size en vez de object-position/transform, ver TarjetaCard. */
  fondoImagenRepetir?: boolean
  /** Fondo del panel de contenido (blanco/oscuro por defecto según
   *  temaModo) — separado a propósito del fondo del banner (colorPrimario/
   *  colorSecundario) para no repetir la confusión de que "Fondo" en
   *  Colores y tipografía en realidad controlaba el banner. Simple =
   *  personalizacion_libre, avanzado = personalizacion_avanzada. */
  fondoTarjetaModo?: "simple" | "avanzado"
  fondoTarjetaColor?: string
  fondoTarjetaColorSecundario?: string
  fondoTarjetaTipoDegradado?: "lineal" | "radial"
  fondoTarjetaDireccionGrados?: number
  /** Color del título (h1) — default: auto-contraste (mismo criterio que el
   *  resto del texto) si no está seteado. Gating: personalizacion_libre,
   *  mismo criterio que colorBotones/colorBadges. */
  colorTitulo?: string
  /** Tamaño de fuente del título en px — rango sugerido en el editor 20-40,
   *  default: 20 (equivalente al `text-xl` fijo de siempre) si no está
   *  seteado. Gating: personalizacion_libre. */
  tituloTamano?: number
  /** peso de fuente del título (font-weight) — rango sugerido en el editor
   *  400-800, default: 600 (equivalente al `font-semibold` fijo de siempre)
   *  si no está seteado. Gating: personalizacion_libre. */
  tituloPeso?: number
  /** @deprecated Título de la sección "Servicios" del modelo viejo — pasó
   *  primero a vivir por sección en `DatosContacto.seccionesServicios[].
   *  titulo`, y esa a su vez fue absorbida por botones `tipo: "catalogo"`
   *  (2026-08-09, ver `normalizarBotones()`). Se sigue leyendo solo para
   *  esa migración en memoria de tarjetas viejas. */
  tituloServicios?: string
  /** @deprecated Título de la sección "Productos" del modelo viejo — mismo
   *  criterio que `tituloServicios`, absorbido por botones `tipo:
   *  "catalogo"`. Se sigue leyendo solo para la migración en memoria. */
  tituloProductos?: string
  /** Ícono del badge "@enlace" (debajo del avatar) — opcional. `undefined`
   *  = mostrado (compatibilidad: toda tarjeta vieja se veía con el ícono
   *  Sparkles siempre puesto, así que "sin definir" no puede significar
   *  "oculto"). `false` = sin ícono. `badgeIconoId` reusa el mismo set
   *  curado que BotonCta (BOTON_ICONOS, lib/boton-cta.ts); sin valor =
   *  "sparkles" (el ícono de siempre). */
  badgeIconoActivo?: boolean
  badgeIconoId?: string
  /** Color de la línea "Rol o descripción" (`empresa`, la tipografía
   *  secundaria bajo el título) — mismo criterio que `colorTitulo`: default
   *  auto-contraste si no está seteado. Gating: personalizacion_libre. */
  colorTextoSecundario?: string
  /** true = centra el bloque de dirección/horario (ícono+texto de cada
   *  línea) — por default queda alineado a la izquierda (comportamiento de
   *  siempre). Sin gating de plan: es organización visual, mismo criterio
   *  que el resto de los campos de "solo alineación/orden" del editor
   *  (ordenContacto, orden de botones). */
  ubicacionCentrada?: boolean
  /** @deprecated Ver `SeccionOrdenable` — ya no se escribe (Agenda pasó a
   *  ser un botón más dentro de "botones", 2026-08-10). Se sigue leyendo
   *  solo dentro de `normalizarBotones()` para migrar tarjetas viejas. */
  ordenSecciones?: SeccionOrdenable[]
  /** Orden entre los 4 pills de "Datos de contacto" (no de la sección en
   *  sí, ver `ContactoOrdenable`) — el dueño lo reordena con flechas ↑/↓
   *  en "Canales de contacto". Sin este campo, orden fijo de siempre
   *  (teléfono → WhatsApp → email → cómo llegar). */
  ordenContacto?: ContactoOrdenable[]
  /** Reemplaza el `<h1>` de texto (nombre) por una imagen de logo — a
   *  diferencia del avatar, esta imagen NO se recorta a ninguna forma, se
   *  muestra con su proporción natural (ancho libre, alto fijo) "como si
   *  fuera texto". `undefined`/`"texto"` = comportamiento de siempre.
   *  Gating: personalizacion_avanzada (cualquier plan activo). */
  tituloModo?: "texto" | "imagen"
  tituloImagenUrl?: string
  /** Alto del logo en px — rango sugerido en el editor 24-80, default 32. */
  tituloImagenAltura?: number
}

export type MetodoPago = "mercado_pago" | "transferencia"
export type EstadoPago = "pendiente" | "aprobado" | "rechazado"

export interface Tarjeta {
  id: string
  slug: string
  tipo: TarjetaTipo
  user_id: string | null
  datos_contacto: DatosContacto
  identidad_visual: IdentidadVisual
  metodo_pago: MetodoPago | null
  estado_pago: EstadoPago
  publicado: boolean
  precio_pagado: number | null
  cupon_codigo: string | null
  plan_id: string | null
  zona_horaria: string
  /** @deprecated Columna existe en DB (migración
   *  20260810000000_add_agenda_intervalo_colchon.sql) pero sin caller: un
   *  solo proveedor por tarjeta comparte un único calendario, así que "cada
   *  cuánto ofrecer un horario" no es una config aparte — los horarios se
   *  calculan directo desde duración+colchón de cada servicio (ver
   *  `obtenerSlotsDisponibles`, lib/agenda.ts). No se borra la columna
   *  (mismo criterio que el resto de campos deprecados del proyecto). */
  intervalo_agenda_minutos: number
  created_at: string
}

// Tarjeta + su plan embebido (join vía plan_id) — usada por cualquier
// listado que necesite mostrar el nombre del plan sin una consulta aparte
// (admin/tarjetas global, mi-cuenta/tarjetas personal). `planes` es null
// cuando `plan_id` es null (nunca pagó, o se le canceló la suscripción).
export interface TarjetaConPlan extends Tarjeta {
  planes: { nombre_display: string; slug: string } | null
}

// Auditoría de cada cambio de `tarjetas.slug` (el enlace personalizado) —
// una fila por cambio, poblada por un trigger AFTER UPDATE (nunca por el
// cliente directo, ver migración 20260801000000_add_tarjeta_slug_historial.sql).
// Usada para calcular "cuántos cambios de enlace le quedan" al dueño en el
// editor — límite de negocio: máximo 2 cambios cada 14 días, enforced
// también a nivel de trigger (BEFORE UPDATE), no solo en el cliente.
export interface CambioSlugTarjeta {
  id: string
  tarjeta_id: string
  slug_anterior: string
  slug_nuevo: string
  created_at: string
}

export interface ServicioAgendable {
  id: string
  tarjeta_id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  /** Minutos de colchón antes/después de UNA cita de este servicio,
   *  durante los cuales no se ofrece ni se permite agendar otra — por
   *  servicio (no por tarjeta): cada uno puede necesitar más o menos
   *  espacio según su propia naturaleza. Default 0 (sin colchón, mismo
   *  comportamiento de siempre). Ver migración
   *  20260810000000_add_agenda_intervalo_colchon.sql. */
  colchon_minutos: number
  precio: number
  requiere_pago_inmediato: boolean
  activo: boolean
  created_at: string
}

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface DisponibilidadSemanal {
  id: string
  tarjeta_id: string
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin: string
  created_at: string
}

export type TipoExcepcionDisponibilidad = "bloqueo" | "apertura_extra"

export interface DisponibilidadExcepcion {
  id: string
  tarjeta_id: string
  fecha: string
  tipo: TipoExcepcionDisponibilidad
  hora_inicio: string | null
  hora_fin: string | null
  created_at: string
}

export interface Configuracion {
  id: number
  precio_regular: number
  precio_lanzamiento: number
  promocion_activa: boolean
  promocion_fin: string
  descuento_tarjeta_adicional_pct: number
}

export interface Cupon {
  id: number
  codigo: string
  porcentaje_descuento: number
  activo: boolean
  afiliado_nombre: string | null
  afiliado_id: string | null
  fecha_vencimiento: string | null
  limite_usos: number | null
  created_at: string
}

// Auditoría de CADA cobro (venta inicial + cada renovación) atribuido a un
// cupón — una fila por invoice de Stripe, no una por suscripción (ver
// migración 20260727000000_add_sistema_afiliados.sql: la comisión de
// afiliados es recurrente, se calcula sobre cada cobro). Snapshot
// congelado al momento de la confirmación de pago (codigo/afiliado_nombre
// sobreviven aunque se borre el cupón, la tarjeta, la suscripción o el
// afiliado — todas esas FK son nullable con ON DELETE SET NULL, la fila
// nunca se borra en cascada). comision_stripe/monto_neto pueden llegar
// null temporalmente (lag async del balance_transaction de Stripe, ver
// backfillComisionStripe).
export interface CuponUso {
  id: string
  cupon_id: number | null
  afiliado_id: string | null
  tarjeta_id: string | null
  suscripcion_id: string | null
  stripe_invoice_id: string | null
  codigo: string
  afiliado_nombre: string | null
  monto_descontado: number
  precio_final: number
  comision_stripe: number | null
  monto_neto: number | null
  created_at: string
}

// Alta 100% manual por el admin — sin autoregistro. email matchea contra
// el login de Google (mismo email que ya usan los dueños de tarjeta) para
// habilitar la pestaña "Ganancias" en Mi Cuenta.
export interface Afiliado {
  id: string
  nombre: string
  email: string
  porcentaje_comision: number
  activo: boolean
  created_at: string
}

// Registro manual de un pago ya realizado a un afiliado — afiliado_id
// nullable con ON DELETE SET NULL (mismo patrón que cupon_usos), el
// snapshot de afiliado_nombre mantiene la fila útil aunque se borre el
// afiliado. Solo lectura para el propio afiliado, CRUD para el admin.
export interface AfiliadoPago {
  id: string
  afiliado_id: string | null
  afiliado_nombre: string
  monto: number
  fecha: string
  nota: string | null
  registrado_por: string
  created_at: string
}

// Gestionado 100% desde /admin/testimonios. `orden` controla el despliegue
// en el home (asc); `calificacion` null = sin estrellas para ese testimonio.
export interface Testimonio {
  id: string
  nombre: string
  rol_o_negocio: string
  cita: string
  avatar_url: string | null
  calificacion: number | null
  activo: boolean
  orden: number
  created_at: string
}

export type PlanSlug = "connect" | "growth"

export interface Plan {
  id: string
  slug: PlanSlug
  nombre_display: string
  precio_mensual: number
  precio_anual: number
  orden: number
  activo: boolean
  features: Record<string, unknown>
  created_at: string
}

export type PeriodicidadSuscripcion = "mensual" | "anual"
export type EstadoSuscripcion = "pendiente" | "autorizada" | "pausada" | "cancelada" | "vencida"
export type ProveedorSuscripcion = "mercadopago" | "stripe" | "manual"

export interface Suscripcion {
  id: string
  tarjeta_id: string
  plan_id: string
  proveedor: ProveedorSuscripcion
  preapproval_id: string | null
  preapproval_plan_id: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_checkout_session_id: string | null
  periodicidad: PeriodicidadSuscripcion
  estado: EstadoSuscripcion
  es_adicional: boolean
  descuento_aplicado: number
  precio_base: number
  precio_final: number
  cupon_codigo: string | null
  fecha_inicio: string
  fecha_renovacion: string | null
  /** Solo se completan para proveedor='manual' — alta manual desde el
   *  admin (ej. pago por transferencia), sin pasar por Stripe. */
  registrado_por: string | null
  nota_manual: string | null
  created_at: string
  updated_at: string
}
