"use client"

import { Loader2, Plus } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { actualizarCupon, crearCupon, getCupones } from "@/lib/configuracion"
import type { Cupon } from "@/lib/types"
import { cn } from "@/lib/utils"

const inputClase =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

// "Cupones y Precios" — hoy solo cupones (los precios reales viven en
// /admin/configuracion, ver CLAUDE.md sobre por qué "Precios y promoción"
// del dashboard viejo quedó huérfano). Contenido movido tal cual del
// dashboard viejo, sin cambios de lógica — el sistema de cupones avanzado
// (afiliados, vencimiento, límite de usos) es la Parte B, todavía sin
// aplicar.
export default function AdminCuponesPage() {
  const [cupones, setCupones] = React.useState<Cupon[] | null>(null)
  const [nuevoCuponCodigo, setNuevoCuponCodigo] = React.useState("")
  const [nuevoCuponPorcentaje, setNuevoCuponPorcentaje] = React.useState("100")
  const [creandoCupon, setCreandoCupon] = React.useState(false)
  const [cuponFormError, setCuponFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    getCupones().then(setCupones)
  }, [])

  async function handleCrearCupon(event: React.FormEvent) {
    event.preventDefault()
    if (!nuevoCuponCodigo.trim()) return
    setCreandoCupon(true)
    setCuponFormError(null)
    const { error } = await crearCupon(nuevoCuponCodigo, Number(nuevoCuponPorcentaje))
    setCreandoCupon(false)
    if (error) {
      setCuponFormError(
        error.code === "23505" ? "Ese código ya existe." : "No pudimos crear el cupón."
      )
      return
    }
    setNuevoCuponCodigo("")
    setNuevoCuponPorcentaje("100")
    getCupones().then(setCupones)
  }

  async function toggleCuponActivo(cupon: Cupon) {
    await actualizarCupon(cupon.id, { activo: !cupon.activo })
    setCupones(
      (prev) => prev?.map((c) => (c.id === cupon.id ? { ...c, activo: !c.activo } : c)) ?? null
    )
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Cupones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Códigos de descuento para nuevas suscripciones.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <form onSubmit={handleCrearCupon} className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Código</span>
            <input
              value={nuevoCuponCodigo}
              onChange={(e) => setNuevoCuponCodigo(e.target.value)}
              placeholder="LANZAMIENTO100"
              className={inputClase}
            />
          </label>
          <label className="flex w-20 flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">%</span>
            <input
              type="number"
              min={1}
              max={100}
              value={nuevoCuponPorcentaje}
              onChange={(e) => setNuevoCuponPorcentaje(e.target.value)}
              className={inputClase}
            />
          </label>
          <Button type="submit" size="sm" disabled={creandoCupon || !nuevoCuponCodigo.trim()}>
            {creandoCupon ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </Button>
        </form>
        {cuponFormError && <p className="mt-2 text-xs text-destructive">{cuponFormError}</p>}

        <div className="mt-4 flex flex-col gap-2">
          {cupones === null ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : cupones.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no creaste ningún cupón.</p>
          ) : (
            cupones.map((cupon) => (
              <div
                key={cupon.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{cupon.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    {cupon.porcentaje_descuento}% de descuento
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCuponActivo(cupon)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    cupon.activo
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {cupon.activo ? "Activo" : "Inactivo"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
