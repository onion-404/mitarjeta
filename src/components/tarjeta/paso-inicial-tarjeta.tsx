"use client"

import { ArrowRight, Loader2 } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { GIROS } from "@/lib/giros"
import { supabase } from "@/lib/supabase"
import type { Giro, Plan } from "@/lib/types"

interface PasoInicialTarjetaProps {
  plan: Plan
  userId: string
  /** Prellenado desde ?nombre=... (input "Reclama tu link" del hero del
   *  home), ver reclamar-link.tsx. */
  nombreInicial?: string
  onCreada: (tarjeta: { id: string; slug: string }) => void
}

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

function normalizarSlug(valor: string) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos (marcas combinantes tras NFD)
    .replace(/[^a-z0-9-\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

const inputClase =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const labelClase = "text-sm font-medium text-foreground"

// Primer paso real de la creación de una tarjeta — antes de entrar al
// editor completo (TarjetaForm), pedido explícito del cliente: "que la
// Linkard tenga definido el tipo de producto/servicio". Solo 3 campos
// (título, enlace, giro) para bajar la fricción de arranque — el resto se
// completa dentro del editor. Al continuar, la tarjeta se INSERTA de
// inmediato (antes esto solo pasaba al final, después de llenar todo el
// editor) y la persona pasa a /editar/[id], que ya sabe mostrar "Tu plan"
// para retomar el pago — mismo mecanismo que ya existía para una tarjeta
// abandonada a medio pagar, reusado acá para "recién creada, todavía sin
// pagar". Esto hace que la tarjeta sea guardada y reanudable desde el
// primer paso, no solo al terminar.
export function PasoInicialTarjeta({
  plan,
  userId,
  nombreInicial,
  onCreada,
}: PasoInicialTarjetaProps) {
  const [nombre, setNombre] = React.useState(nombreInicial ?? "")
  const [slug, setSlug] = React.useState(nombreInicial ? normalizarSlug(nombreInicial) : "")
  const [slugTocado, setSlugTocado] = React.useState(false)
  const [giro, setGiro] = React.useState<Giro | "">("")
  const [resultadoSlug, setResultadoSlug] = React.useState<{
    slug: string
    disponible: boolean
  } | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Deriva el slug del título mientras el dueño no haya tocado el campo de
  // enlace a mano — mismo criterio "no pisar lo que la persona ya editó"
  // que usa el resto del editor con valores derivados. Diferido con
  // setTimeout (mismo mecanismo que ya usa tarjeta-form.tsx para esto): un
  // setState síncrono en el cuerpo del efecto dispara renders en cascada
  // (regla react-hooks/set-state-in-effect).
  React.useEffect(() => {
    if (slugTocado) return
    const timeoutId = window.setTimeout(() => setSlug(normalizarSlug(nombre)), 0)
    return () => window.clearTimeout(timeoutId)
  }, [nombre, slugTocado])

  // Chequeo de disponibilidad con debounce — versión simplificada del mismo
  // mecanismo de tarjeta-form.tsx (acá no hay caso "edición", siempre es
  // creación nueva).
  React.useEffect(() => {
    const slugTrim = slug.trim()
    if (slugTrim.length < 4 || !SLUG_REGEX.test(slugTrim)) return

    const timeoutId = window.setTimeout(async () => {
      const { data, error: consultaError } = await supabase
        .from("tarjetas")
        .select("slug")
        .eq("slug", slugTrim)
        .maybeSingle()
      if (consultaError) return
      setResultadoSlug({ slug: slugTrim, disponible: !data })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [slug])

  const slugTrim = slug.trim()
  const slugValido = slugTrim.length >= 4 && SLUG_REGEX.test(slugTrim)
  const slugDisponible = resultadoSlug?.slug === slugTrim ? resultadoSlug.disponible : null
  const puedeContinuar =
    nombre.trim().length > 0 && slugValido && slugDisponible !== false && !saving

  async function continuar(event: React.FormEvent) {
    event.preventDefault()
    if (!puedeContinuar) return
    setSaving(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from("tarjetas")
      .insert({
        tipo: "personal",
        slug: slugTrim,
        datos_contacto: { nombre: nombre.trim() },
        identidad_visual: {},
        giro: giro || null,
        publicado: true,
        user_id: userId,
      })
      .select("id, slug")
      .single()

    if (!insertError && data) {
      onCreada(data)
      return
    }

    if (insertError?.code === "23505") {
      setResultadoSlug({ slug: slugTrim, disponible: false })
      setError("Justo tomaron ese enlace. Elige otro para continuar.")
      setSaving(false)
      return
    }

    setError("No pudimos crear tu Linkard. Intenta de nuevo en unos segundos.")
    setSaving(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Plan {plan.nombre_display}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          Empecemos con lo básico
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          El resto (colores, catálogo, agenda...) lo defines dentro del editor — esto se
          guarda solo y puedes retomarlo cuando quieras.
        </p>
      </div>

      <form onSubmit={continuar} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClase}>Título de tu Linkard</span>
          <input
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Tu nombre o el de tu negocio"
            maxLength={80}
            className={inputClase}
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClase}>Tu enlace</span>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="shrink-0 text-sm text-muted-foreground">linkard.mx/</span>
            <input
              value={slug}
              onChange={(event) => {
                setSlugTocado(true)
                setSlug(normalizarSlug(event.target.value))
              }}
              placeholder="tu-nombre"
              maxLength={40}
              className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none"
            />
          </div>
          {slugTrim.length > 0 && !slugValido && (
            <span className="text-xs text-destructive">
              Mínimo 4 caracteres, solo minúsculas, números y guiones.
            </span>
          )}
          {slugValido && slugDisponible === false && (
            <span className="text-xs text-destructive">Ese enlace ya está en uso.</span>
          )}
          {slugValido && slugDisponible === true && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              linkard.mx/{slugTrim} está disponible.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClase}>
            Tipo de negocio <span className="font-normal text-muted-foreground">(opcional)</span>
          </span>
          <select
            value={giro}
            onChange={(event) => setGiro(event.target.value as Giro | "")}
            className={inputClase}
          >
            <option value="">Prefiero no elegir</option>
            {GIROS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={!puedeContinuar} className="mt-1">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Continuar <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
