"use client"

import { Accordion } from "@base-ui/react/accordion"
import { Drawer } from "@base-ui/react/drawer"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Moon,
  Move,
  Plus,
  Sun,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { AccionesTarjeta } from "@/components/tarjeta/acciones-tarjeta"
import { AgendaServicios } from "@/components/tarjeta/agenda-servicios"
import { EstadisticasTarjeta } from "@/components/tarjeta/estadisticas-tarjeta"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CandadoPlan } from "@/components/tarjeta/candado-plan"
import { CompartirTarjeta } from "@/components/tarjeta/compartir-tarjeta"
import { OpcionPersonalizacion, SwatchDivisor, SwatchForma } from "@/components/tarjeta/opcion-personalizacion"
import { PlantillasGaleria } from "@/components/tarjeta/plantillas-galeria"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"
import { ReposicionarImagen } from "@/components/tarjeta/reposicionar-imagen"
import { SelectorTipografia } from "@/components/tarjeta/selector-tipografia"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { TarjetaQr } from "@/components/tarjeta/tarjeta-qr"
import { BANNER_PRESETS } from "@/lib/banner-presets"
import {
  BOTON_ICONOS,
  BOTON_TEXTURAS,
  SECCIONES_ORDENABLES,
  normalizarBotones,
  ordenSeccionesNormalizado,
} from "@/lib/boton-cta"
import { validarCupon } from "@/lib/cupones"
import { estiloImagenPosicionada } from "@/lib/imagen-posicion"
import {
  DIVISORES_BANNER,
  FORMAS_AVATAR,
  calcularBloqueos,
  estaBloqueada,
  type Plantilla,
} from "@/lib/personalizacion"
import { PLATAFORMAS, obtenerPlataforma } from "@/lib/redes"
import { subirImagenCloudinary, validarImagen } from "@/lib/subir-imagen"
import { supabase } from "@/lib/supabase"
import { getLimiteCambioSlug, type LimiteCambioSlug } from "@/lib/tarjetas"
import { cn } from "@/lib/utils"
import type {
  AvatarForma,
  Boton,
  BotonHijo,
  BotonTipo,
  CatalogoVista,
  Cupon,
  DatosContacto,
  DivisorBanner,
  EstiloTipografia,
  IdentidadVisual,
  PeriodicidadSuscripcion,
  Plan,
  PlataformaRed,
  RedSocial,
  SeccionOrdenable,
  ServicioAgendable,
  Tarjeta,
  TarjetaTipo,
  TemaModo,
} from "@/lib/types"

interface ProductoFormState {
  titulo: string
  descripcion: string
  precio: string
  enlaceUrl: string
  imagenFile: File | null
  imagenPreview: string
  imagenUrlExistente: string
}

/** Estado de un botón en el editor — unifica Botones/Servicios/Productos/
 *  folleto suelto (2026-08-09, ver lib/types.ts) en un solo shape plano,
 *  reemplaza `BotonCtaFormState`/`SeccionServiciosFormState`. Plano (no
 *  discriminado por `tipo`), mismo criterio que ya usaba
 *  `SeccionServiciosFormState` reusando `ProductoFormState` tal cual: evita
 *  narrowing/casteos en cada `setState`. Los campos no aplicables al `tipo`
 *  actual del botón simplemente no se leen (ver `construirBotonFinal`/
 *  `construirBotonPreview` más abajo). `hijos` NUNCA contiene un elemento
 *  con `tipo === "opciones"` (un solo nivel de anidamiento, reforzado por
 *  la UI — el selector de tipo al agregar un hijo no ofrece "Opciones") —
 *  no se modela en el tipo por la misma razón de simplicidad que el resto
 *  del shape plano. */
interface BotonFormState {
  id: string
  tipo: BotonTipo
  titulo: string
  subtitulo: string
  url: string // "enlace"
  waNumero: string // "whatsapp"
  waMensaje: string // "whatsapp"
  archivoFile: File | null // "archivo"
  archivoPreview: string // "archivo" — nombre local, no hay preview visual de un PDF
  archivoUrlExistente: string // "archivo"
  iconoTipo: "imagen" | "icono"
  iconoId: string
  imagenFile: File | null
  imagenPreview: string
  imagenUrlExistente: string
  colorFondoActivo: boolean
  colorFondo: string
  textura: string
  colorBordeActivo: boolean
  colorBorde: string
  hijos: BotonFormState[] // "opciones"
  vista: CatalogoVista // "catalogo"
  items: ProductoFormState[] // "catalogo" — reusa ProductoFormState tal cual
  /** Colapsado por defecto si viene de datos ya guardados; un botón
   *  agregado en la sesión actual arranca expandido (ver crearBotonNuevo
   *  más abajo, dentro del componente). */
  expandido: boolean
}

/** Direcciona un botón dentro del array top-level o, si `indiceHijo` está
 *  presente, un hijo de un botón "opciones" — un solo nivel de anidamiento,
 *  igual que el modelo de datos. Reusada tanto por el CRUD del editor como
 *  por el payload de guardado (misma generalización del patrón de clave
 *  compuesta que ya usaba `imagenesServicioItemPorClave`). */
interface UbicacionBoton {
  indice: number
  indiceHijo?: number
}

function claveBoton(ubicacion: UbicacionBoton): string {
  return ubicacion.indiceHijo === undefined ? `${ubicacion.indice}` : `${ubicacion.indice}.${ubicacion.indiceHijo}`
}

function claveItemCatalogo(ubicacion: UbicacionBoton, indiceItem: number): string {
  return `${claveBoton(ubicacion)}.${indiceItem}`
}

const ETIQUETA_TIPO_BOTON: Record<BotonTipo, string> = {
  enlace: "Enlace",
  whatsapp: "WhatsApp",
  opciones: "Opciones",
  catalogo: "Catálogo",
  archivo: "Archivo",
}

/** Convierte un `Boton` ya normalizado (`normalizarBotones()`, ver
 *  lib/boton-cta.ts, que resuelve TODA la compatibilidad legacy) al estado
 *  de edición — inversa de `construirBotonFinal`/`construirBotonPreview`
 *  más abajo. Recursivo para los hijos de "opciones", adapta los ítems de
 *  "catalogo" reusando `ProductoFormState`. Función pura (sin closures
 *  sobre el componente) — no necesita `colorBotones`/`whatsapp` porque solo
 *  adapta contenido YA guardado, nunca crea uno nuevo (ver crearBotonNuevo,
 *  adentro del componente, para eso). */
function adaptarBotonFormState(boton: Boton | BotonHijo, expandido: boolean): BotonFormState {
  return {
    id: boton.id,
    tipo: boton.tipo,
    titulo: boton.titulo,
    subtitulo: boton.subtitulo ?? "",
    url: boton.tipo === "enlace" ? boton.url : "",
    waNumero: boton.tipo === "whatsapp" ? boton.waNumero : "",
    waMensaje: boton.tipo === "whatsapp" ? (boton.waMensaje ?? "") : "",
    archivoFile: null,
    archivoPreview: "",
    archivoUrlExistente: boton.tipo === "archivo" ? boton.archivoUrl : "",
    iconoTipo: boton.iconoTipo ?? "icono",
    iconoId: boton.iconoId ?? BOTON_ICONOS[0].id,
    imagenFile: null,
    imagenPreview: "",
    imagenUrlExistente: boton.imagenUrl ?? "",
    colorFondoActivo: Boolean(boton.colorFondo),
    colorFondo: boton.colorFondo ?? "#6366f1",
    textura: boton.textura ?? "ninguna",
    colorBordeActivo: Boolean(boton.colorBorde),
    colorBorde: boton.colorBorde ?? "#18181b",
    hijos: boton.tipo === "opciones" ? boton.hijos.map((hijo) => adaptarBotonFormState(hijo, false)) : [],
    vista: boton.tipo === "catalogo" ? boton.vista : "grid2",
    items:
      boton.tipo === "catalogo"
        ? boton.items.map((item) => ({
            titulo: item.titulo,
            descripcion: item.descripcion ?? "",
            precio: item.precio ?? "",
            enlaceUrl: item.enlaceUrl ?? "",
            imagenFile: null,
            imagenPreview: "",
            imagenUrlExistente: item.imagenUrl ?? "",
          }))
        : [],
    expandido,
  }
}

/** Vista previa en vivo (sin subir nada todavía) de UN botón — recursiva,
 *  usa `imagenPreview`/`archivoFile` locales en vez de URLs de Cloudinary.
 *  Análoga a `construirBotonFinal` (ver el payload de guardado más abajo)
 *  pero sin Maps/índices: no necesita direccionar nada porque no hay
 *  subida real que resolver, solo lee cada botón/ítem tal cual está en el
 *  momento. */
function construirBotonPreview(boton: BotonFormState): Boton {
  const base = {
    id: boton.id,
    titulo: boton.titulo,
    subtitulo: boton.subtitulo || undefined,
    iconoTipo: boton.iconoTipo,
    imagenUrl: boton.iconoTipo === "imagen" ? boton.imagenPreview || boton.imagenUrlExistente || undefined : undefined,
    iconoId: boton.iconoTipo === "icono" ? boton.iconoId : undefined,
    colorFondo: boton.colorFondoActivo ? boton.colorFondo : undefined,
    textura: boton.textura !== "ninguna" ? boton.textura : undefined,
    colorBorde: boton.colorBordeActivo ? boton.colorBorde : undefined,
  }
  if (boton.tipo === "enlace") return { ...base, tipo: "enlace", url: boton.url }
  if (boton.tipo === "whatsapp")
    return { ...base, tipo: "whatsapp", waNumero: boton.waNumero, waMensaje: boton.waMensaje || undefined }
  if (boton.tipo === "archivo")
    return { ...base, tipo: "archivo", archivoUrl: boton.archivoUrlExistente || (boton.archivoFile ? "#" : "") }
  if (boton.tipo === "catalogo")
    return {
      ...base,
      tipo: "catalogo",
      vista: boton.vista,
      items: boton.items
        .filter((item) => item.titulo.trim())
        .map((item) => ({
          titulo: item.titulo,
          descripcion: item.descripcion || undefined,
          precio: item.precio || undefined,
          enlaceUrl: item.enlaceUrl || undefined,
          imagenUrl: item.imagenPreview || item.imagenUrlExistente || undefined,
        })),
    }
  return {
    ...base,
    tipo: "opciones",
    hijos: boton.hijos.filter((hijo) => hijo.titulo.trim()).map((hijo) => construirBotonPreview(hijo) as BotonHijo),
  }
}

function moverEnArray<T>(lista: T[], index: number, direccion: -1 | 1): T[] {
  const destino = index + direccion
  if (destino < 0 || destino >= lista.length) return lista
  const copia = [...lista]
  ;[copia[index], copia[destino]] = [copia[destino], copia[index]]
  return copia
}

const TOPE_BOTONES = 8
const TOPE_HIJOS_OPCIONES = 6
const TOPE_ITEMS_CATALOGO = 12

interface OpcionTipoBoton {
  tipo: BotonTipo
  etiqueta: string
  disponible: boolean
  /** Plan que desbloquea esta opción — solo se muestra el candado si
   *  `!disponible`. Ausente = sin restricción de plan (enlace/whatsapp/
   *  opciones). */
  plan?: "alcance" | "poder"
}

/** Fila de pills para elegir el tipo al agregar un botón — reusada tanto
 *  para el nivel superior (5 tipos) como para hijos de un botón "opciones"
 *  (4 tipos, sin "opciones" — un solo nivel de anidamiento). Componente sin
 *  estado propio, no necesita closures del formulario. */
function SelectorTipoBoton({
  opciones,
  onElegir,
}: {
  opciones: OpcionTipoBoton[]
  onElegir: (tipo: BotonTipo) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((opcion) => (
        <button
          key={opcion.tipo}
          type="button"
          disabled={!opcion.disponible}
          onClick={() => onElegir(opcion.tipo)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <Plus className="size-3.5" /> {opcion.etiqueta}
          {!opcion.disponible && opcion.plan && <CandadoPlan plan={opcion.plan} />}
        </button>
      ))}
    </div>
  )
}

const inputClase =
  "w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none backdrop-blur transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/60"
const labelClase = "text-sm font-medium text-foreground"
const panelClase =
  "rounded-3xl border border-black/5 bg-white/70 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50 overflow-hidden"
const triggerClase =
  "group flex w-full items-center justify-between gap-2 px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors duration-200 ease-out data-panel-open:bg-[var(--acento-bg)]"
const panelInnerClase =
  "h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"
const tabMovilClase =
  "shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
const drawerBackdropClase =
  "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60"
const drawerViewportClase = "fixed inset-0 z-50 flex items-end justify-center"
const drawerPopupClase =
  "w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-background pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-out [transform:translateY(var(--drawer-swipe-movement-y))] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]"

function redesValidas(redes: RedSocial[]) {
  return redes.filter((red) => {
    if (red.plataforma === "personalizado") return red.url.trim().length > 0
    return red.url.trim().length > obtenerPlataforma(red.plataforma).prefijo.length
  })
}

/** Corta un valor a un máximo de líneas (dirección/horarios: hasta 3) —
 *  se aplica en el propio onChange, así el límite es imposible de superar
 *  tecleando en vez de solo avisar después. */
function limitarLineas(valor: string, maxLineas: number) {
  return valor.split("\n").slice(0, maxLineas).join("\n")
}

const TAMANO_MAXIMO_ARCHIVO_MB = 5
const TAMANO_MAXIMO_ARCHIVO = TAMANO_MAXIMO_ARCHIVO_MB * 1024 * 1024

/** Valida tipo y peso antes de aceptar el folleto PDF. */
function validarPdf(file: File): string | null {
  if (file.type !== "application/pdf") {
    return `"${file.name}" debe ser un PDF.`
  }
  if (file.size > TAMANO_MAXIMO_ARCHIVO) {
    return `"${file.name}" pesa más de ${TAMANO_MAXIMO_ARCHIVO_MB}MB. Elegí un PDF más liviano.`
  }
  return null
}

/** Traduce el error de un UPDATE de `tarjetas` a un mensaje legible — el
 *  trigger `fn_validar_limite_cambio_slug` (ver migración
 *  20260801000000_add_tarjeta_slug_historial.sql) rechaza el UPDATE entero
 *  con una excepción de Postgres si ya se agotó el límite de 2 cambios de
 *  enlace cada 14 días; esto solo debería disparar en una carrera real
 *  (dos pestañas guardando casi al mismo tiempo) ya que el cliente ya
 *  valida esto antes de intentar guardar (ver slugLimiteAlcanzado). */
function mensajeErrorGuardadoSlug(error: { message?: string } | null): string {
  if (error?.message?.includes("limite_cambio_slug_alcanzado")) {
    return "Alcanzaste el límite de 2 cambios de enlace cada 14 días. Probá de nuevo más tarde."
  }
  return "No pudimos guardar los cambios. Probá de nuevo en unos segundos."
}

interface TarjetaFormProps {
  /** Si se pasa, el formulario opera en modo edición (UPDATE en vez de INSERT). */
  tarjeta?: Tarjeta
  /** Plan elegido en /planes — requerido en modo creación (ver /crear/page.tsx). */
  plan?: Plan
  /** Ciclo de facturación elegido en /planes — requerido en modo creación. */
  periodicidad?: PeriodicidadSuscripcion
  /** Plan REAL de la tarjeta en modo edición (distinto de `plan`, que en
   *  edición es sobre una suscripción pendiente/abandonada) — fuente del
   *  gating de personalización avanzada. Null si nunca pagó. */
  planActivo?: Plan | null
  /** Código de cupón que llegó por query param (?cupon=...) desde el botón
   *  "Obtener mi descuento" del home, a través de /planes → /crear (y del
   *  redirectTo de login si hizo falta). Se pre-llena Y se valida de
   *  verdad (fn_cupon_es_valido) — no se asume aplicado solo por venir en
   *  la URL, puede haberse agotado/vencido para cuando la persona llega acá. */
  cuponInicial?: string
}

export function TarjetaForm({
  tarjeta,
  plan,
  periodicidad = "anual",
  planActivo,
  cuponInicial,
}: TarjetaFormProps) {
  const esEdicion = Boolean(tarjeta)
  // Una tarjeta existente puede no tener plan activo todavía: se creó, se
  // llegó a Stripe, pero el pago se canceló o abandonó antes de completarse
  // (plan_id sigue null). Ese caso necesita seguir mostrando "Tu plan" para
  // poder reintentar el pago — no es lo mismo que edición normal, aunque
  // `esEdicion` sea true en ambos casos. `esEdicion` sigue controlando cosas
  // que no dependen del plan (ej. Agenda, enlace personalizado no editable);
  // `mostrarSeccionPago` es específicamente sobre mostrar/ocultar "Tu plan".
  const tienePlanActivo = Boolean(tarjeta?.plan_id)
  const mostrarSeccionPago = !tienePlanActivo
  const datosIniciales = tarjeta?.datos_contacto
  const visualInicial = tarjeta?.identidad_visual

  // Tipo único de tarjeta (ver lib/types.ts): la columna `tipo` en DB sigue
  // existiendo (no se migra), pero el editor ya no ofrece elegirla — toda
  // tarjeta nueva se guarda como "personal". Se mantiene el estado (nunca se
  // vuelve a llamar `setTipo`) solo para no romper el payload de guardado ni
  // el valor ya guardado de tarjetas viejas.
  const [tipo] = React.useState<TarjetaTipo>(tarjeta?.tipo ?? "personal")

  // Título / Rol o descripción / Bio (antes "Nombre completo"/"Empresa"/
  // "Puesto o profesión") — con fallback a los campos legacy de
  // "empresarial" (nombreEmpresa/giro/telefonoCorporativo) para que una
  // tarjeta empresarial ya existente abra el editor con su contenido
  // pre-cargado en los campos nuevos, sin perder nada. Se escribe solo en
  // los campos nuevos al guardar — los legacy quedan @deprecated en
  // lib/types.ts, no se borran de tarjetas no regrabadas.
  const [nombre, setNombre] = React.useState(
    datosIniciales?.nombre ?? datosIniciales?.nombreEmpresa ?? ""
  )
  const [empresa, setEmpresa] = React.useState(
    datosIniciales?.empresa ?? datosIniciales?.giro ?? ""
  )
  const [puesto, setPuesto] = React.useState(datosIniciales?.puesto ?? "")
  const [telefono, setTelefono] = React.useState(
    datosIniciales?.telefono ?? datosIniciales?.telefonoCorporativo ?? ""
  )
  const [whatsapp, setWhatsapp] = React.useState(datosIniciales?.whatsapp ?? "")
  const [email, setEmail] = React.useState(datosIniciales?.email ?? "")
  const [horarios, setHorarios] = React.useState(datosIniciales?.horarios ?? "")

  // Común
  const [direccion, setDireccion] = React.useState(datosIniciales?.direccion ?? "")
  const [direccionMapsUrl, setDireccionMapsUrl] = React.useState(
    datosIniciales?.direccionMapsUrl ?? ""
  )
  const [videoUrl, setVideoUrl] = React.useState(datosIniciales?.videoUrl ?? "")
  const [redes, setRedes] = React.useState<RedSocial[]>(datosIniciales?.redes ?? [])

  // Botones — unifica Botones/Servicios/Productos/folleto suelto en un solo
  // sistema de 5 tipos (2026-08-09, ver lib/types.ts). `normalizarBotones()`
  // (lib/boton-cta.ts) resuelve TODA la compatibilidad legacy (botones
  // planos sin `tipo`, secciones de Servicios, Productos, folleto PDF
  // suelto) en memoria — nunca escribe hasta el próximo guardado, así
  // ninguna tarjeta pierde contenido por no haber sido regrabada. Cada
  // botón normalizado se adapta acá sumando los campos propios del editor
  // (File/preview/expandido) — colapsado por defecto porque viene de datos
  // YA guardados (uno agregado en esta sesión arranca expandido, ver
  // crearBotonNuevo más abajo).
  const [botones, setBotones] = React.useState<BotonFormState[]>(() =>
    normalizarBotones(datosIniciales ?? {}, visualInicial ?? {}).map((boton) =>
      adaptarBotonFormState(boton, false)
    )
  )

  const [colorPrimario, setColorPrimario] = React.useState(
    visualInicial?.colorPrimario ?? "#6366f1"
  )
  const [colorSecundario, setColorSecundario] = React.useState(
    visualInicial?.colorSecundario ?? "#a855f7"
  )
  const [temaModo, setTemaModo] = React.useState<TemaModo>(
    visualInicial?.temaModo ?? "claro"
  )
  const [avatarForma, setAvatarForma] = React.useState<AvatarForma>(
    visualInicial?.avatarForma ?? "circulo"
  )
  const [estiloTipografia, setEstiloTipografia] = React.useState<EstiloTipografia>(
    visualInicial?.estiloTipografia ?? "moderna"
  )
  // Color/tamaño/peso del título — defaults calzan con el look fijo de
  // siempre (auto-contraste / 20px / 600) para que una tarjeta sin estos
  // campos seteados se vea exactamente igual que antes de esta feature.
  const [colorTitulo, setColorTitulo] = React.useState(visualInicial?.colorTitulo ?? "")
  const [tituloTamano, setTituloTamano] = React.useState(visualInicial?.tituloTamano ?? 20)
  const [tituloPeso, setTituloPeso] = React.useState(visualInicial?.tituloPeso ?? 600)
  // Color de la línea "Rol o descripción" (empresa) — mismo criterio que
  // colorTitulo: vacío = auto-contraste.
  const [colorTextoSecundario, setColorTextoSecundario] = React.useState(
    visualInicial?.colorTextoSecundario ?? ""
  )

  // Ícono del badge "@enlace" — opcional, con el mismo set curado que los
  // botones CTA (BOTON_ICONOS). Activo por defecto (compatibilidad: toda
  // tarjeta vieja se veía siempre con Sparkles puesto).
  const [badgeIconoActivo, setBadgeIconoActivo] = React.useState(
    visualInicial?.badgeIconoActivo ?? true
  )
  const [badgeIconoId, setBadgeIconoId] = React.useState(visualInicial?.badgeIconoId ?? "sparkles")

  // --- Personalización avanzada (gating por plan, ver lib/personalizacion.ts) ---
  const [colorBotones, setColorBotones] = React.useState(
    visualInicial?.colorBotones ?? visualInicial?.colorPrimario ?? "#6366f1"
  )
  const [colorBadges, setColorBadges] = React.useState(
    visualInicial?.colorBadges ?? visualInicial?.colorSecundario ?? "#a855f7"
  )
  const [modoColorAvanzado, setModoColorAvanzado] = React.useState(
    visualInicial?.modoColorAvanzado ?? false
  )
  const [colorTextoBotones, setColorTextoBotones] = React.useState(
    visualInicial?.colorTextoBotones ?? "#ffffff"
  )
  const [colorTextoBadges, setColorTextoBadges] = React.useState(
    visualInicial?.colorTextoBadges ?? "#ffffff"
  )
  const [colorTextoGeneral, setColorTextoGeneral] = React.useState(
    visualInicial?.colorTextoGeneral ?? "#18181b"
  )
  const [modoTipografiaAvanzado, setModoTipografiaAvanzado] = React.useState(
    visualInicial?.modoTipografiaAvanzado ?? false
  )
  const [estiloTipografiaCuerpo, setEstiloTipografiaCuerpo] = React.useState<EstiloTipografia>(
    visualInicial?.estiloTipografiaCuerpo ?? "moderna"
  )
  const [divisorBanner, setDivisorBanner] = React.useState<DivisorBanner>(
    visualInicial?.divisorBanner ?? "recta"
  )
  const [glassmorfismo, setGlassmorfismo] = React.useState(visualInicial?.glassmorfismo ?? false)
  const [plantillaBase, setPlantillaBase] = React.useState<string | null>(
    visualInicial?.plantillaBase ?? null
  )

  // Fondo de la tarjeta (panel de contenido) — separado a propósito del
  // fondo del banner (colorPrimario/colorSecundario, arriba). "Activo" es un
  // toggle explícito (no basta con mirar si fondoTarjetaColor tiene valor:
  // un <input type="color"> siempre tiene algún valor, nunca está "vacío").
  const [fondoTarjetaActivo, setFondoTarjetaActivo] = React.useState(
    Boolean(visualInicial?.fondoTarjetaColor)
  )
  const [fondoTarjetaModo, setFondoTarjetaModo] = React.useState<"simple" | "avanzado">(
    visualInicial?.fondoTarjetaModo ?? "simple"
  )
  const [fondoTarjetaColor, setFondoTarjetaColor] = React.useState(
    visualInicial?.fondoTarjetaColor ?? "#ffffff"
  )
  const [fondoTarjetaColorSecundario, setFondoTarjetaColorSecundario] = React.useState(
    visualInicial?.fondoTarjetaColorSecundario ?? "#f4f4f5"
  )
  const [fondoTarjetaTipoDegradado, setFondoTarjetaTipoDegradado] = React.useState<
    "lineal" | "radial"
  >(visualInicial?.fondoTarjetaTipoDegradado ?? "lineal")
  const [fondoTarjetaDireccionGrados, setFondoTarjetaDireccionGrados] = React.useState(
    visualInicial?.fondoTarjetaDireccionGrados ?? 135
  )

  // Orden de aparición de Agenda/Botones en la tarjeta pública — el dueño
  // lo reordena con flechas ↑/↓ (ver contenidoOrdenSecciones más abajo).
  // Normalizado siempre: una tarjeta vieja sin este campo (o con un valor
  // legacy que mencione "servicios"/"productos", de antes de la
  // unificación de Botones) arranca en el orden fijo de siempre.
  const [ordenSecciones, setOrdenSecciones] = React.useState<SeccionOrdenable[]>(() =>
    ordenSeccionesNormalizado(visualInicial?.ordenSecciones)
  )

  function moverSeccion(index: number, direccion: -1 | 1) {
    setOrdenSecciones((prev) => {
      const destino = index + direccion
      if (destino < 0 || destino >= prev.length) return prev
      const copia = [...prev]
      ;[copia[index], copia[destino]] = [copia[destino], copia[index]]
      return copia
    })
  }

  // Fail-closed: sin plan confirmado (ni el elegido al crear, ni uno activo
  // en edición), el gating queda en el nivel más restrictivo — mismo
  // criterio que el resto del gating por plan del proyecto.
  const featuresGating = esEdicion ? planActivo?.features : plan?.features
  const featuresPersonalizacion = {
    personalizacion_libre: Boolean(featuresGating?.personalizacion_libre),
    personalizacion_avanzada: Boolean(featuresGating?.personalizacion_avanzada),
  }

  function aplicarPlantilla(plantilla: Plantilla) {
    const v = plantilla.valores
    if (v.colorPrimario !== undefined) setColorPrimario(v.colorPrimario)
    if (v.colorSecundario !== undefined) setColorSecundario(v.colorSecundario)
    if (v.colorBotones !== undefined) setColorBotones(v.colorBotones)
    if (v.colorBadges !== undefined) setColorBadges(v.colorBadges)
    if (v.modoColorAvanzado !== undefined) setModoColorAvanzado(v.modoColorAvanzado)
    if (v.colorTextoBotones !== undefined) setColorTextoBotones(v.colorTextoBotones)
    if (v.colorTextoBadges !== undefined) setColorTextoBadges(v.colorTextoBadges)
    if (v.avatarForma !== undefined) setAvatarForma(v.avatarForma)
    if (v.divisorBanner !== undefined) setDivisorBanner(v.divisorBanner)
    if (v.glassmorfismo !== undefined) setGlassmorfismo(v.glassmorfismo)
    if (v.estiloTipografia !== undefined) setEstiloTipografia(v.estiloTipografia)
    if (v.temaModo !== undefined) setTemaModo(v.temaModo)
    if (v.bannerPreset !== undefined) setBannerPresetId(v.bannerPreset)
    setPlantillaBase(plantilla.id)
  }

  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState("")
  const [avatarUrlExistente, setAvatarUrlExistente] = React.useState(
    visualInicial?.avatarUrl ?? ""
  )
  const [avatarInputKey, setAvatarInputKey] = React.useState(0)
  // Ancla de reposicionamiento + zoom del avatar (mismo mecanismo que
  // banner/fondoImagen abajo) — reemplaza el recorte destructivo que hacía
  // RecortarAvatar: la foto se sube completa (sin recortar a cuadrado) y se
  // encuadra por CSS, así se puede reabrir "Reposicionar" en cualquier
  // momento sin volver a elegir el archivo. Sin gating (nunca fue paga).
  const [avatarPosicion, setAvatarPosicion] = React.useState(
    visualInicial?.avatarPosicion ?? { x: 50, y: 50 }
  )
  const [reposicionandoAvatar, setReposicionandoAvatar] = React.useState(false)

  const [bannerFile, setBannerFile] = React.useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = React.useState("")
  const [bannerUrlExistente, setBannerUrlExistente] = React.useState(
    visualInicial?.bannerUrl ?? ""
  )
  const [bannerPresetId, setBannerPresetId] = React.useState<string | undefined>(
    visualInicial?.bannerUrl ? undefined : (visualInicial?.bannerPreset ?? "aurora")
  )
  const [bannerInputKey, setBannerInputKey] = React.useState(0)
  const [bannerPosicion, setBannerPosicion] = React.useState(
    visualInicial?.bannerPosicion ?? { x: 50, y: 50 }
  )
  const [reposicionandoBanner, setReposicionandoBanner] = React.useState(false)
  const [bannerAltura, setBannerAltura] = React.useState(visualInicial?.bannerAltura ?? 192)

  // Imagen de fondo de TODA la tarjeta (banner + detrás del panel) —
  // mutuamente excluyente con el banner de color/preset/upload de arriba y
  // con "Fondo de la tarjeta" de abajo (gating: personalizacion_avanzada,
  // ver lib/personalizacion.ts).
  const [fondoImagenFile, setFondoImagenFile] = React.useState<File | null>(null)
  const [fondoImagenPreview, setFondoImagenPreview] = React.useState("")
  const [fondoImagenUrlExistente, setFondoImagenUrlExistente] = React.useState(
    visualInicial?.fondoImagenUrl ?? ""
  )
  const [fondoImagenInputKey, setFondoImagenInputKey] = React.useState(0)
  const [fondoImagenPosicion, setFondoImagenPosicion] = React.useState(
    visualInicial?.fondoImagenPosicion ?? { x: 50, y: 50 }
  )
  const [reposicionandoFondoImagen, setReposicionandoFondoImagen] = React.useState(false)
  const fondoImagenAbortRef = React.useRef<AbortController | null>(null)

  const avatarAbortRef = React.useRef<AbortController | null>(null)
  const bannerAbortRef = React.useRef<AbortController | null>(null)
  const previewRef = React.useRef<HTMLDivElement>(null)

  function scrollPreviewTo(campo: string) {
    if (typeof window !== "undefined" && window.innerWidth < 1024) return
    const elemento = previewRef.current?.querySelector(`[data-campo="${campo}"]`)
    elemento?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [guardadoOk, setGuardadoOk] = React.useState(false)
  /** Breve estado visual (check verde) que se muestra en el botón justo
   * después de guardar con éxito, antes de redirigir o abrir el modal. */
  const [guardadoExito, setGuardadoExito] = React.useState(false)
  const [toast, setToast] = React.useState<{
    tipo: "advertencia" | "error" | "exito"
    mensaje: string
  } | null>(null)

  function mostrarToast(tipo: "advertencia" | "error" | "exito", mensaje: string) {
    setToast({ tipo, mensaje })
    window.setTimeout(() => {
      setToast((actual) => (actual?.mensaje === mensaje ? null : actual))
    }, 5000)
  }

  function mostrarErrorArchivo(mensaje: string) {
    mostrarToast("advertencia", mensaje)
  }

  // Enlace personalizado — obligatorio al crear, y editable siempre (con
  // límite de 2 cambios cada 14 días, ver limiteSlug más abajo).
  const [slugPersonalizado, setSlugPersonalizado] = React.useState(tarjeta?.slug ?? "")
  // El slug realmente persistido, según esta sesión del editor — arranca
  // igual al prop `tarjeta.slug`, pero se actualiza tras un guardado
  // exitoso que lo cambió. Se usa en vez del prop (que queda stale hasta el
  // próximo load de la página) para no confundir "guardé un cambio" con
  // "tengo un cambio sin guardar" en un segundo guardado consecutivo.
  const [slugGuardado, setSlugGuardado] = React.useState(tarjeta?.slug ?? "")
  // Último slug efectivamente consultado y su disponibilidad. `verificandoSlug`
  // y `slugDisponible` se derivan de esto comparando contra el valor actual
  // del input, en vez de guardarse aparte (evita setState síncrono en el
  // efecto de chequeo).
  const [resultadoSlug, setResultadoSlug] = React.useState<{
    slug: string
    disponible: boolean
  } | null>(null)
  // Cuántos cambios de enlace le quedan a la tarjeta en la ventana móvil de
  // 14 días — solo aplica en edición (crear no consume el límite, ver
  // lib/tarjetas.ts). null mientras carga o en modo creación.
  const [limiteSlug, setLimiteSlug] = React.useState<LimiteCambioSlug | null>(null)

  React.useEffect(() => {
    if (!esEdicion || !tarjeta) return
    let cancelado = false
    getLimiteCambioSlug(tarjeta.id).then((limite) => {
      if (!cancelado) setLimiteSlug(limite)
    })
    return () => {
      cancelado = true
    }
  }, [esEdicion, tarjeta])
  const [vista, setVista] = React.useState<"editar" | "ver">("editar")

  // Tab/drawer móvil (patrón Linktree): id de la sección abierta, o null.
  const [tabMovilAbierto, setTabMovilAbierto] = React.useState<string | null>(null)
  const [agendaServiciosPreview, setAgendaServiciosPreview] = React.useState<ServicioAgendable[]>(
    []
  )
  const onAgendaServiciosChange = React.useCallback(
    (activos: ServicioAgendable[]) => setAgendaServiciosPreview(activos),
    []
  )

  // Cupón de descuento para la suscripción (solo al crear) — la validación
  // real y la combinación con el descuento de tarjeta adicional pasa en
  // POST /api/suscripciones; acá solo se usa para el preview de precio.
  const [cuponInput, setCuponInput] = React.useState("")
  const [cuponValidado, setCuponValidado] = React.useState<Cupon | null>(null)
  const [cuponError, setCuponError] = React.useState<string | null>(null)
  const [validandoCupon, setValidandoCupon] = React.useState(false)

  // Chequeo de disponibilidad del enlace personalizado, con debounce de
  // 500ms — corre tanto al crear como al editar (el enlace ya es editable
  // siempre, ver CLAUDE.md). En edición, si el valor no cambió respecto al
  // slug ya guardado de la tarjeta, se marca disponible sin consultar nada
  // (es el que ya tiene).
  React.useEffect(() => {
    const slug = slugPersonalizado.trim()
    if (slug.length < 4) return

    // Diferido con setTimeout aunque el caso "ya es el mío" no necesite
    // debounce real — llamar setState de forma síncrona en el cuerpo del
    // efecto dispara renders en cascada (regla react-hooks/set-state-in-effect),
    // mismo mecanismo ya usado en otros efectos de este archivo.
    if (esEdicion && tarjeta && slug === slugGuardado) {
      const timeoutId = window.setTimeout(() => setResultadoSlug({ slug, disponible: true }), 0)
      return () => window.clearTimeout(timeoutId)
    }

    const timeoutId = window.setTimeout(async () => {
      let consulta = supabase.from("tarjetas").select("slug").eq("slug", slug)
      // Excluye la propia tarjeta — sin esto, después de guardar un cambio
      // de slug con éxito (el prop `tarjeta` sigue con el valor viejo hasta
      // el próximo load), la consulta se encontraría a sí misma y marcaría
      // su propio enlace nuevo como "ya en uso".
      if (esEdicion && tarjeta) consulta = consulta.neq("id", tarjeta.id)
      const { data, error } = await consulta.maybeSingle()

      // Si falló la consulta (red, etc.) no bloqueamos: la unicidad real se
      // valida igual al guardar, atrapando el error 23505 de Postgres.
      if (error) return
      setResultadoSlug({ slug, disponible: !data })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [slugPersonalizado, esEdicion, tarjeta, slugGuardado])

  // Vuelta desde el Checkout hosteado de Stripe (success_url/cancel_url):
  // `back_url` de Mercado Pago no distinguía éxito de cancelación, esto sí
  // — un toast simple alcanza, la confirmación real de estado la hace el
  // webhook. Se limpia el query param para que no vuelva a disparar en un
  // refresh.
  React.useEffect(() => {
    if (!esEdicion) return
    const params = new URLSearchParams(window.location.search)
    const resultado = params.get("stripe")
    if (!resultado) return

    window.history.replaceState(null, "", window.location.pathname)

    // Diferido: llamar setState de forma síncrona dentro de un efecto
    // dispara renders en cascada (regla react-hooks/set-state-in-effect) —
    // mismo mecanismo (setTimeout) que ya usa mostrarToast para el auto-dismiss.
    window.setTimeout(() => {
      if (resultado === "exito") {
        mostrarToast(
          "exito",
          "¡Listo! Estamos confirmando tu suscripción — puede tardar unos segundos en reflejarse."
        )
      } else if (resultado === "cancelado") {
        mostrarToast("advertencia", "Cancelaste el pago. Podés intentarlo de nuevo cuando quieras.")
      }
    }, 0)
  }, [esEdicion])

  React.useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  React.useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    }
  }, [bannerPreview])

  function agregarRed() {
    setRedes((prev) =>
      prev.length >= 5 ? prev : [...prev, { plataforma: "instagram", label: "", url: "" }]
    )
  }

  function actualizarRedPlataforma(index: number, plataforma: PlataformaRed) {
    setRedes((prev) =>
      prev.map((red, i) => (i === index ? { plataforma, label: "", url: "" } : red))
    )
  }

  function actualizarRedValor(index: number, valor: string) {
    setRedes((prev) =>
      prev.map((red, i) => {
        if (i !== index) return red
        if (red.plataforma === "personalizado") return { ...red, url: valor }
        return { ...red, url: obtenerPlataforma(red.plataforma).prefijo + valor }
      })
    )
  }

  function actualizarRedLabel(index: number, label: string) {
    setRedes((prev) => prev.map((red, i) => (i === index ? { ...red, label } : red)))
  }

  function quitarRed(index: number) {
    setRedes((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleValidarCupon() {
    if (!cuponInput.trim()) return
    setValidandoCupon(true)
    setCuponError(null)
    const cupon = await validarCupon(cuponInput)
    setValidandoCupon(false)
    if (!cupon) {
      setCuponValidado(null)
      setCuponError("Ese código no es válido o ya no está activo.")
      return
    }
    setCuponValidado(cupon)
  }

  function quitarCupon() {
    setCuponValidado(null)
    setCuponInput("")
    setCuponError(null)
  }

  // Pre-llenado desde ?cupon=... (botón "Obtener mi descuento" del home,
  // ver CLAUDE.md) — se muestra YA aplicado, no como si la persona tuviera
  // que reingresarlo, pero de todas formas pasa por fn_cupon_es_valido():
  // puede haberse agotado o vencido entre que lo "guardó" en el home y que
  // llega hasta acá.
  React.useEffect(() => {
    if (esEdicion || !cuponInicial?.trim()) return
    const codigo = cuponInicial.trim()
    // Diferido: setState síncrono dentro de un efecto dispara renders en
    // cascada (regla react-hooks/set-state-in-effect) — mismo mecanismo
    // que ya usa mostrarToast en este archivo.
    window.setTimeout(() => {
      setCuponInput(codigo)
      setValidandoCupon(true)
      setCuponError(null)
    }, 0)
    validarCupon(codigo).then((cupon) => {
      setValidandoCupon(false)
      if (!cupon) {
        setCuponError("Ese código no es válido o ya no está activo.")
        return
      }
      setCuponValidado(cupon)
    })
  }, [esEdicion, cuponInicial])

  // Tope de botones tipo "catalogo" según el plan REAL de la tarjeta (mismo
  // criterio fail-closed que featuresGating de arriba) — nunca por debajo de
  // lo ya guardado (mismo principio que calcularBloqueos: bajar de plan no
  // rompe/oculta contenido ya creado, solo bloquea agregar uno más). Cuenta
  // tanto los de nivel superior como los anidados dentro de un botón
  // "opciones" — la regla de negocio no distingue nivel.
  function contarCatalogos(lista: BotonFormState[]): number {
    return lista.reduce(
      (total, boton) =>
        total +
        (boton.tipo === "catalogo" ? 1 : 0) +
        (boton.tipo === "opciones" ? contarCatalogos(boton.hijos) : 0),
      0
    )
  }
  const catalogosActuales = contarCatalogos(botones)
  const catalogoMaxPlan = Math.max(Number(featuresGating?.secciones_servicios_max) || 1, catalogosActuales)
  const catalogoBloqueado = catalogosActuales >= catalogoMaxPlan
  // Mismo criterio que usaba el "Agregar otra sección de servicios" de
  // antes: bloqueado con 1 ya guardado pide Alcance, con 2 pide Poder.
  const catalogoPlanNecesario: "alcance" | "poder" = catalogosActuales <= 1 ? "alcance" : "poder"

  // "Archivo" es exclusivo del plan Poder (reusa el flag ya existente de
  // personalización avanzada en vez de sumar uno nuevo) — mismo criterio
  // fail-open sobre lo ya guardado: bajar de plan nunca oculta/rompe un
  // botón archivo ya guardado, solo bloquea AGREGAR uno nuevo.
  function hayArchivo(lista: BotonFormState[]): boolean {
    return lista.some(
      (boton) => boton.tipo === "archivo" || (boton.tipo === "opciones" && hayArchivo(boton.hijos))
    )
  }
  const archivoDisponible = featuresPersonalizacion.personalizacion_avanzada || hayArchivo(botones)

  // --- Botones — CRUD unificado (enlace/whatsapp/opciones/catalogo/archivo) --

  /** Botón nuevo con valores por defecto — a diferencia de
   *  `adaptarBotonFormState` (que adapta contenido YA guardado), esta SÍ
   *  necesita closures sobre el componente (`colorBotones`/`whatsapp`).
   *  Arranca `expandido: true`: se acaba de agregar en esta sesión, tiene
   *  sentido verlo abierto para completarlo sin un click extra. */
  function crearBotonNuevo(tipo: BotonTipo): BotonFormState {
    return {
      id: crypto.randomUUID(),
      tipo,
      titulo: "",
      subtitulo: "",
      url: "",
      waNumero: whatsapp || "",
      waMensaje: "",
      archivoFile: null,
      archivoPreview: "",
      archivoUrlExistente: "",
      iconoTipo: "icono",
      iconoId: tipo === "archivo" ? "descarga" : BOTON_ICONOS[0].id,
      imagenFile: null,
      imagenPreview: "",
      imagenUrlExistente: "",
      colorFondoActivo: false,
      colorFondo: colorBotones,
      textura: "ninguna",
      colorBordeActivo: false,
      colorBorde: "#18181b",
      hijos: [],
      vista: "grid2",
      items: [],
      expandido: true,
    }
  }

  function agregarBoton(tipo: BotonTipo) {
    if (botones.length >= TOPE_BOTONES) return
    if (tipo === "catalogo" && catalogoBloqueado) return
    if (tipo === "archivo" && !archivoDisponible) return
    setBotones((prev) => [...prev, crearBotonNuevo(tipo)])
  }

  function agregarBotonHijo(indicePadre: number, tipo: Exclude<BotonTipo, "opciones">) {
    if (tipo === "catalogo" && catalogoBloqueado) return
    if (tipo === "archivo" && !archivoDisponible) return
    setBotones((prev) =>
      prev.map((boton, i) => {
        if (i !== indicePadre || boton.tipo !== "opciones") return boton
        if (boton.hijos.length >= TOPE_HIJOS_OPCIONES) return boton
        return { ...boton, hijos: [...boton.hijos, crearBotonNuevo(tipo)] }
      })
    )
  }

  /** Aplica `fn` al botón en `ubicacion` (top-level o hijo de "opciones") —
   *  base de todas las actualizaciones/subidas de imagen/archivo, evita
   *  repetir el branching top-level/hijo en cada función. */
  function actualizarEnUbicacion(
    lista: BotonFormState[],
    ubicacion: UbicacionBoton,
    fn: (boton: BotonFormState) => BotonFormState
  ): BotonFormState[] {
    return lista.map((boton, i) => {
      if (i !== ubicacion.indice) return boton
      if (ubicacion.indiceHijo === undefined) return fn(boton)
      return { ...boton, hijos: boton.hijos.map((hijo, j) => (j === ubicacion.indiceHijo ? fn(hijo) : hijo)) }
    })
  }

  function actualizarBotonEn<K extends keyof BotonFormState>(
    ubicacion: UbicacionBoton,
    campo: K,
    valor: BotonFormState[K]
  ) {
    setBotones((prev) => actualizarEnUbicacion(prev, ubicacion, (boton) => ({ ...boton, [campo]: valor })))
  }

  function moverBotonEn(ubicacion: UbicacionBoton, direccion: -1 | 1) {
    setBotones((prev) => {
      if (ubicacion.indiceHijo === undefined) return moverEnArray(prev, ubicacion.indice, direccion)
      return prev.map((boton, i) =>
        i !== ubicacion.indice || boton.tipo !== "opciones"
          ? boton
          : { ...boton, hijos: moverEnArray(boton.hijos, ubicacion.indiceHijo!, direccion) }
      )
    })
  }

  /** Revoca cualquier preview local (imagen propia, ítems de catálogo,
   *  hijos de "opciones") antes de descartar un botón — recursivo porque
   *  un "opciones" puede tener hijos con sus propias imágenes/ítems. */
  function revocarPreviewsBoton(boton: BotonFormState) {
    if (boton.imagenPreview) URL.revokeObjectURL(boton.imagenPreview)
    boton.items.forEach((item) => {
      if (item.imagenPreview) URL.revokeObjectURL(item.imagenPreview)
    })
    boton.hijos.forEach(revocarPreviewsBoton)
  }

  function quitarBotonEn(ubicacion: UbicacionBoton) {
    setBotones((prev) => {
      if (ubicacion.indiceHijo === undefined) {
        const actual = prev[ubicacion.indice]
        if (actual) revocarPreviewsBoton(actual)
        return prev.filter((_, i) => i !== ubicacion.indice)
      }
      return prev.map((boton, i) => {
        if (i !== ubicacion.indice || boton.tipo !== "opciones") return boton
        const hijo = boton.hijos[ubicacion.indiceHijo!]
        if (hijo) revocarPreviewsBoton(hijo)
        return { ...boton, hijos: boton.hijos.filter((_, j) => j !== ubicacion.indiceHijo) }
      })
    })
  }

  function handleBotonImagenChange(ubicacion: UbicacionBoton, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const error = validarImagen(file)
    if (error) {
      mostrarErrorArchivo(error)
      event.target.value = ""
      return
    }
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => {
        if (boton.imagenPreview) URL.revokeObjectURL(boton.imagenPreview)
        return { ...boton, imagenFile: file, imagenPreview: URL.createObjectURL(file), imagenUrlExistente: "" }
      })
    )
  }

  function quitarBotonImagen(ubicacion: UbicacionBoton) {
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => {
        if (boton.imagenPreview) URL.revokeObjectURL(boton.imagenPreview)
        return { ...boton, imagenFile: null, imagenPreview: "", imagenUrlExistente: "" }
      })
    )
  }

  function handleBotonArchivoChange(ubicacion: UbicacionBoton, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const error = validarPdf(file)
    if (error) {
      mostrarErrorArchivo(error)
      event.target.value = ""
      return
    }
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => ({
        ...boton,
        archivoFile: file,
        archivoPreview: file.name,
        archivoUrlExistente: "",
      }))
    )
  }

  function quitarBotonArchivo(ubicacion: UbicacionBoton) {
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => ({
        ...boton,
        archivoFile: null,
        archivoPreview: "",
        archivoUrlExistente: "",
      }))
    )
  }

  function agregarItemCatalogo(ubicacion: UbicacionBoton) {
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => {
        if (boton.items.length >= TOPE_ITEMS_CATALOGO) return boton
        return {
          ...boton,
          items: [
            ...boton.items,
            {
              titulo: "",
              descripcion: "",
              precio: "",
              enlaceUrl: "",
              imagenFile: null,
              imagenPreview: "",
              imagenUrlExistente: "",
            },
          ],
        }
      })
    )
  }

  function actualizarItemCatalogo<K extends keyof ProductoFormState>(
    ubicacion: UbicacionBoton,
    indiceItem: number,
    campo: K,
    valor: ProductoFormState[K]
  ) {
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => ({
        ...boton,
        items: boton.items.map((item, j) => (j === indiceItem ? { ...item, [campo]: valor } : item)),
      }))
    )
  }

  function handleItemCatalogoImagenChange(
    ubicacion: UbicacionBoton,
    indiceItem: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    if (!file) return
    const error = validarImagen(file)
    if (error) {
      mostrarErrorArchivo(error)
      event.target.value = ""
      return
    }
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => ({
        ...boton,
        items: boton.items.map((item, j) => {
          if (j !== indiceItem) return item
          if (item.imagenPreview) URL.revokeObjectURL(item.imagenPreview)
          return { ...item, imagenFile: file, imagenPreview: URL.createObjectURL(file), imagenUrlExistente: "" }
        }),
      }))
    )
  }

  function quitarItemCatalogoImagen(ubicacion: UbicacionBoton, indiceItem: number) {
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => ({
        ...boton,
        items: boton.items.map((item, j) => {
          if (j !== indiceItem) return item
          if (item.imagenPreview) URL.revokeObjectURL(item.imagenPreview)
          return { ...item, imagenFile: null, imagenPreview: "", imagenUrlExistente: "" }
        }),
      }))
    )
  }

  function quitarItemCatalogo(ubicacion: UbicacionBoton, indiceItem: number) {
    setBotones((prev) =>
      actualizarEnUbicacion(prev, ubicacion, (boton) => {
        const item = boton.items[indiceItem]
        if (item?.imagenPreview) URL.revokeObjectURL(item.imagenPreview)
        return { ...boton, items: boton.items.filter((_, j) => j !== indiceItem) }
      })
    )
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const error = validarImagen(file)
    if (error) {
      mostrarErrorArchivo(error)
      event.target.value = ""
      return
    }
    setAvatarFile(file)
    setAvatarUrlExistente("")
    // Reinicia el encuadre para la foto nueva — el de la foto anterior no
    // tiene por qué seguir siendo el correcto.
    setAvatarPosicion({ x: 50, y: 50 })
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    // Abre el diálogo de encuadre apenas se elige el archivo — mismo
    // momento en el que antes aparecía el recorte destructivo, pero ahora
    // reabrible después con el botón "Reposicionar" (ver más abajo).
    setReposicionandoAvatar(true)
  }

  function quitarAvatar() {
    avatarAbortRef.current?.abort()
    avatarAbortRef.current = null
    setAvatarFile(null)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setAvatarUrlExistente("")
    setAvatarInputKey((k) => k + 1)
  }

  function handleBannerFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const error = validarImagen(file)
    if (error) {
      mostrarErrorArchivo(error)
      event.target.value = ""
      return
    }
    setBannerFile(file)
    setBannerPresetId(undefined)
    setBannerUrlExistente("")
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  function elegirPreset(id: string) {
    bannerAbortRef.current?.abort()
    bannerAbortRef.current = null
    setBannerPresetId(id)
    setBannerFile(null)
    setBannerUrlExistente("")
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setBannerInputKey((k) => k + 1)
  }

  function quitarBanner() {
    bannerAbortRef.current?.abort()
    bannerAbortRef.current = null
    setBannerFile(null)
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setBannerUrlExistente("")
    setBannerPresetId(undefined)
    setBannerInputKey((k) => k + 1)
  }

  function handleFondoImagenFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const error = validarImagen(file)
    if (error) {
      mostrarErrorArchivo(error)
      event.target.value = ""
      return
    }
    setFondoImagenFile(file)
    setFondoImagenUrlExistente("")
    setFondoImagenPosicion({ x: 50, y: 50 })
    setFondoImagenPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  function quitarFondoImagen() {
    fondoImagenAbortRef.current?.abort()
    fondoImagenAbortRef.current = null
    setFondoImagenFile(null)
    setFondoImagenPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setFondoImagenUrlExistente("")
    setFondoImagenInputKey((k) => k + 1)
  }

  async function handleGuardar(event: React.SubmitEvent) {
    event.preventDefault()
    if (!nombre.trim()) {
      setSaveError("Ingresá un título para continuar.")
      return
    }

    // El enlace es obligatorio siempre (editable en cualquier modo, ver
    // CLAUDE.md) — en edición viene pre-llenado con el actual, así que solo
    // se topa con esto si lo borró a mano.
    {
      const slugElegido = slugPersonalizado.trim()
      if (!slugElegido) {
        setSaveError("Elegí un enlace personalizado para continuar.")
        return
      }
      if (slugElegido.length < 4) {
        setSaveError("El enlace debe tener al menos 4 caracteres.")
        return
      }
      if (esEdicion && slugCambio) {
        if (slugDisponible === false) {
          setSaveError("Ese enlace ya está en uso. Elegí otro para continuar.")
          return
        }
        if (slugLimiteAlcanzado) {
          setSaveError(
            limiteSlug?.proximaLiberacion
              ? `Alcanzaste el límite de 2 cambios de enlace cada 14 días. Podés volver a cambiarlo el ${new Date(
                  limiteSlug.proximaLiberacion
                ).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}.`
              : "Alcanzaste el límite de 2 cambios de enlace cada 14 días."
          )
          return
        }
      }
    }

    setSaving(true)
    setSaveError(null)
    setGuardadoOk(false)
    setGuardadoExito(false)

    let avatarUrl: string | undefined = avatarUrlExistente || undefined
    let bannerUrl: string | undefined = bannerUrlExistente || undefined
    let fondoImagenUrlFinal: string | undefined = fondoImagenUrlExistente || undefined
    const imagenesBotonPorRuta = new Map<string, string>()
    const archivosBotonPorRuta = new Map<string, string>()
    const imagenesCatalogoItemPorClave = new Map<string, string>()

    type TareaSubida =
      | { tipo: "avatar"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "banner"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "fondoImagen"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "botonImagen"; ruta: UbicacionBoton; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "botonArchivo"; ruta: UbicacionBoton; etiqueta: string; promesa: Promise<string | null> }
      | {
          tipo: "catalogoItem"
          ruta: UbicacionBoton
          indiceItem: number
          etiqueta: string
          promesa: Promise<string | null>
        }

    const tareas: TareaSubida[] = []

    if (avatarFile) {
      avatarAbortRef.current = new AbortController()
      tareas.push({
        tipo: "avatar",
        etiqueta: "la foto",
        promesa: subirImagenCloudinary(
          avatarFile,
          "mitarjeta/avatars",
          avatarAbortRef.current.signal
        ).catch(() => null),
      })
    }

    if (bannerFile) {
      bannerAbortRef.current = new AbortController()
      tareas.push({
        tipo: "banner",
        etiqueta: "el banner",
        promesa: subirImagenCloudinary(
          bannerFile,
          "mitarjeta/banners",
          bannerAbortRef.current.signal
        ).catch(() => null),
      })
    }

    if (fondoImagenFile) {
      fondoImagenAbortRef.current = new AbortController()
      tareas.push({
        tipo: "fondoImagen",
        etiqueta: "la imagen de fondo",
        promesa: subirImagenCloudinary(
          fondoImagenFile,
          "mitarjeta/fondos",
          fondoImagenAbortRef.current.signal
        ).catch(() => null),
      })
    }

    // Recorre TODOS los botones (top-level + hijos de "opciones") empujando
    // tareas de imagen/archivo/ítems de catálogo, direccionadas por su
    // UbicacionBoton — mismo patrón de clave compuesta que ya usaba
    // `imagenesServicioItemPorClave`, generalizado a hasta 2 niveles. Si el
    // botón no tiene título se descarta entero en `construirBotonFinal` más
    // abajo (junto con sus hijos/ítems), así que ni vale la pena subir nada
    // para él.
    function recolectarTareasBoton(boton: BotonFormState, ubicacion: UbicacionBoton) {
      if (!boton.titulo.trim()) return
      if (boton.iconoTipo === "imagen" && boton.imagenFile) {
        tareas.push({
          tipo: "botonImagen",
          ruta: ubicacion,
          etiqueta: `la imagen de "${boton.titulo.trim()}"`,
          promesa: subirImagenCloudinary(boton.imagenFile, "mitarjeta/botones").catch(() => null),
        })
      }
      if (boton.tipo === "archivo" && boton.archivoFile) {
        tareas.push({
          tipo: "botonArchivo",
          ruta: ubicacion,
          etiqueta: `el archivo de "${boton.titulo.trim()}"`,
          promesa: subirImagenCloudinary(boton.archivoFile, "mitarjeta/brochures", undefined, "raw").catch(
            () => null
          ),
        })
      }
      if (boton.tipo === "catalogo") {
        boton.items.forEach((item, indiceItem) => {
          if (item.titulo.trim() && item.imagenFile) {
            tareas.push({
              tipo: "catalogoItem",
              ruta: ubicacion,
              indiceItem,
              etiqueta: `la imagen de "${item.titulo.trim()}"`,
              promesa: subirImagenCloudinary(item.imagenFile, "mitarjeta/productos").catch(() => null),
            })
          }
        })
      }
      if (boton.tipo === "opciones") {
        boton.hijos.forEach((hijo, indiceHijo) =>
          recolectarTareasBoton(hijo, { indice: ubicacion.indice, indiceHijo })
        )
      }
    }
    botones.forEach((boton, indice) => recolectarTareasBoton(boton, { indice }))

    // Todas las subidas (avatar, banner, imagen de fondo y las de cada
    // botón/ítem de catálogo/archivo) se disparan en paralelo en vez de
    // esperarse una por una: en una conexión móvil esto reduce el tiempo de
    // guardado a una fracción del secuencial.
    const resultados =
      tareas.length > 0 ? await Promise.all(tareas.map((tarea) => tarea.promesa)) : []

    avatarAbortRef.current = null
    bannerAbortRef.current = null
    fondoImagenAbortRef.current = null

    const fallidas: string[] = []
    tareas.forEach((tarea, i) => {
      const url = resultados[i]
      if (!url) {
        fallidas.push(tarea.etiqueta)
        return
      }
      if (tarea.tipo === "avatar") avatarUrl = url
      else if (tarea.tipo === "banner") bannerUrl = url
      else if (tarea.tipo === "fondoImagen") fondoImagenUrlFinal = url
      else if (tarea.tipo === "botonImagen") imagenesBotonPorRuta.set(claveBoton(tarea.ruta), url)
      else if (tarea.tipo === "botonArchivo") archivosBotonPorRuta.set(claveBoton(tarea.ruta), url)
      else imagenesCatalogoItemPorClave.set(claveItemCatalogo(tarea.ruta, tarea.indiceItem), url)
    })

    if (fallidas.length > 0) {
      setSaveError(
        fallidas.length === 1
          ? `No pudimos subir ${fallidas[0]}. Probá de nuevo.`
          : `No pudimos subir ${fallidas.length} archivos (${fallidas.join(", ")}). Probá de nuevo.`
      )
      setSaving(false)
      return
    }

    const redesFinales = redesValidas(redes)

    /** Arma el `Boton` final de UNO — recursivo para los hijos de
     *  "opciones" (mismo criterio de filtro `titulo.trim()` e índice
     *  ORIGINAL antes de filtrar que ya usaba `productosFinales`/
     *  `botonesFinales` antes de la unificación). Closure sobre los 3 Maps
     *  de arriba (recién poblados con las URLs subidas). */
    function construirBotonFinal(boton: BotonFormState, ubicacion: UbicacionBoton): Boton {
      const base = {
        id: boton.id,
        titulo: boton.titulo.trim(),
        subtitulo: boton.subtitulo.trim() || undefined,
        iconoTipo: boton.iconoTipo,
        imagenUrl:
          boton.iconoTipo === "imagen"
            ? (imagenesBotonPorRuta.get(claveBoton(ubicacion)) ?? (boton.imagenUrlExistente || undefined))
            : undefined,
        iconoId: boton.iconoTipo === "icono" ? boton.iconoId : undefined,
        colorFondo: boton.colorFondoActivo ? boton.colorFondo : undefined,
        textura: boton.textura !== "ninguna" ? boton.textura : undefined,
        colorBorde: boton.colorBordeActivo ? boton.colorBorde : undefined,
      }
      if (boton.tipo === "enlace") return { ...base, tipo: "enlace", url: boton.url.trim() }
      if (boton.tipo === "whatsapp")
        return {
          ...base,
          tipo: "whatsapp",
          waNumero: boton.waNumero.trim(),
          waMensaje: boton.waMensaje.trim() || undefined,
        }
      if (boton.tipo === "archivo")
        return {
          ...base,
          tipo: "archivo",
          archivoUrl: archivosBotonPorRuta.get(claveBoton(ubicacion)) ?? boton.archivoUrlExistente ?? "",
        }
      if (boton.tipo === "catalogo")
        return {
          ...base,
          tipo: "catalogo",
          vista: boton.vista,
          items: boton.items
            .map((item, indiceItem) => ({ item, indiceItem }))
            .filter(({ item }) => item.titulo.trim())
            .map(({ item, indiceItem }) => ({
              titulo: item.titulo.trim(),
              descripcion: item.descripcion.trim() || undefined,
              precio: item.precio.trim() || undefined,
              enlaceUrl: item.enlaceUrl.trim() || undefined,
              imagenUrl:
                imagenesCatalogoItemPorClave.get(claveItemCatalogo(ubicacion, indiceItem)) ??
                item.imagenUrlExistente ??
                undefined,
            })),
        }
      // "opciones"
      return {
        ...base,
        tipo: "opciones",
        hijos: boton.hijos
          .map((hijo, indiceHijo) => ({ hijo, indiceHijo }))
          .filter(({ hijo }) => hijo.titulo.trim())
          .map(
            ({ hijo, indiceHijo }) =>
              construirBotonFinal(hijo, { indice: ubicacion.indice, indiceHijo }) as BotonHijo
          ),
      }
    }

    const botonesFinales: Boton[] = botones
      .map((boton, indice) => ({ boton, indice }))
      .filter(({ boton }) => boton.titulo.trim())
      .map(({ boton, indice }) => construirBotonFinal(boton, { indice }))

    const datos_contacto: DatosContacto = {
      direccion: direccion.trim() || undefined,
      direccionMapsUrl: direccionMapsUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      redes: redesFinales,
      botones: botonesFinales,
      nombre: nombre.trim(),
      empresa: empresa.trim() || undefined,
      puesto: puesto.trim() || undefined,
      telefono: telefono.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      email: email.trim() || undefined,
      horarios: horarios.trim() || undefined,
    }

    const identidad_visual: IdentidadVisual = {
      colorPrimario,
      colorSecundario,
      avatarUrl,
      avatarPosicion,
      bannerUrl,
      bannerPreset: bannerUrl ? undefined : bannerPresetId,
      temaModo,
      avatarForma,
      estiloTipografia,
      colorTitulo: colorTitulo || undefined,
      tituloTamano: tituloTamano !== 20 ? tituloTamano : undefined,
      tituloPeso: tituloPeso !== 600 ? tituloPeso : undefined,
      colorBotones,
      colorBadges,
      modoColorAvanzado,
      colorTextoBotones: modoColorAvanzado ? colorTextoBotones : undefined,
      colorTextoBadges: modoColorAvanzado ? colorTextoBadges : undefined,
      colorTextoGeneral: modoColorAvanzado ? colorTextoGeneral : undefined,
      modoTipografiaAvanzado,
      estiloTipografiaCuerpo: modoTipografiaAvanzado ? estiloTipografiaCuerpo : undefined,
      divisorBanner,
      glassmorfismo,
      plantillaBase,
      bannerPosicion,
      bannerAltura: bannerAltura !== 192 ? bannerAltura : undefined,
      fondoImagenUrl: fondoImagenUrlFinal,
      fondoImagenPosicion: fondoImagenUrlFinal ? fondoImagenPosicion : undefined,
      fondoTarjetaModo: fondoTarjetaActivo ? fondoTarjetaModo : undefined,
      fondoTarjetaColor: fondoTarjetaActivo ? fondoTarjetaColor : undefined,
      fondoTarjetaColorSecundario:
        fondoTarjetaActivo && fondoTarjetaModo === "avanzado" ? fondoTarjetaColorSecundario : undefined,
      fondoTarjetaTipoDegradado:
        fondoTarjetaActivo && fondoTarjetaModo === "avanzado" ? fondoTarjetaTipoDegradado : undefined,
      fondoTarjetaDireccionGrados:
        fondoTarjetaActivo && fondoTarjetaModo === "avanzado" && fondoTarjetaTipoDegradado === "lineal"
          ? fondoTarjetaDireccionGrados
          : undefined,
      colorTextoSecundario: colorTextoSecundario || undefined,
      ordenSecciones,
      badgeIconoActivo,
      badgeIconoId: badgeIconoActivo ? badgeIconoId : undefined,
    }

    if (bloqueosGuardado.length > 0) {
      setSaveError(
        "Hay cambios que requieren un plan superior — revertilos o actualizá tu plan para guardar."
      )
      setSaving(false)
      return
    }

    if (esEdicion && tarjeta && tienePlanActivo) {
      const { error } = await supabase
        .from("tarjetas")
        .update({
          tipo,
          datos_contacto,
          identidad_visual,
          ...(slugCambio ? { slug: slugActualTrim } : {}),
        })
        .eq("id", tarjeta.id)

      setSaving(false)
      if (error) {
        setSaveError(mensajeErrorGuardadoSlug(error))
        return
      }
      if (slugCambio) {
        setSlugGuardado(slugActualTrim)
        setLimiteSlug((prev) =>
          prev ? { ...prev, cambiosRestantes: Math.max(0, prev.cambiosRestantes - 1) } : prev
        )
      }
      setGuardadoOk(true)
      setGuardadoExito(true)
      window.setTimeout(() => setGuardadoExito(false), 1600)
      return
    }

    if (!plan) {
      setSaveError("Falta el plan seleccionado. Volvé a /planes e intentá de nuevo.")
      setSaving(false)
      return
    }

    // La sesión se pide fresca acá (no un valor capturado al montar el
    // formulario): puede haber pasado un rato subiendo imágenes, y
    // /api/suscripciones exige un access_token vigente.
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      setSaveError("Tu sesión expiró. Recargá la página e iniciá sesión de nuevo.")
      setSaving(false)
      return
    }

    // TS no propaga el narrowing de `plan`/`session` dentro de la función
    // anidada de abajo; se capturan en consts ya confirmados no-nulos.
    const planConfirmado = plan
    const accessToken = session.access_token

    async function alGuardarConExito(data: { id: string; slug: string }) {
      const suscripcionRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tarjetaId: data.id,
          planId: planConfirmado.id,
          periodicidad,
          cuponCodigo: cuponValidado?.codigo,
        }),
      })
      const suscripcionData = (await suscripcionRes.json()) as {
        checkoutUrl?: string
        error?: string
      }

      if (suscripcionData.checkoutUrl) {
        // Un instante de confirmación visual antes de salir hacia Stripe;
        // se siente más premium que un redirect abrupto.
        setGuardadoExito(true)
        await new Promise((resolve) => window.setTimeout(resolve, 700))
        window.location.assign(suscripcionData.checkoutUrl)
        return
      }

      // Preferimos el motivo específico que ya calculó el backend (ej. el
      // precio con descuento quedó por debajo del mínimo que acepta Stripe)
      // en vez de un mensaje genérico — mismo criterio que el error de
      // cupón inválido, que tampoco es genérico.
      setSaveError(
        suscripcionData.error ??
          "Tu tarjeta se guardó, pero no pudimos iniciar la suscripción con Stripe. Volvé a intentar desde el editor."
      )
      setSaving(false)
    }

    // Tarjeta que ya existe pero sin plan activo (tienePlanActivo es false
    // acá porque el branch de arriba ya se llevó el caso "esEdicion +
    // tienePlanActivo" con su propio return): canceló o abandonó el
    // checkout de Stripe la vez anterior. UPDATE en vez de INSERT — el slug
    // y el id ya existen — y directo a reintentar el pago.
    if (esEdicion && tarjeta) {
      const { error } = await supabase
        .from("tarjetas")
        .update({
          tipo,
          datos_contacto,
          identidad_visual,
          ...(slugCambio ? { slug: slugActualTrim } : {}),
        })
        .eq("id", tarjeta.id)

      if (error) {
        setSaveError(mensajeErrorGuardadoSlug(error))
        setSaving(false)
        return
      }
      if (slugCambio) setSlugGuardado(slugActualTrim)
      await alGuardarConExito({ id: tarjeta.id, slug: slugCambio ? slugActualTrim : tarjeta.slug })
      return
    }

    const datosBase = {
      tipo,
      datos_contacto,
      identidad_visual,
      publicado: true,
      user_id: session.user.id,
    }

    const slugElegido = slugPersonalizado.trim()

    if (slugDisponible === false) {
      setSaveError("Ese enlace ya está en uso. Elegí otro para continuar.")
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from("tarjetas")
      .insert({ slug: slugElegido, ...datosBase })
      .select("id, slug")
      .single()

    if (!error && data) {
      await alGuardarConExito(data)
      return
    }

    if (error?.code === "23505") {
      // Carrera de concurrencia: alguien tomó el enlace justo entre el
      // chequeo en vivo y este guardado. Se lo marcamos como no disponible
      // para que la etiqueta bajo el input quede consistente con el toast.
      setResultadoSlug({ slug: slugElegido, disponible: false })
      mostrarToast("error", "Justo tomaron ese enlace. Elegí otro y volvé a guardar.")
      setSaving(false)
      return
    }

    setSaveError("No pudimos guardar tu tarjeta. Probá de nuevo en unos segundos.")
    setSaving(false)
  }

  const avatarMostrado = avatarPreview || avatarUrlExistente
  const bannerMostrado = bannerPreview || bannerUrlExistente
  const fondoImagenMostrado = fondoImagenPreview || fondoImagenUrlExistente

  // La vista previa refleja el contenido tal cual el dueño lo está
  // probando, aunque todavía no haya guardado (mismo criterio que el resto
  // de identidadVisualActual/colores/plantillas en vivo) — reusa
  // `construirBotonPreview` (función pura, ver arriba) en vez de repetir
  // esta transformación acá.
  const botonesActuales: Boton[] = botones
    .filter((boton) => boton.titulo.trim())
    .map((boton) => construirBotonPreview(boton))

  const datosContactoActual: DatosContacto = {
    direccion,
    direccionMapsUrl,
    videoUrl,
    redes: redesValidas(redes),
    botones: botonesActuales,
    nombre,
    empresa,
    puesto,
    telefono,
    whatsapp,
    email,
    horarios,
  }

  const identidadVisualActual: IdentidadVisual = {
    colorPrimario,
    colorSecundario,
    avatarUrl: avatarMostrado,
    avatarPosicion,
    bannerUrl: bannerMostrado,
    bannerPreset: bannerMostrado ? undefined : bannerPresetId,
    temaModo,
    avatarForma,
    estiloTipografia,
    colorTitulo: colorTitulo || undefined,
    tituloTamano: tituloTamano !== 20 ? tituloTamano : undefined,
    tituloPeso: tituloPeso !== 600 ? tituloPeso : undefined,
    colorBotones,
    colorBadges,
    modoColorAvanzado,
    colorTextoBotones: modoColorAvanzado ? colorTextoBotones : undefined,
    colorTextoBadges: modoColorAvanzado ? colorTextoBadges : undefined,
    colorTextoGeneral: modoColorAvanzado ? colorTextoGeneral : undefined,
    modoTipografiaAvanzado,
    estiloTipografiaCuerpo: modoTipografiaAvanzado ? estiloTipografiaCuerpo : undefined,
    divisorBanner,
    glassmorfismo,
    plantillaBase,
    bannerPosicion,
    bannerAltura: bannerAltura !== 192 ? bannerAltura : undefined,
    fondoImagenUrl: fondoImagenMostrado || undefined,
    fondoImagenPosicion: fondoImagenMostrado ? fondoImagenPosicion : undefined,
    fondoTarjetaModo: fondoTarjetaActivo ? fondoTarjetaModo : undefined,
    fondoTarjetaColor: fondoTarjetaActivo ? fondoTarjetaColor : undefined,
    fondoTarjetaColorSecundario:
      fondoTarjetaActivo && fondoTarjetaModo === "avanzado" ? fondoTarjetaColorSecundario : undefined,
    fondoTarjetaTipoDegradado:
      fondoTarjetaActivo && fondoTarjetaModo === "avanzado" ? fondoTarjetaTipoDegradado : undefined,
    fondoTarjetaDireccionGrados:
      fondoTarjetaActivo && fondoTarjetaModo === "avanzado" && fondoTarjetaTipoDegradado === "lineal"
        ? fondoTarjetaDireccionGrados
        : undefined,
    colorTextoSecundario: colorTextoSecundario || undefined,
    ordenSecciones,
    badgeIconoActivo,
    badgeIconoId: badgeIconoActivo ? badgeIconoId : undefined,
  }

  const bloqueosGuardado = calcularBloqueos(
    identidadVisualActual,
    visualInicial ?? null,
    featuresPersonalizacion
  )

  // Precio de vista previa nada más: la combinación real con el descuento de
  // tarjeta adicional (el mayor de los dos, no se suman — ver CLAUDE.md) se
  // calcula server-side en POST /api/suscripciones. Este valor nunca queda
  // por ARRIBA de lo que se cobra de verdad, como mucho el final es menor.
  const precioBase = plan ? (periodicidad === "anual" ? plan.precio_anual : plan.precio_mensual) : null
  const descuentoPorcentaje = cuponValidado?.porcentaje_descuento ?? 0
  const precioFinal =
    precioBase !== null
      ? Math.round(precioBase * (1 - descuentoPorcentaje / 100) * 100) / 100
      : null

  const slugActualTrim = slugPersonalizado.trim()
  const verificandoSlug = Boolean(slugActualTrim) && resultadoSlug?.slug !== slugActualTrim
  const slugDisponible = resultadoSlug?.slug === slugActualTrim ? resultadoSlug.disponible : null

  const slugMuyCorto = Boolean(slugActualTrim) && slugActualTrim.length < 4

  // En edición, el enlace solo "cambia" (y consume el límite de 2/14 días)
  // si difiere del que la tarjeta ya tiene guardado — reabrir el editor sin
  // tocarlo nunca debe bloquear el guardado del resto de los campos.
  const slugCambio = esEdicion && Boolean(tarjeta) && slugActualTrim !== slugGuardado
  const slugLimiteAlcanzado = slugCambio && limiteSlug !== null && limiteSlug.cambiosRestantes <= 0

  const slugBloqueaGuardado =
    ((!esEdicion || slugCambio) &&
      (!slugActualTrim || slugMuyCorto || verificandoSlug || slugDisponible === false)) ||
    slugLimiteAlcanzado

  const personalizacionBloqueaGuardado = bloqueosGuardado.length > 0

  const contenidoAvisoBloqueos = personalizacionBloqueaGuardado && (
    <div className="flex flex-col gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
      <p className="font-semibold">Hay cambios que necesitan un plan superior para guardarse:</p>
      <ul className="flex flex-col gap-0.5 pl-4 list-disc">
        {bloqueosGuardado.map((b) => (
          <li key={b.campo}>
            {b.campo} ({b.valorEtiqueta}) requiere el plan{" "}
            <span className="font-semibold capitalize">{b.plan}</span>
          </li>
        ))}
      </ul>
      <Link href="/planes" className="font-semibold underline underline-offset-2">
        Ver planes y actualizar
      </Link>
    </div>
  )

  // --------------------------------------------------------------------
  // Contenido de cada sección, definido una sola vez y reutilizado tanto
  // en el accordion de desktop como en los drawers móviles (mismo patrón,
  // dos contenedores: nada se duplica).
  // --------------------------------------------------------------------
  const contenidoPlantillas = (
    <PlantillasGaleria
      identidadVisual={identidadVisualActual}
      guardado={visualInicial ?? null}
      features={featuresPersonalizacion}
      onAplicar={aplicarPlantilla}
      onEmpezarDeCero={() => setPlantillaBase(null)}
    />
  )

  const bloqueoColorAvanzado = estaBloqueada(
    "avanzada",
    true,
    visualInicial?.modoColorAvanzado ?? false,
    featuresPersonalizacion
  )
  const bloqueoTipografiaAvanzada = estaBloqueada(
    "avanzada",
    true,
    visualInicial?.modoTipografiaAvanzado ?? false,
    featuresPersonalizacion
  )
  // Colores/tipografía "simple" (fondo/botones/badges, estiloTipografia) no
  // son grillas discretas de opciones — el candado se muestra de forma
  // estática mientras el plan no tenga personalizacion_libre, sin comparar
  // contra lo guardado (a diferencia de las grillas, acá alcanza con avisar
  // que la sección entera requiere Alcance).
  const bloqueoColoresSimple = !featuresPersonalizacion.personalizacion_libre
    ? ({ plan: "alcance" } as const)
    : null

  const bloqueoGlassmorfismo = estaBloqueada(
    "avanzada",
    true,
    visualInicial?.glassmorfismo ?? false,
    featuresPersonalizacion
  )

  // Fondo de la tarjeta: mismo criterio que "Colores" de arriba — simple
  // requiere Alcance, avanzado (2 colores + degradado) requiere Poder.
  const bloqueoFondoTarjetaSimple = bloqueoColoresSimple
  const bloqueoFondoTarjetaAvanzado = estaBloqueada(
    "avanzada",
    true,
    Boolean(visualInicial?.fondoTarjetaModo === "avanzado"),
    featuresPersonalizacion
  )

  // Imagen de fondo de toda la tarjeta: Poder únicamente (la feature
  // visualmente más transformadora de las 6 nuevas, mismo nivel que
  // divisores exóticos/glassmorfismo/modos avanzados).
  const bloqueoFondoImagen = estaBloqueada(
    "avanzada",
    true,
    Boolean(visualInicial?.fondoImagenUrl),
    featuresPersonalizacion
  )

  const contenidoColoresYTipografia = (
    <div className="flex flex-col gap-5 px-5 pb-5 pt-1">
      <div className="flex flex-col gap-2">
        <span className={labelClase}>Tema de la tarjeta</span>
        <div className="grid grid-cols-2 gap-2">
          {(["claro", "oscuro"] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setTemaModo(opcion)}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors duration-200 ease-out",
                temaModo === opcion
                  ? "border-foreground bg-background"
                  : "border-border bg-background/50 hover:bg-background"
              )}
            >
              {opcion === "claro" ? (
                <Sun className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Moon className="size-4 shrink-0 text-muted-foreground" />
              )}
              {opcion === "claro" ? "Claro" : "Oscuro"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={cn(labelClase, "flex items-center gap-1.5")}>
            Colores
            {bloqueoColoresSimple && <CandadoPlan plan={bloqueoColoresSimple.plan} />}
          </span>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Modo avanzado
            {bloqueoColorAvanzado && <CandadoPlan plan={bloqueoColorAvanzado.plan} />}
            <Switch checked={modoColorAvanzado} onCheckedChange={setModoColorAvanzado} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Fondo del banner</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={colorPrimario}
                onChange={(e) => setColorPrimario(e.target.value)}
                onFocus={() => scrollPreviewTo("banner")}
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
              />
              <input
                type="color"
                value={colorSecundario}
                onChange={(e) => setColorSecundario(e.target.value)}
                onFocus={() => scrollPreviewTo("banner")}
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Botones</span>
            <input
              type="color"
              value={colorBotones}
              onChange={(e) => setColorBotones(e.target.value)}
              className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Badges</span>
            <input
              type="color"
              value={colorBadges}
              onChange={(e) => setColorBadges(e.target.value)}
              className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-background/50 px-3 py-2.5">
          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Ícono en el badge del enlace (@usuario)</span>
            <Switch checked={badgeIconoActivo} onCheckedChange={setBadgeIconoActivo} />
          </label>
          {badgeIconoActivo && (
            <div className="flex flex-wrap gap-1.5">
              {BOTON_ICONOS.map(({ id, etiqueta, Icono }) => (
                <button
                  key={id}
                  type="button"
                  title={etiqueta}
                  aria-label={etiqueta}
                  onClick={() => setBadgeIconoId(id)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg border-2 transition-colors duration-200 ease-out",
                    badgeIconoId === id
                      ? "border-foreground bg-background"
                      : "border-border bg-background/50 hover:bg-background"
                  )}
                >
                  <Icono className="size-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
          <span className={cn(labelClase, "flex items-center gap-1.5 text-xs")}>
            Estilo de botones y badges
            {bloqueoGlassmorfismo && <CandadoPlan plan={bloqueoGlassmorfismo.plan} />}
          </span>
          <div className="inline-flex rounded-full border border-border bg-background p-0.5">
            {(["solido", "vidrio"] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setGlassmorfismo(opcion === "vidrio")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ease-out",
                  (opcion === "vidrio") === glassmorfismo
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opcion === "solido" ? "Sólido" : "Vidrio"}
              </button>
            ))}
          </div>
        </div>

        {modoColorAvanzado && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">Texto de botones</span>
              <input
                type="color"
                value={colorTextoBotones}
                onChange={(e) => setColorTextoBotones(e.target.value)}
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">Texto de badges</span>
              <input
                type="color"
                value={colorTextoBadges}
                onChange={(e) => setColorTextoBadges(e.target.value)}
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2 sm:col-span-2">
              <span className="flex flex-col text-xs text-muted-foreground">
                Textos secundarios
                <span className="text-[10px] text-muted-foreground/70">
                  Rol/bio, dirección, horarios, secciones y servicios/productos
                </span>
              </span>
              <input
                type="color"
                value={colorTextoGeneral}
                onChange={(e) => setColorTextoGeneral(e.target.value)}
                className="size-8 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </label>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={cn(labelClase, "flex items-center gap-1.5")}>
            Fondo de la tarjeta
            {fondoTarjetaActivo &&
              (fondoTarjetaModo === "avanzado" ? bloqueoFondoTarjetaAvanzado : bloqueoFondoTarjetaSimple) && (
                <CandadoPlan
                  plan={
                    (fondoTarjetaModo === "avanzado"
                      ? bloqueoFondoTarjetaAvanzado
                      : bloqueoFondoTarjetaSimple
                    )!.plan
                  }
                />
              )}
          </span>
          <Switch checked={fondoTarjetaActivo} onCheckedChange={setFondoTarjetaActivo} />
        </div>
        <span className="text-xs text-muted-foreground">
          El panel de contenido (separado del fondo del banner de arriba).
        </span>

        {fondoTarjetaActivo && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Modo avanzado (2 colores + degradado)</span>
              <Switch
                checked={fondoTarjetaModo === "avanzado"}
                onCheckedChange={(checked) => setFondoTarjetaModo(checked ? "avanzado" : "simple")}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {fondoTarjetaModo === "avanzado" ? "Color 1" : "Color"}
                </span>
                <input
                  type="color"
                  value={fondoTarjetaColor}
                  onChange={(e) => setFondoTarjetaColor(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
                />
              </label>
              {fondoTarjetaModo === "avanzado" && (
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Color 2</span>
                  <input
                    type="color"
                    value={fondoTarjetaColorSecundario}
                    onChange={(e) => setFondoTarjetaColorSecundario(e.target.value)}
                    className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                </label>
              )}
            </div>

            {fondoTarjetaModo === "avanzado" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <div className="inline-flex rounded-full border border-border bg-background p-0.5">
                    {(["lineal", "radial"] as const).map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => setFondoTarjetaTipoDegradado(opcion)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ease-out",
                          fondoTarjetaTipoDegradado === opcion
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {opcion === "lineal" ? "Lineal" : "Radial"}
                      </button>
                    ))}
                  </div>
                </div>
                {fondoTarjetaTipoDegradado === "lineal" && (
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Dirección</span>
                    <input
                      type="range"
                      min={0}
                      max={359}
                      value={fondoTarjetaDireccionGrados}
                      onChange={(e) => setFondoTarjetaDireccionGrados(Number(e.target.value))}
                      className="w-24 cursor-pointer accent-foreground"
                    />
                  </label>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  const contenidoDatosEsenciales = (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
      <label className="flex flex-col gap-1.5">
        <span className={labelClase}>Título</span>
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onFocus={() => scrollPreviewTo("nombre")}
          placeholder="Ej. María Gómez o Café Aroma"
          className={inputClase}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClase}>Rol o descripción</span>
        <input
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          onFocus={() => scrollPreviewTo("nombre")}
          placeholder="Ej. Abogada · Grupo Aroma"
          className={inputClase}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className={labelClase}>Bio</span>
          <span className="text-xs text-muted-foreground">{puesto.length}/160</span>
        </div>
        <textarea
          value={puesto}
          onChange={(e) => setPuesto(e.target.value.slice(0, 160))}
          onFocus={() => scrollPreviewTo("bio")}
          maxLength={160}
          rows={3}
          placeholder="Contá en pocas palabras quién sos o qué hacés."
          className={cn(inputClase, "resize-none")}
        />
      </label>

      {/* Tipografía + color/tamaño/peso del título — antes vivía en "Colores
          y tipografía", reubicada acá (pedido explícito, ver CLAUDE.md): es
          lo primero que define la identidad de la tarjeta, junto al Título
          mismo. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
        <div className="flex items-center justify-between">
          <span className={cn(labelClase, "flex items-center gap-1.5")}>
            Fuente del título
            {bloqueoColoresSimple && <CandadoPlan plan={bloqueoColoresSimple.plan} />}
          </span>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Fuente distinta para el cuerpo
            {bloqueoTipografiaAvanzada && <CandadoPlan plan={bloqueoTipografiaAvanzada.plan} />}
            <Switch checked={modoTipografiaAvanzado} onCheckedChange={setModoTipografiaAvanzado} />
          </label>
        </div>

        <SelectorTipografia
          value={estiloTipografia}
          onChange={setEstiloTipografia}
          valorGuardado={visualInicial?.estiloTipografia ?? "moderna"}
          features={featuresPersonalizacion}
        />

        {modoTipografiaAvanzado && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Fuente del cuerpo</span>
            <SelectorTipografia
              value={estiloTipografiaCuerpo}
              onChange={setEstiloTipografiaCuerpo}
              valorGuardado={visualInicial?.estiloTipografiaCuerpo ?? "moderna"}
              features={featuresPersonalizacion}
            />
          </label>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              Tamaño del título ({tituloTamano}px)
            </span>
            <input
              type="range"
              min={20}
              max={40}
              value={tituloTamano}
              onChange={(e) => setTituloTamano(Number(e.target.value))}
              onFocus={() => scrollPreviewTo("nombre")}
              className="w-full cursor-pointer accent-foreground"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Peso del título ({tituloPeso})</span>
            <input
              type="range"
              min={400}
              max={800}
              step={50}
              value={tituloPeso}
              onChange={(e) => setTituloPeso(Number(e.target.value))}
              onFocus={() => scrollPreviewTo("nombre")}
              className="w-full cursor-pointer accent-foreground"
            />
          </label>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">Color del título</span>
          <div className="flex items-center gap-2">
            {colorTitulo && (
              <button
                type="button"
                onClick={() => setColorTitulo("")}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Automático
              </button>
            )}
            <input
              type="color"
              value={colorTitulo || "#18181b"}
              onChange={(e) => setColorTitulo(e.target.value)}
              onFocus={() => scrollPreviewTo("nombre")}
              className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
            />
          </div>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">Color del texto secundario</span>
          <div className="flex items-center gap-2">
            {colorTextoSecundario && (
              <button
                type="button"
                onClick={() => setColorTextoSecundario("")}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Automático
              </button>
            )}
            <input
              type="color"
              value={colorTextoSecundario || "#3f3f46"}
              onChange={(e) => setColorTextoSecundario(e.target.value)}
              onFocus={() => scrollPreviewTo("nombre")}
              className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
            />
          </div>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClase}>Enlace personalizado</span>
        <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-white/70 backdrop-blur transition-colors duration-200 ease-out focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-zinc-900/60">
          <span className="flex shrink-0 items-center border-r border-border bg-muted/60 px-3 text-sm text-muted-foreground">
            linkard.mx/
          </span>
          <input
            required
            minLength={4}
            value={slugPersonalizado}
            onChange={(e) =>
              setSlugPersonalizado(
                e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "")
              )
            }
            placeholder="tu-nombre"
            className="w-full bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        {slugPersonalizado.trim() && (
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              slugMuyCorto
                ? "text-destructive"
                : verificandoSlug
                  ? "text-muted-foreground"
                  : slugDisponible === true
                    ? "text-emerald-600 dark:text-emerald-400"
                    : slugDisponible === false
                      ? "text-destructive"
                      : "text-muted-foreground"
            )}
          >
            {slugMuyCorto ? (
              <>
                <X className="size-3" /> Mínimo 4 caracteres
              </>
            ) : verificandoSlug ? (
              <>
                <Loader2 className="size-3 animate-spin" /> Verificando
                disponibilidad...
              </>
            ) : slugDisponible === true ? (
              <>
                <Check className="size-3" />{" "}
                {esEdicion && !slugCambio ? "Es tu enlace actual" : "Enlace disponible"}
              </>
            ) : slugDisponible === false ? (
              <>
                <X className="size-3" /> Este enlace ya está en uso
              </>
            ) : null}
          </p>
        )}

        {/* Límite de 2 cambios cada 14 días — solo aplica en edición, crear
            la tarjeta no consume el límite (ver lib/tarjetas.ts). */}
        {esEdicion && limiteSlug && (
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              slugLimiteAlcanzado ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {slugLimiteAlcanzado ? (
              <>
                <X className="size-3" /> Alcanzaste el límite de cambios de enlace.{" "}
                {limiteSlug.proximaLiberacion &&
                  `Podés volver a cambiarlo el ${new Date(
                    limiteSlug.proximaLiberacion
                  ).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}.`}
              </>
            ) : (
              `Te quedan ${limiteSlug.cambiosRestantes} de 2 cambios de enlace disponibles (cada 14 días).`
            )}
          </p>
        )}
      </label>

      <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        ¡No te preocupes! Los únicos campos obligatorios son tu título y tu
        enlace personalizado. Todos los demás datos los puedes agregar,
        cambiar o mejorar en el momento que quieras.
      </p>
    </div>
  )

  const contenidoAvatarYBanner = (
    <div className="flex flex-col gap-5 px-5 pb-5 pt-1">
      <div className="flex flex-col gap-1.5">
        <span className={labelClase}>Foto de perfil</span>
        <div className="flex items-center gap-3">
          {avatarMostrado && (
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL de Cloudinary */}
              <img
                src={avatarMostrado}
                alt="Vista previa de la foto"
                style={estiloImagenPosicionada(avatarPosicion)}
                className="size-12 rounded-full border border-border object-cover"
              />
              <button
                type="button"
                onClick={quitarAvatar}
                aria-label="Quitar foto"
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <input
            key={avatarInputKey}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            onFocus={() => scrollPreviewTo("avatar")}
            className={cn(
              inputClase,
              "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
            )}
          />
        </div>
        {avatarMostrado && (
          <button
            type="button"
            onClick={() => setReposicionandoAvatar(true)}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
          >
            <Move className="size-3.5" /> Reposicionar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClase}>Forma de avatar</span>
        <div className="grid grid-cols-3 gap-2">
          {FORMAS_AVATAR.map((forma) => {
            const bloqueada = estaBloqueada(
              forma.tier,
              forma.id,
              visualInicial?.avatarForma ?? "circulo",
              featuresPersonalizacion
            )
            return (
              <OpcionPersonalizacion
                key={forma.id}
                seleccionada={avatarForma === forma.id}
                bloqueada={bloqueada}
                etiqueta={forma.etiqueta}
                onClick={() => setAvatarForma(forma.id)}
              >
                <SwatchForma forma={forma} />
              </OpcionPersonalizacion>
            )
          })}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 transition-opacity",
          fondoImagenMostrado && "pointer-events-none opacity-40"
        )}
      >
        <span className={labelClase}>Fondo del banner</span>
        <div className="grid grid-cols-5 gap-2">
          {BANNER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => elegirPreset(preset.id)}
              onFocus={() => scrollPreviewTo("banner")}
              title={preset.nombre}
              aria-label={preset.nombre}
              className={cn(
                "aspect-square rounded-xl border-2 transition-all duration-200 ease-out hover:scale-105",
                bannerPresetId === preset.id && !bannerMostrado
                  ? "border-foreground shadow-md"
                  : "border-transparent"
              )}
              style={{ background: preset.background }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          o subí tu propia imagen
        </span>
        <div className="flex items-center gap-3">
          {bannerMostrado && (
            <div className="relative shrink-0">
              <div
                className="h-12 w-20 rounded-lg border border-border bg-cover bg-center"
                style={{ backgroundImage: `url(${bannerMostrado})`, backgroundPosition: `${bannerPosicion.x}% ${bannerPosicion.y}%` }}
              />
              <button
                type="button"
                onClick={quitarBanner}
                aria-label="Quitar banner"
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <input
            key={bannerInputKey}
            type="file"
            accept="image/*"
            onChange={handleBannerFileChange}
            onFocus={() => scrollPreviewTo("banner")}
            className={cn(
              inputClase,
              "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
            )}
          />
        </div>
        {bannerMostrado && (
          <button
            type="button"
            onClick={() => setReposicionandoBanner(true)}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
          >
            <Move className="size-3.5" /> Reposicionar
          </button>
        )}
      </div>

      {/* Fuera del bloque de arriba (que se deshabilita con "Imagen de
          fondo de la tarjeta" activa) a propósito: el alto sigue
          determinando dónde queda el "corte" antes del panel incluso con
          la imagen de fondo puesta — no es exclusivo del banner de
          color/preset/upload. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Altura del banner ({bannerAltura}px)</span>
        <input
          type="range"
          min={140}
          max={320}
          step={8}
          value={bannerAltura}
          onChange={(e) => setBannerAltura(Number(e.target.value))}
          onFocus={() => scrollPreviewTo("banner")}
          className="w-full cursor-pointer accent-foreground"
        />
      </label>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/50 p-3">
        <span className={cn(labelClase, "flex items-center gap-1.5")}>
          Imagen de fondo de la tarjeta
          {bloqueoFondoImagen && <CandadoPlan plan={bloqueoFondoImagen.plan} />}
        </span>
        <span className="text-xs text-muted-foreground">
          Reemplaza el banner y el fondo del panel por una sola imagen continua
          detrás de toda la tarjeta.
        </span>
        <div className="flex items-center gap-3">
          {fondoImagenMostrado && (
            <div className="relative shrink-0">
              <div
                className="h-12 w-20 rounded-lg border border-border bg-cover"
                style={{
                  backgroundImage: `url(${fondoImagenMostrado})`,
                  backgroundPosition: `${fondoImagenPosicion.x}% ${fondoImagenPosicion.y}%`,
                }}
              />
              <button
                type="button"
                onClick={quitarFondoImagen}
                aria-label="Quitar imagen de fondo"
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <input
            key={fondoImagenInputKey}
            type="file"
            accept="image/*"
            onChange={handleFondoImagenFileChange}
            className={cn(
              inputClase,
              "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
            )}
          />
        </div>
        {fondoImagenMostrado && (
          <button
            type="button"
            onClick={() => setReposicionandoFondoImagen(true)}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
          >
            <Move className="size-3.5" /> Reposicionar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClase}>Divisor banner → tarjeta</span>
        <div className="grid grid-cols-4 gap-2">
          {DIVISORES_BANNER.map((divisor) => {
            const bloqueada = estaBloqueada(
              divisor.tier,
              divisor.id,
              visualInicial?.divisorBanner ?? "recta",
              featuresPersonalizacion
            )
            return (
              <OpcionPersonalizacion
                key={divisor.id}
                seleccionada={(divisorBanner ?? "recta") === divisor.id}
                bloqueada={bloqueada}
                etiqueta={divisor.etiqueta}
                onClick={() => setDivisorBanner(divisor.id)}
              >
                <SwatchDivisor divisor={divisor} />
              </OpcionPersonalizacion>
            )
          })}
        </div>
      </div>

      {bannerMostrado && (
        <ReposicionarImagen
          abierto={reposicionandoBanner}
          imagenUrl={bannerMostrado}
          valorInicial={bannerPosicion}
          alto={bannerAltura}
          onCancelar={() => setReposicionandoBanner(false)}
          onConfirmar={(pos) => {
            setBannerPosicion(pos)
            setReposicionandoBanner(false)
          }}
        />
      )}
      {fondoImagenMostrado && (
        <ReposicionarImagen
          abierto={reposicionandoFondoImagen}
          imagenUrl={fondoImagenMostrado}
          valorInicial={fondoImagenPosicion}
          alto={420}
          onCancelar={() => setReposicionandoFondoImagen(false)}
          onConfirmar={(pos) => {
            setFondoImagenPosicion(pos)
            setReposicionandoFondoImagen(false)
          }}
        />
      )}
    </div>
  )

  const contenidoContacto = (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClase}>Teléfono</span>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            onFocus={() => scrollPreviewTo("contacto")}
            placeholder="+54 11 5555-5555"
            className={inputClase}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClase}>WhatsApp</span>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            onFocus={() => scrollPreviewTo("contacto")}
            placeholder="+54 11 5555-5555"
            className={inputClase}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClase}>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => scrollPreviewTo("contacto")}
          placeholder="tu@correo.com"
          className={inputClase}
        />
      </label>
    </div>
  )

  const contenidoRedes = (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-1">
      {redes.map((red, index) => {
        const plataformaCfg = obtenerPlataforma(red.plataforma)
        const Icono = SOCIAL_ICONS[red.plataforma]
        const sufijo =
          red.plataforma === "personalizado"
            ? red.url
            : red.url.slice(plataformaCfg.prefijo.length)

        return (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/50 p-3"
          >
            <div className="flex items-center gap-2">
              <Icono className="size-4 shrink-0 text-muted-foreground" />
              <select
                value={red.plataforma}
                onChange={(e) =>
                  actualizarRedPlataforma(index, e.target.value as PlataformaRed)
                }
                onFocus={() => scrollPreviewTo("redes")}
                className={cn(inputClase, "w-auto flex-1")}
              >
                {PLATAFORMAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => quitarRed(index)}
                aria-label="Quitar enlace"
                className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {red.plataforma === "personalizado" ? (
              <div className="flex gap-2">
                <input
                  value={red.label}
                  onChange={(e) => actualizarRedLabel(index, e.target.value)}
                  onFocus={() => scrollPreviewTo("redes")}
                  placeholder="Nombre"
                  className={cn(inputClase, "w-28 shrink-0")}
                />
                <input
                  value={red.url}
                  onChange={(e) => actualizarRedValor(index, e.target.value)}
                  onFocus={() => scrollPreviewTo("redes")}
                  placeholder={plataformaCfg.placeholder}
                  className={inputClase}
                />
              </div>
            ) : (
              <div className="flex items-center overflow-hidden rounded-xl border border-border bg-muted/60">
                <span className="shrink-0 pl-3 text-xs text-muted-foreground">
                  {plataformaCfg.prefijo}
                </span>
                <input
                  value={sufijo}
                  onChange={(e) => actualizarRedValor(index, e.target.value)}
                  onFocus={() => scrollPreviewTo("redes")}
                  placeholder={plataformaCfg.placeholder}
                  className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
                />
              </div>
            )}
          </div>
        )
      })}

      {redes.length < 5 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={agregarRed}
          className="self-start"
        >
          <Plus className="size-3.5" /> Agregar red
        </Button>
      )}
    </div>
  )

  const contenidoUbicacion = (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClase}>Dirección física</span>
          <textarea
            value={direccion}
            onChange={(e) => setDireccion(limitarLineas(e.target.value, 3))}
            onFocus={() => scrollPreviewTo("ubicacion")}
            rows={2}
            placeholder={"Av. Siempre Viva 742\nCol. Centro"}
            className={cn(inputClase, "resize-none")}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClase}>Enlace de Google Maps</span>
          <input
            value={direccionMapsUrl}
            onChange={(e) => setDireccionMapsUrl(e.target.value)}
            onFocus={() => scrollPreviewTo("ubicacion")}
            placeholder="https://maps.google.com/..."
            className={inputClase}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClase}>Horarios de atención</span>
        <textarea
          value={horarios}
          onChange={(e) => setHorarios(limitarLineas(e.target.value, 3))}
          onFocus={() => scrollPreviewTo("ubicacion")}
          rows={2}
          placeholder={"Lun a Vie 9 a 18hs\nSáb 9 a 13hs"}
          className={cn(inputClase, "resize-none")}
        />
      </label>
    </div>
  )

  const contenidoMultimedia = (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
      <label className="flex flex-col gap-1.5">
        <span className={labelClase}>Video de YouTube (opcional)</span>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          onFocus={() => scrollPreviewTo("video")}
          placeholder="https://www.youtube.com/watch?v=..."
          className={inputClase}
        />
      </label>
    </div>
  )

  // Orden de aparición de Agenda/Botones en la tarjeta pública — mismo
  // patrón de flechas ↑/↓ que ya usa /admin/testimonios para reordenar (sin
  // librería de drag-and-drop nueva). "Servicios"/"Productos" ya no son
  // bloques propios (2026-08-09) — ahora son botones tipo "catalogo" dentro
  // de "Botones", reordenables individualmente (ver renderBotonFila).
  const contenidoOrdenSecciones = (
    <div className="flex flex-col gap-2 px-5 pb-5 pt-1">
      <p className="text-xs text-muted-foreground">
        Elegí en qué orden aparecen estas secciones en tu tarjeta pública.
      </p>
      {ordenSecciones.map((id, index) => {
        const meta = SECCIONES_ORDENABLES.find((s) => s.id === id)
        return (
          <div
            key={id}
            className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2"
          >
            <span className="text-sm font-medium text-foreground">{meta?.etiqueta ?? id}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moverSeccion(index, -1)}
                disabled={index === 0}
                aria-label={`Subir ${meta?.etiqueta ?? id}`}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => moverSeccion(index, 1)}
                disabled={index === ordenSecciones.length - 1}
                aria-label={`Bajar ${meta?.etiqueta ?? id}`}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )

  /** Ícono/imagen a la izquierda + color de fondo/borde/textura — común a
   *  enlace/whatsapp/archivo/opciones (NO a catálogo: su tile público no
   *  usa ninguno de estos campos, ver renderBotonCatalogo en
   *  tarjeta-card.tsx, así que no tiene sentido ofrecerlos acá). Extraído
   *  para no repetir este bloque 4 veces dentro de renderBotonFila. */
  function contenidoIconoYColorBoton(boton: BotonFormState, ubicacion: UbicacionBoton) {
    const imagenMostrada = boton.imagenPreview || boton.imagenUrlExistente
    return (
      <>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Ícono o imagen (a la izquierda)</span>
          <div className="inline-flex w-fit rounded-full border border-border bg-white/70 p-0.5 dark:bg-zinc-900/60">
            {(["icono", "imagen"] as const).map((tipoIcono) => (
              <button
                key={tipoIcono}
                type="button"
                onClick={() => actualizarBotonEn(ubicacion, "iconoTipo", tipoIcono)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out",
                  boton.iconoTipo === tipoIcono
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tipoIcono === "icono" ? "Ícono" : "Imagen"}
              </button>
            ))}
          </div>

          {boton.iconoTipo === "icono" ? (
            <div className="flex flex-wrap gap-1.5">
              {BOTON_ICONOS.map(({ id, etiqueta, Icono }) => (
                <button
                  key={id}
                  type="button"
                  title={etiqueta}
                  aria-label={etiqueta}
                  onClick={() => actualizarBotonEn(ubicacion, "iconoId", id)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg border-2 transition-colors duration-200 ease-out",
                    boton.iconoId === id
                      ? "border-foreground bg-background"
                      : "border-border bg-background/50 hover:bg-background"
                  )}
                >
                  <Icono className="size-4" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {imagenMostrada && (
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL de Cloudinary */}
                  <img
                    src={imagenMostrada}
                    alt="Vista previa del botón"
                    className="size-12 rounded-full border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => quitarBotonImagen(ubicacion)}
                    aria-label="Quitar imagen del botón"
                    className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleBotonImagenChange(ubicacion, e)}
                className={cn(
                  inputClase,
                  "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                )}
              />
            </div>
          )}
          <span className="text-[11px] text-muted-foreground">
            Imagen cuadrada (1:1), mínimo 200×200px para que se vea nítida.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Color de fondo</span>
            <div className="flex items-center gap-2">
              {boton.colorFondoActivo && (
                <button
                  type="button"
                  onClick={() => actualizarBotonEn(ubicacion, "colorFondoActivo", false)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Quitar
                </button>
              )}
              <input
                type="color"
                value={boton.colorFondo}
                onChange={(e) => {
                  actualizarBotonEn(ubicacion, "colorFondo", e.target.value)
                  actualizarBotonEn(ubicacion, "colorFondoActivo", true)
                }}
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </div>
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Color del borde</span>
            <div className="flex items-center gap-2">
              {boton.colorBordeActivo && (
                <button
                  type="button"
                  onClick={() => actualizarBotonEn(ubicacion, "colorBordeActivo", false)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Quitar
                </button>
              )}
              <input
                type="color"
                value={boton.colorBorde}
                onChange={(e) => {
                  actualizarBotonEn(ubicacion, "colorBorde", e.target.value)
                  actualizarBotonEn(ubicacion, "colorBordeActivo", true)
                }}
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
              />
            </div>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Textura de fondo</span>
          <select
            value={boton.textura}
            onChange={(e) => actualizarBotonEn(ubicacion, "textura", e.target.value)}
            className={inputClase}
          >
            {BOTON_TEXTURAS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </>
    )
  }

  /** Fila-cabecera SIEMPRE visible (ícono/imagen chica + título + badge de
   *  tipo + mover ↑/↓ + eliminar + chevron expandir/colapsar) + panel
   *  específico por tipo cuando está expandido. Recursiva: un botón
   *  "opciones" renderiza a cada uno de sus hijos con esta misma función
   *  (un solo nivel — los hijos nunca son "opciones", ver BotonHijo). */
  function renderBotonFila(
    boton: BotonFormState,
    ubicacion: UbicacionBoton,
    index: number,
    total: number
  ): React.ReactNode {
    const imagenMostrada = boton.imagenPreview || boton.imagenUrlExistente
    const IconoCabecera = BOTON_ICONOS.find((i) => i.id === boton.iconoId)?.Icono ?? BOTON_ICONOS[0].Icono

    return (
      <div
        key={boton.id}
        className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/50 p-3"
      >
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {boton.iconoTipo === "imagen" && imagenMostrada ? (
              // eslint-disable-next-line @next/next/no-img-element -- ícono chico, puede ser vista previa local
              <img src={imagenMostrada} alt="" className="size-full object-cover" />
            ) : (
              <IconoCabecera className="size-4 text-muted-foreground" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {boton.titulo.trim() || "Sin título"}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {ETIQUETA_TIPO_BOTON[boton.tipo]}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => moverBotonEn(ubicacion, -1)}
              disabled={index === 0}
              aria-label="Subir"
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moverBotonEn(ubicacion, 1)}
              disabled={index === total - 1}
              aria-label="Bajar"
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => quitarBotonEn(ubicacion)}
              aria-label="Quitar botón"
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => actualizarBotonEn(ubicacion, "expandido", !boton.expandido)}
              aria-label={boton.expandido ? "Colapsar" : "Expandir"}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200 ease-out",
                  boton.expandido && "rotate-180"
                )}
              />
            </button>
          </div>
        </div>

        {boton.expandido && (
          <div className="flex flex-col gap-3 border-t border-border/60 pt-3">
            <input
              value={boton.titulo}
              onChange={(e) => actualizarBotonEn(ubicacion, "titulo", e.target.value)}
              onFocus={() => scrollPreviewTo("botones")}
              placeholder="Título del botón"
              className={inputClase}
            />

            {boton.tipo === "enlace" && (
              <>
                <input
                  value={boton.subtitulo}
                  onChange={(e) => actualizarBotonEn(ubicacion, "subtitulo", e.target.value)}
                  onFocus={() => scrollPreviewTo("botones")}
                  placeholder="Subtítulo (opcional)"
                  className={inputClase}
                />
                <input
                  type="url"
                  value={boton.url}
                  onChange={(e) => actualizarBotonEn(ubicacion, "url", e.target.value)}
                  onFocus={() => scrollPreviewTo("botones")}
                  placeholder="Enlace (https://...)"
                  className={inputClase}
                />
                {contenidoIconoYColorBoton(boton, ubicacion)}
              </>
            )}

            {boton.tipo === "whatsapp" && (
              <>
                <input
                  value={boton.subtitulo}
                  onChange={(e) => actualizarBotonEn(ubicacion, "subtitulo", e.target.value)}
                  onFocus={() => scrollPreviewTo("botones")}
                  placeholder="Subtítulo (opcional)"
                  className={inputClase}
                />
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Número de WhatsApp</span>
                  <input
                    value={boton.waNumero}
                    onChange={(e) => actualizarBotonEn(ubicacion, "waNumero", e.target.value)}
                    placeholder="Ej. 5215512345678"
                    className={inputClase}
                  />
                </label>
                {whatsapp && whatsapp !== boton.waNumero && (
                  <button
                    type="button"
                    onClick={() => actualizarBotonEn(ubicacion, "waNumero", whatsapp)}
                    className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Usar el mismo de &ldquo;Canales de contacto&rdquo; ({whatsapp})
                  </button>
                )}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Mensaje (opcional)</span>
                  <textarea
                    value={boton.waMensaje}
                    onChange={(e) => actualizarBotonEn(ubicacion, "waMensaje", e.target.value)}
                    rows={2}
                    placeholder="Hola, quiero más información..."
                    className={cn(inputClase, "resize-none")}
                  />
                </label>
                {contenidoIconoYColorBoton(boton, ubicacion)}
              </>
            )}

            {boton.tipo === "archivo" && (
              <>
                <input
                  value={boton.subtitulo}
                  onChange={(e) => actualizarBotonEn(ubicacion, "subtitulo", e.target.value)}
                  onFocus={() => scrollPreviewTo("botones")}
                  placeholder="Subtítulo (opcional)"
                  className={inputClase}
                />
                <label className="flex flex-col gap-1.5">
                  <span className={labelClase}>Archivo (PDF)</span>
                  <div className="flex items-center gap-3">
                    {(boton.archivoUrlExistente || boton.archivoFile) && (
                      <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="max-w-32 truncate text-xs text-foreground">
                          {boton.archivoFile?.name || "Archivo actual"}
                        </span>
                        <button
                          type="button"
                          onClick={() => quitarBotonArchivo(ubicacion)}
                          aria-label="Quitar archivo"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleBotonArchivoChange(ubicacion, e)}
                      className={cn(
                        inputClase,
                        "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                      )}
                    />
                  </div>
                </label>
                {contenidoIconoYColorBoton(boton, ubicacion)}
              </>
            )}

            {boton.tipo === "opciones" && (
              <>
                <input
                  value={boton.subtitulo}
                  onChange={(e) => actualizarBotonEn(ubicacion, "subtitulo", e.target.value)}
                  onFocus={() => scrollPreviewTo("botones")}
                  placeholder="Subtítulo (opcional)"
                  className={inputClase}
                />
                {contenidoIconoYColorBoton(boton, ubicacion)}

                <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                  <span className="text-xs font-medium text-foreground">
                    Botones dentro de este menú
                  </span>
                  {boton.hijos.map((hijo, indiceHijo) =>
                    renderBotonFila(
                      hijo,
                      { indice: ubicacion.indice, indiceHijo },
                      indiceHijo,
                      boton.hijos.length
                    )
                  )}
                  {boton.hijos.length < TOPE_HIJOS_OPCIONES && (
                    <SelectorTipoBoton
                      opciones={[
                        { tipo: "enlace", etiqueta: "Enlace", disponible: true },
                        { tipo: "whatsapp", etiqueta: "WhatsApp", disponible: true },
                        {
                          tipo: "catalogo",
                          etiqueta: "Catálogo",
                          disponible: !catalogoBloqueado,
                          plan: catalogoPlanNecesario,
                        },
                        { tipo: "archivo", etiqueta: "Archivo", disponible: archivoDisponible, plan: "poder" },
                      ]}
                      onElegir={(tipoHijo) =>
                        agregarBotonHijo(ubicacion.indice, tipoHijo as Exclude<BotonTipo, "opciones">)
                      }
                    />
                  )}
                </div>
              </>
            )}

            {boton.tipo === "catalogo" && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClase}>Vista</span>
                  <div className="inline-flex w-fit rounded-full border border-border bg-white/70 p-0.5 dark:bg-zinc-900/60">
                    {(
                      [
                        { id: "grid2" as const, etiqueta: "Grid 2 columnas" },
                        { id: "lista1" as const, etiqueta: "Lista 1 por línea" },
                      ]
                    ).map(({ id, etiqueta }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => actualizarBotonEn(ubicacion, "vista", id)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out",
                          boton.vista === id
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {etiqueta}
                      </button>
                    ))}
                  </div>
                </label>

                {boton.items.map((item, indiceItem) => {
                  const imagenItemMostrada = item.imagenPreview || item.imagenUrlExistente
                  return (
                    <div
                      key={indiceItem}
                      className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/50 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          value={item.titulo}
                          onChange={(e) =>
                            actualizarItemCatalogo(ubicacion, indiceItem, "titulo", e.target.value)
                          }
                          onFocus={() => scrollPreviewTo("botones")}
                          placeholder="Título"
                          className={cn(inputClase, "flex-1")}
                        />
                        <div className="flex w-32 shrink-0 items-center overflow-hidden rounded-xl border border-border bg-muted/60">
                          <span className="shrink-0 pl-3 text-xs text-muted-foreground">$</span>
                          <input
                            value={item.precio}
                            onChange={(e) =>
                              actualizarItemCatalogo(ubicacion, indiceItem, "precio", e.target.value)
                            }
                            onFocus={() => scrollPreviewTo("botones")}
                            placeholder="Precio"
                            className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => quitarItemCatalogo(ubicacion, indiceItem)}
                          aria-label="Quitar ítem"
                          className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <input
                        value={item.descripcion}
                        onChange={(e) =>
                          actualizarItemCatalogo(ubicacion, indiceItem, "descripcion", e.target.value)
                        }
                        onFocus={() => scrollPreviewTo("botones")}
                        placeholder="Descripción corta (opcional)"
                        className={inputClase}
                      />
                      <input
                        type="url"
                        value={item.enlaceUrl}
                        onChange={(e) =>
                          actualizarItemCatalogo(ubicacion, indiceItem, "enlaceUrl", e.target.value)
                        }
                        onFocus={() => scrollPreviewTo("botones")}
                        placeholder="Enlace para agendar, comprar o ver más (opcional)"
                        className={inputClase}
                      />
                      <div className="flex items-center gap-3">
                        {imagenItemMostrada && (
                          <div className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL de Cloudinary */}
                            <img
                              src={imagenItemMostrada}
                              alt="Vista previa"
                              className="size-12 rounded-lg border border-border object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => quitarItemCatalogoImagen(ubicacion, indiceItem)}
                              aria-label="Quitar imagen"
                              className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleItemCatalogoImagenChange(ubicacion, indiceItem, e)}
                          className={cn(
                            inputClase,
                            "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                          )}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Imagen cuadrada (1:1), mínimo 600×600px para que se vea nítida al ampliarse.
                      </span>
                    </div>
                  )
                })}

                {boton.items.length < TOPE_ITEMS_CATALOGO && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => agregarItemCatalogo(ubicacion)}
                    className="self-start"
                  >
                    <Plus className="size-3.5" /> Agregar ítem
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  const contenidoBotones = (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-1">
      <p className="text-xs text-muted-foreground">
        Elegí el tipo de botón: enlace directo, WhatsApp, un menú de opciones, un catálogo de
        productos o servicios, o un archivo descargable.
      </p>

      {botones.map((boton, index) => renderBotonFila(boton, { indice: index }, index, botones.length))}

      {botones.length < TOPE_BOTONES && (
        <SelectorTipoBoton
          opciones={[
            { tipo: "enlace", etiqueta: "Enlace", disponible: true },
            { tipo: "whatsapp", etiqueta: "WhatsApp", disponible: true },
            { tipo: "opciones", etiqueta: "Opciones", disponible: true },
            {
              tipo: "catalogo",
              etiqueta: "Catálogo",
              disponible: !catalogoBloqueado,
              plan: catalogoPlanNecesario,
            },
            { tipo: "archivo", etiqueta: "Archivo", disponible: archivoDisponible, plan: "poder" },
          ]}
          onElegir={agregarBoton}
        />
      )}
    </div>
  )

  const contenidoAgenda = esEdicion && tarjeta && (
    <div className="px-5 pb-5 pt-1">
      <AgendaServicios
        tarjetaId={tarjeta.id}
        planId={tarjeta.plan_id}
        onServiciosChange={onAgendaServiciosChange}
      />
    </div>
  )

  const contenidoMetricas = esEdicion && tarjeta && (
    <div className="px-5 pb-5 pt-1">
      <EstadisticasTarjeta tarjetaId={tarjeta.id} planId={tarjeta.plan_id} />
    </div>
  )

  const contenidoResumenPago = mostrarSeccionPago && plan && (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{plan.nombre_display}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {periodicidad === "anual" ? "Anual" : "Mensual"}
        </span>
      </div>

      {precioBase !== null && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-foreground">
            $
            {(precioFinal ?? precioBase).toLocaleString("es-MX", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              MXN/{periodicidad === "anual" ? "año" : "mes"}
            </span>
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={cuponInput}
          onChange={(e) => setCuponInput(e.target.value)}
          placeholder="Código de descuento (opcional)"
          disabled={Boolean(cuponValidado)}
          className={cn(inputClase, "flex-1 disabled:opacity-60")}
        />
        {cuponValidado ? (
          <Button type="button" variant="outline" onClick={quitarCupon}>
            Quitar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleValidarCupon}
            disabled={validandoCupon || !cuponInput.trim()}
          >
            {validandoCupon ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Aplicar"
            )}
          </Button>
        )}
      </div>

      {cuponValidado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Código {cuponValidado.codigo} aplicado: {cuponValidado.porcentaje_descuento}% de
          descuento.
        </p>
      )}
      {cuponError && <p className="text-sm text-destructive">{cuponError}</p>}

      <p className="text-xs text-muted-foreground">
        Al crear tu tarjeta vas a ir a Stripe para activar tu suscripción{" "}
        {periodicidad === "anual" ? "anual" : "mensual"}. El precio final puede ser menor
        a este si te corresponde algún descuento adicional.
      </p>
    </div>
  )

  // 3 estados posibles, no 2: edición pura (esEdicion && tienePlanActivo),
  // reintentar pago (esEdicion && !tienePlanActivo — tarjeta ya creada pero
  // canceló/abandonó el checkout de Stripe), y creación nueva (!esEdicion).
  const contenidoBotonGuardar = guardadoExito ? (
    <span className="inline-flex animate-in items-center gap-1.5 zoom-in-95 duration-300">
      <Check className="size-4" />
      {esEdicion && tienePlanActivo ? "¡Guardado!" : "¡Listo!"}
    </span>
  ) : saving ? (
    <span className="inline-flex items-center gap-1.5 animate-pulse">
      <Loader2 className="size-4 animate-spin" />
      {esEdicion && tienePlanActivo ? "Guardando..." : "Procesando..."}
    </span>
  ) : esEdicion && tienePlanActivo ? (
    <>
      Guardar cambios <Check className="size-4" />
    </>
  ) : esEdicion ? (
    <>
      Completar pago <ArrowRight className="size-4" />
    </>
  ) : (
    <>
      Crear e ir a pagar <ArrowRight className="size-4" />
    </>
  )

  interface Seccion {
    id: string
    titulo: string
    contenido: React.ReactNode
  }

  const SECCIONES: Seccion[] = [
    { id: "plantillas", titulo: "Plantillas", contenido: contenidoPlantillas },
    { id: "datos", titulo: "Datos esenciales", contenido: contenidoDatosEsenciales },
    { id: "colores", titulo: "Colores y tipografía", contenido: contenidoColoresYTipografia },
    { id: "avatar-banner", titulo: "Avatar y banner", contenido: contenidoAvatarYBanner },
    { id: "contacto", titulo: "Canales de contacto", contenido: contenidoContacto },
    { id: "redes", titulo: "Redes sociales", contenido: contenidoRedes },
    { id: "ubicacion", titulo: "Ubicación y negocio", contenido: contenidoUbicacion },
    { id: "multimedia", titulo: "Contenido multimedia", contenido: contenidoMultimedia },
    ...(esEdicion && tarjeta ? [{ id: "agenda", titulo: "Agenda", contenido: contenidoAgenda }] : []),
    { id: "botones", titulo: "Botones", contenido: contenidoBotones },
    { id: "orden", titulo: "Orden de secciones", contenido: contenidoOrdenSecciones },
    ...(esEdicion && tarjeta
      ? [{ id: "metricas", titulo: "Estadísticas", contenido: contenidoMetricas }]
      : []),
  ]

  return (
    <div className="relative flex flex-1 flex-col overflow-clip bg-gradient-to-b from-indigo-50 via-white to-white dark:from-zinc-950 dark:via-black dark:to-black">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: colorPrimario }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-64 size-96 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: colorSecundario }}
      />

      {toast && (
        <div
          className={cn(
            "fixed inset-x-0 top-4 z-50 mx-auto flex w-fit max-w-[90vw] animate-in items-center gap-2 rounded-full border px-4 py-2.5 text-center text-sm font-medium shadow-lg backdrop-blur fade-in slide-in-from-top-2 duration-300",
            toast.tipo === "advertencia"
              ? "border-amber-200 bg-amber-50/95 text-amber-700 dark:border-amber-900 dark:bg-amber-950/95 dark:text-amber-300"
              : toast.tipo === "exito"
                ? "border-emerald-200 bg-emerald-50/95 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/95 dark:text-emerald-300"
                : "border-red-200 bg-red-50/95 text-red-700 dark:border-red-900 dark:bg-red-950/95 dark:text-red-300"
          )}
        >
          {toast.tipo === "exito" ? (
            <Check className="size-4 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" />
          )}
          {toast.mensaje}
        </div>
      )}

      {/* Encabezado (título, banners, toggle ver/editar): solo desktop. En
          mobile el preview ocupa toda la pantalla y esta información no
          tiene lugar; el botón "Guardar" ya da feedback propio. */}
      <div className="relative mx-auto hidden w-full max-w-6xl px-4 pt-10 sm:px-6 lg:block lg:px-10">
        <h1 className="text-2xl font-semibold text-foreground">
          {esEdicion ? "Edita tu tarjeta" : "Crea tu tarjeta digital"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {esEdicion
            ? "Modificá tus datos y guardá los cambios cuando quieras."
            : plan
              ? `Completá tus datos y mirá la vista previa en tiempo real. Plan ${plan.nombre_display} (${periodicidad === "anual" ? "anual" : "mensual"}).`
              : "Completá tus datos y mirá la vista previa en tiempo real."}
        </p>

        {guardadoOk && tarjeta && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <Check className="size-4 shrink-0" />
            Cambios guardados.{" "}
            <Link href={`/${slugGuardado}`} className="underline underline-offset-2">
              Ver tarjeta
            </Link>
          </div>
        )}

        {esEdicion && (
          <div className="mt-6 inline-flex w-fit rounded-full border border-border bg-white/70 p-1 shadow-sm backdrop-blur dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => setVista("editar")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out",
                vista === "editar"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Modo edición
            </button>
            <button
              type="button"
              onClick={() => setVista("ver")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out",
                vista === "ver"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Ver tarjeta
            </button>
          </div>
        )}
      </div>

      {/* Modo "ver tarjeta": solo existe en desktop (en mobile el preview ya
          está siempre visible a pantalla completa detrás de los tabs). */}
      {esEdicion && vista === "ver" && tarjeta && (
        <div className="relative mx-auto hidden w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 lg:flex">
          <TarjetaCard
            tipo={tipo}
            datosContacto={datosContactoActual}
            identidadVisual={identidadVisualActual}
            slug={slugGuardado}
            agendaServicios={agendaServiciosPreview}
            pantallaCompleta
            className="relative"
          />
          <AccionesTarjeta
            slug={slugGuardado}
            titulo={nombre || "Linkard"}
            datosContacto={datosContactoActual}
          />
        </div>
      )}

      <div
        className={cn(
          "relative mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10",
          esEdicion && vista === "ver" && "lg:hidden"
        )}
      >
        {/* Preview: pantalla completa en mobile (fixed, sin bezel), mockup
            de teléfono sticky en desktop — igual que antes en lg: y arriba. */}
        <div className="fixed inset-0 z-0 overflow-y-auto bg-neutral-100 dark:bg-neutral-950 lg:static lg:z-auto lg:order-last lg:flex lg:h-[calc(100vh-4rem)] lg:items-center lg:justify-center lg:self-start lg:overflow-visible lg:bg-transparent lg:sticky lg:top-8">
          <div className="mx-auto w-full max-w-sm pb-28 lg:flex lg:flex-col lg:items-center lg:gap-2 lg:pb-0">
            <span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground lg:block">
              Vista previa en tiempo real
            </span>
            <div className="relative mx-auto w-full overflow-hidden lg:aspect-[9/19.5] lg:w-96 lg:rounded-[2.5rem] lg:border-[8px] lg:border-neutral-800 lg:bg-neutral-800 lg:shadow-2xl lg:dark:border-neutral-700">
              <div className="hidden lg:absolute lg:left-1/2 lg:top-2 lg:z-10 lg:block lg:h-6 lg:w-28 lg:-translate-x-1/2 lg:rounded-full lg:bg-neutral-800" />
              <div
                ref={previewRef}
                className={cn(
                  "size-full overflow-y-auto lg:rounded-[2rem]",
                  temaModo === "oscuro" ? "bg-neutral-950" : "bg-white"
                )}
              >
                <TarjetaCard
                  tipo={tipo}
                  datosContacto={datosContactoActual}
                  identidadVisual={identidadVisualActual}
                  slug={slugPersonalizado.trim() || tarjeta?.slug}
                  agendaServicios={agendaServiciosPreview}
                  className="w-full min-w-0 rounded-none border-0 shadow-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Formulario desktop: exactamente el accordion de siempre. */}
        <form
          id="tarjeta-form"
          onSubmit={handleGuardar}
          className="relative z-10 hidden flex-col gap-6 lg:flex"
        >
          <Accordion.Root
            defaultValue={["datos"]}
            className="flex flex-col gap-3"
            style={{ "--acento-bg": `${colorSecundario || "#71717a"}1a` } as React.CSSProperties}
          >
            {SECCIONES.map((seccion) => (
              <Accordion.Item key={seccion.id} value={seccion.id} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    {seccion.titulo}
                    <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 ease-out group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>{seccion.contenido}</Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion.Root>

          {mostrarSeccionPago && (
            <fieldset className={cn(panelClase, "flex flex-col gap-3 p-5")}>
              <legend className="mb-1 px-1 text-sm font-semibold text-foreground">
                Tu plan
              </legend>
              {contenidoResumenPago}
            </fieldset>
          )}

          {contenidoAvisoBloqueos}
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <Button
            type="submit"
            size="lg"
            disabled={saving || guardadoExito || slugBloqueaGuardado || personalizacionBloqueaGuardado}
            className={cn(
              "w-full transition-colors duration-300 ease-out",
              guardadoExito && "bg-emerald-600 text-white hover:bg-emerald-600"
            )}
          >
            {contenidoBotonGuardar}
          </Button>
        </form>

        {/* Barra fija + tabs: solo mobile. El submit apunta a #tarjeta-form
            vía el atributo `form`, aunque el <form> esté oculto en mobile. */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] pt-2.5 backdrop-blur lg:hidden">
          {personalizacionBloqueaGuardado && <div className="px-4">{contenidoAvisoBloqueos}</div>}
          {saveError && <p className="px-4 text-xs text-destructive">{saveError}</p>}
          <div className="px-4">
            <Button
              type="submit"
              form="tarjeta-form"
              size="sm"
              disabled={saving || guardadoExito || slugBloqueaGuardado || personalizacionBloqueaGuardado}
              className={cn(
                "w-full transition-colors duration-300 ease-out",
                guardadoExito && "bg-emerald-600 text-white hover:bg-emerald-600"
              )}
            >
              {contenidoBotonGuardar}
            </Button>
          </div>
          <nav className="flex gap-1.5 overflow-x-auto px-4 pb-2.5">
            {SECCIONES.map((seccion) => (
              <button
                key={seccion.id}
                type="button"
                onClick={() => setTabMovilAbierto(seccion.id)}
                className={tabMovilClase}
              >
                {seccion.titulo}
              </button>
            ))}
            {mostrarSeccionPago && (
              <button
                type="button"
                onClick={() => setTabMovilAbierto("pago")}
                className={tabMovilClase}
              >
                Tu plan
              </button>
            )}
            {esEdicion && tarjeta && (
              <button
                type="button"
                onClick={() => setTabMovilAbierto("compartir")}
                className={tabMovilClase}
              >
                Compartir
              </button>
            )}
          </nav>
        </div>

        {/* Drawers mobile: un Drawer por sección, mismo `seccion.contenido`
            que usa el accordion de desktop (nada duplicado). */}
        {SECCIONES.map((seccion) => (
          <Drawer.Root
            key={seccion.id}
            open={tabMovilAbierto === seccion.id}
            onOpenChange={(open) => setTabMovilAbierto(open ? seccion.id : null)}
          >
            <Drawer.Portal>
              <Drawer.Backdrop className={drawerBackdropClase} />
              <Drawer.Viewport className={drawerViewportClase}>
                <Drawer.Popup className={drawerPopupClase}>
                  <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border" />
                  <div className="flex items-center justify-between px-5 py-3">
                    <Drawer.Title className="text-sm font-semibold text-foreground">
                      {seccion.titulo}
                    </Drawer.Title>
                    <Drawer.Close
                      aria-label="Cerrar"
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </Drawer.Close>
                  </div>
                  {seccion.contenido}
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.Root>
        ))}

        {mostrarSeccionPago && (
          <Drawer.Root
            open={tabMovilAbierto === "pago"}
            onOpenChange={(open) => setTabMovilAbierto(open ? "pago" : null)}
          >
            <Drawer.Portal>
              <Drawer.Backdrop className={drawerBackdropClase} />
              <Drawer.Viewport className={drawerViewportClase}>
                <Drawer.Popup className={drawerPopupClase}>
                  <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border" />
                  <div className="flex items-center justify-between px-5 py-3">
                    <Drawer.Title className="text-sm font-semibold text-foreground">
                      Tu plan
                    </Drawer.Title>
                    <Drawer.Close
                      aria-label="Cerrar"
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </Drawer.Close>
                  </div>
                  <div className="px-5 pb-5">{contenidoResumenPago}</div>
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.Root>
        )}

        {esEdicion && tarjeta && (
          <Drawer.Root
            open={tabMovilAbierto === "compartir"}
            onOpenChange={(open) => setTabMovilAbierto(open ? "compartir" : null)}
          >
            <Drawer.Portal>
              <Drawer.Backdrop className={drawerBackdropClase} />
              <Drawer.Viewport className={drawerViewportClase}>
                <Drawer.Popup className={drawerPopupClase}>
                  <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border" />
                  <div className="flex items-center justify-between px-5 py-3">
                    <Drawer.Title className="text-sm font-semibold text-foreground">
                      Compartir
                    </Drawer.Title>
                    <Drawer.Close
                      aria-label="Cerrar"
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </Drawer.Close>
                  </div>
                  <div className="flex flex-col gap-5 px-5 pb-5">
                    <TarjetaQr slug={slugGuardado} variant="inline" />
                    <CompartirTarjeta
                      slug={slugGuardado}
                      titulo={nombre || "Linkard"}
                      variant="inline"
                    />
                  </div>
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.Root>
        )}
      </div>

      {avatarMostrado && (
        <ReposicionarImagen
          abierto={reposicionandoAvatar}
          imagenUrl={avatarMostrado}
          valorInicial={avatarPosicion}
          alto={280}
          onCancelar={() => setReposicionandoAvatar(false)}
          onConfirmar={(pos) => {
            setAvatarPosicion(pos)
            setReposicionandoAvatar(false)
          }}
        />
      )}
    </div>
  )
}
