import { createClient } from "@supabase/supabase-js";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
function getVar(name) {
  const line = env.split("\n").find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1).trim().replace(/\r$/, "") : null;
}
const supabase = createClient(getVar("NEXT_PUBLIC_SUPABASE_URL"), getVar("SUPABASE_SERVICE_ROLE_KEY"));

const { data: planPresencia } = await supabase.from("planes").select("id").eq("slug", "presencia").single();
const { data: planPoder } = await supabase.from("planes").select("id").eq("slug", "poder").single();

const { data: userA, error: eu } = await supabase.auth.admin.createUser({
  email: "prueba-secciones-legacy@example.com", email_confirm: true,
});
if (eu) { console.error(eu); process.exit(1); }

// Tarjeta con modelo LEGACY de servicios (sin seccionesServicios) en plan Presencia
const { data: tarjetaLegacy, error: e1 } = await supabase.from("tarjetas").insert({
  slug: "prueba-servicios-legacy",
  tipo: "personal",
  user_id: userA.user.id,
  datos_contacto: {
    nombre: "Prueba Legacy",
    descripcionServicios: "Descripcion general legacy",
    servicios: [
      { titulo: "Corte de pelo", descripcion: "Corte clasico" },
      { titulo: "Barba", descripcion: "Arreglo de barba" },
    ],
  },
  identidad_visual: { colorPrimario: "#6366f1", colorSecundario: "#a855f7", tituloServicios: "Lo que ofrecemos" },
  publicado: true,
  plan_id: planPresencia.id,
}).select().single();
if (e1) { console.error(e1); process.exit(1); }

// Tarjeta con modelo NUEVO de seccionesServicios en plan Poder (para probar tope 3 + folleto en [0])
const { data: userB, error: eu2 } = await supabase.auth.admin.createUser({
  email: "prueba-secciones-nuevo@example.com", email_confirm: true,
});
if (eu2) { console.error(eu2); process.exit(1); }

const { data: tarjetaNueva, error: e2 } = await supabase.from("tarjetas").insert({
  slug: "prueba-servicios-nuevo",
  tipo: "personal",
  user_id: userB.user.id,
  datos_contacto: {
    nombre: "Prueba Nuevo",
    seccionesServicios: [
      { titulo: "Cortes", items: [{ titulo: "Corte clasico", precio: "150", descripcion: "Con lavado" }] },
    ],
  },
  identidad_visual: { colorPrimario: "#6366f1", colorSecundario: "#a855f7" },
  publicado: true,
  plan_id: planPoder.id,
}).select().single();
if (e2) { console.error(e2); process.exit(1); }

console.log(JSON.stringify({
  userAId: userA.user.id, tarjetaLegacyId: tarjetaLegacy.id,
  userBId: userB.user.id, tarjetaNuevaId: tarjetaNueva.id,
}, null, 2));
