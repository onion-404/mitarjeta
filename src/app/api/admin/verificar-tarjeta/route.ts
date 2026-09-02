import { ADMIN_EMAIL } from "@/lib/admin"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"

interface BodyVerificarTarjeta {
  tarjetaId?: string
  verificado?: boolean
}

// Prende/apaga `tarjetas.verificado` (ícono de verificación junto al
// @slug en la tarjeta pública) — check exclusivo del panel admin, el dueño
// de la tarjeta no tiene forma de tocarlo desde su propio editor (por eso
// vive en una columna aparte, no en `identidad_visual`). Mismo patrón que
// el resto de las rutas /api/admin/*: Bearer token + chequeo de ADMIN_EMAIL
// + service role (bypassea RLS, no depende de una policy de UPDATE nueva).
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || userData.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: "No tienes permiso para hacer esto." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as BodyVerificarTarjeta | null
  const { tarjetaId, verificado } = body ?? {}
  if (!tarjetaId || typeof verificado !== "boolean") {
    return Response.json({ error: "Faltan datos obligatorios." }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 500 }
    )
  }

  const { error } = await admin.from("tarjetas").update({ verificado }).eq("id", tarjetaId)

  if (error) {
    return Response.json({ error: "No pudimos actualizar la verificación." }, { status: 500 })
  }

  return Response.json({ ok: true })
}
