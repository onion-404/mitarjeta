"use client"

import type { Session } from "@supabase/supabase-js"
import { CreditCard, Loader2 } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  getSuscripcionesDeUsuario,
  getTarjetasDeUsuario,
  nombrePrincipalDeTarjeta,
  type SuscripcionResumen,
} from "@/lib/tarjetas"
import { supabase } from "@/lib/supabase"
import type { EstadoSuscripcion, TarjetaConPlan } from "@/lib/types"
import { cn } from "@/lib/utils"

const ESTADO_ETIQUETA: Record<EstadoSuscripcion, string> = {
  pendiente: "Pendiente",
  autorizada: "Autorizada",
  pausada: "Pausada",
  cancelada: "Cancelada",
  vencida: "Vencida",
}

const ESTADO_CLASE: Record<EstadoSuscripcion, string> = {
  autorizada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  pausada: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  vencida: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
}

// "Suscripción y Pago" — una fila por tarjeta con su plan/estado y un botón
// "Administrar pago" propio (Stripe Customer Portal). El plan vive en la
// tarjeta, no en el usuario, y cada suscripción tiene su propio
// stripe_customer_id (ver crearCheckoutSession/crearPortalSession) — no
// existe "un portal único de la cuenta", por eso el botón es por fila y se
// deshabilita hasta que esa suscripción puntual ya tenga Customer asignado
// (pasó por checkout.session.completed).
export default function MiCuentaSuscripcionPage() {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  const [tarjetas, setTarjetas] = React.useState<TarjetaConPlan[] | null>(null)
  const [suscripciones, setSuscripciones] = React.useState<Record<
    string,
    SuscripcionResumen
  > | null>(null)
  const [abriendoPortalId, setAbriendoPortalId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!session) return
    let cancelado = false
    async function cargar() {
      const data = await getTarjetasDeUsuario(session!.user.id)
      if (cancelado) return
      setTarjetas(data)
      const mapa = await getSuscripcionesDeUsuario(data.map((t) => t.id))
      if (!cancelado) setSuscripciones(mapa)
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [session])

  async function handleAdministrarPago(tarjetaId: string) {
    setError(null)
    setAbriendoPortalId(tarjetaId)

    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) {
      setError("Tu sesión expiró, vuelve a iniciar sesión.")
      setAbriendoPortalId(null)
      return
    }

    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ tarjetaId }),
    })
    const body = await res.json().catch(() => null)

    if (!res.ok) {
      setAbriendoPortalId(null)
      setError(body?.error ?? "No pudimos abrir el portal de pago.")
      return
    }
    window.location.assign(body.portalUrl)
  }

  if (session === undefined || tarjetas === null || suscripciones === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Suscripción y Pago</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra el método de pago y la facturación de cada tarjeta.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {tarjetas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Todavía no tienes ninguna tarjeta.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tarjetas.map((tarjeta) => {
            const s = suscripciones[tarjeta.id]
            const puedeAdministrar = Boolean(s?.stripe_customer_id)
            return (
              <div
                key={tarjeta.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:bg-zinc-900/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {nombrePrincipalDeTarjeta(tarjeta)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    /{tarjeta.slug} · {tarjeta.planes?.nombre_display ?? "Sin plan"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium",
                        ESTADO_CLASE[s.estado]
                      )}
                    >
                      {ESTADO_ETIQUETA[s.estado]}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!puedeAdministrar || abriendoPortalId === tarjeta.id}
                    title={
                      puedeAdministrar
                        ? undefined
                        : "Todavía no hay un pago confirmado para esta tarjeta"
                    }
                    onClick={() => handleAdministrarPago(tarjeta.id)}
                  >
                    {abriendoPortalId === tarjeta.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-3.5" />
                    )}
                    Administrar pago
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
