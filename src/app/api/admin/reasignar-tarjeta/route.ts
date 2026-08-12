import { ADMIN_EMAIL } from "@/lib/admin"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"

interface BodyReasignarTarjeta {
  tarjetaId?: string
  email?: string
}

// Reasigna una tarjeta (creada por el admin a nombre de un cliente que pidió
// ayuda, ej.) a la cuenta real del cliente, buscada por email. La SDK de
// supabase-js instalada (2.110.2) no expone un filtro por email en
// `listUsers()` — confirmado contra la API real de GoTrue que
// `GET /auth/v1/admin/users?filter=<email>` sí busca por email exacto y
// devuelve `users: []` (sin error críptico) si no existe ninguna cuenta.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || userData.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: "No tienes permiso para hacer esto." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as BodyReasignarTarjeta | null
  const { tarjetaId, email } = body ?? {}

  if (!tarjetaId || !email?.trim()) {
    return Response.json({ error: "Faltan datos obligatorios." }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 500 }
    )
  }

  const emailNormalizado = email.trim().toLowerCase()
  const busquedaRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(emailNormalizado)}`,
    { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } }
  )

  if (!busquedaRes.ok) {
    return Response.json({ error: "No pudimos buscar esa cuenta. Prueba de nuevo." }, { status: 500 })
  }

  const busquedaData = (await busquedaRes.json()) as { users?: { id: string; email?: string }[] }
  const usuario = busquedaData.users?.find(
    (u) => u.email?.toLowerCase() === emailNormalizado
  )

  if (!usuario) {
    return Response.json(
      {
        error:
          "No existe ninguna cuenta registrada con ese email. Pedile al cliente que inicie sesión al menos una vez (Google o link mágico) antes de reasignar.",
      },
      { status: 404 }
    )
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 500 }
    )
  }

  const { data: tarjeta, error: tarjetaError } = await admin
    .from("tarjetas")
    .select("id")
    .eq("id", tarjetaId)
    .maybeSingle()

  if (tarjetaError || !tarjeta) {
    return Response.json({ error: "La tarjeta no existe." }, { status: 400 })
  }

  const { error: updateError } = await admin
    .from("tarjetas")
    .update({ user_id: usuario.id })
    .eq("id", tarjetaId)

  if (updateError) {
    return Response.json({ error: "No pudimos reasignar la tarjeta." }, { status: 500 })
  }

  return Response.json({ ok: true, email: usuario.email })
}
