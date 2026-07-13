"use client"

import { Dialog } from "@base-ui/react/dialog"
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Lock,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { BANNER_PRESETS } from "@/lib/banner-presets"
import { PLATAFORMAS, obtenerPlataforma } from "@/lib/redes"
import { subirImagenCloudinary } from "@/lib/subir-imagen"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type { DatosContacto, PlataformaRed, RedSocial, TarjetaTipo } from "@/lib/types"

const GUEST_ID_KEY = "mitarjeta_guest_id"
const PENDIENTE_KEY = "mitarjeta_pendiente"

const inputClase =
  "w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none backdrop-blur transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/60"
const labelClase = "text-sm font-medium text-foreground"
const panelClase =
  "rounded-3xl border border-black/5 bg-white/70 p-5 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50"

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

export default function CrearTarjetaPage() {
  const [tipo, setTipo] = React.useState<TarjetaTipo>("personal")

  // Personal
  const [nombre, setNombre] = React.useState("")
  const [puesto, setPuesto] = React.useState("")
  const [telefono, setTelefono] = React.useState("")
  const [whatsapp, setWhatsapp] = React.useState("")
  const [email, setEmail] = React.useState("")

  // Empresarial
  const [nombreEmpresa, setNombreEmpresa] = React.useState("")
  const [giro, setGiro] = React.useState("")
  const [telefonoCorporativo, setTelefonoCorporativo] = React.useState("")
  const [direccion, setDireccion] = React.useState("")
  const [direccionMapsUrl, setDireccionMapsUrl] = React.useState("")
  const [sitioWeb, setSitioWeb] = React.useState("")
  const [horarios, setHorarios] = React.useState("")

  // Común
  const [redes, setRedes] = React.useState<RedSocial[]>([])
  const [colorPrimario, setColorPrimario] = React.useState("#6366f1")
  const [colorSecundario, setColorSecundario] = React.useState("#a855f7")
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState("")
  const [bannerFile, setBannerFile] = React.useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = React.useState("")
  const [bannerPresetId, setBannerPresetId] = React.useState<string | undefined>(
    "aurora"
  )

  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [tarjetaCreada, setTarjetaCreada] = React.useState<{
    id: string
    slug: string
  } | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [claimed, setClaimed] = React.useState(false)

  const [emailInput, setEmailInput] = React.useState("")
  const [emailEnviado, setEmailEnviado] = React.useState(false)
  const [authLoading, setAuthLoading] = React.useState(false)
  const [authError, setAuthError] = React.useState<string | null>(null)

  const esEmpresarial = tipo === "empresarial"

  React.useEffect(() => {
    if (!localStorage.getItem(GUEST_ID_KEY)) {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)
      localStorage.setItem(GUEST_ID_KEY, id)
    }
  }, [])

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
    async function reclamarPendiente(userId: string) {
      const raw = localStorage.getItem(PENDIENTE_KEY)
      if (!raw) return

      const pendiente = JSON.parse(raw) as { id: string; slug: string }
      const { error } = await supabase
        .from("tarjetas")
        .update({ user_id: userId })
        .eq("id", pendiente.id)
        .is("user_id", null)

      if (!error) {
        localStorage.removeItem(PENDIENTE_KEY)
        setClaimed(true)
        setModalOpen(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) reclamarPendiente(data.session.user.id)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) reclamarPendiente(session.user.id)
      }
    )

    return () => subscription.subscription.unsubscribe()
  }, [])

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

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  function handleBannerFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPresetId(undefined)
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  function elegirPreset(id: string) {
    setBannerPresetId(id)
    setBannerFile(null)
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
  }

  async function handleCrear(event: React.FormEvent) {
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

    let avatarUrl: string | undefined
    if (avatarFile) {
      const url = await subirImagenCloudinary(avatarFile, "mitarjeta/avatars")
      if (!url) {
        setSaveError("No pudimos subir la foto. Probá de nuevo.")
        setSaving(false)
        return
      }
      avatarUrl = url
    }

    let bannerUrl: string | undefined
    if (bannerFile) {
      const url = await subirImagenCloudinary(bannerFile, "mitarjeta/banners")
      if (!url) {
        setSaveError("No pudimos subir el banner. Probá de nuevo.")
        setSaving(false)
        return
      }
      bannerUrl = url
    }

    const redesFinales = redesValidas(redes)
    const datos_contacto: DatosContacto = esEmpresarial
      ? {
          nombreEmpresa: nombreEmpresa.trim(),
          giro: giro.trim() || undefined,
          telefonoCorporativo: telefonoCorporativo.trim() || undefined,
          direccion: direccion.trim() || undefined,
          direccionMapsUrl: direccionMapsUrl.trim() || undefined,
          sitioWeb: sitioWeb.trim() || undefined,
          horarios: horarios.trim() || undefined,
          redes: redesFinales,
        }
      : {
          nombre: nombre.trim(),
          puesto: puesto.trim() || undefined,
          telefono: telefono.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          email: email.trim() || undefined,
          redes: redesFinales,
        }

    const identidad_visual = {
      colorPrimario,
      colorSecundario,
      avatarUrl,
      bannerUrl,
      bannerPreset: bannerUrl ? undefined : bannerPresetId,
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
          estado_pago: "pendiente",
          publicado: true,
        })
        .select("id, slug")
        .single()

      if (!error && data) {
        localStorage.setItem(PENDIENTE_KEY, JSON.stringify(data))
        setTarjetaCreada(data)
        setModalOpen(true)
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

  async function handleGoogle() {
    setAuthError(null)
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/crear` },
    })
    if (error) {
      setAuthError("No pudimos iniciar sesión con Google.")
      setAuthLoading(false)
    }
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setAuthError("Ingresá un correo válido.")
      return
    }

    setAuthLoading(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: `${window.location.origin}/crear` },
    })
    setAuthLoading(false)

    if (error) {
      setAuthError("No pudimos enviar el enlace. Intentá de nuevo.")
      return
    }
    setEmailEnviado(true)
  }

  async function handleCopy() {
    if (!tarjetaCreada) return
    await navigator.clipboard.writeText(
      `${window.location.origin}/${tarjetaCreada.slug}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white dark:from-zinc-950 dark:via-black dark:to-black">
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
          Creá tu tarjeta digital
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Completá tus datos y mirá la vista previa en tiempo real. Podés
          publicarla sin registrarte.
        </p>

        {claimed && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck className="size-4 shrink-0" />
            Tu tarjeta quedó protegida en tu cuenta.
          </div>
        )}
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10">
        <div className="order-first flex justify-center lg:order-last lg:sticky lg:top-10 lg:h-fit lg:justify-start">
          <div className="flex w-full max-w-sm flex-col items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vista previa en tiempo real
            </span>
            <TarjetaCard
              tipo={tipo}
              datosContacto={
                esEmpresarial
                  ? {
                      nombreEmpresa,
                      giro,
                      telefonoCorporativo,
                      direccion,
                      direccionMapsUrl,
                      sitioWeb,
                      horarios,
                      redes: redesValidas(redes),
                    }
                  : { nombre, puesto, telefono, whatsapp, email, redes: redesValidas(redes) }
              }
              identidadVisual={{
                colorPrimario,
                colorSecundario,
                avatarUrl: avatarPreview,
                bannerUrl: bannerPreview,
                bannerPreset: bannerPreview ? undefined : bannerPresetId,
              }}
            />
          </div>
        </div>

        <form onSubmit={handleCrear} className="flex flex-col gap-6">
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

          <fieldset className={cn(panelClase, "flex flex-col gap-4")}>
            <legend className="mb-1 px-1 text-sm font-semibold text-foreground">
              Datos de contacto
            </legend>

            {esEmpresarial ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClase}>Nombre de la empresa</span>
                  <input
                    required
                    value={nombreEmpresa}
                    onChange={(e) => setNombreEmpresa(e.target.value)}
                    placeholder="Ej. Café Aroma"
                    className={inputClase}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClase}>Giro / Razón social</span>
                  <input
                    value={giro}
                    onChange={(e) => setGiro(e.target.value)}
                    placeholder="Ej. Cafetería"
                    className={inputClase}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClase}>Teléfono corporativo</span>
                  <input
                    type="tel"
                    value={telefonoCorporativo}
                    onChange={(e) => setTelefonoCorporativo(e.target.value)}
                    placeholder="+54 11 5555-5555"
                    className={inputClase}
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClase}>Dirección física</span>
                    <input
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Av. Siempre Viva 742"
                      className={inputClase}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClase}>Enlace de Google Maps</span>
                    <input
                      value={direccionMapsUrl}
                      onChange={(e) => setDireccionMapsUrl(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className={inputClase}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClase}>Sitio web</span>
                  <input
                    value={sitioWeb}
                    onChange={(e) => setSitioWeb(e.target.value)}
                    placeholder="https://..."
                    className={inputClase}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClase}>Horarios de atención</span>
                  <input
                    value={horarios}
                    onChange={(e) => setHorarios(e.target.value)}
                    placeholder="Lun a Vie 9 a 18hs"
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
                    placeholder="Ej. María Gómez"
                    className={inputClase}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClase}>Puesto o profesión</span>
                  <input
                    value={puesto}
                    onChange={(e) => setPuesto(e.target.value)}
                    placeholder="Ej. Abogada"
                    className={inputClase}
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClase}>Teléfono</span>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
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
                    placeholder="tu@correo.com"
                    className={inputClase}
                  />
                </label>
              </>
            )}
          </fieldset>

          <fieldset className={cn(panelClase, "flex flex-col gap-3")}>
            <legend className="mb-1 px-1 text-sm font-semibold text-foreground">
              {esEmpresarial ? "Redes de la empresa" : "Redes o enlaces"}
            </legend>

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
                        placeholder="Nombre"
                        className={cn(inputClase, "w-28 shrink-0")}
                      />
                      <input
                        value={red.url}
                        onChange={(e) => actualizarRedValor(index, e.target.value)}
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
          </fieldset>

          <fieldset className={cn(panelClase, "flex flex-col gap-4")}>
            <legend className="mb-1 px-1 text-sm font-semibold text-foreground">
              Identidad visual
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
                <span className={labelClase}>Color primario</span>
                <input
                  type="color"
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
                <span className={labelClase}>Color secundario</span>
                <input
                  type="color"
                  value={colorSecundario}
                  onChange={(e) => setColorSecundario(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={labelClase}>
                {esEmpresarial ? "Foto o logo" : "Foto de perfil"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className={cn(
                  inputClase,
                  "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                )}
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className={labelClase}>Fondo del banner</span>
              <div className="grid grid-cols-5 gap-2">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => elegirPreset(preset.id)}
                    title={preset.nombre}
                    aria-label={preset.nombre}
                    className={cn(
                      "aspect-square rounded-xl border-2 transition-all hover:scale-105",
                      bannerPresetId === preset.id && !bannerFile
                        ? "border-foreground shadow-md"
                        : "border-transparent"
                    )}
                    style={{ background: preset.background }}
                  />
                ))}
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  o subí tu propia imagen
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerFileChange}
                  className={cn(
                    inputClase,
                    "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                  )}
                />
              </label>
            </div>
          </fieldset>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <Button type="submit" size="lg" disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creando...
              </>
            ) : (
              <>
                Crear mi tarjeta <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      </div>

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
                <Lock className="size-5" />
              </span>
              <Dialog.Title className="mt-2 text-lg font-semibold text-foreground">
                ¡Tu tarjeta ya está en línea!
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Reclamala ahora: si cerrás esta ventana sin registrarte, nadie
                —ni siquiera vos— va a poder editarla después.
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
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={authLoading}
                onClick={handleGoogle}
              >
                <GoogleIcon className="size-4" /> Continuar con Google
              </Button>

              {emailEnviado ? (
                <p className="rounded-lg bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
                  Te enviamos un enlace a <strong>{emailInput}</strong>. Abrilo
                  para reclamar tu tarjeta.
                </p>
              ) : (
                <form onSubmit={handleEmailSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="tu@correo.com"
                    className={inputClase}
                  />
                  <Button type="submit" variant="secondary" disabled={authLoading}>
                    <Mail className="size-4" />
                  </Button>
                </form>
              )}

              {authError && (
                <p className="text-center text-sm text-destructive">
                  {authError}
                </p>
              )}

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
    </div>
  )
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.5C29.6 35.1 27 36 24 36c-5.2 0-9.6-3.1-11.3-7.6l-6.6 5.1C9.9 40 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.6 5.5C39.9 37 44 31.9 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  )
}
