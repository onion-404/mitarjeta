"use client"

import { Mail } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { GoogleIcon } from "@/components/auth/google-icon"
import { supabase } from "@/lib/supabase"

const inputClase =
  "w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none backdrop-blur transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-zinc-900/60"

interface AuthMethodsProps {
  redirectTo: string
}

export function AuthMethods({ redirectTo }: AuthMethodsProps) {
  const [emailInput, setEmailInput] = React.useState("")
  const [emailEnviado, setEmailEnviado] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleGoogle() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    })
    if (error) {
      setError("No pudimos iniciar sesión con Google.")
      setLoading(false)
    }
  }

  async function handleEmailSubmit(event: React.SubmitEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setError("Ingresá un correo válido.")
      return
    }

    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
    })
    setLoading(false)

    if (error) {
      setError("No pudimos enviar el enlace. Intentá de nuevo.")
      return
    }
    setEmailEnviado(true)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={loading}
        onClick={handleGoogle}
      >
        <GoogleIcon className="size-4" /> Continuar con Google
      </Button>

      {emailEnviado ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
          Te enviamos un enlace a <strong>{emailInput}</strong>. Abrilo para
          continuar.
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
          <Button type="submit" variant="secondary" disabled={loading}>
            <Mail className="size-4" />
          </Button>
        </form>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  )
}
