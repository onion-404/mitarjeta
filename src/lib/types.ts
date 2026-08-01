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
// 9 estilos (2026-08-01, ampliado desde los 3 originales) — 7 disponibles
// con personalizacion_libre (Alcance+), 2 exclusivos de personalizacion_avanzada
// (Poder): "display" y "manuscrita". Ver ESTILOS_TIPOGRAFIA en
// lib/personalizacion.ts para el tier y la fuente de cada uno.
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
  descripcion?: string
  imagenUrl?: string
  precio?: string
  enlaceUrl?: string
}

/** Una sección de "Servicios" — mismos 5 campos por ítem que Producto (se
 *  reusa el tipo). Reemplaza al modelo viejo (Servicio[] + descripcionServicios
 *  + identidad_visual.tituloServicios, una sola lista sin precio/imagen/
 *  enlace). Tope de secciones por tarjeta: 1/2/3 según
 *  planes.features.secciones_servicios_max (presencia/alcance/poder). */
export interface SeccionServicios {
  titulo: string
  items: Producto[]
}

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
   *  imagen/enlace) — reemplazado por `seccionesServicios`. Se sigue
   *  leyendo (no se borra de tarjetas viejas no regrabadas) solo para armar
   *  una sección equivalente en memoria la primera vez que se abre el
   *  editor; ya no se escribe. */
  descripcionServicios?: string
  /** @deprecated Ver nota de `descripcionServicios`. */
  servicios?: Servicio[]
  /** Reemplaza al modelo viejo de arriba — 1 a 3 secciones (tope según
   *  plan), cada ítem con los mismos campos que Producto. */
  seccionesServicios?: SeccionServicios[]
  productos?: Producto[]
  redes?: RedSocial[]
}

export interface IdentidadVisual {
  colorPrimario?: string
  colorSecundario?: string
  avatarUrl?: string
  bannerUrl?: string
  bannerPreset?: string
  brochureUrl?: string
  temaModo?: TemaModo
  avatarForma?: AvatarForma
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
  bannerPosicion?: { x: number; y: number }
  /** Imagen de fondo de TODA la tarjeta (banner + detrás del panel de
   *  contenido) — mutuamente excluyente con bannerUrl/bannerPreset/degradé
   *  de banner Y con fondoTarjeta* de abajo: si está seteada, tiene
   *  prioridad sobre ambos en el render (gating: personalizacion_avanzada). */
  fondoImagenUrl?: string
  fondoImagenPosicion?: { x: number; y: number }
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
  /** @deprecated Título de la sección "Servicios" del modelo viejo — ahora
   *  vive por sección en `DatosContacto.seccionesServicios[].titulo`. Se
   *  sigue leyendo solo para la migración en memoria de tarjetas viejas. */
  tituloServicios?: string
  /** Título personalizable de la sección "Productos" — vacío/undefined usa
   *  el default ("Productos"). */
  tituloProductos?: string
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

export type PlanSlug = "presencia" | "alcance" | "poder"

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
