"use client"

import { Banknote, CircleDollarSign, HandCoins, Loader2, TrendingUp } from "lucide-react"
import * as React from "react"

import { getAfiliadoPropio, getPagosAfiliado, getRendimientoAfiliado } from "@/lib/afiliados"
import type { Afiliado, AfiliadoPago } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { RendimientoAfiliado } from "@/lib/afiliados"

const formatoMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

// Solo lectura — el afiliado ve sus ganancias y el historial de pagos ya
// hechos, no puede editar nada (requisito explícito). Revalida por su
// cuenta que sea un afiliado activo (fail-closed, mismo criterio que el
// gating de Agenda por plan_id): la pestaña ya está oculta si no lo es,
// pero esta página no confía solo en eso para alguien que navegue directo
// a la URL.
export default function MiCuentaGananciasPage() {
  const [afiliado, setAfiliado] = React.useState<Afiliado | null | undefined>(undefined)
  const [rendimiento, setRendimiento] = React.useState<RendimientoAfiliado | null>(null)
  const [pagos, setPagos] = React.useState<AfiliadoPago[] | null>(null)

  React.useEffect(() => {
    getAfiliadoPropio().then(setAfiliado)
  }, [])

  React.useEffect(() => {
    if (!afiliado) return
    getRendimientoAfiliado(afiliado.id, afiliado.porcentaje_comision).then(setRendimiento)
    getPagosAfiliado(afiliado.id).then(setPagos)
  }, [afiliado])

  if (afiliado === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (afiliado === null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Ganancias</h1>
        <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Esta sección es solo para afiliados activos.
        </p>
      </div>
    )
  }

  const cargando = rendimiento === null || pagos === null

  const tiles = [
    {
      etiqueta: "Ventas netas atribuidas",
      valor: rendimiento ? formatoMXN.format(rendimiento.ventasNetas) : "—",
      icono: TrendingUp,
      acento: "from-blue-500 to-cyan-500",
    },
    {
      etiqueta: `Comisión (${afiliado.porcentaje_comision}%)`,
      valor: rendimiento ? formatoMXN.format(rendimiento.comisionGenerada) : "—",
      icono: CircleDollarSign,
      acento: "from-emerald-500 to-teal-500",
    },
    {
      etiqueta: "Ya cobrado",
      valor: rendimiento ? formatoMXN.format(rendimiento.totalPagado) : "—",
      icono: Banknote,
      acento: "from-indigo-500 to-violet-500",
    },
    {
      etiqueta: "Saldo pendiente",
      valor: rendimiento ? formatoMXN.format(rendimiento.saldoPendiente) : "—",
      icono: HandCoins,
      acento: "from-amber-500 to-orange-500",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Ganancias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hola {afiliado.nombre} — tu comisión se calcula sobre cada cobro (venta inicial y
          renovaciones) de tus códigos.
        </p>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.etiqueta}
                className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
              >
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-gradient-to-br opacity-20 blur-2xl",
                    tile.acento
                  )}
                />
                <span
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-white",
                    tile.acento
                  )}
                >
                  <tile.icono className="size-4" />
                </span>
                <p className="relative mt-2.5 text-2xl font-semibold text-foreground">
                  {tile.valor}
                </p>
                <p className="relative text-xs text-muted-foreground">{tile.etiqueta}</p>
              </div>
            ))}
          </div>

          {rendimiento && (
            <p className="text-xs text-muted-foreground">
              {rendimiento.cantidadCobros} cobro{rendimiento.cantidadCobros === 1 ? "" : "s"}{" "}
              atribuido{rendimiento.cantidadCobros === 1 ? "" : "s"} · ventas brutas{" "}
              {formatoMXN.format(rendimiento.ventasBrutas)}
              {rendimiento.codigosVigentes.length > 0
                ? ` · códigos: ${rendimiento.codigosVigentes.join(", ")}`
                : ""}
            </p>
          )}

          <div className="rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h2 className="px-6 pt-5 text-sm font-semibold text-foreground">
              Historial de pagos recibidos
            </h2>
            {pagos && pagos.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Todavía no se registró ningún pago.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-border/40">
                {pagos?.map((pago) => (
                  <div key={pago.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatoMXN.format(pago.monto)}
                      </p>
                      {pago.nota && <p className="text-xs text-muted-foreground">{pago.nota}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatoFecha.format(new Date(`${pago.fecha}T00:00:00`))}
                    </p>
                  </div>
                ))}
                <div className="h-2" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
