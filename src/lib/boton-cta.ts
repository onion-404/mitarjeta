import {
  Award,
  Beef,
  BookOpen,
  Beer,
  Briefcase,
  Building2,
  Cake,
  Calendar,
  Camera,
  Car,
  ChefHat,
  Coffee,
  CupSoda,
  Download,
  Dumbbell,
  Fish,
  Gavel,
  Gift,
  GraduationCap,
  Hammer,
  HardHat,
  Heart,
  Home,
  IceCreamCone,
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
  Pizza,
  Play,
  Salad,
  Sandwich,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Soup,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Ticket,
  Truck,
  Utensils,
  Video,
  Wine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"

import type {
  Boton,
  BotonArchivo,
  BotonCatalogo,
  BotonCta,
  ContactoOrdenable,
  DatosContacto,
  IdentidadVisual,
  SeccionOrdenable,
} from "@/lib/types"

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
  // Gastronomía/comercio — pedido explícito del cliente para cubrir más
  // rubros de negocio (restaurantes, bares, cafeterías, tiendas). Sin
  // ícono de "taco" literal (no existe en lucide-react, se comprobó contra
  // el export completo del paquete) — Sandwich es el más cercano
  // disponible para comida envuelta/de mano en general.
  { id: "cubiertos", etiqueta: "Restaurante", Icono: Utensils },
  { id: "taco", etiqueta: "Comida rápida", Icono: Sandwich },
  { id: "bebida", etiqueta: "Bebida", Icono: CupSoda },
  { id: "carne", etiqueta: "Carnicería/parrilla", Icono: Beef },
  { id: "pizza", etiqueta: "Pizzería", Icono: Pizza },
  { id: "sopa", etiqueta: "Sopas/caldos", Icono: Soup },
  { id: "ensalada", etiqueta: "Comida saludable", Icono: Salad },
  { id: "helado", etiqueta: "Heladería", Icono: IceCreamCone },
  { id: "pastel", etiqueta: "Pastelería", Icono: Cake },
  { id: "pescado", etiqueta: "Pescadería/mariscos", Icono: Fish },
  { id: "cerveza", etiqueta: "Bar/cervecería", Icono: Beer },
  { id: "vino", etiqueta: "Vinería", Icono: Wine },
  { id: "carrito", etiqueta: "Compras", Icono: ShoppingCart },
  { id: "tienda-fisica", etiqueta: "Tienda física", Icono: Store },
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
  {
    id: "lineas",
    etiqueta: "Líneas verticales",
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 3px, transparent 3px, transparent 11px)",
  },
  {
    id: "cruzado",
    etiqueta: "Cruzado",
    backgroundImage:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px, transparent 10px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px, transparent 10px)",
  },
  {
    id: "circulos",
    etiqueta: "Círculos",
    backgroundImage:
      "radial-gradient(circle, transparent 55%, rgba(255,255,255,0.18) 56%, rgba(255,255,255,0.18) 62%, transparent 63%)",
    backgroundSize: "22px 22px",
  },
  {
    id: "cuadros",
    etiqueta: "Cuadros",
    backgroundImage:
      "conic-gradient(rgba(255,255,255,0.14) 90deg, transparent 90deg 180deg, rgba(255,255,255,0.14) 180deg 270deg, transparent 270deg)",
    backgroundSize: "20px 20px",
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
  { id: "agenda", etiqueta: "Agenda" },
  { id: "botones", etiqueta: "Botones" },
]

export const ORDEN_SECCIONES_DEFAULT: SeccionOrdenable[] = ["agenda", "botones"]

/** Tolerante hacia adelante Y hacia atrás: un `ordenSecciones` viejo que
 *  todavía mencione "servicios"/"productos" (de antes de la unificación de
 *  Botones, 2026-08-09) simplemente los descarta acá (ya no están en
 *  `ORDEN_SECCIONES_DEFAULT`) — su función hoy es leerse crudo desde
 *  `normalizarBotones()` para decidir el orden relativo de los botones
 *  migrados, no a través de esta función. */
export function ordenSeccionesNormalizado(orden?: SeccionOrdenable[]): SeccionOrdenable[] {
  if (!orden || orden.length === 0) return ORDEN_SECCIONES_DEFAULT
  const conocidas = orden.filter((id) => ORDEN_SECCIONES_DEFAULT.includes(id))
  const faltantes = ORDEN_SECCIONES_DEFAULT.filter((id) => !conocidas.includes(id))
  return [...conocidas, ...faltantes]
}

// ============================================================================
// Orden de los pills de "Datos de contacto" (2026-08-10) — a diferencia de
// SeccionOrdenable (que mueve secciones ENTERAS entre sí), esto reordena los
// 4 pills fijos DENTRO de esa sección, que en sí misma no se mueve.
// ============================================================================
export interface ContactoOrdenableMeta {
  id: ContactoOrdenable
  etiqueta: string
}

export const CONTACTO_ORDENABLES: ContactoOrdenableMeta[] = [
  { id: "telefono", etiqueta: "Llamar" },
  { id: "whatsapp", etiqueta: "WhatsApp" },
  { id: "email", etiqueta: "Email" },
  { id: "ubicacion", etiqueta: "Cómo llegar" },
]

export const ORDEN_CONTACTO_DEFAULT: ContactoOrdenable[] = ["telefono", "whatsapp", "email", "ubicacion"]

export function ordenContactoNormalizado(orden?: ContactoOrdenable[]): ContactoOrdenable[] {
  if (!orden || orden.length === 0) return ORDEN_CONTACTO_DEFAULT
  const conocidos = orden.filter((id) => ORDEN_CONTACTO_DEFAULT.includes(id))
  const faltantes = ORDEN_CONTACTO_DEFAULT.filter((id) => !conocidos.includes(id))
  return [...conocidos, ...faltantes]
}

// ============================================================================
// Unificación de Botones/Servicios/Productos (2026-08-09) — normalizarBotones
// es la ÚNICA fuente de verdad de "cómo se ve una tarjeta vieja como lista de
// botones", reusada tal cual tanto por el editor (tarjeta-form.tsx, sumando
// encima los campos propios de edición) como por el render público
// (tarjeta-card.tsx) — así ambos NUNCA pueden divergir en qué significa el
// contenido legacy de una tarjeta. Nunca escribe nada, solo lee.
// ============================================================================

/** IDs deliberadamente determinísticos (no `crypto.randomUUID()`) para los
 *  botones armados a partir de contenido legacy — un id aleatorio en cada
 *  render rompería la memoización/keys de React entre renders sucesivos. */
const ID_BROCHURE_MIGRADO = "migrado-brochure"
const idSeccionServiciosMigrada = (indice: number) => `migrado-servicios-${indice}`
const ID_PRODUCTOS_MIGRADO = "migrado-productos"

export function normalizarBotones(datosContacto: DatosContacto, identidadVisual: IdentidadVisual): Boton[] {
  const botonesPlanos: Boton[] = (datosContacto.botones ?? []).map((boton) =>
    "tipo" in boton ? boton : { ...(boton as BotonCta), tipo: "enlace" as const }
  )

  // Servicios — mismo fallback legacy que ya existía (seccionesServicios
  // guardado, o si no, una sección armada desde `servicios`/`tituloServicios`).
  const seccionesServicios = datosContacto.seccionesServicios?.length
    ? datosContacto.seccionesServicios
    : datosContacto.servicios?.length || identidadVisual.tituloServicios
      ? [
          {
            titulo: identidadVisual.tituloServicios ?? "",
            items: (datosContacto.servicios ?? []).map((servicio) => ({
              titulo: servicio.titulo,
              descripcion: servicio.descripcion,
            })),
          },
        ]
      : []

  const catalogosMigrados: BotonCatalogo[] = []
  seccionesServicios.forEach((seccion, indice) => {
    if (!seccion.items.length && !seccion.titulo.trim()) return
    catalogosMigrados.push({
      id: idSeccionServiciosMigrada(indice),
      tipo: "catalogo",
      titulo: seccion.titulo.trim() || (indice === 0 ? "Servicios" : `Sección ${indice + 1}`),
      vista: "grid2",
      items: seccion.items,
    })
  })

  if (datosContacto.productos?.length) {
    catalogosMigrados.push({
      id: ID_PRODUCTOS_MIGRADO,
      tipo: "catalogo",
      titulo: identidadVisual.tituloProductos?.trim() || "Productos",
      vista: "grid2",
      items: datosContacto.productos,
    })
  }

  const archivosMigrados: BotonArchivo[] = identidadVisual.brochureUrl
    ? [
        {
          id: ID_BROCHURE_MIGRADO,
          tipo: "archivo",
          titulo: "Folleto",
          iconoTipo: "icono",
          iconoId: "descarga",
          archivoUrl: identidadVisual.brochureUrl,
        },
      ]
    : []

  const migrados: Boton[] = [...catalogosMigrados, ...archivosMigrados]
  if (!migrados.length) return botonesPlanos

  // Orden relativo: si la tarjeta ya tenía un `ordenSecciones` guardado
  // (de antes de la unificación, puede seguir mencionando "servicios"/
  // "productos" aunque el tipo actual ya no los liste) y ese orden ponía
  // "botones" ANTES de "servicios"/"productos", los botones planos van
  // primero; en cualquier otro caso (sin orden guardado, o el legacy los
  // tenía en el orden de siempre) los catálogos/archivo migrados van
  // primero — mismo orden fijo que la tarjeta ya mostraba de siempre.
  const ordenGuardado = (identidadVisual.ordenSecciones as unknown as string[] | undefined) ?? []
  const indiceBotones = ordenGuardado.indexOf("botones")
  const indiceServiciosOProductos = Math.min(
    ...["servicios", "productos"].map((id) => {
      const i = ordenGuardado.indexOf(id)
      return i === -1 ? Number.POSITIVE_INFINITY : i
    })
  )
  const botonesPrimero =
    indiceBotones !== -1 && indiceServiciosOProductos !== Number.POSITIVE_INFINITY && indiceBotones < indiceServiciosOProductos

  return botonesPrimero ? [...botonesPlanos, ...migrados] : [...migrados, ...botonesPlanos]
}
