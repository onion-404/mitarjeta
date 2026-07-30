"use client"

import { Accordion } from "@base-ui/react/accordion"
import { Drawer } from "@base-ui/react/drawer"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
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

import { AgendaServicios } from "@/components/tarjeta/agenda-servicios"
import { EstadisticasTarjeta } from "@/components/tarjeta/estadisticas-tarjeta"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CandadoPlan } from "@/components/tarjeta/candado-plan"
import { CompartirTarjeta } from "@/components/tarjeta/compartir-tarjeta"
import { OpcionPersonalizacion, SwatchDivisor, SwatchForma } from "@/components/tarjeta/opcion-personalizacion"
import { PlantillasGaleria } from "@/components/tarjeta/plantillas-galeria"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"
import { RecortarAvatar } from "@/components/tarjeta/recortar-avatar"
import { ReposicionarImagen } from "@/components/tarjeta/reposicionar-imagen"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { TarjetaQr } from "@/components/tarjeta/tarjeta-qr"
import { BANNER_PRESETS } from "@/lib/banner-presets"
import { validarCupon } from "@/lib/cupones"
import {
  DIVISORES_BANNER,
  ESTILOS_TIPOGRAFIA,
  FORMAS_AVATAR,
  calcularBloqueos,
  estaBloqueada,
  type Plantilla,
} from "@/lib/personalizacion"
import { PLATAFORMAS, obtenerPlataforma } from "@/lib/redes"
import { subirImagenCloudinary, validarImagen } from "@/lib/subir-imagen"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type {
  AvatarForma,
  Cupon,
  DatosContacto,
  DivisorBanner,
  EstiloTipografia,
  IdentidadVisual,
  PeriodicidadSuscripcion,
  Plan,
  PlataformaRed,
  Producto,
  RedSocial,
  ServicioAgendable,
  SeccionServicios,
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

/** Un ítem de sección de Servicios usa exactamente la misma forma que un
 *  ítem de Producto (mismos 5 campos) — se reusa el tipo en vez de
 *  duplicarlo. */
interface SeccionServiciosFormState {
  titulo: string
  items: ProductoFormState[]
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

  const [tipo, setTipo] = React.useState<TarjetaTipo>(tarjeta?.tipo ?? "personal")

  // Personal
  const [nombre, setNombre] = React.useState(datosIniciales?.nombre ?? "")
  const [empresa, setEmpresa] = React.useState(datosIniciales?.empresa ?? "")
  const [puesto, setPuesto] = React.useState(datosIniciales?.puesto ?? "")
  const [telefono, setTelefono] = React.useState(datosIniciales?.telefono ?? "")
  const [whatsapp, setWhatsapp] = React.useState(datosIniciales?.whatsapp ?? "")
  const [email, setEmail] = React.useState(datosIniciales?.email ?? "")

  // Empresarial
  const [nombreEmpresa, setNombreEmpresa] = React.useState(
    datosIniciales?.nombreEmpresa ?? ""
  )
  const [giro, setGiro] = React.useState(datosIniciales?.giro ?? "")
  const [telefonoCorporativo, setTelefonoCorporativo] = React.useState(
    datosIniciales?.telefonoCorporativo ?? ""
  )
  const [sitioWeb, setSitioWeb] = React.useState(datosIniciales?.sitioWeb ?? "")
  const [horarios, setHorarios] = React.useState(datosIniciales?.horarios ?? "")

  // Común
  const [direccion, setDireccion] = React.useState(datosIniciales?.direccion ?? "")
  const [direccionMapsUrl, setDireccionMapsUrl] = React.useState(
    datosIniciales?.direccionMapsUrl ?? ""
  )
  const [videoUrl, setVideoUrl] = React.useState(datosIniciales?.videoUrl ?? "")
  const [redes, setRedes] = React.useState<RedSocial[]>(datosIniciales?.redes ?? [])

  // Servicios — N secciones independientes (tope 1/2/3 según plan, ver
  // secciones_servicios_max más abajo), cada ítem con los mismos 5 campos
  // que un Producto (título, precio, descripción, imagen, enlace). El
  // folleto PDF de abajo solo se ofrece en la sección [0].
  // Compatibilidad: si la tarjeta ya tiene `seccionesServicios` guardado, se
  // usa directo. Si no (tarjeta vieja con el modelo previo de una sola lista
  // título+descripción, o tarjeta nueva sin nada todavía), se arma UNA
  // sección en memoria a partir de `servicios`/`tituloServicios` — no se
  // escribe nada hasta el próximo guardado, así ninguna tarjeta real pierde
  // datos por no haber sido regrabada.
  const [seccionesServicios, setSeccionesServicios] = React.useState<SeccionServiciosFormState[]>(
    () => {
      if (datosIniciales?.seccionesServicios?.length) {
        return datosIniciales.seccionesServicios.map((seccion) => ({
          titulo: seccion.titulo,
          items: seccion.items.map((item) => ({
            titulo: item.titulo,
            descripcion: item.descripcion ?? "",
            precio: item.precio ?? "",
            enlaceUrl: item.enlaceUrl ?? "",
            imagenFile: null,
            imagenPreview: "",
            imagenUrlExistente: item.imagenUrl ?? "",
          })),
        }))
      }
      const legacyServicios = datosIniciales?.servicios ?? []
      return [
        {
          titulo: visualInicial?.tituloServicios ?? "",
          items: legacyServicios.map((servicio) => ({
            titulo: servicio.titulo,
            descripcion: servicio.descripcion ?? "",
            precio: "",
            enlaceUrl: "",
            imagenFile: null,
            imagenPreview: "",
            imagenUrlExistente: "",
          })),
        },
      ]
    }
  )

  // Brochure (PDF)
  const [brochureFile, setBrochureFile] = React.useState<File | null>(null)
  const [brochureUrlExistente, setBrochureUrlExistente] = React.useState(
    visualInicial?.brochureUrl ?? ""
  )
  const [brochureInputKey, setBrochureInputKey] = React.useState(0)
  const brochureAbortRef = React.useRef<AbortController | null>(null)

  // Productos
  const [productos, setProductos] = React.useState<ProductoFormState[]>(
    (datosIniciales?.productos ?? []).map((producto) => ({
      titulo: producto.titulo,
      descripcion: producto.descripcion ?? "",
      precio: producto.precio ?? "",
      enlaceUrl: producto.enlaceUrl ?? "",
      imagenFile: null,
      imagenPreview: "",
      imagenUrlExistente: producto.imagenUrl ?? "",
    }))
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

  // Título personalizable de la sección "Productos" — vive en identidad_visual
  // (jsonb, sin migración) igual que el resto del sistema de
  // personalización. Vacío = usa el default ("Productos") tanto acá como en
  // TarjetaCard. El título de "Servicios" ahora vive POR SECCIÓN dentro de
  // `seccionesServicios[].titulo` (ver más arriba) — ya no acá.
  const [tituloProductos, setTituloProductos] = React.useState(
    visualInicial?.tituloProductos ?? ""
  )

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
  const [avatarPendiente, setAvatarPendiente] = React.useState<File | null>(null)

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

  // Enlace personalizado (opcional, solo al crear)
  const [slugPersonalizado, setSlugPersonalizado] = React.useState("")
  // Último slug efectivamente consultado y su disponibilidad. `verificandoSlug`
  // y `slugDisponible` se derivan de esto comparando contra el valor actual
  // del input, en vez de guardarse aparte (evita setState síncrono en el
  // efecto de chequeo).
  const [resultadoSlug, setResultadoSlug] = React.useState<{
    slug: string
    disponible: boolean
  } | null>(null)
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

  const esEmpresarial = tipo === "empresarial"

  // Chequeo de disponibilidad del enlace personalizado, con debounce de 500ms.
  React.useEffect(() => {
    if (esEdicion) return

    const slug = slugPersonalizado.trim()
    if (slug.length < 4) return

    const timeoutId = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("tarjetas")
        .select("slug")
        .eq("slug", slug)
        .maybeSingle()

      // Si falló la consulta (red, etc.) no bloqueamos: la unicidad real se
      // valida igual al guardar, atrapando el error 23505 de Postgres.
      if (error) return
      setResultadoSlug({ slug, disponible: !data })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [slugPersonalizado, esEdicion])

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

  // Tope de secciones de Servicios según el plan REAL de la tarjeta (mismo
  // criterio fail-closed que featuresGating de arriba) — nunca por debajo de
  // lo que ya está guardado (mismo principio que calcularBloqueos: bajar de
  // plan no rompe/oculta secciones ya creadas, solo bloquea agregar una más).
  const seccionesServiciosMaxPlan = Math.max(
    Number(featuresGating?.secciones_servicios_max) || 1,
    seccionesServicios.length
  )

  function agregarSeccionServicios() {
    setSeccionesServicios((prev) =>
      prev.length >= seccionesServiciosMaxPlan ? prev : [...prev, { titulo: "", items: [] }]
    )
  }

  function quitarSeccionServicios(indiceSeccion: number) {
    setSeccionesServicios((prev) => {
      if (prev.length <= 1) return prev // siempre queda al menos una sección
      prev[indiceSeccion]?.items.forEach((item) => {
        if (item.imagenPreview) URL.revokeObjectURL(item.imagenPreview)
      })
      return prev.filter((_, i) => i !== indiceSeccion)
    })
  }

  function actualizarTituloSeccionServicios(indiceSeccion: number, titulo: string) {
    setSeccionesServicios((prev) =>
      prev.map((seccion, i) => (i === indiceSeccion ? { ...seccion, titulo } : seccion))
    )
  }

  function agregarItemServicio(indiceSeccion: number) {
    setSeccionesServicios((prev) =>
      prev.map((seccion, i) => {
        if (i !== indiceSeccion || seccion.items.length >= 12) return seccion
        return {
          ...seccion,
          items: [
            ...seccion.items,
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

  function actualizarItemServicio<K extends keyof ProductoFormState>(
    indiceSeccion: number,
    indiceItem: number,
    campo: K,
    valor: ProductoFormState[K]
  ) {
    setSeccionesServicios((prev) =>
      prev.map((seccion, i) =>
        i !== indiceSeccion
          ? seccion
          : {
              ...seccion,
              items: seccion.items.map((item, j) =>
                j === indiceItem ? { ...item, [campo]: valor } : item
              ),
            }
      )
    )
  }

  function handleItemServicioImagenChange(
    indiceSeccion: number,
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
    setSeccionesServicios((prev) =>
      prev.map((seccion, i) => {
        if (i !== indiceSeccion) return seccion
        return {
          ...seccion,
          items: seccion.items.map((item, j) => {
            if (j !== indiceItem) return item
            if (item.imagenPreview) URL.revokeObjectURL(item.imagenPreview)
            return {
              ...item,
              imagenFile: file,
              imagenPreview: URL.createObjectURL(file),
              imagenUrlExistente: "",
            }
          }),
        }
      })
    )
  }

  function quitarItemServicioImagen(indiceSeccion: number, indiceItem: number) {
    setSeccionesServicios((prev) =>
      prev.map((seccion, i) => {
        if (i !== indiceSeccion) return seccion
        return {
          ...seccion,
          items: seccion.items.map((item, j) => {
            if (j !== indiceItem) return item
            if (item.imagenPreview) URL.revokeObjectURL(item.imagenPreview)
            return { ...item, imagenFile: null, imagenPreview: "", imagenUrlExistente: "" }
          }),
        }
      })
    )
  }

  function quitarItemServicio(indiceSeccion: number, indiceItem: number) {
    setSeccionesServicios((prev) =>
      prev.map((seccion, i) => {
        if (i !== indiceSeccion) return seccion
        const item = seccion.items[indiceItem]
        if (item?.imagenPreview) URL.revokeObjectURL(item.imagenPreview)
        return { ...seccion, items: seccion.items.filter((_, j) => j !== indiceItem) }
      })
    )
  }

  function handleBrochureChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const error = validarPdf(file)
    if (error) {
      mostrarErrorArchivo(error)
      event.target.value = ""
      return
    }
    setBrochureFile(file)
    setBrochureUrlExistente("")
  }

  function quitarBrochure() {
    brochureAbortRef.current?.abort()
    brochureAbortRef.current = null
    setBrochureFile(null)
    setBrochureUrlExistente("")
    setBrochureInputKey((k) => k + 1)
  }

  function agregarProducto() {
    setProductos((prev) =>
      prev.length >= 12
        ? prev
        : [
            ...prev,
            {
              titulo: "",
              descripcion: "",
              precio: "",
              enlaceUrl: "",
              imagenFile: null,
              imagenPreview: "",
              imagenUrlExistente: "",
            },
          ]
    )
  }

  function actualizarProductoTitulo(index: number, titulo: string) {
    setProductos((prev) =>
      prev.map((producto, i) => (i === index ? { ...producto, titulo } : producto))
    )
  }

  function actualizarProductoDescripcion(index: number, descripcion: string) {
    setProductos((prev) =>
      prev.map((producto, i) => (i === index ? { ...producto, descripcion } : producto))
    )
  }

  function actualizarProductoPrecio(index: number, precio: string) {
    setProductos((prev) =>
      prev.map((producto, i) => (i === index ? { ...producto, precio } : producto))
    )
  }

  function actualizarProductoEnlace(index: number, enlaceUrl: string) {
    setProductos((prev) =>
      prev.map((producto, i) => (i === index ? { ...producto, enlaceUrl } : producto))
    )
  }

  function handleProductoImagenChange(
    index: number,
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
    setProductos((prev) =>
      prev.map((producto, i) => {
        if (i !== index) return producto
        if (producto.imagenPreview) URL.revokeObjectURL(producto.imagenPreview)
        return {
          ...producto,
          imagenFile: file,
          imagenPreview: URL.createObjectURL(file),
          imagenUrlExistente: "",
        }
      })
    )
  }

  function quitarProductoImagen(index: number) {
    setProductos((prev) =>
      prev.map((producto, i) => {
        if (i !== index) return producto
        if (producto.imagenPreview) URL.revokeObjectURL(producto.imagenPreview)
        return { ...producto, imagenFile: null, imagenPreview: "", imagenUrlExistente: "" }
      })
    )
  }

  function quitarProducto(index: number) {
    setProductos((prev) => {
      const actual = prev[index]
      if (actual?.imagenPreview) URL.revokeObjectURL(actual.imagenPreview)
      return prev.filter((_, i) => i !== index)
    })
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
    setAvatarPendiente(file)
  }

  function handleRecorteConfirmado(archivo: File) {
    setAvatarFile(archivo)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(archivo)
    })
    setAvatarPendiente(null)
    setAvatarInputKey((k) => k + 1)
  }

  function handleRecorteCancelado() {
    setAvatarPendiente(null)
    setAvatarInputKey((k) => k + 1)
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
    const nombrePrincipal = esEmpresarial ? nombreEmpresa : nombre
    if (!nombrePrincipal.trim()) {
      setSaveError(
        esEmpresarial
          ? "Ingresá el nombre de la empresa para continuar."
          : "Ingresá un nombre para continuar."
      )
      return
    }

    if (!esEdicion) {
      const slugElegido = slugPersonalizado.trim()
      if (!slugElegido) {
        setSaveError("Elegí un enlace personalizado para continuar.")
        return
      }
      if (slugElegido.length < 4) {
        setSaveError("El enlace debe tener al menos 4 caracteres.")
        return
      }
    }

    setSaving(true)
    setSaveError(null)
    setGuardadoOk(false)
    setGuardadoExito(false)

    let avatarUrl: string | undefined = avatarUrlExistente || undefined
    let bannerUrl: string | undefined = bannerUrlExistente || undefined
    let brochureUrl: string | undefined = brochureUrlExistente || undefined
    let fondoImagenUrlFinal: string | undefined = fondoImagenUrlExistente || undefined
    const imagenesProductoPorIndice = new Map<number, string>()
    const imagenesServicioItemPorClave = new Map<string, string>()

    type TareaSubida =
      | { tipo: "avatar"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "banner"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "brochure"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "fondoImagen"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "producto"; indice: number; etiqueta: string; promesa: Promise<string | null> }
      | {
          tipo: "servicioItem"
          indiceSeccion: number
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

    if (brochureFile) {
      brochureAbortRef.current = new AbortController()
      tareas.push({
        tipo: "brochure",
        etiqueta: "el folleto PDF",
        promesa: subirImagenCloudinary(
          brochureFile,
          "mitarjeta/brochures",
          brochureAbortRef.current.signal,
          "raw"
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

    productos.forEach((producto, indice) => {
      if (producto.titulo.trim() && producto.imagenFile) {
        tareas.push({
          tipo: "producto",
          indice,
          etiqueta: `la imagen de "${producto.titulo.trim()}"`,
          promesa: subirImagenCloudinary(producto.imagenFile, "mitarjeta/productos").catch(
            () => null
          ),
        })
      }
    })

    seccionesServicios.forEach((seccion, indiceSeccion) => {
      seccion.items.forEach((item, indiceItem) => {
        if (item.titulo.trim() && item.imagenFile) {
          tareas.push({
            tipo: "servicioItem",
            indiceSeccion,
            indiceItem,
            etiqueta: `la imagen de "${item.titulo.trim()}"`,
            promesa: subirImagenCloudinary(item.imagenFile, "mitarjeta/servicios").catch(
              () => null
            ),
          })
        }
      })
    })

    // Todas las subidas (avatar, banner, folleto y fotos de productos y
    // servicios) se disparan en paralelo en vez de esperarse una por una: en
    // una conexión móvil esto reduce el tiempo de guardado a una fracción
    // del secuencial.
    const resultados =
      tareas.length > 0 ? await Promise.all(tareas.map((tarea) => tarea.promesa)) : []

    avatarAbortRef.current = null
    bannerAbortRef.current = null
    brochureAbortRef.current = null
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
      else if (tarea.tipo === "brochure") brochureUrl = url
      else if (tarea.tipo === "fondoImagen") fondoImagenUrlFinal = url
      else if (tarea.tipo === "producto") imagenesProductoPorIndice.set(tarea.indice, url)
      else imagenesServicioItemPorClave.set(`${tarea.indiceSeccion}-${tarea.indiceItem}`, url)
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

    const productosFinales: Producto[] = productos
      .map((producto, indice) => ({ producto, indice }))
      .filter(({ producto }) => producto.titulo.trim())
      .map(({ producto, indice }) => ({
        titulo: producto.titulo.trim(),
        descripcion: producto.descripcion.trim() || undefined,
        precio: producto.precio.trim() || undefined,
        enlaceUrl: producto.enlaceUrl.trim() || undefined,
        imagenUrl: imagenesProductoPorIndice.get(indice) ?? producto.imagenUrlExistente ?? undefined,
      }))

    const redesFinales = redesValidas(redes)
    const seccionesServiciosFinales: SeccionServicios[] = seccionesServicios
      .map((seccion, indiceSeccion) => ({
        titulo: seccion.titulo.trim(),
        items: seccion.items
          .map((item, indiceItem) => ({ item, indiceItem }))
          .filter(({ item }) => item.titulo.trim())
          .map(({ item, indiceItem }) => ({
            titulo: item.titulo.trim(),
            descripcion: item.descripcion.trim() || undefined,
            precio: item.precio.trim() || undefined,
            enlaceUrl: item.enlaceUrl.trim() || undefined,
            imagenUrl:
              imagenesServicioItemPorClave.get(`${indiceSeccion}-${indiceItem}`) ??
              item.imagenUrlExistente ??
              undefined,
          })),
      }))
      // La sección [0] siempre se guarda (aunque esté vacía, es la
      // "Servicios" por defecto) — las siguientes solo si tienen título o
      // algún ítem, para no persistir una sección vacía que se abrió pero
      // nunca se llenó.
      .filter((seccion, i) => i === 0 || seccion.titulo || seccion.items.length > 0)

    const comunes: DatosContacto = {
      direccion: direccion.trim() || undefined,
      direccionMapsUrl: direccionMapsUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      seccionesServicios: seccionesServiciosFinales,
      productos: productosFinales,
      redes: redesFinales,
    }
    const datos_contacto: DatosContacto = esEmpresarial
      ? {
          ...comunes,
          nombreEmpresa: nombreEmpresa.trim(),
          giro: giro.trim() || undefined,
          telefonoCorporativo: telefonoCorporativo.trim() || undefined,
          sitioWeb: sitioWeb.trim() || undefined,
          horarios: horarios.trim() || undefined,
        }
      : {
          ...comunes,
          nombre: nombre.trim(),
          empresa: empresa.trim() || undefined,
          puesto: puesto.trim() || undefined,
          telefono: telefono.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          email: email.trim() || undefined,
        }

    const identidad_visual: IdentidadVisual = {
      colorPrimario,
      colorSecundario,
      avatarUrl,
      bannerUrl,
      bannerPreset: bannerUrl ? undefined : bannerPresetId,
      brochureUrl,
      temaModo,
      avatarForma,
      estiloTipografia,
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
      tituloProductos: tituloProductos.trim() || undefined,
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
        .update({ tipo, datos_contacto, identidad_visual })
        .eq("id", tarjeta.id)

      setSaving(false)
      if (error) {
        setSaveError("No pudimos guardar los cambios. Probá de nuevo en unos segundos.")
        return
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
        .update({ tipo, datos_contacto, identidad_visual })
        .eq("id", tarjeta.id)

      if (error) {
        setSaveError("No pudimos guardar los cambios. Probá de nuevo en unos segundos.")
        setSaving(false)
        return
      }
      await alGuardarConExito({ id: tarjeta.id, slug: tarjeta.slug })
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
  const brochureMostrado = brochureUrlExistente || (brochureFile ? "#" : undefined)
  const productosActuales: Producto[] = productos
    .filter((producto) => producto.titulo.trim())
    .map((producto) => ({
      titulo: producto.titulo,
      descripcion: producto.descripcion || undefined,
      precio: producto.precio || undefined,
      enlaceUrl: producto.enlaceUrl || undefined,
      imagenUrl: producto.imagenPreview || producto.imagenUrlExistente || undefined,
    }))

  const seccionesServiciosActuales: SeccionServicios[] = seccionesServicios.map((seccion) => ({
    titulo: seccion.titulo,
    items: seccion.items
      .filter((item) => item.titulo.trim())
      .map((item) => ({
        titulo: item.titulo,
        descripcion: item.descripcion || undefined,
        precio: item.precio || undefined,
        enlaceUrl: item.enlaceUrl || undefined,
        imagenUrl: item.imagenPreview || item.imagenUrlExistente || undefined,
      })),
  }))

  const comunesActuales = {
    direccion,
    direccionMapsUrl,
    videoUrl,
    seccionesServicios: seccionesServiciosActuales,
    productos: productosActuales,
    redes: redesValidas(redes),
  }

  const datosContactoActual: DatosContacto = esEmpresarial
    ? {
        ...comunesActuales,
        nombreEmpresa,
        giro,
        telefonoCorporativo,
        sitioWeb,
        horarios,
      }
    : {
        ...comunesActuales,
        nombre,
        empresa,
        puesto,
        telefono,
        whatsapp,
        email,
      }

  const identidadVisualActual: IdentidadVisual = {
    colorPrimario,
    colorSecundario,
    avatarUrl: avatarMostrado,
    bannerUrl: bannerMostrado,
    bannerPreset: bannerMostrado ? undefined : bannerPresetId,
    brochureUrl: brochureMostrado,
    temaModo,
    avatarForma,
    estiloTipografia,
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
    tituloProductos: tituloProductos.trim() || undefined,
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

  const slugBloqueaGuardado =
    !esEdicion &&
    (!slugActualTrim || slugMuyCorto || verificandoSlug || slugDisponible === false)

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
              <span className="text-xs text-muted-foreground">Texto general</span>
              <input
                type="color"
                value={colorTextoGeneral}
                onChange={(e) => setColorTextoGeneral(e.target.value)}
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={labelClase}>Tipografía</span>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Modo avanzado
            {bloqueoTipografiaAvanzada && <CandadoPlan plan={bloqueoTipografiaAvanzada.plan} />}
            <Switch checked={modoTipografiaAvanzado} onCheckedChange={setModoTipografiaAvanzado} />
          </label>
        </div>
        <span className="text-xs text-muted-foreground">
          {modoTipografiaAvanzado ? "Título" : "Estilo tipográfico"}
        </span>
        <div className="grid grid-cols-3 gap-2">
          {ESTILOS_TIPOGRAFIA.map((estilo) => {
            const bloqueada = estaBloqueada(
              estilo.tier,
              estilo.id,
              visualInicial?.estiloTipografia ?? "moderna",
              featuresPersonalizacion
            )
            return (
              <OpcionPersonalizacion
                key={estilo.id}
                seleccionada={estiloTipografia === estilo.id}
                bloqueada={bloqueada}
                etiqueta={estilo.etiqueta}
                onClick={() => setEstiloTipografia(estilo.id)}
              >
                <span style={{ fontFamily: estilo.fuente }} className="text-lg font-semibold">
                  Aa
                </span>
              </OpcionPersonalizacion>
            )
          })}
        </div>

        {modoTipografiaAvanzado && (
          <>
            <span className="mt-2 text-xs text-muted-foreground">Cuerpo</span>
            <div className="grid grid-cols-3 gap-2">
              {ESTILOS_TIPOGRAFIA.map((estilo) => (
                <OpcionPersonalizacion
                  key={estilo.id}
                  seleccionada={estiloTipografiaCuerpo === estilo.id}
                  etiqueta={estilo.etiqueta}
                  onClick={() => setEstiloTipografiaCuerpo(estilo.id)}
                >
                  <span style={{ fontFamily: estilo.fuente }} className="text-lg font-semibold">
                    Aa
                  </span>
                </OpcionPersonalizacion>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )

  const contenidoDatosEsenciales = (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
      {esEmpresarial ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={labelClase}>Nombre de la empresa</span>
            <input
              required
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              onFocus={() => scrollPreviewTo("nombre")}
              placeholder="Ej. Café Aroma"
              className={inputClase}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClase}>Giro / Razón social</span>
            <input
              value={giro}
              onChange={(e) => setGiro(e.target.value)}
              onFocus={() => scrollPreviewTo("nombre")}
              placeholder="Ej. Cafetería"
              className={inputClase}
            />
          </label>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={labelClase}>Nombre completo</span>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onFocus={() => scrollPreviewTo("nombre")}
              placeholder="Ej. María Gómez"
              className={inputClase}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClase}>Empresa</span>
            <input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              onFocus={() => scrollPreviewTo("nombre")}
              placeholder="Ej. Grupo Aroma"
              className={inputClase}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClase}>Puesto o profesión</span>
            <input
              value={puesto}
              onChange={(e) => setPuesto(e.target.value)}
              onFocus={() => scrollPreviewTo("nombre")}
              placeholder="Ej. Abogada"
              className={inputClase}
            />
          </label>
        </>
      )}

      {!esEdicion && (
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
                  <Check className="size-3" /> Enlace disponible
                </>
              ) : slugDisponible === false ? (
                <>
                  <X className="size-3" /> Este enlace ya está en uso
                </>
              ) : null}
            </p>
          )}
        </label>
      )}

      <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        ¡No te preocupes! {esEdicion ? "El único campo obligatorio es tu nombre." : "Los únicos campos obligatorios son tu nombre y tu enlace personalizado."}{" "}
        Todos los demás datos los puedes agregar, cambiar o
        mejorar en el momento que quieras.
      </p>
    </div>
  )

  const contenidoAvatarYBanner = (
    <div className="flex flex-col gap-5 px-5 pb-5 pt-1">
      <div className="flex flex-col gap-1.5">
        <span className={labelClase}>
          {esEmpresarial ? "Foto o logo" : "Foto de perfil"}
        </span>
        <div className="flex items-center gap-3">
          {avatarMostrado && (
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL de Cloudinary */}
              <img
                src={avatarMostrado}
                alt="Vista previa de la foto"
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
          alto={192}
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
      {esEmpresarial ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={labelClase}>Teléfono corporativo</span>
            <input
              type="tel"
              value={telefonoCorporativo}
              onChange={(e) => setTelefonoCorporativo(e.target.value)}
              onFocus={() => scrollPreviewTo("contacto")}
              placeholder="+54 11 5555-5555"
              className={inputClase}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClase}>Sitio web</span>
            <input
              value={sitioWeb}
              onChange={(e) => setSitioWeb(e.target.value)}
              onFocus={() => scrollPreviewTo("contacto")}
              placeholder="https://..."
              className={inputClase}
            />
          </label>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClase}>Teléfono celular</span>
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
        </>
      )}
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
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            onFocus={() => scrollPreviewTo("ubicacion")}
            placeholder="Av. Siempre Viva 742"
            className={inputClase}
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
      {esEmpresarial && (
        <label className="flex flex-col gap-1.5">
          <span className={labelClase}>Horarios de atención</span>
          <input
            value={horarios}
            onChange={(e) => setHorarios(e.target.value)}
            onFocus={() => scrollPreviewTo("ubicacion")}
            placeholder="Lun a Vie 9 a 18hs"
            className={inputClase}
          />
        </label>
      )}
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

  // Mismo patrón visual/UX que "Productos" (título, precio, descripción,
  // enlace, imagen por ítem) — reemplaza al viejo "Servicios" de una sola
  // lista título+descripción. Una función en vez de una constante porque
  // ahora puede haber 1/2/3 secciones (según plan), cada una con su propio
  // campo de título editable en tiempo real (ver SECCIONES más abajo).
  function contenidoSeccionServicios(indiceSeccion: number) {
    const seccion = seccionesServicios[indiceSeccion]
    if (!seccion) return null
    const esUltima = indiceSeccion === seccionesServicios.length - 1
    const campoScroll = `servicios-${indiceSeccion}`

    return (
      <div className="flex flex-col gap-3 px-5 pb-5 pt-1">
        <div className="flex items-center gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClase}>Título de la sección</span>
            <input
              value={seccion.titulo}
              onChange={(e) => actualizarTituloSeccionServicios(indiceSeccion, e.target.value)}
              onFocus={() => scrollPreviewTo(campoScroll)}
              placeholder={indiceSeccion === 0 ? "Servicios" : `Sección ${indiceSeccion + 1}`}
              className={inputClase}
            />
          </label>
          {indiceSeccion > 0 && (
            <button
              type="button"
              onClick={() => quitarSeccionServicios(indiceSeccion)}
              aria-label="Quitar esta sección"
              className="mt-6 shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {seccion.items.map((item, index) => {
          const imagenMostrada = item.imagenPreview || item.imagenUrlExistente
          return (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/50 p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  value={item.titulo}
                  onChange={(e) =>
                    actualizarItemServicio(indiceSeccion, index, "titulo", e.target.value)
                  }
                  onFocus={() => scrollPreviewTo(campoScroll)}
                  placeholder="Título del servicio"
                  className={cn(inputClase, "flex-1")}
                />
                <div className="flex w-32 shrink-0 items-center overflow-hidden rounded-xl border border-border bg-muted/60">
                  <span className="shrink-0 pl-3 text-xs text-muted-foreground">$</span>
                  <input
                    value={item.precio}
                    onChange={(e) =>
                      actualizarItemServicio(indiceSeccion, index, "precio", e.target.value)
                    }
                    onFocus={() => scrollPreviewTo(campoScroll)}
                    placeholder="Precio"
                    className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => quitarItemServicio(indiceSeccion, index)}
                  aria-label="Quitar servicio"
                  className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <input
                value={item.descripcion}
                onChange={(e) =>
                  actualizarItemServicio(indiceSeccion, index, "descripcion", e.target.value)
                }
                onFocus={() => scrollPreviewTo(campoScroll)}
                placeholder="Descripción corta (opcional)"
                className={inputClase}
              />
              <input
                type="url"
                value={item.enlaceUrl}
                onChange={(e) =>
                  actualizarItemServicio(indiceSeccion, index, "enlaceUrl", e.target.value)
                }
                onFocus={() => scrollPreviewTo(campoScroll)}
                placeholder="Enlace para agendar o ver más (opcional)"
                className={inputClase}
              />
              <div className="flex items-center gap-3">
                {imagenMostrada && (
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL de Cloudinary */}
                    <img
                      src={imagenMostrada}
                      alt="Vista previa del servicio"
                      className="size-12 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => quitarItemServicioImagen(indiceSeccion, index)}
                      aria-label="Quitar imagen del servicio"
                      className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleItemServicioImagenChange(indiceSeccion, index, e)}
                  onFocus={() => scrollPreviewTo(campoScroll)}
                  className={cn(
                    inputClase,
                    "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                  )}
                />
              </div>
            </div>
          )
        })}

        {seccion.items.length < 12 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => agregarItemServicio(indiceSeccion)}
            className="self-start"
          >
            <Plus className="size-3.5" /> Agregar servicio
          </Button>
        )}

        {indiceSeccion === 0 && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClase}>Folleto o presentación (PDF)</span>
            <div className="flex items-center gap-3">
              {(brochureUrlExistente || brochureFile) && (
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="max-w-32 truncate text-xs text-foreground">
                    {brochureFile?.name || "Folleto actual"}
                  </span>
                  <button
                    type="button"
                    onClick={quitarBrochure}
                    aria-label="Quitar folleto"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
              <input
                key={brochureInputKey}
                type="file"
                accept="application/pdf"
                onChange={handleBrochureChange}
                onFocus={() => scrollPreviewTo(campoScroll)}
                className={cn(
                  inputClase,
                  "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                )}
              />
            </div>
          </label>
        )}

        {esUltima &&
          (seccionesServicios.length < seccionesServiciosMaxPlan ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={agregarSeccionServicios}
              className="self-start"
            >
              <Plus className="size-3.5" /> Agregar otra sección de servicios
            </Button>
          ) : (
            seccionesServicios.length < 3 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CandadoPlan plan={seccionesServicios.length === 1 ? "alcance" : "poder"} />
                Actualizá tu plan para agregar otra sección de servicios.
              </div>
            )
          ))}
      </div>
    )
  }

  const contenidoProductos = (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-1">
      <label className="flex flex-col gap-1.5">
        <span className={labelClase}>Título de la sección</span>
        <input
          value={tituloProductos}
          onChange={(e) => setTituloProductos(e.target.value)}
          onFocus={() => scrollPreviewTo("productos")}
          placeholder="Productos"
          className={inputClase}
        />
      </label>

      {productos.map((producto, index) => {
        const imagenMostrada = producto.imagenPreview || producto.imagenUrlExistente
        return (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/50 p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={producto.titulo}
                onChange={(e) => actualizarProductoTitulo(index, e.target.value)}
                onFocus={() => scrollPreviewTo("productos")}
                placeholder="Título del producto"
                className={cn(inputClase, "flex-1")}
              />
              <div className="flex w-32 shrink-0 items-center overflow-hidden rounded-xl border border-border bg-muted/60">
                <span className="shrink-0 pl-3 text-xs text-muted-foreground">$</span>
                <input
                  value={producto.precio}
                  onChange={(e) => actualizarProductoPrecio(index, e.target.value)}
                  onFocus={() => scrollPreviewTo("productos")}
                  placeholder="Precio"
                  className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => quitarProducto(index)}
                aria-label="Quitar producto"
                className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <input
              value={producto.descripcion}
              onChange={(e) => actualizarProductoDescripcion(index, e.target.value)}
              onFocus={() => scrollPreviewTo("productos")}
              placeholder="Descripción corta (opcional)"
              className={inputClase}
            />
            <input
              type="url"
              value={producto.enlaceUrl}
              onChange={(e) => actualizarProductoEnlace(index, e.target.value)}
              onFocus={() => scrollPreviewTo("productos")}
              placeholder="Enlace para comprar o ver más (opcional)"
              className={inputClase}
            />
            <div className="flex items-center gap-3">
              {imagenMostrada && (
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL de Cloudinary */}
                  <img
                    src={imagenMostrada}
                    alt="Vista previa del producto"
                    className="size-12 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => quitarProductoImagen(index)}
                    aria-label="Quitar imagen del producto"
                    className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleProductoImagenChange(index, e)}
                onFocus={() => scrollPreviewTo("productos")}
                className={cn(
                  inputClase,
                  "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                )}
              />
            </div>
          </div>
        )
      })}

      {productos.length < 12 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={agregarProducto}
          className="self-start"
        >
          <Plus className="size-3.5" /> Agregar producto
        </Button>
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
    ...seccionesServicios.map((seccion, indiceSeccion) => ({
      id: `servicios-${indiceSeccion}`,
      titulo: seccion.titulo.trim() || (indiceSeccion === 0 ? "Servicios" : `Sección ${indiceSeccion + 1}`),
      contenido: contenidoSeccionServicios(indiceSeccion),
    })),
    { id: "productos", titulo: "Productos", contenido: contenidoProductos },
    ...(esEdicion && tarjeta ? [{ id: "agenda", titulo: "Agenda", contenido: contenidoAgenda }] : []),
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
            <Link href={`/${tarjeta.slug}`} className="underline underline-offset-2">
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
            slug={tarjeta.slug}
            agendaServicios={agendaServiciosPreview}
            mostrarAcciones
            className="relative"
          />
          <TarjetaQr slug={tarjeta.slug} />
          <CompartirTarjeta
            slug={tarjeta.slug}
            titulo={
              (esEmpresarial ? nombreEmpresa : nombre) || "Linkard"
            }
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
                  slug={esEdicion ? tarjeta?.slug : slugPersonalizado.trim()}
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
          <div className="inline-flex w-fit rounded-full border border-border bg-white/70 p-1 shadow-sm backdrop-blur dark:bg-zinc-900/50">
            {(["personal", "empresarial"] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setTipo(opcion)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out",
                  tipo === opcion
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opcion === "personal" ? "Personal" : "Empresarial"}
              </button>
            ))}
          </div>

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
                    <TarjetaQr slug={tarjeta.slug} variant="inline" />
                    <CompartirTarjeta
                      slug={tarjeta.slug}
                      titulo={(esEmpresarial ? nombreEmpresa : nombre) || "Linkard"}
                      variant="inline"
                    />
                  </div>
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.Root>
        )}
      </div>

      <RecortarAvatar
        archivo={avatarPendiente}
        onCancelar={handleRecorteCancelado}
        onConfirmar={handleRecorteConfirmado}
      />
    </div>
  )
}
