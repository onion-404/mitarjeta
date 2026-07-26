"use client"

import { ArrowDown, ArrowUp, ChevronDown, Loader2, Plus, Star, Trash2, X } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { subirImagenCloudinary, validarImagen } from "@/lib/subir-imagen"
import {
  actualizarTestimonio,
  crearTestimonio,
  eliminarTestimonio,
  getTestimonios,
  guardarOrden,
  inicialesDeNombre,
} from "@/lib/testimonios"
import type { Testimonio } from "@/lib/types"
import { cn } from "@/lib/utils"

const inputClase =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface FormularioTestimonio {
  nombre: string
  rolONegocio: string
  cita: string
  calificacion: string // "" = sin calificación
}

function formularioVacio(): FormularioTestimonio {
  return { nombre: "", rolONegocio: "", cita: "", calificacion: "" }
}

function formularioDesdeTestimonio(t: Testimonio): FormularioTestimonio {
  return {
    nombre: t.nombre,
    rolONegocio: t.rol_o_negocio,
    cita: t.cita,
    calificacion: t.calificacion !== null ? String(t.calificacion) : "",
  }
}

function CampoAvatar({
  inputKey,
  avatarActualUrl,
  nombreParaIniciales,
  archivo,
  preview,
  onCambiarArchivo,
  onQuitar,
}: {
  inputKey: number
  avatarActualUrl?: string | null
  nombreParaIniciales: string
  archivo: File | null
  preview: string
  onCambiarArchivo: (file: File | null) => void
  onQuitar: () => void
}) {
  const [error, setError] = React.useState<string | null>(null)
  const mostrado = preview || avatarActualUrl

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const err = validarImagen(file)
    if (err) {
      setError(err)
      event.target.value = ""
      return
    }
    setError(null)
    onCambiarArchivo(file)
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm sm:col-span-2">
      <span className="text-xs text-muted-foreground">
        Foto <span className="font-normal">(opcional)</span>
      </span>
      <div className="flex items-center gap-3">
        {mostrado ? (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL de Cloudinary */}
            <img
              src={mostrado}
              alt="Vista previa de la foto"
              className="size-12 rounded-full border border-border object-cover"
            />
            <button
              type="button"
              onClick={onQuitar}
              aria-label="Quitar foto"
              className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {inicialesDeNombre(nombreParaIniciales || "?")}
          </span>
        )}
        <input
          key={inputKey}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className={cn(
            inputClase,
            "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
          )}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {archivo && <p className="text-xs text-muted-foreground">Se sube al guardar.</p>}
    </div>
  )
}

function CamposTestimonio({
  form,
  onChange,
}: {
  form: FormularioTestimonio
  onChange: (form: FormularioTestimonio) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="text-xs text-muted-foreground">Nombre</span>
        <input
          value={form.nombre}
          onChange={(e) => onChange({ ...form, nombre: e.target.value })}
          placeholder="Ana Martínez"
          className={inputClase}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="text-xs text-muted-foreground">Rol o negocio</span>
        <input
          value={form.rolONegocio}
          onChange={(e) => onChange({ ...form, rolONegocio: e.target.value })}
          placeholder="Dueña de estudio de yoga"
          className={inputClase}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-3">
        <span className="text-xs text-muted-foreground">Cita</span>
        <textarea
          value={form.cita}
          onChange={(e) => onChange({ ...form, cita: e.target.value })}
          rows={3}
          placeholder="Desde que uso Linkard mis clientas agendan solas, ya no ando contestando WhatsApp todo el día."
          className={cn(inputClase, "resize-none")}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs text-muted-foreground">Calificación</span>
        <select
          value={form.calificacion}
          onChange={(e) => onChange({ ...form, calificacion: e.target.value })}
          className={inputClase}
        >
          <option value="">Sin calificación</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} estrella{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default function AdminTestimoniosPage() {
  const [testimonios, setTestimonios] = React.useState<Testimonio[] | null>(null)

  const [nuevoForm, setNuevoForm] = React.useState<FormularioTestimonio>(formularioVacio())
  const [nuevoArchivo, setNuevoArchivo] = React.useState<File | null>(null)
  const [nuevoPreview, setNuevoPreview] = React.useState("")
  const [nuevoInputKey, setNuevoInputKey] = React.useState(0)
  const [creando, setCreando] = React.useState(false)
  const [errorCreacion, setErrorCreacion] = React.useState<string | null>(null)

  const [expandidoId, setExpandidoId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState<FormularioTestimonio | null>(null)
  const [editArchivo, setEditArchivo] = React.useState<File | null>(null)
  const [editPreview, setEditPreview] = React.useState("")
  const [editInputKey, setEditInputKey] = React.useState(0)
  const [editQuitarFoto, setEditQuitarFoto] = React.useState(false)
  const [guardandoId, setGuardandoId] = React.useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = React.useState<string | null>(null)
  const [moviendoId, setMoviendoId] = React.useState<string | null>(null)

  function recargar() {
    getTestimonios().then(setTestimonios)
  }

  React.useEffect(() => {
    recargar()
  }, [])

  function limpiarPreviewNuevo() {
    setNuevoArchivo(null)
    setNuevoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setNuevoInputKey((k) => k + 1)
  }

  function elegirArchivoNuevo(file: File | null) {
    setNuevoArchivo(file)
    setNuevoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : ""
    })
  }

  function limpiarPreviewEdit() {
    setEditArchivo(null)
    setEditPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setEditInputKey((k) => k + 1)
  }

  function elegirArchivoEdit(file: File | null) {
    setEditArchivo(file)
    setEditQuitarFoto(false)
    setEditPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : ""
    })
  }

  async function handleCrear(event: React.FormEvent) {
    event.preventDefault()
    if (!nuevoForm.nombre.trim() || !nuevoForm.rolONegocio.trim() || !nuevoForm.cita.trim()) return
    setCreando(true)
    setErrorCreacion(null)

    let avatarUrl: string | null = null
    if (nuevoArchivo) {
      avatarUrl = await subirImagenCloudinary(nuevoArchivo, "mitarjeta/testimonios")
      if (!avatarUrl) {
        setCreando(false)
        setErrorCreacion("No pudimos subir la foto. Probá de nuevo.")
        return
      }
    }

    const siguienteOrden = testimonios?.length
      ? Math.max(...testimonios.map((t) => t.orden)) + 1
      : 0

    const { error } = await crearTestimonio({
      nombre: nuevoForm.nombre,
      rolONegocio: nuevoForm.rolONegocio,
      cita: nuevoForm.cita,
      avatarUrl,
      calificacion: nuevoForm.calificacion ? Number(nuevoForm.calificacion) : null,
      orden: siguienteOrden,
    })

    setCreando(false)
    if (error) {
      setErrorCreacion("No pudimos crear el testimonio.")
      return
    }
    setNuevoForm(formularioVacio())
    limpiarPreviewNuevo()
    recargar()
  }

  function toggleExpandido(t: Testimonio) {
    if (expandidoId === t.id) {
      setExpandidoId(null)
      setEditForm(null)
      limpiarPreviewEdit()
      return
    }
    setExpandidoId(t.id)
    setEditForm(formularioDesdeTestimonio(t))
    limpiarPreviewEdit()
  }

  async function handleGuardar(t: Testimonio) {
    if (!editForm) return
    setGuardandoId(t.id)

    let avatarUrl = t.avatar_url
    if (editQuitarFoto) {
      avatarUrl = null
    } else if (editArchivo) {
      const url = await subirImagenCloudinary(editArchivo, "mitarjeta/testimonios")
      if (!url) {
        setGuardandoId(null)
        return
      }
      avatarUrl = url
    }

    const { error } = await actualizarTestimonio(t.id, {
      nombre: editForm.nombre.trim(),
      rol_o_negocio: editForm.rolONegocio.trim(),
      cita: editForm.cita.trim(),
      calificacion: editForm.calificacion ? Number(editForm.calificacion) : null,
      avatar_url: avatarUrl,
    })

    setGuardandoId(null)
    if (!error) {
      setExpandidoId(null)
      setEditForm(null)
      limpiarPreviewEdit()
      recargar()
    }
  }

  async function handleToggleActivo(t: Testimonio) {
    await actualizarTestimonio(t.id, { activo: !t.activo })
    recargar()
  }

  async function handleEliminar(t: Testimonio) {
    if (!window.confirm(`¿Eliminar el testimonio de "${t.nombre}"? Esta acción no se puede deshacer.`))
      return
    setEliminandoId(t.id)
    const { error } = await eliminarTestimonio(t.id)
    setEliminandoId(null)
    if (!error) {
      setExpandidoId(null)
      setEditForm(null)
      recargar()
    }
  }

  async function handleMover(index: number, direccion: -1 | 1) {
    if (!testimonios) return
    const otro = testimonios[index + direccion]
    const actual = testimonios[index]
    if (!otro) return

    setMoviendoId(actual.id)
    await Promise.all([
      guardarOrden(actual.id, otro.orden),
      guardarOrden(otro.id, actual.orden),
    ])
    setMoviendoId(null)
    recargar()
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Testimonios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Se muestran en el home, en el orden de esta lista, solo los marcados como activos.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-foreground">Nuevo testimonio</h2>
        <form onSubmit={handleCrear} className="mt-3 flex flex-col gap-3">
          <CamposTestimonio form={nuevoForm} onChange={setNuevoForm} />
          <CampoAvatar
            inputKey={nuevoInputKey}
            nombreParaIniciales={nuevoForm.nombre}
            archivo={nuevoArchivo}
            preview={nuevoPreview}
            onCambiarArchivo={elegirArchivoNuevo}
            onQuitar={limpiarPreviewNuevo}
          />
          <Button
            type="submit"
            size="sm"
            disabled={
              creando ||
              !nuevoForm.nombre.trim() ||
              !nuevoForm.rolONegocio.trim() ||
              !nuevoForm.cita.trim()
            }
            className="self-start"
          >
            {creando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar testimonio
          </Button>
          {errorCreacion && <p className="text-xs text-destructive">{errorCreacion}</p>}
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {testimonios === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : testimonios.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Todavía no cargaste ningún testimonio.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {testimonios.map((t, index) => {
              const expandido = expandidoId === t.id

              return (
                <div key={t.id}>
                  <div className="flex w-full items-center gap-2 px-4 py-3">
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        aria-label="Mover arriba"
                        disabled={index === 0 || moviendoId === t.id}
                        onClick={() => handleMover(index, -1)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Mover abajo"
                        disabled={index === testimonios.length - 1 || moviendoId === t.id}
                        onClick={() => handleMover(index, 1)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>

                    {t.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL de Cloudinary
                      <img
                        src={t.avatar_url}
                        alt=""
                        className="size-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {inicialesDeNombre(t.nombre)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpandido(t)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {t.nombre}{" "}
                          <span className="font-normal text-muted-foreground">
                            · {t.rol_o_negocio}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{t.cita}</p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          expandido && "rotate-180"
                        )}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActivo(t)}
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                        t.activo
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      )}
                    >
                      {t.activo ? "Activo" : "Inactivo"}
                    </button>
                  </div>

                  {expandido && editForm && (
                    <div className="flex flex-col gap-3 border-t border-border/40 bg-muted/20 px-4 py-4">
                      <CamposTestimonio form={editForm} onChange={setEditForm} />
                      <CampoAvatar
                        inputKey={editInputKey}
                        avatarActualUrl={editQuitarFoto ? null : t.avatar_url}
                        nombreParaIniciales={editForm.nombre}
                        archivo={editArchivo}
                        preview={editPreview}
                        onCambiarArchivo={elegirArchivoEdit}
                        onQuitar={() => {
                          limpiarPreviewEdit()
                          setEditQuitarFoto(true)
                        }}
                      />

                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              "size-4",
                              editForm.calificacion && n <= Number(editForm.calificacion)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground">Vista previa de estrellas</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={guardandoId === t.id}
                          onClick={() => handleGuardar(t)}
                        >
                          {guardandoId === t.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Guardar cambios"
                          )}
                        </Button>
                        <button
                          type="button"
                          disabled={eliminandoId === t.id}
                          onClick={() => handleEliminar(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {eliminandoId === t.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
