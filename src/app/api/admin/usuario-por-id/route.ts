import { ADMIN_EMAIL } from "@/lib/admin"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"

// Resuelve el email de un usuario a partir de su id — auth.users no está
// expuesto vía PostgREST al rol anon/authenticated, hace falta la Admin API
// (service role). Usado por el detalle de tarjeta en /admin para mostrar
// quién es el dueño actual antes de reasignarla.
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || userData.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: "No tienes permiso para hacer esto." }, { status: 403 })
  }

  const userId = new URL(request.url).searchParams.get("userId")
  if (!userId) {
    return Response.json({ error: "Falta userId." }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 500 }
    )
  }

  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) {
    return Response.json({ error: "No encontramos esa cuenta." }, { status: 404 })
  }

  return Response.json({ email: data.user.email })
}
