import type { AvatarForma, DivisorBanner, EstiloTipografia, IdentidadVisual } from "@/lib/types"

// ============================================================================
// Formas de avatar
// ============================================================================
// circulo/suave: border-radius, ya existían. hexagono: polygon() — porcentual,
// se ve igual de nítido en cualquier tamaño (verificado renderizado a 32px y
// 96px). blob/corazon/estrella: la estrella también es polygon() (un path
// recto, sin curvas, así que escala perfecto); blob y corazón SÍ necesitan
// curvas (path()) y esas coordenadas son píxeles literales de la caja de
// referencia — NO escalan solas con el tamaño del elemento. Por eso van
// autoradas en una caja fija de 100×100 y el que las use debe envolverlas en
// un wrapper con `transform: scale(tamañoReal / 100)` (mismo wrapper sirve
// para el "anillo": mismo clip-path, caja un poco más grande, detrás de la
// foto — un box-shadow/ring normal no abraza estas siluetas, verificado).
export type TierPersonalizacion = "basica" | "avanzada"

export interface FormaAvatarMeta {
  id: AvatarForma
  etiqueta: string
  tier: TierPersonalizacion
  /** border-radius vía className — circulo/suave, sin clip-path. */
  claseCss?: string
  /** polygon() o path(); las de path() requieren el wrapper de 100×100 + scale. */
  clipPath?: string
  /** true = el clip-path es path() con curvas, necesita el wrapper de escala. */
  requiereWrapperEscala?: boolean
}

export const FORMAS_AVATAR: FormaAvatarMeta[] = [
  { id: "circulo", etiqueta: "Círculo", tier: "basica", claseCss: "rounded-full" },
  { id: "suave", etiqueta: "Redondeado", tier: "basica", claseCss: "rounded-[2rem]" },
  {
    id: "hexagono",
    etiqueta: "Hexágono",
    tier: "basica",
    clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  },
  {
    id: "estrella",
    etiqueta: "Estrella",
    tier: "avanzada",
    clipPath:
      "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  },
  {
    id: "corazon",
    etiqueta: "Corazón",
    tier: "avanzada",
    requiereWrapperEscala: true,
    clipPath:
      "path('M50 24 C 38 4, 6 4, 6 34 C 6 58, 30 76, 50 92 C 70 76, 94 58, 94 34 C 94 4, 62 4, 50 24 Z')",
  },
  {
    id: "blob",
    etiqueta: "Blob orgánico",
    tier: "avanzada",
    requiereWrapperEscala: true,
    clipPath:
      "path('M29 9 C 52 -6 78 3 92 22 C 105 41 96 55 88 68 C 79 82 84 96 62 97 C 40 98 40 88 24 90 C 8 92 -4 78 3 60 C 8 46 2 38 6 24 C 10 11 16 15 29 9 Z')",
  },
]

// "cuadrado" (legacy: rounded-md/xl) queda deliberadamente FUERA de este
// array — sigue existiendo en el tipo y en el render de TarjetaCard para no
// romper tarjetas ya guardadas con ese valor, pero el picker del editor ya
// no la ofrece como opción nueva (ver CLAUDE.md, decisión confirmada).

// ============================================================================
// Divisores banner → tarjeta
// ============================================================================
// "recta" no es un clip-path nuevo: es el rounded-t-[2rem] que ya existe hoy,
// sin tocar. diagonal/zigzag son polygon() (porcentuales, escalan sin
// problema). onda es path() — path() ata las coordenadas al ancho real en
// píxeles de la caja, y TarjetaCard mide entre 320-384px según breakpoint;
// se autoró para 340px y se verificó renderizada también a 384px: la
// diferencia es imperceptible a simple vista (probado lado a lado), así que
// un solo path alcanza para todo el rango real sin lógica condicional por
// ancho.
export interface DivisorBannerMeta {
  id: DivisorBanner
  etiqueta: string
  tier: TierPersonalizacion | null // null = sin gating, disponible siempre
  clipPath: string | null // null = "recta", usa el rounded-t-[2rem] actual
  /** Solo "onda": ancho (px) para el que se autoró el path() — el swatch
   *  chico del picker lo reescala con el mismo wrapper de scale que usan las
   *  formas de avatar con path(); la tarjeta real lo aplica directo, sin
   *  reescalar (se probó renderizado que tolera bien todo el rango real de
   *  320-384px de ancho, ver CLAUDE.md). */
  anchoDiseno?: number
}

export const DIVISORES_BANNER: DivisorBannerMeta[] = [
  { id: "recta", etiqueta: "Recta", tier: null, clipPath: null },
  {
    id: "diagonal",
    etiqueta: "Diagonal",
    tier: "avanzada",
    clipPath: "polygon(0% 60%, 100% 0%, 100% 100%, 0% 100%)",
  },
  {
    id: "zigzag",
    etiqueta: "Zigzag",
    tier: "avanzada",
    clipPath:
      "polygon(0% 40%, 8.33% 0%, 16.67% 40%, 25% 0%, 33.33% 40%, 41.67% 0%, 50% 40%, 58.33% 0%, 66.67% 40%, 75% 0%, 83.33% 40%, 91.67% 0%, 100% 40%, 100% 100%, 0% 100%)",
  },
  {
    id: "onda",
    etiqueta: "Onda",
    tier: "avanzada",
    // El borde inferior del path va a y=4000 (no y=100 como en el diseño
    // original) — bug real encontrado antes de integrarlo: el panel de
    // contenido real mide varios cientos de px de alto según el contenido
    // (agenda, servicios, productos...), y path() usa píxeles absolutos, no
    // porcentuales — con el borde en y=100 todo el contenido debajo de esa
    // línea quedaba recortado (invisible). 4000 excede cualquier alto real
    // posible sin afectar el swatch chico (un clip-path que se extiende más
    // allá de la caja visible simplemente no recorta nada extra ahí).
    anchoDiseno: 340,
    clipPath:
      "path('M0,20 C 42.5,0 85,40 127.5,20 C 170,0 212.5,40 255,20 C 297.5,0 340,40 340,20 L340,4000 L0,4000 Z')",
  },
]

// ============================================================================
// Estilo tipográfico (modo simple: 1 fuente para título Y cuerpo)
// ============================================================================
// Las 3 son tier "basica" (requieren personalizacion_libre) — igual que las
// formas básicas, "moderna" nunca muestra candado en la práctica porque es
// el default de cualquier tarjeta nueva (nunca difiere de lo guardado).
export interface EstiloTipografiaMeta {
  id: EstiloTipografia
  etiqueta: string
  tier: TierPersonalizacion
  fuente?: string
}

export const ESTILOS_TIPOGRAFIA: EstiloTipografiaMeta[] = [
  { id: "moderna", etiqueta: "Moderna", tier: "basica" },
  { id: "elegante", etiqueta: "Elegante", tier: "basica", fuente: "var(--font-elegante)" },
  { id: "creativa", etiqueta: "Creativa", tier: "basica", fuente: "var(--font-creativa)" },
]

// ============================================================================
// Plantillas — cada una es solo un bundle de los campos ya definidos, nada
// de campos bespoke nuevos ("glow"/"doble anillo" de los briefs se logran
// combinando color + la técnica de anillo con clip-path de arriba, no son
// mecanismos aparte). `plantillaBase` NO va adentro de `valores`: lo setea
// quien aplica la plantilla, al momento de aplicarla, para no confundir
// "valor del campo" con "de qué plantilla vino".
export interface Plantilla {
  id: string
  nombre: string
  vibe: string
  valores: Partial<IdentidadVisual>
}

export const PLANTILLAS: Plantilla[] = [
  {
    id: "aurora-creator",
    nombre: "Aurora Creator",
    vibe: "Para creadores de contenido — vibrante, con efecto vidrio sutil.",
    valores: {
      bannerPreset: "aurora",
      colorPrimario: "#6366f1",
      colorSecundario: "#a855f7",
      avatarForma: "circulo",
      divisorBanner: "onda",
      glassmorfismo: true,
      estiloTipografia: "moderna",
      temaModo: "claro",
    },
  },
  {
    id: "estudio-minimal",
    nombre: "Estudio Minimal",
    vibe: "Blanco y negro, elegante — para consultoría o servicios profesionales.",
    valores: {
      colorPrimario: "#171717",
      colorSecundario: "#404040",
      avatarForma: "suave",
      divisorBanner: "recta",
      glassmorfismo: false,
      estiloTipografia: "elegante",
      temaModo: "claro",
    },
  },
  {
    id: "neon-nocturno",
    nombre: "Neón Nocturno",
    vibe: "Fondo oscuro, acentos neón — para vida nocturna, música, eventos.",
    valores: {
      temaModo: "oscuro",
      colorPrimario: "#22d3ee",
      colorSecundario: "#e879f9",
      avatarForma: "circulo",
      divisorBanner: "zigzag",
      glassmorfismo: true,
      estiloTipografia: "moderna",
    },
  },
  {
    id: "calido-bienestar",
    nombre: "Cálido Bienestar",
    vibe: "Tierra y terracota — para yoga, wellness, terapias.",
    valores: {
      colorPrimario: "#c2673d",
      colorSecundario: "#a8763f",
      avatarForma: "blob",
      divisorBanner: "onda",
      glassmorfismo: false,
      estiloTipografia: "creativa",
      temaModo: "claro",
    },
  },
  {
    id: "mono-bold",
    nombre: "Mono Bold",
    vibe: "Alto contraste blanco y negro — para marcas con personalidad fuerte.",
    valores: {
      colorPrimario: "#000000",
      colorSecundario: "#000000",
      colorBotones: "#000000",
      colorBadges: "#000000",
      modoColorAvanzado: true,
      colorTextoBotones: "#ffffff",
      colorTextoBadges: "#ffffff",
      avatarForma: "hexagono",
      divisorBanner: "diagonal",
      glassmorfismo: false,
      estiloTipografia: "moderna",
      temaModo: "claro",
    },
  },
  {
    id: "pastel-soft",
    nombre: "Pastel Soft",
    vibe: "Colores suaves — para marcas delicadas, cuidado personal, regalos.",
    valores: {
      colorPrimario: "#fbcfe8",
      colorSecundario: "#bfdbfe",
      avatarForma: "circulo",
      divisorBanner: "onda",
      glassmorfismo: false,
      estiloTipografia: "moderna",
      temaModo: "claro",
    },
  },
]

// ============================================================================
// Gating: "¿esta opción puntual está bloqueada para el plan actual?"
// ============================================================================
// Nunca bloquea el valor que YA está guardado (evita que bajar de plan
// rompa/marque como inválido algo que la persona no tocó — ver CLAUDE.md,
// Parte C del plan). Solo compara la opción candidata contra lo guardado.
export interface PlanFeaturesPersonalizacion {
  personalizacion_libre: boolean
  personalizacion_avanzada: boolean
}

export interface Bloqueo {
  plan: "alcance" | "poder"
}

function featureDeTier(tier: TierPersonalizacion): "personalizacion_libre" | "personalizacion_avanzada" {
  return tier === "basica" ? "personalizacion_libre" : "personalizacion_avanzada"
}

function planDeTier(tier: TierPersonalizacion): "alcance" | "poder" {
  return tier === "basica" ? "alcance" : "poder"
}

export function estaBloqueada(
  tier: TierPersonalizacion | null,
  valorOpcion: unknown,
  valorGuardado: unknown,
  features: PlanFeaturesPersonalizacion
): Bloqueo | null {
  if (!tier) return null // ej. divisor "recta", sin gating
  if (valorOpcion === valorGuardado) return null // ya lo tenía, nunca se bloquea
  if (features[featureDeTier(tier)]) return null // el plan ya lo cubre
  return { plan: planDeTier(tier) }
}

// ============================================================================
// calcularBloqueos: la lista completa de bloqueos del draft actual contra lo
// guardado — la usan tanto el botón de guardar (TarjetaForm) como la
// galería de plantillas (para decidir si mostrar el candado en una card).
// `guardado === null` = modo creación (tarjeta nueva, sin fila en DB
// todavía): se compara directo contra el plan elegido, sin "ya lo tenía".
// ============================================================================
export interface BloqueoCampo extends Bloqueo {
  campo: string
  valorEtiqueta: string
}

const CAMPOS_COLOR_BASICOS = ["colorPrimario", "colorSecundario", "colorBotones", "colorBadges"] as const

export function calcularBloqueos(
  draft: IdentidadVisual,
  guardado: IdentidadVisual | null,
  features: PlanFeaturesPersonalizacion
): BloqueoCampo[] {
  const bloqueos: BloqueoCampo[] = []
  const base = guardado ?? {}

  if (draft.avatarForma) {
    const meta = FORMAS_AVATAR.find((f) => f.id === draft.avatarForma)
    if (meta) {
      const b = estaBloqueada(meta.tier, draft.avatarForma, base.avatarForma ?? "circulo", features)
      if (b) bloqueos.push({ ...b, campo: "Forma de avatar", valorEtiqueta: meta.etiqueta })
    }
  }

  if (draft.divisorBanner) {
    const meta = DIVISORES_BANNER.find((d) => d.id === draft.divisorBanner)
    if (meta) {
      const b = estaBloqueada(meta.tier, draft.divisorBanner, base.divisorBanner ?? "recta", features)
      if (b) bloqueos.push({ ...b, campo: "Divisor", valorEtiqueta: meta.etiqueta })
    }
  }

  if (draft.estiloTipografia) {
    const meta = ESTILOS_TIPOGRAFIA.find((e) => e.id === draft.estiloTipografia)
    if (meta) {
      const b = estaBloqueada(meta.tier, draft.estiloTipografia, base.estiloTipografia ?? "moderna", features)
      if (b) bloqueos.push({ ...b, campo: "Estilo tipográfico", valorEtiqueta: meta.etiqueta })
    }
  }

  if (draft.glassmorfismo) {
    const b = estaBloqueada("avanzada", true, base.glassmorfismo ?? false, features)
    if (b) bloqueos.push({ ...b, campo: "Efecto vidrio", valorEtiqueta: "Activado" })
  }

  if (draft.modoColorAvanzado) {
    const b = estaBloqueada("avanzada", true, base.modoColorAvanzado ?? false, features)
    if (b) bloqueos.push({ ...b, campo: "Modo avanzado de color", valorEtiqueta: "Activado" })
  }

  if (draft.modoTipografiaAvanzado) {
    const b = estaBloqueada("avanzada", true, base.modoTipografiaAvanzado ?? false, features)
    if (b) bloqueos.push({ ...b, campo: "Modo avanzado de tipografía", valorEtiqueta: "Activado" })
  }

  // Colores personalizados (fondo/botones/badges): se consolida en un solo
  // bloqueo aunque varios de los 4 campos difieran a la vez, para no listar
  // 4 líneas casi idénticas.
  const colorCambio = CAMPOS_COLOR_BASICOS.some((campo) => {
    const valor = draft[campo]
    return valor !== undefined && valor !== (base[campo] ?? undefined)
  })
  if (colorCambio) {
    const b = estaBloqueada("basica", true, false, features)
    if (b) bloqueos.push({ ...b, campo: "Colores personalizados", valorEtiqueta: "Personalizado" })
  }

  return bloqueos
}

/** El bloqueo más restrictivo entre una lista — para decidir qué candado
 *  (Alcance o Poder) mostrar en una card de plantilla que tiene varios
 *  ingredientes bloqueados a la vez. */
export function bloqueoMasRestrictivo(bloqueos: BloqueoCampo[]): Bloqueo | null {
  if (bloqueos.some((b) => b.plan === "poder")) return { plan: "poder" }
  if (bloqueos.some((b) => b.plan === "alcance")) return { plan: "alcance" }
  return null
}
