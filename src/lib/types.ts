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
  direccion?: string
  direccionMapsUrl?: string
  sitioWeb?: string
  horarios?: string
  // Común a ambos
  redes?: RedSocial[]
}

export interface IdentidadVisual {
  colorPrimario?: string
  colorSecundario?: string
  avatarUrl?: string
  bannerUrl?: string
  bannerPreset?: string
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
  created_at: string
}
