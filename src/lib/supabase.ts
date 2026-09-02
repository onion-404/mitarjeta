import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// `persistSession`/`autoRefreshToken`/`detectSessionInUrl` ya eran el
// default de supabase-js — se dejan explícitos (2026-09-04, pedido: "que
// el inicio de sesión se mantenga") para que quede claro que es
// intencional, no un default heredado. Con esto, la sesión sobrevive
// cerrar la pestaña/app y se refresca sola en segundo plano — el dueño
// vuelve a entrar sin loguearse de nuevo mientras no cierre sesión a mano
// o el navegador borre su almacenamiento. Nota real (no controlable desde
// acá): en iOS, un ícono agregado a la pantalla de inicio corre en un
// contexto de almacenamiento que en versiones viejas de iOS podía
// limpiarse solo tras 7 días de inactividad (ITP) — comportamiento de
// WebKit, no de este código; versiones recientes de iOS ya no lo aplican
// a apps instaladas, pero no es algo que se pueda forzar desde el cliente.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
