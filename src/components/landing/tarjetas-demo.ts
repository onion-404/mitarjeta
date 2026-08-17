// Personas de ejemplo (mockup de producto, no testimonios ni afirmaciones de
// clientes reales — mismo criterio que ya usaba TARJETA_DEMO histórico)
// reutilizadas por el abanico del hero (page.tsx) y por el showcase de
// nichos (showcase-nichos.tsx). Centralizadas acá para que ambas secciones
// muestren SIEMPRE la misma tarjeta real renderizada por <TarjetaCard> — sin
// capturas de pantalla estáticas que puedan quedar desactualizadas si el
// componente cambia de diseño. Cada una usa un bannerPreset real
// (lib/banner-presets.ts), nunca un gradiente inventado para la landing.
export const TARJETA_CREADORA = {
  tipo: "personal" as const,
  slug: "sofia-martin",
  datosContacto: {
    nombre: "Sofía Martín",
    puesto: "Diseñadora UX",
    telefono: "+52 55 5555 5555",
    whatsapp: "+52 55 5555 5555",
    email: "sofia@ejemplo.com",
    redes: [
      { plataforma: "instagram" as const, label: "", url: "https://instagram.com/sofia" },
    ],
  },
  identidadVisual: {
    colorPrimario: "#6366f1",
    colorSecundario: "#a855f7",
    bannerPreset: "aurora",
  },
}

export const TARJETA_ESTUDIO = {
  tipo: "personal" as const,
  slug: "estudio-raiz",
  datosContacto: {
    nombre: "Estudio Raíz",
    empresa: "Peluquería y estética",
    telefono: "+52 55 4444 4444",
    horarios: "Lun-Sáb 9-19h",
  },
  identidadVisual: {
    bannerPreset: "sunset",
    estiloTipografia: "elegante" as const,
  },
}

export const TARJETA_ANTOJITOS = {
  tipo: "personal" as const,
  slug: "tacos-el-primo",
  datosContacto: {
    nombre: "Tacos El Primo",
    empresa: "Antojitos mexicanos",
    telefono: "+52 55 3333 3333",
    horarios: "Todos los días 18-24h",
  },
  identidadVisual: {
    bannerPreset: "citrus",
    estiloTipografia: "creativa" as const,
  },
}

export const TARJETA_TERAPEUTA = {
  tipo: "personal" as const,
  slug: "valentina-reyes",
  datosContacto: {
    nombre: "Dra. Valentina Reyes",
    puesto: "Psicóloga clínica",
    telefono: "+52 55 2222 2222",
    whatsapp: "+52 55 2222 2222",
    horarios: "Lun-Vie 10-18h",
  },
  identidadVisual: {
    bannerPreset: "mint",
    estiloTipografia: "moderna" as const,
  },
}
