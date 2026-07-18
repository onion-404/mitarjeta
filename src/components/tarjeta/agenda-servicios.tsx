"use client"

import { Plus, Trash2 } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type {
  DiaSemana,
  DisponibilidadExcepcion,
  DisponibilidadSemanal,
  ServicioAgendable,
  TipoExcepcionDisponibilidad,
} from "@/lib/types"

const inputClase =
  "w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none backdrop-blur transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/60"
const labelClase = "text-sm font-medium text-foreground"
const itemCardClase =
  "flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/50 p-3"

const DURACIONES_MINUTOS = [15, 30, 45, 60, 90, 120]

const DIAS_SEMANA: DiaSemana[] = [0, 1, 2, 3, 4, 5, 6]
const NOMBRES_DIA: Record<DiaSemana, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

interface AgendaServiciosProps {
  tarjetaId: string
  planId: string | null
  /** Se llama con los servicios activos cada vez que cambian, para alimentar el preview en vivo. */
  onServiciosChange?: (servicios: ServicioAgendable[]) => void
}

export function AgendaServicios({ tarjetaId, planId, onServiciosChange }: AgendaServiciosProps) {
  const [servicios, setServicios] = React.useState<ServicioAgendable[]>([])
  const [semanal, setSemanal] = React.useState<DisponibilidadSemanal[]>([])
  const [excepciones, setExcepciones] = React.useState<DisponibilidadExcepcion[]>([])
  const [limite, setLimite] = React.useState<number | null>(null)
  const [nombrePlan, setNombrePlan] = React.useState<string | null>(null)
  const [cargando, setCargando] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelado = false
    async function cargar() {
      // Sin plan confirmado no hay nada que cargar: la sección se bloquea
      // por completo (ver el render más abajo), ni vale la pena pedirle
      // datos a Supabase.
      if (!planId) {
        if (!cancelado) setCargando(false)
        return
      }
      const [serviciosRes, semanalRes, excepcionesRes] = await Promise.all([
        supabase
          .from("servicios_agendables")
          .select("*")
          .eq("tarjeta_id", tarjetaId)
          .order("created_at"),
        supabase
          .from("disponibilidad_semanal")
          .select("*")
          .eq("tarjeta_id", tarjetaId)
          .order("hora_inicio"),
        supabase
          .from("disponibilidad_excepciones")
          .select("*")
          .eq("tarjeta_id", tarjetaId)
          .order("fecha"),
      ])
      if (cancelado) return
      setServicios((serviciosRes.data ?? []) as ServicioAgendable[])
      setSemanal((semanalRes.data ?? []) as DisponibilidadSemanal[])
      setExcepciones((excepcionesRes.data ?? []) as DisponibilidadExcepcion[])
      setCargando(false)
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [tarjetaId, planId])

  React.useEffect(() => {
    let cancelado = false
    async function cargarLimite() {
      if (!planId) {
        if (!cancelado) {
          setLimite(null)
          setNombrePlan(null)
        }
        return
      }
      const { data } = await supabase
        .from("planes")
        .select("nombre_display, features")
        .eq("id", planId)
        .maybeSingle()
      if (cancelado) return
      const max = (data?.features as Record<string, unknown> | null | undefined)?.[
        "servicios_agendables_max"
      ]
      setLimite(typeof max === "number" ? max : null)
      setNombrePlan(data?.nombre_display ?? null)
    }
    cargarLimite()
    return () => {
      cancelado = true
    }
  }, [planId])

  React.useEffect(() => {
    onServiciosChange?.(servicios.filter((s) => s.activo))
  }, [servicios, onServiciosChange])

  // Fail-closed: sin información de límite (plan sin `servicios_agendables_max`
  // definido, o el fetch del plan falló) se trata como 0 permitidos, no como
  // "sin límite" — mejor bloquear de más que dejar pasar servicios gratis.
  const limiteAlcanzado = servicios.length >= (limite ?? 0)

  // ---------------------------------------------------------------------
  // Servicios agendables
  // ---------------------------------------------------------------------
  async function crearServicio() {
    if (limiteAlcanzado) return
    setError(null)
    // El id se genera acá mismo y se manda explícito en el insert (en vez de
    // dejar que lo genere el DEFAULT de la columna) para que nunca cambie
    // entre el alta optimista y la confirmación del server: si cambiara, el
    // `key` de React cambiaría con él, remontando el input y tirando
    // cualquier cosa que el usuario ya haya tecleado mientras tanto.
    const id = crypto.randomUUID()
    const filaTemporal: ServicioAgendable = {
      id,
      tarjeta_id: tarjetaId,
      nombre: "Nuevo servicio",
      descripcion: null,
      duracion_minutos: 30,
      precio: 0,
      requiere_pago_inmediato: false,
      activo: true,
      created_at: new Date().toISOString(),
    }
    setServicios((prev) => [...prev, filaTemporal])

    const { error: err } = await supabase.from("servicios_agendables").insert({
      id,
      tarjeta_id: tarjetaId,
      nombre: "Nuevo servicio",
      duracion_minutos: 30,
      precio: 0,
    })
    if (err) {
      setError("No pudimos crear el servicio. Probá de nuevo.")
      setServicios((prev) => prev.filter((s) => s.id !== id))
    }
  }

  function actualizarServicioLocal(id: string, cambios: Partial<ServicioAgendable>) {
    setServicios((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)))
  }

  async function persistirServicio(id: string, cambios: Partial<ServicioAgendable>) {
    const { error: err } = await supabase.from("servicios_agendables").update(cambios).eq("id", id)
    if (err) setError("No pudimos guardar el cambio. Probá de nuevo.")
  }

  async function borrarServicio(id: string) {
    const anterior = servicios
    setServicios((prev) => prev.filter((s) => s.id !== id))
    const { error: err } = await supabase.from("servicios_agendables").delete().eq("id", id)
    if (err) {
      setError("No pudimos borrar el servicio. Probá de nuevo.")
      setServicios(anterior)
    }
  }

  // ---------------------------------------------------------------------
  // Disponibilidad semanal
  // ---------------------------------------------------------------------
  async function toggleDia(dia: DiaSemana, abrir: boolean) {
    if (abrir) {
      const id = crypto.randomUUID()
      const filaTemporal: DisponibilidadSemanal = {
        id,
        tarjeta_id: tarjetaId,
        dia_semana: dia,
        hora_inicio: "09:00",
        hora_fin: "18:00",
        created_at: new Date().toISOString(),
      }
      setSemanal((prev) => [...prev, filaTemporal])

      const { error: err } = await supabase
        .from("disponibilidad_semanal")
        .insert({ id, tarjeta_id: tarjetaId, dia_semana: dia, hora_inicio: "09:00", hora_fin: "18:00" })
      if (err) {
        setError("No pudimos abrir ese día. Probá de nuevo.")
        setSemanal((prev) => prev.filter((s) => s.id !== id))
      }
      return
    }
    const idsDelDia = semanal.filter((s) => s.dia_semana === dia).map((s) => s.id)
    const anterior = semanal
    setSemanal((prev) => prev.filter((s) => s.dia_semana !== dia))
    const { error: err } = await supabase.from("disponibilidad_semanal").delete().in("id", idsDelDia)
    if (err) {
      setError("No pudimos cerrar ese día. Probá de nuevo.")
      setSemanal(anterior)
    }
  }

  async function agregarRango(dia: DiaSemana) {
    const id = crypto.randomUUID()
    const filaTemporal: DisponibilidadSemanal = {
      id,
      tarjeta_id: tarjetaId,
      dia_semana: dia,
      hora_inicio: "09:00",
      hora_fin: "13:00",
      created_at: new Date().toISOString(),
    }
    setSemanal((prev) => [...prev, filaTemporal])

    const { error: err } = await supabase
      .from("disponibilidad_semanal")
      .insert({ id, tarjeta_id: tarjetaId, dia_semana: dia, hora_inicio: "09:00", hora_fin: "13:00" })
    if (err) {
      setError("No pudimos agregar el rango. Probá de nuevo.")
      setSemanal((prev) => prev.filter((s) => s.id !== id))
    }
  }

  function actualizarRangoLocal(id: string, cambios: Partial<DisponibilidadSemanal>) {
    setSemanal((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)))
  }

  async function persistirRango(id: string, cambios: Partial<DisponibilidadSemanal>) {
    const { error: err } = await supabase.from("disponibilidad_semanal").update(cambios).eq("id", id)
    if (err) setError("No pudimos guardar el horario. Probá de nuevo.")
  }

  async function borrarRango(id: string) {
    const anterior = semanal
    setSemanal((prev) => prev.filter((s) => s.id !== id))
    const { error: err } = await supabase.from("disponibilidad_semanal").delete().eq("id", id)
    if (err) {
      setError("No pudimos borrar el rango. Probá de nuevo.")
      setSemanal(anterior)
    }
  }

  // ---------------------------------------------------------------------
  // Excepciones (bloqueos / aperturas puntuales)
  // ---------------------------------------------------------------------
  async function crearExcepcion(tipo: TipoExcepcionDisponibilidad) {
    const hoy = new Date().toISOString().slice(0, 10)
    const payload: {
      tarjeta_id: string
      fecha: string
      tipo: TipoExcepcionDisponibilidad
      hora_inicio: string | null
      hora_fin: string | null
    } =
      tipo === "bloqueo"
        ? { tarjeta_id: tarjetaId, fecha: hoy, tipo, hora_inicio: null, hora_fin: null }
        : { tarjeta_id: tarjetaId, fecha: hoy, tipo, hora_inicio: "09:00", hora_fin: "13:00" }

    const id = crypto.randomUUID()
    setExcepciones((prev) => [...prev, { id, ...payload, created_at: new Date().toISOString() }])

    const { error: err } = await supabase.from("disponibilidad_excepciones").insert({ id, ...payload })
    if (err) {
      setError("No pudimos crear la excepción. Probá de nuevo.")
      setExcepciones((prev) => prev.filter((e) => e.id !== id))
    }
  }

  function actualizarExcepcionLocal(id: string, cambios: Partial<DisponibilidadExcepcion>) {
    setExcepciones((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)))
  }

  async function persistirExcepcion(id: string, cambios: Partial<DisponibilidadExcepcion>) {
    const { error: err } = await supabase
      .from("disponibilidad_excepciones")
      .update(cambios)
      .eq("id", id)
    if (err) setError("No pudimos guardar la excepción. Probá de nuevo.")
  }

  async function borrarExcepcion(id: string) {
    const anterior = excepciones
    setExcepciones((prev) => prev.filter((e) => e.id !== id))
    const { error: err } = await supabase.from("disponibilidad_excepciones").delete().eq("id", id)
    if (err) {
      setError("No pudimos borrar la excepción. Probá de nuevo.")
      setExcepciones(anterior)
    }
  }

  // Sin plan_id no hay suscripción autorizada para esta tarjeta (nunca hubo
  // una, o se canceló/pausó): la agenda es una función paga, se bloquea
  // entera en vez de solo limitar la cantidad de servicios.
  if (!planId) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Necesitás un plan activo para usar la agenda de servicios. Suscribite a un plan
        para habilitarla.
      </p>
    )
  }

  if (cargando) {
    return <p className="px-1 text-sm text-muted-foreground">Cargando agenda...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Servicios agendables */}
      <div className="flex flex-col gap-3">
        <span className={labelClase}>Servicios agendables</span>
        {servicios.map((servicio) => (
          <div key={servicio.id} className={itemCardClase}>
            <div className="flex items-center gap-2">
              <input
                value={servicio.nombre}
                onChange={(e) => actualizarServicioLocal(servicio.id, { nombre: e.target.value })}
                onBlur={(e) => persistirServicio(servicio.id, { nombre: e.target.value })}
                placeholder="Nombre del servicio"
                className={cn(inputClase, "flex-1")}
              />
              <button
                type="button"
                onClick={() => borrarServicio(servicio.id)}
                aria-label="Quitar servicio"
                className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <input
              value={servicio.descripcion ?? ""}
              onChange={(e) =>
                actualizarServicioLocal(servicio.id, { descripcion: e.target.value })
              }
              onBlur={(e) => persistirServicio(servicio.id, { descripcion: e.target.value })}
              placeholder="Descripción corta (opcional)"
              className={inputClase}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Duración</span>
                <select
                  value={servicio.duracion_minutos}
                  onChange={(e) => {
                    const duracion_minutos = Number(e.target.value)
                    actualizarServicioLocal(servicio.id, { duracion_minutos })
                    persistirServicio(servicio.id, { duracion_minutos })
                  }}
                  className={inputClase}
                >
                  {DURACIONES_MINUTOS.map((min) => (
                    <option key={min} value={min}>
                      {min} min
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Precio</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={servicio.precio}
                  onChange={(e) =>
                    actualizarServicioLocal(servicio.id, { precio: Number(e.target.value) })
                  }
                  onBlur={(e) =>
                    persistirServicio(servicio.id, { precio: Number(e.target.value) || 0 })
                  }
                  className={inputClase}
                />
              </label>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
              <span className="text-sm text-foreground">
                {servicio.requiere_pago_inmediato
                  ? "Cobrar al agendar (Checkout Pro)"
                  : "Pago contra entrega (default)"}
              </span>
              <input
                type="checkbox"
                checked={servicio.requiere_pago_inmediato}
                onChange={(e) => {
                  actualizarServicioLocal(servicio.id, {
                    requiere_pago_inmediato: e.target.checked,
                  })
                  persistirServicio(servicio.id, { requiere_pago_inmediato: e.target.checked })
                }}
                className="size-4 shrink-0 accent-foreground"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
              <span className="text-sm text-foreground">
                {servicio.activo ? "Activo (visible en la tarjeta)" : "Inactivo (oculto)"}
              </span>
              <input
                type="checkbox"
                checked={servicio.activo}
                onChange={(e) => {
                  actualizarServicioLocal(servicio.id, { activo: e.target.checked })
                  persistirServicio(servicio.id, { activo: e.target.checked })
                }}
                className="size-4 shrink-0 accent-foreground"
              />
            </label>
          </div>
        ))}

        {limiteAlcanzado ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Tu plan {nombrePlan ?? "actual"} permite hasta {limite}{" "}
            {limite === 1 ? "servicio agendable" : "servicios agendables"}. Subí de plan para
            agregar más.
          </p>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={crearServicio} className="self-start">
            <Plus className="size-3.5" /> Agregar servicio
          </Button>
        )}
      </div>

      {/* Disponibilidad semanal */}
      <div className="flex flex-col gap-3">
        <span className={labelClase}>Horario semanal</span>
        {DIAS_SEMANA.map((dia) => {
          const rangosDelDia = semanal.filter((s) => s.dia_semana === dia)
          const abierto = rangosDelDia.length > 0
          return (
            <div key={dia} className={itemCardClase}>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{NOMBRES_DIA[dia]}</span>
                <input
                  type="checkbox"
                  checked={abierto}
                  onChange={(e) => toggleDia(dia, e.target.checked)}
                  className="size-4 shrink-0 accent-foreground"
                />
              </label>

              {abierto && (
                <div className="flex flex-col gap-2">
                  {rangosDelDia.map((rango) => (
                    <div key={rango.id} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={rango.hora_inicio.slice(0, 5)}
                        onChange={(e) => actualizarRangoLocal(rango.id, { hora_inicio: e.target.value })}
                        onBlur={(e) => persistirRango(rango.id, { hora_inicio: e.target.value })}
                        className={cn(inputClase, "flex-1")}
                      />
                      <span className="text-xs text-muted-foreground">a</span>
                      <input
                        type="time"
                        value={rango.hora_fin.slice(0, 5)}
                        onChange={(e) => actualizarRangoLocal(rango.id, { hora_fin: e.target.value })}
                        onBlur={(e) => persistirRango(rango.id, { hora_fin: e.target.value })}
                        className={cn(inputClase, "flex-1")}
                      />
                      <button
                        type="button"
                        onClick={() => borrarRango(rango.id)}
                        aria-label="Quitar rango"
                        className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => agregarRango(dia)}
                    className="self-start"
                  >
                    <Plus className="size-3.5" /> Agregar otro rango (ej. tarde)
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Excepciones puntuales */}
      <div className="flex flex-col gap-3">
        <span className={labelClase}>Excepciones (bloqueos o aperturas puntuales)</span>
        {excepciones.map((excepcion) => {
          const diaCompleto = excepcion.tipo === "bloqueo" && excepcion.hora_inicio === null
          return (
            <div key={excepcion.id} className={itemCardClase}>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={excepcion.fecha}
                  onChange={(e) => {
                    actualizarExcepcionLocal(excepcion.id, { fecha: e.target.value })
                    persistirExcepcion(excepcion.id, { fecha: e.target.value })
                  }}
                  className={cn(inputClase, "flex-1")}
                />
                <select
                  value={excepcion.tipo}
                  onChange={(e) => {
                    const tipo = e.target.value as TipoExcepcionDisponibilidad
                    const cambios: Partial<DisponibilidadExcepcion> =
                      tipo === "apertura_extra"
                        ? { tipo, hora_inicio: excepcion.hora_inicio ?? "09:00", hora_fin: excepcion.hora_fin ?? "13:00" }
                        : { tipo }
                    actualizarExcepcionLocal(excepcion.id, cambios)
                    persistirExcepcion(excepcion.id, cambios)
                  }}
                  className={cn(inputClase, "w-auto shrink-0")}
                >
                  <option value="bloqueo">Bloqueo</option>
                  <option value="apertura_extra">Apertura extra</option>
                </select>
                <button
                  type="button"
                  onClick={() => borrarExcepcion(excepcion.id)}
                  aria-label="Quitar excepción"
                  className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {excepcion.tipo === "bloqueo" && (
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Bloquear el día completo</span>
                  <input
                    type="checkbox"
                    checked={diaCompleto}
                    onChange={(e) => {
                      const cambios: Partial<DisponibilidadExcepcion> = e.target.checked
                        ? { hora_inicio: null, hora_fin: null }
                        : { hora_inicio: "09:00", hora_fin: "13:00" }
                      actualizarExcepcionLocal(excepcion.id, cambios)
                      persistirExcepcion(excepcion.id, cambios)
                    }}
                    className="size-4 shrink-0 accent-foreground"
                  />
                </label>
              )}

              {!diaCompleto && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={(excepcion.hora_inicio ?? "09:00").slice(0, 5)}
                    onChange={(e) => {
                      actualizarExcepcionLocal(excepcion.id, { hora_inicio: e.target.value })
                      persistirExcepcion(excepcion.id, { hora_inicio: e.target.value })
                    }}
                    className={cn(inputClase, "flex-1")}
                  />
                  <span className="text-xs text-muted-foreground">a</span>
                  <input
                    type="time"
                    value={(excepcion.hora_fin ?? "13:00").slice(0, 5)}
                    onChange={(e) => {
                      actualizarExcepcionLocal(excepcion.id, { hora_fin: e.target.value })
                      persistirExcepcion(excepcion.id, { hora_fin: e.target.value })
                    }}
                    className={cn(inputClase, "flex-1")}
                  />
                </div>
              )}
            </div>
          )
        })}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => crearExcepcion("bloqueo")}
            className="self-start"
          >
            <Plus className="size-3.5" /> Bloquear fecha
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => crearExcepcion("apertura_extra")}
            className="self-start"
          >
            <Plus className="size-3.5" /> Apertura extra
          </Button>
        </div>
      </div>
    </div>
  )
}
