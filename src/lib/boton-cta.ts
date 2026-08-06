import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Car,
  ChefHat,
  Coffee,
  Download,
  Dumbbell,
  Gavel,
  Gift,
  GraduationCap,
  Hammer,
  HardHat,
  Heart,
  Home,
  Leaf,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Paintbrush,
  Palette,
  PawPrint,
  Phone,
  Play,
  Scissors,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  Ticket,
  Truck,
  Video,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"

import type { SeccionOrdenable } from "@/lib/types"

// ============================================================================
// Íconos curados para el botón CTA (opción "icono" de BotonCta.iconoTipo) —
// set chico y genérico a propósito (no íconos de marca, esos ya viven en
// social-icons.tsx para las redes sociales) para cubrir los usos más
// comunes de un CTA: agendar, comprar, contactar, descargar, etc.
// ============================================================================
export interface BotonIconoMeta {
  id: string
  etiqueta: string
  Icono: LucideIcon
}

export const BOTON_ICONOS: BotonIconoMeta[] = [
  { id: "enlace", etiqueta: "Enlace", Icono: Link2 },
  { id: "whatsapp", etiqueta: "WhatsApp", Icono: MessageCircle },
  { id: "telefono", etiqueta: "Teléfono", Icono: Phone },
  { id: "email", etiqueta: "Email", Icono: Mail },
  { id: "calendario", etiqueta: "Agendar", Icono: Calendar },
  { id: "tienda", etiqueta: "Tienda", Icono: ShoppingBag },
  { id: "ticket", etiqueta: "Ticket", Icono: Ticket },
  { id: "regalo", etiqueta: "Regalo", Icono: Gift },
  { id: "ubicacion", etiqueta: "Ubicación", Icono: MapPin },
  { id: "descarga", etiqueta: "Descarga", Icono: Download },
  { id: "play", etiqueta: "Reproducir", Icono: Play },
  { id: "video", etiqueta: "Video", Icono: Video },
  { id: "camara", etiqueta: "Cámara", Icono: Camera },
  { id: "musica", etiqueta: "Música", Icono: Music2 },
  { id: "cafe", etiqueta: "Café", Icono: Coffee },
  { id: "corazon", etiqueta: "Favorito", Icono: Heart },
  { id: "estrella", etiqueta: "Destacado", Icono: Star },
  { id: "premio", etiqueta: "Premio", Icono: Award },
  { id: "libro", etiqueta: "Libro", Icono: BookOpen },
  { id: "rayo", etiqueta: "Rápido", Icono: Zap },
  { id: "sparkles", etiqueta: "Especial", Icono: Sparkles },
  // Profesiones/rubros — lucide-react no trae un ícono de "diente" literal
  // (se probó, no existe ninguna variante); Stethoscope es el más cercano
  // disponible para salud/consultorio (médico, dentista, etc.).
  { id: "auto", etiqueta: "Automotriz", Icono: Car },
  { id: "salud", etiqueta: "Salud", Icono: Stethoscope },
  { id: "peluqueria", etiqueta: "Peluquería", Icono: Scissors },
  { id: "maletin", etiqueta: "Negocios", Icono: Briefcase },
  { id: "construccion", etiqueta: "Construcción", Icono: Hammer },
  { id: "obra", etiqueta: "Obra", Icono: HardHat },
  { id: "gastronomia", etiqueta: "Gastronomía", Icono: ChefHat },
  { id: "arte", etiqueta: "Arte", Icono: Paintbrush },
  { id: "educacion", etiqueta: "Educación", Icono: GraduationCap },
  { id: "entrenamiento", etiqueta: "Entrenamiento", Icono: Dumbbell },
  { id: "diseno", etiqueta: "Diseño", Icono: Palette },
  { id: "inmobiliaria", etiqueta: "Inmobiliaria", Icono: Home },
  { id: "jardineria", etiqueta: "Jardinería", Icono: Leaf },
  { id: "legal", etiqueta: "Legal", Icono: Gavel },
  { id: "arquitectura", etiqueta: "Arquitectura", Icono: Building2 },
  { id: "plomeria", etiqueta: "Plomería", Icono: Wrench },
  { id: "veterinaria", etiqueta: "Veterinaria", Icono: PawPrint },
  { id: "mudanzas", etiqueta: "Mudanzas", Icono: Truck },
]

export function obtenerBotonIcono(iconoId: string | undefined): BotonIconoMeta | undefined {
  return BOTON_ICONOS.find((i) => i.id === iconoId)
}

// ============================================================================
// Texturas prediseñadas para el fondo del botón — patrones CSS puros (sin
// imágenes, sin subida) en blanco translúcido a bajo alfa: se apoyan
// encima de `colorFondo` (el color elegido por el dueño), así funcionan
// sobre cualquier color sin generar un asset por combinación.
// ============================================================================
export interface BotonTexturaMeta {
  id: string
  etiqueta: string
  backgroundImage?: string
  backgroundSize?: string
}

export const BOTON_TEXTURAS: BotonTexturaMeta[] = [
  { id: "ninguna", etiqueta: "Ninguna" },
  {
    id: "puntos",
    etiqueta: "Puntos",
    backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1.5px, transparent 1.5px)",
    backgroundSize: "12px 12px",
  },
  {
    id: "rayas",
    etiqueta: "Rayas",
    backgroundImage:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 6px, transparent 6px, transparent 14px)",
  },
  {
    id: "cuadricula",
    etiqueta: "Cuadrícula",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
    backgroundSize: "14px 14px",
  },
  {
    id: "diagonales",
    etiqueta: "Diagonales",
    backgroundImage:
      "repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.16) 3px, transparent 3px, transparent 12px)",
  },
  {
    id: "ondas",
    etiqueta: "Ondas",
    backgroundImage:
      "repeating-radial-gradient(circle at 0 0, transparent 0, rgba(255,255,255,0.14) 8px, transparent 16px)",
    backgroundSize: "32px 32px",
  },
]

export function obtenerBotonTextura(texturaId: string | undefined): BotonTexturaMeta | undefined {
  if (!texturaId || texturaId === "ninguna") return undefined
  return BOTON_TEXTURAS.find((t) => t.id === texturaId)
}

// ============================================================================
// Link de WhatsApp — mismo criterio de "solo dígitos" que ya usa TarjetaCard
// para el botón de contacto (wa.me exige el número sin +/espacios/guiones).
// ============================================================================
function soloDigitos(valor: string) {
  return valor.replace(/[^\d]/g, "")
}

export function construirUrlWhatsapp(numero: string, mensaje: string): string {
  const digitos = soloDigitos(numero)
  const texto = mensaje.trim()
  return texto ? `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}` : `https://wa.me/${digitos}`
}

// ============================================================================
// Orden de secciones opcionales (servicios/agenda/productos/botones) — ver
// IdentidadVisual.ordenSecciones. `ordenSeccionesNormalizado` es tolerante
// hacia adelante: una tarjeta que ya guardó un orden ANTES de que existiera
// "botones" simplemente lo agrega al final en vez de perderlo/romper.
// ============================================================================
export interface SeccionOrdenableMeta {
  id: SeccionOrdenable
  etiqueta: string
}

export const SECCIONES_ORDENABLES: SeccionOrdenableMeta[] = [
  { id: "servicios", etiqueta: "Servicios" },
  { id: "agenda", etiqueta: "Agenda" },
  { id: "productos", etiqueta: "Productos" },
  { id: "botones", etiqueta: "Botones" },
]

export const ORDEN_SECCIONES_DEFAULT: SeccionOrdenable[] = ["servicios", "agenda", "productos", "botones"]

export function ordenSeccionesNormalizado(orden?: SeccionOrdenable[]): SeccionOrdenable[] {
  if (!orden || orden.length === 0) return ORDEN_SECCIONES_DEFAULT
  const conocidas = orden.filter((id) => ORDEN_SECCIONES_DEFAULT.includes(id))
  const faltantes = ORDEN_SECCIONES_DEFAULT.filter((id) => !conocidas.includes(id))
  return [...conocidas, ...faltantes]
}
