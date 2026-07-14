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
  created_at: string
}

export interface Configuracion {
  id: number
  precio_regular: number
  precio_lanzamiento: number
  promocion_activa: boolean
  promocion_fin: string
}

export interface Cupon {
  id: string
  codigo: string
  porcentaje_descuento: number
  activo: boolean
  created_at: string
}
