"use client"

import type { Session } from "@supabase/supabase-js"
import { ArrowLeft, Check, Copy, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { ADMIN_EMAIL } from "@/lib/admin"
import { supabase } from "@/lib/supabase"

const inputClase =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export default function CobroManualPage() {
  const router = useRouter()
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)

  const [monto, setMonto] = React.useState("")
  const [descripcion, setDescripcion] = React.useState("")
  const [payerEmail, setPayerEmail] = React.useState("")
  const [generando, setGenerando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [initPoint, setInitPoint] = React.useState<string | null>(null)
  const [copiado, setCopiado] = React.useState(false)

  const esAdmin = session?.user.email === ADMIN_EMAIL

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (session === undefined) return
    if (!esAdmin) router.replace("/")
  }, [session, esAdmin, router])

  async function handleGenerar(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setInitPoint(null)

    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) {
      setError("Tu sesión expiró, volvé a iniciar sesión.")
      return
    }

    setGenerando(true)
    const res = await fetch("/api/admin/cobro-manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        monto: Number(monto),
        descripcion,
        payerEmail: payerEmail.trim() || undefined,
      }),
    })
    const body = await res.json().catch(() => null)
    setGenerando(false)

    if (!res.ok) {
      setError(body?.error ?? "No pudimos generar el link de pago.")
      return
    }
    setInitPoint(body.initPoint)
  }

  async function copiarLink() {
    if (!initPoint) return
    await navigator.clipboard.writeText(initPoint)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (session === undefined || !esAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al panel
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">Cobro manual</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Genera un link de pago puntual (Checkout Pro) para compartir por WhatsApp u otro
        medio. No queda registrado en ningún lugar del sistema, solo es un link de Mercado
        Pago.
      </p>

      <form
        onSubmit={handleGenerar}
        className="mt-6 flex flex-col gap-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Monto (MXN)</span>
          <input
            type="number"
            min={1}
            step="0.01"
            required
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="500"
            className={inputClase}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Descripción</span>
          <input
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Lo que va a ver el pagador en Mercado Pago"
            className={inputClase}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">
            Email del pagador <span className="font-normal text-muted-foreground">(opcional)</span>
          </span>
          <input
            type="email"
            value={payerEmail}
            onChange={(e) => setPayerEmail(e.target.value)}
            placeholder="Para pre-llenarlo en el checkout"
            className={inputClase}
          />
        </label>

        <Button type="submit" disabled={generando} className="self-start">
          {generando ? <Loader2 className="size-4 animate-spin" /> : "Generar link de pago"}
        </Button>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      {initPoint && (
        <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-foreground">Link generado</h2>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={initPoint}
              onFocus={(e) => e.currentTarget.select()}
              className={inputClase}
            />
            <Button type="button" variant="outline" size="icon" onClick={copiarLink}>
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <a
            href={initPoint}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <ExternalLink className="size-4" /> Abrir link de pago
          </a>
        </div>
      )}
    </div>
  )
}
