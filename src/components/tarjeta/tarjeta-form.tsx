"use client"

import { Accordion } from "@base-ui/react/accordion"
import { Dialog } from "@base-ui/react/dialog"
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Lock,
  Moon,
  Pencil,
  Plus,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { AuthMethods } from "@/components/auth/auth-methods"
import { Button } from "@/components/ui/button"
import { CompartirTarjeta } from "@/components/tarjeta/compartir-tarjeta"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"
import { RecortarAvatar } from "@/components/tarjeta/recortar-avatar"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { TarjetaQr } from "@/components/tarjeta/tarjeta-qr"
import { DATOS_BANCARIOS } from "@/lib/banco"
import { BANNER_PRESETS } from "@/lib/banner-presets"
import { getConfiguracionActiva, validarCupon } from "@/lib/configuracion"
import { PLATAFORMAS, obtenerPlataforma } from "@/lib/redes"
import { guardarTarjetaPendiente, reclamarTarjetaPendiente } from "@/lib/reclamo"
import { subirImagenCloudinary } from "@/lib/subir-imagen"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type {
  AvatarForma,
  Configuracion,
  Cupon,
  DatosContacto,
  EstiloTipografia,
  PlataformaRed,
  Producto,
  RedSocial,
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

const GUEST_ID_KEY = "mitarjeta_guest_id"

const inputClase =
  "w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none backdrop-blur transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/60"
const labelClase = "text-sm font-medium text-foreground"
const panelClase =
  "rounded-3xl border border-black/5 bg-white/70 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50 overflow-hidden"
const triggerClase =
  "group flex w-full items-center justify-between gap-2 px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors data-panel-open:bg-[var(--acento-bg)]"
const panelInnerClase =
  "h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"

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

interface TarjetaFormProps {
  /** Si se pasa, el formulario opera en modo edición (UPDATE en vez de INSERT). */
  tarjeta?: Tarjeta
}

export function TarjetaForm({ tarjeta }: TarjetaFormProps) {
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
  const [tarjetaCreada, setTarjetaCreada] = React.useState<{
    id: string
    slug: string
  } | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [claimed, setClaimed] = React.useState(false)
  const [vista, setVista] = React.useState<"editar" | "ver">("editar")

  // Precio, cupón y método de pago (solo al crear)
  const [configuracion, setConfiguracion] = React.useState<Configuracion | null>(null)
  const [cuponInput, setCuponInput] = React.useState("")
  const [cuponValidado, setCuponValidado] = React.useState<Cupon | null>(null)
  const [cuponError, setCuponError] = React.useState<string | null>(null)
  const [validandoCupon, setValidandoCupon] = React.useState(false)
  const [metodoPago, setMetodoPago] = React.useState<"mercado_pago" | "transferencia" | null>(
    null
  )
  const [copiadoClabe, setCopiadoClabe] = React.useState(false)

  const esEmpresarial = tipo === "empresarial"

  React.useEffect(() => {
    if (esEdicion) return
    getConfiguracionActiva().then(setConfiguracion)
  }, [esEdicion])

  React.useEffect(() => {
    if (esEdicion) return
    if (!localStorage.getItem(GUEST_ID_KEY)) {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)
      localStorage.setItem(GUEST_ID_KEY, id)
    }
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

  React.useEffect(() => {
    if (esEdicion) return

    async function intentarReclamo(userId: string) {
      const reclamada = await reclamarTarjetaPendiente(userId)
      if (reclamada) {
        setClaimed(true)
        setModalOpen(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) intentarReclamo(data.session.user.id)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) intentarReclamo(session.user.id)
      }
    )

    return () => subscription.subscription.unsubscribe()
  }, [esEdicion])

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

    let avatarUrl: string | undefined = avatarUrlExistente || undefined
    if (avatarFile) {
      avatarAbortRef.current = new AbortController()
      const url = await subirImagenCloudinary(
        avatarFile,
        "mitarjeta/avatars",
        avatarAbortRef.current.signal
      )
      avatarAbortRef.current = null
      if (!url) {
        setSaveError("No pudimos subir la foto. Probá de nuevo.")
        setSaving(false)
        return
      }
      avatarUrl = url
    }

    let bannerUrl: string | undefined = bannerUrlExistente || undefined
    if (bannerFile) {
      bannerAbortRef.current = new AbortController()
      const url = await subirImagenCloudinary(
        bannerFile,
        "mitarjeta/banners",
        bannerAbortRef.current.signal
      )
      bannerAbortRef.current = null
      if (!url) {
        setSaveError("No pudimos subir el banner. Probá de nuevo.")
        setSaving(false)
        return
      }
      bannerUrl = url
    }

    let brochureUrl: string | undefined = brochureUrlExistente || undefined
    if (brochureFile) {
      brochureAbortRef.current = new AbortController()
      const url = await subirImagenCloudinary(
        brochureFile,
        "mitarjeta/brochures",
        brochureAbortRef.current.signal,
        "raw"
      )
      brochureAbortRef.current = null
      if (!url) {
        setSaveError("No pudimos subir el folleto PDF. Probá de nuevo.")
        setSaving(false)
        return
      }
      brochureUrl = url
    }

    const productosFinales: Producto[] = []
    for (const producto of productos) {
      if (!producto.titulo.trim()) continue
      let imagenUrl = producto.imagenUrlExistente || undefined
      if (producto.imagenFile) {
        const url = await subirImagenCloudinary(producto.imagenFile, "mitarjeta/productos")
        if (!url) {
          setSaveError("No pudimos subir la imagen de un producto. Probá de nuevo.")
          setSaving(false)
          return
        }
        imagenUrl = url
      }
      productosFinales.push({
        titulo: producto.titulo.trim(),
        descripcion: producto.descripcion.trim() || undefined,
        precio: producto.precio.trim() || undefined,
        enlaceUrl: producto.enlaceUrl.trim() || undefined,
        imagenUrl,
      })
    }

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
      return
    }

    const esGratis = descuentoPorcentaje >= 100

    if (!esGratis && !metodoPago) {
      setSaveError("Elegí un método de pago para continuar.")
      setSaving(false)
      return
    }

    for (let intento = 0; intento < 2; intento += 1) {
      const slug = generarSlug(nombrePrincipal)
      const { data, error } = await supabase
        .from("tarjetas")
        .insert({
          slug,
          tipo,
          datos_contacto,
          identidad_visual,
          estado_pago: esGratis ? "aprobado" : "pendiente",
          metodo_pago: esGratis ? null : metodoPago,
          publicado: true,
          precio_pagado: precioFinal,
          cupon_codigo: cuponValidado?.codigo ?? null,
        })
        .select("id, slug")
        .single()

      if (!error && data) {
        guardarTarjetaPendiente(data)
        setTarjetaCreada(data)

        if (esGratis || metodoPago === "transferencia") {
          setModalOpen(true)
          setSaving(false)
          return
        }

        const checkoutRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tarjetaId: data.id,
            titulo: nombrePrincipal,
            precio: precioFinal,
          }),
        })
        const checkoutData = (await checkoutRes.json()) as { initPoint?: string }

        if (checkoutData.initPoint) {
          window.location.assign(checkoutData.initPoint)
          return
        }

        setSaveError(
          "Tu tarjeta se guardó, pero no pudimos iniciar el pago con Mercado Pago. Probá de nuevo o elegí transferencia."
        )
        setSaving(false)
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

  async function handleCopy() {
    if (!tarjetaCreada) return
    await navigator.clipboard.writeText(
      `${window.location.origin}/${tarjetaCreada.slug}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopiarClabe() {
    await navigator.clipboard.writeText(DATOS_BANCARIOS.clabe)
    setCopiadoClabe(true)
    setTimeout(() => setCopiadoClabe(false), 2000)
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

  const precioRegular = configuracion?.precio_regular ?? null
  const hayPromo = Boolean(
    configuracion?.promocion_activa &&
      configuracion.precio_lanzamiento < configuracion.precio_regular
  )
  const precioBase = configuracion
    ? hayPromo
      ? configuracion.precio_lanzamiento
      : configuracion.precio_regular
    : null
  const descuentoPorcentaje = cuponValidado?.porcentaje_descuento ?? 0
  const precioFinal =
    precioBase !== null
      ? Math.round(precioBase * (1 - descuentoPorcentaje / 100) * 100) / 100
      : null

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

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-semibold text-foreground">
          {esEdicion ? "Editá tu tarjeta" : "Creá tu tarjeta digital"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {esEdicion
            ? "Modificá tus datos y guardá los cambios cuando quieras."
            : "Completá tus datos y mirá la vista previa en tiempo real. Podés publicarla sin registrarte."}
        </p>

        {claimed && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck className="size-4 shrink-0" />
            Tu tarjeta quedó protegida en tu cuenta.
          </div>
        )}

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
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                vista === "editar"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Pencil className="size-3.5" /> Modo edición
            </button>
            <button
              type="button"
              onClick={() => setVista("ver")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                vista === "ver"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="size-3.5" /> Ver tarjeta
            </button>
          </div>
        )}
      </div>

      {esEdicion && vista === "ver" && tarjeta ? (
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10">
          <TarjetaCard
            tipo={tipo}
            datosContacto={datosContactoActual}
            identidadVisual={identidadVisualActual}
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
      ) : (
        <div className="relative mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10">
          <div className="order-first flex justify-center self-start lg:sticky lg:top-8 lg:order-last lg:flex lg:h-[calc(100vh-4rem)] lg:items-center lg:justify-center">
            <div className="flex w-full max-w-sm flex-col items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Vista previa en tiempo real
              </span>
              <div className="relative mx-auto aspect-[9/19.5] w-72 overflow-hidden rounded-[2.5rem] border-[8px] border-neutral-800 bg-neutral-800 shadow-2xl lg:w-96 dark:border-neutral-700">
                <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-neutral-800" />
                <div
                  ref={previewRef}
                  className={cn(
                    "size-full overflow-y-auto rounded-[2rem]",
                    temaModo === "oscuro" ? "bg-neutral-950" : "bg-white"
                  )}
                >
                  <TarjetaCard
                    tipo={tipo}
                    datosContacto={datosContactoActual}
                    identidadVisual={identidadVisualActual}
                    className="w-full min-w-0 rounded-none border-0 shadow-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleGuardar} className="flex flex-col gap-6">
            <div className="inline-flex w-fit rounded-full border border-border bg-white/70 p-1 shadow-sm backdrop-blur dark:bg-zinc-900/50">
              {(["personal", "empresarial"] as const).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setTipo(opcion)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
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
              defaultValue={[1]}
              className="flex flex-col gap-3"
              style={{ "--acento-bg": `${colorSecundario || "#71717a"}1a` } as React.CSSProperties}
            >
              <Accordion.Item value={0} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Diseño de tarjeta
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                              "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors",
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
                              "flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-xs transition-colors",
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
                              "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-xs transition-colors",
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
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value={1} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Datos esenciales
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                    <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ¡No te preocupes! El único campo obligatorio es tu nombre.
                      Todos los demás datos los puedes agregar, cambiar o
                      mejorar en el momento que quieras.
                    </p>
                  </div>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value={2} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Identidad visual
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                              "aspect-square rounded-xl border-2 transition-all hover:scale-105",
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
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value={3} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Canales de contacto
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value={4} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Redes sociales
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value={5} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Ubicación y negocio
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value={6} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Contenido multimedia
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value={7} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Servicios
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value={8} className={panelClase}>
                <Accordion.Header>
                  <Accordion.Trigger className={triggerClase}>
                    Productos
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className={panelInnerClase}>
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
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion.Root>

            {!esEdicion && (
              <fieldset className={cn(panelClase, "flex flex-col gap-3")}>
                <legend className="mb-1 px-1 text-sm font-semibold text-foreground">
                  Resumen y pago
                </legend>

                {precioBase !== null && (
                  <div className="flex items-baseline gap-2">
                    {hayPromo && precioRegular !== null && (
                      <span className="text-sm text-muted-foreground line-through">
                        ${precioRegular.toLocaleString("es-MX")}
                      </span>
                    )}
                    <span className="text-2xl font-semibold text-foreground">
                      ${(precioFinal ?? precioBase).toLocaleString("es-MX")}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        MXN/año
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
                    Código {cuponValidado.codigo} aplicado:{" "}
                    {cuponValidado.porcentaje_descuento}% de descuento
                    {descuentoPorcentaje >= 100 &&
                      " — ¡tu tarjeta se activa de inmediato!"}
                  </p>
                )}
                {cuponError && (
                  <p className="text-sm text-destructive">{cuponError}</p>
                )}

                {descuentoPorcentaje < 100 && (
                  <div className="flex flex-col gap-2">
                    <span className={labelClase}>Método de pago</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setMetodoPago("mercado_pago")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors",
                          metodoPago === "mercado_pago"
                            ? "border-foreground bg-background"
                            : "border-border bg-background/50 hover:bg-background"
                        )}
                      >
                        <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                        Mercado Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetodoPago("transferencia")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors",
                          metodoPago === "transferencia"
                            ? "border-foreground bg-background"
                            : "border-border bg-background/50 hover:bg-background"
                        )}
                      >
                        <Building2 className="size-4 shrink-0 text-muted-foreground" />
                        Transferencia o depósito
                      </button>
                    </div>

                    {metodoPago === "transferencia" && (
                      <div className="mt-1 flex flex-col gap-1.5 rounded-xl border border-border bg-background/50 p-3 text-sm">
                        <p className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Banco</span>
                          <span className="font-medium text-foreground">
                            {DATOS_BANCARIOS.banco}
                          </span>
                        </p>
                        <p className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Titular</span>
                          <span className="font-medium text-foreground">
                            {DATOS_BANCARIOS.titular}
                          </span>
                        </p>
                        <p className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">CLABE</span>
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            {DATOS_BANCARIOS.clabe}
                            <button
                              type="button"
                              onClick={handleCopiarClabe}
                              aria-label="Copiar CLABE"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {copiadoClabe ? (
                                <Check className="size-3.5" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </button>
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Después de transferir, confirmá tu tarjeta con el botón
                          de abajo. Quedará pendiente hasta que verifiquemos el
                          depósito.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </fieldset>
            )}

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <Button type="submit" size="lg" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {esEdicion ? "Guardando..." : "Creando..."}
                </>
              ) : esEdicion ? (
                <>
                  Guardar cambios <Check className="size-4" />
                </>
              ) : (
                <>
                  Crear mi tarjeta <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-6 shadow-2xl transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Dialog.Close
              aria-label="Cerrar"
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </Dialog.Close>

            <div className="flex flex-col items-center gap-1 pt-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                {metodoPago === "transferencia" ? (
                  <Clock className="size-5" />
                ) : (
                  <Lock className="size-5" />
                )}
              </span>
              <Dialog.Title className="mt-2 text-lg font-semibold text-foreground">
                {metodoPago === "transferencia"
                  ? "Tu tarjeta está siendo procesada"
                  : "¡Tu tarjeta ya está en línea!"}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {metodoPago === "transferencia"
                  ? "En breve el administrador aprobará tu acceso al confirmar la transferencia."
                  : "Reclamala ahora: si cerrás esta ventana sin registrarte, nadie —ni siquiera vos— va a poder editarla después."}
              </Dialog.Description>
            </div>

            {tarjetaCreada && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
                <span className="truncate text-muted-foreground">
                  {typeof window !== "undefined" ? window.location.host : ""}/
                  {tarjetaCreada.slug}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="ml-auto shrink-0 text-foreground"
                  aria-label="Copiar enlace"
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              <AuthMethods redirectTo="/crear" />

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="mt-1 text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Seguir sin registrarme (podría perder el acceso para editar)
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <RecortarAvatar
        archivo={avatarPendiente}
        onCancelar={handleRecorteCancelado}
        onConfirmar={handleRecorteConfirmado}
      />
    </div>
  )
}
