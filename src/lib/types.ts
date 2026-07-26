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
export type EstiloTipografia = "moderna" | "elegante" | "creativa"
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

export interface DatosContacto {
  // Personal
  nombre?: string
  empresa?: string
  puesto?: string
  telefono?: string
  whatsapp?: string
  email?: string
  // Empresarial
  nombreEmpresa?: string
  giro?: string
  telefonoCorporativo?: string
  sitioWeb?: string
  horarios?: string
  // Común a ambos
  direccion?: string
  direccionMapsUrl?: string
  videoUrl?: string
  descripcionServicios?: string
  servicios?: Servicio[]
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
export type ProveedorSuscripcion = "mercadopago" | "stripe"

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
  created_at: string
  updated_at: string
}
