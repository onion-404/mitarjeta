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
export type AvatarForma = "circulo" | "suave" | "cuadrado"
export type EstiloTipografia = "moderna" | "elegante" | "creativa"

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
  id: string
  codigo: string
  porcentaje_descuento: number
  activo: boolean
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

export interface Suscripcion {
  id: string
  tarjeta_id: string
  plan_id: string
  preapproval_id: string | null
  preapproval_plan_id: string | null
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
