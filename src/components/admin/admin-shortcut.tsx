"use client"

import type { Session } from "@supabase/supabase-js"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { ADMIN_EMAIL } from "@/lib/admin"
import { supabase } from "@/lib/supabase"

export function AdminShortcut() {
  const [session, setSession] = React.useState<Session | null>(null)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nuevaSession) => setSession(nuevaSession)
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  if (session?.user.email !== ADMIN_EMAIL) return null

  return (
    <Link
      href="/admin/dashboard"
      aria-label="Panel de administración"
      title="Panel de administración"
      className="fixed right-4 top-4 z-40 flex size-9 items-center justify-center rounded-full border border-border bg-white/70 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground dark:bg-zinc-900/50"
    >
      <ShieldCheck className="size-4" />
    </Link>
  )
}
