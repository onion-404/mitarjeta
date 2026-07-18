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
  Plus,
  Sun,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { AgendaServicios } from "@/components/tarjeta/agenda-servicios"
import { Button } from "@/components/ui/button"
import { CompartirTarjeta } from "@/components/tarjeta/compartir-tarjeta"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"
import { RecortarAvatar } from "@/components/tarjeta/recortar-avatar"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { TarjetaQr } from "@/components/tarjeta/tarjeta-qr"
import { BANNER_PRESETS } from "@/lib/banner-presets"
import { validarCupon } from "@/lib/configuracion"
import { PLATAFORMAS, obtenerPlataforma } from "@/lib/redes"
import { subirImagenCloudinary } from "@/lib/subir-imagen"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type {
  AvatarForma,
  Cupon,
  DatosContacto,
  EstiloTipografia,
  PeriodicidadSuscripcion,
  Plan,
  PlataformaRed,
  Producto,
  RedSocial,
  ServicioAgendable,
  Servicio,
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

function generarSlug(nombre: string) {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  const sufijo =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8)
  return `${base || "tarjeta"}-${sufijo}`
}

function redesValidas(redes: RedSocial[]) {
  return redes.filter((red) => {
    if (red.plataforma === "personalizado") return red.url.trim().length > 0
    return red.url.trim().length > obtenerPlataforma(red.plataforma).prefijo.length
  })
}

const TAMANO_MAXIMO_ARCHIVO_MB = 5
const TAMANO_MAXIMO_ARCHIVO = TAMANO_MAXIMO_ARCHIVO_MB * 1024 * 1024

/** Valida tipo y peso antes de aceptar una imagen (avatar, banner o producto). */
function validarImagen(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return `"${file.name}" no es una imagen válida.`
  }
  if (file.size > TAMANO_MAXIMO_ARCHIVO) {
    return `"${file.name}" pesa más de ${TAMANO_MAXIMO_ARCHIVO_MB}MB. Elegí una imagen más liviana para que tu tarjeta cargue rápido.`
  }
  return null
}

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
}

export function TarjetaForm({ tarjeta, plan, periodicidad = "anual" }: TarjetaFormProps) {
  const esEdicion = Boolean(tarjeta)
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

  // Servicios
  const [descripcionServicios, setDescripcionServicios] = React.useState(
    datosIniciales?.descripcionServicios ?? ""
  )
  const [servicios, setServicios] = React.useState<Servicio[]>(
    datosIniciales?.servicios ?? []
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
  const [toast, setToast] = React.useState<{ tipo: "advertencia" | "error"; mensaje: string } | null>(
    null
  )

  function mostrarToast(tipo: "advertencia" | "error", mensaje: string) {
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
    if (!slug) return

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

  function agregarServicio() {
    setServicios((prev) =>
      prev.length >= 8 ? prev : [...prev, { titulo: "", descripcion: "" }]
    )
  }

  function actualizarServicioTitulo(index: number, titulo: string) {
    setServicios((prev) =>
      prev.map((servicio, i) => (i === index ? { ...servicio, titulo } : servicio))
    )
  }

  function actualizarServicioDescripcion(index: number, descripcion: string) {
    setServicios((prev) =>
      prev.map((servicio, i) => (i === index ? { ...servicio, descripcion } : servicio))
    )
  }

  function quitarServicio(index: number) {
    setServicios((prev) => prev.filter((_, i) => i !== index))
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

    setSaving(true)
    setSaveError(null)
    setGuardadoOk(false)
    setGuardadoExito(false)

    let avatarUrl: string | undefined = avatarUrlExistente || undefined
    let bannerUrl: string | undefined = bannerUrlExistente || undefined
    let brochureUrl: string | undefined = brochureUrlExistente || undefined
    const imagenesProductoPorIndice = new Map<number, string>()

    type TareaSubida =
      | { tipo: "avatar"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "banner"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "brochure"; etiqueta: string; promesa: Promise<string | null> }
      | { tipo: "producto"; indice: number; etiqueta: string; promesa: Promise<string | null> }

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

    // Todas las subidas (avatar, banner, folleto y fotos de productos) se
    // disparan en paralelo en vez de esperarse una por una: en una conexión
    // móvil esto reduce el tiempo de guardado a una fracción del secuencial.
    const resultados =
      tareas.length > 0 ? await Promise.all(tareas.map((tarea) => tarea.promesa)) : []

    avatarAbortRef.current = null
    bannerAbortRef.current = null
    brochureAbortRef.current = null

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
      else imagenesProductoPorIndice.set(tarea.indice, url)
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
    const serviciosFinales = servicios.filter((servicio) => servicio.titulo.trim())
    const comunes: DatosContacto = {
      direccion: direccion.trim() || undefined,
      direccionMapsUrl: direccionMapsUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      descripcionServicios: descripcionServicios.trim() || undefined,
      servicios: serviciosFinales,
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

    const identidad_visual = {
      colorPrimario,
      colorSecundario,
      avatarUrl,
      bannerUrl,
      bannerPreset: bannerUrl ? undefined : bannerPresetId,
      brochureUrl,
      temaModo,
      avatarForma,
      estiloTipografia,
    }

    if (esEdicion && tarjeta) {
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
      const suscripcionRes = await fetch("/api/suscripciones", {
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
        initPoint?: string
        error?: string
      }

      if (suscripcionData.initPoint) {
        // Un instante de confirmación visual antes de salir hacia Mercado
        // Pago; se siente más premium que un redirect abrupto.
        setGuardadoExito(true)
        await new Promise((resolve) => window.setTimeout(resolve, 700))
        window.location.assign(suscripcionData.initPoint)
        return
      }

      setSaveError(
        "Tu tarjeta se guardó, pero no pudimos iniciar la suscripción con Mercado Pago. Volvé a intentar desde el editor."
      )
      setSaving(false)
    }

    const datosBase = {
      tipo,
      datos_contacto,
      identidad_visual,
      publicado: true,
      user_id: session.user.id,
    }

    const slugElegido = slugPersonalizado.trim()

    if (slugElegido) {
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
      return
    }

    for (let intento = 0; intento < 2; intento += 1) {
      const slug = generarSlug(nombrePrincipal)
      const { data, error } = await supabase
        .from("tarjetas")
        .insert({ slug, ...datosBase })
        .select("id, slug")
        .single()

      if (!error && data) {
        await alGuardarConExito(data)
        return
      }

      if (error?.code !== "23505") {
        setSaveError(
          "No pudimos guardar tu tarjeta. Probá de nuevo en unos segundos."
        )
        setSaving(false)
        return
      }
    }

    setSaveError("No pudimos generar un enlace único. Probá con otro nombre.")
    setSaving(false)
  }

  const avatarMostrado = avatarPreview || avatarUrlExistente
  const bannerMostrado = bannerPreview || bannerUrlExistente
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

  const comunesActuales = {
    direccion,
    direccionMapsUrl,
    videoUrl,
    descripcionServicios,
    servicios: servicios.filter((servicio) => servicio.titulo.trim()),
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

  const identidadVisualActual = {
    colorPrimario,
    colorSecundario,
    avatarUrl: avatarMostrado,
    bannerUrl: bannerMostrado,
    bannerPreset: bannerMostrado ? undefined : bannerPresetId,
    brochureUrl: brochureMostrado,
    temaModo,
    avatarForma,
    estiloTipografia,
  }

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

  const slugBloqueaGuardado =
    !esEdicion && Boolean(slugActualTrim) && (verificandoSlug || slugDisponible === false)

  // --------------------------------------------------------------------
  // Contenido de cada sección, definido una sola vez y reutilizado tanto
  // en el accordion de desktop como en los drawers móviles (mismo patrón,
  // dos contenedores: nada se duplica).
  // --------------------------------------------------------------------
  const contenidoDiseno = (
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

      <div className="flex flex-col gap-2">
        <span className={labelClase}>Forma del avatar</span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { valor: "circulo", etiqueta: "Círculo", clase: "rounded-full" },
              { valor: "suave", etiqueta: "Suave", clase: "rounded-2xl" },
              { valor: "cuadrado", etiqueta: "Cuadrado", clase: "rounded-md" },
            ] as const
          ).map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setAvatarForma(opcion.valor)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-xs transition-colors duration-200 ease-out",
                avatarForma === opcion.valor
                  ? "border-foreground bg-background"
                  : "border-border bg-background/50 hover:bg-background"
              )}
            >
              <span
                className={cn(
                  "size-6 border-2 border-muted-foreground",
                  opcion.clase
                )}
              />
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClase}>Estilo tipográfico</span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { valor: "moderna", etiqueta: "Moderna", fuente: undefined },
              { valor: "elegante", etiqueta: "Elegante", fuente: "var(--font-elegante)" },
              { valor: "creativa", etiqueta: "Creativa", fuente: "var(--font-creativa)" },
            ] as const
          ).map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setEstiloTipografia(opcion.valor)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-xs transition-colors duration-200 ease-out",
                estiloTipografia === opcion.valor
                  ? "border-foreground bg-background"
                  : "border-border bg-background/50 hover:bg-background"
              )}
            >
              <span
                style={opcion.fuente ? { fontFamily: opcion.fuente } : undefined}
                className="text-lg font-semibold"
              >
                Aa
              </span>
              {opcion.etiqueta}
            </button>
          ))}
        </div>
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
          <span className={labelClase}>Enlace personalizado (opcional)</span>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-white/70 backdrop-blur transition-colors duration-200 ease-out focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-zinc-900/60">
            <span className="flex shrink-0 items-center border-r border-border bg-muted/60 px-3 text-sm text-muted-foreground">
              mitarjeta.app/
            </span>
            <input
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
                verificandoSlug
                  ? "text-muted-foreground"
                  : slugDisponible === true
                    ? "text-emerald-600 dark:text-emerald-400"
                    : slugDisponible === false
                      ? "text-destructive"
                      : "text-muted-foreground"
              )}
            >
              {verificandoSlug ? (
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
        ¡No te preocupes! El único campo obligatorio es tu nombre.
        Todos los demás datos los puedes agregar, cambiar o
        mejorar en el momento que quieras.
      </p>
    </div>
  )

  const contenidoIdentidadVisual = (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
          <span className={labelClase}>Color primario</span>
          <input
            type="color"
            value={colorPrimario}
            onChange={(e) => setColorPrimario(e.target.value)}
            onFocus={() => scrollPreviewTo("banner")}
            className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
          <span className={labelClase}>Color secundario</span>
          <input
            type="color"
            value={colorSecundario}
            onChange={(e) => setColorSecundario(e.target.value)}
            onFocus={() => scrollPreviewTo("banner")}
            className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
          />
        </label>
      </div>

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
                style={{ backgroundImage: `url(${bannerMostrado})` }}
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
      </div>
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

  const contenidoServicios = (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-1">
      <label className="flex flex-col gap-1.5">
        <span className={labelClase}>Descripción general</span>
        <textarea
          value={descripcionServicios}
          onChange={(e) => setDescripcionServicios(e.target.value)}
          onFocus={() => scrollPreviewTo("servicios")}
          placeholder="Contá brevemente qué ofrecés"
          rows={2}
          className={inputClase}
        />
      </label>

      {servicios.map((servicio, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/50 p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={servicio.titulo}
              onChange={(e) => actualizarServicioTitulo(index, e.target.value)}
              onFocus={() => scrollPreviewTo("servicios")}
              placeholder="Título del servicio"
              className={cn(inputClase, "flex-1")}
            />
            <button
              type="button"
              onClick={() => quitarServicio(index)}
              aria-label="Quitar servicio"
              className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <input
            value={servicio.descripcion ?? ""}
            onChange={(e) => actualizarServicioDescripcion(index, e.target.value)}
            onFocus={() => scrollPreviewTo("servicios")}
            placeholder="Descripción corta"
            className={inputClase}
          />
        </div>
      ))}

      {servicios.length < 8 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={agregarServicio}
          className="self-start"
        >
          <Plus className="size-3.5" /> Agregar servicio
        </Button>
      )}

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
            onFocus={() => scrollPreviewTo("servicios")}
            className={cn(
              inputClase,
              "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
            )}
          />
        </div>
      </label>
    </div>
  )

  const contenidoProductos = (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-1">
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

  const contenidoResumenPago = !esEdicion && plan && (
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
            ${(precioFinal ?? precioBase).toLocaleString("es-MX")}{" "}
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
        Al crear tu tarjeta vas a ir a Mercado Pago para activar tu suscripción{" "}
        {periodicidad === "anual" ? "anual" : "mensual"}. El precio final puede ser menor
        a este si te corresponde algún descuento adicional.
      </p>
    </div>
  )

  const contenidoBotonGuardar = guardadoExito ? (
    <span className="inline-flex animate-in items-center gap-1.5 zoom-in-95 duration-300">
      <Check className="size-4" />
      {esEdicion ? "¡Guardado!" : "¡Listo!"}
    </span>
  ) : saving ? (
    <span className="inline-flex items-center gap-1.5 animate-pulse">
      <Loader2 className="size-4 animate-spin" />
      {esEdicion ? "Guardando..." : "Creando..."}
    </span>
  ) : esEdicion ? (
    <>
      Guardar cambios <Check className="size-4" />
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
    { id: "diseno", titulo: "Diseño de tarjeta", contenido: contenidoDiseno },
    { id: "datos", titulo: "Datos esenciales", contenido: contenidoDatosEsenciales },
    { id: "visual", titulo: "Identidad visual", contenido: contenidoIdentidadVisual },
    { id: "contacto", titulo: "Canales de contacto", contenido: contenidoContacto },
    { id: "redes", titulo: "Redes sociales", contenido: contenidoRedes },
    { id: "ubicacion", titulo: "Ubicación y negocio", contenido: contenidoUbicacion },
    { id: "multimedia", titulo: "Contenido multimedia", contenido: contenidoMultimedia },
    { id: "servicios", titulo: "Servicios", contenido: contenidoServicios },
    { id: "productos", titulo: "Productos", contenido: contenidoProductos },
    ...(esEdicion && tarjeta ? [{ id: "agenda", titulo: "Agenda", contenido: contenidoAgenda }] : []),
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
              : "border-red-200 bg-red-50/95 text-red-700 dark:border-red-900 dark:bg-red-950/95 dark:text-red-300"
          )}
        >
          <AlertTriangle className="size-4 shrink-0" />
          {toast.mensaje}
        </div>
      )}

      {/* Encabezado (título, banners, toggle ver/editar): solo desktop. En
          mobile el preview ocupa toda la pantalla y esta información no
          tiene lugar; el botón "Guardar" ya da feedback propio. */}
      <div className="relative mx-auto hidden w-full max-w-6xl px-4 pt-10 sm:px-6 lg:block lg:px-10">
        <h1 className="text-2xl font-semibold text-foreground">
          {esEdicion ? "Editá tu tarjeta" : "Creá tu tarjeta digital"}
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
            agendaServicios={agendaServiciosPreview}
            mostrarAcciones
            className="relative"
          />
          <TarjetaQr slug={tarjeta.slug} />
          <CompartirTarjeta
            slug={tarjeta.slug}
            titulo={
              (esEmpresarial ? nombreEmpresa : nombre) || "miTarjeta"
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

          {!esEdicion && (
            <fieldset className={cn(panelClase, "flex flex-col gap-3 p-5")}>
              <legend className="mb-1 px-1 text-sm font-semibold text-foreground">
                Tu plan
              </legend>
              {contenidoResumenPago}
            </fieldset>
          )}

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <Button
            type="submit"
            size="lg"
            disabled={saving || guardadoExito || slugBloqueaGuardado}
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
          {saveError && <p className="px-4 text-xs text-destructive">{saveError}</p>}
          <div className="px-4">
            <Button
              type="submit"
              form="tarjeta-form"
              size="sm"
              disabled={saving || guardadoExito || slugBloqueaGuardado}
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
            {!esEdicion && (
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

        {!esEdicion && (
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
                      titulo={(esEmpresarial ? nombreEmpresa : nombre) || "miTarjeta"}
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
