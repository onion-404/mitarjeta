import "server-only"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Cliente con permisos de service role (bypassea RLS). Solo debe usarse en
 * código server-only para confirmar pagos de invitados ya verificados
 * directamente con Mercado Pago, nunca para operaciones iniciadas por el cliente.
 * Devuelve `null` si SUPABASE_SERVICE_ROLE_KEY todavía no fue configurada.
 */
export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
