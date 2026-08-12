import type { PlanSlug } from "@/lib/types"

// Copy de marketing por plan (propuesta de valor, "ideal para" y "lo que
// incluye") — texto de presentación fijo, no vive en la DB (mismo criterio
// que las etiquetas de features que antes vivían en comparativa-planes.tsx:
// cambia solo con un deploy, no con un UPDATE en `planes`). Fuente única
// compartida entre /planes (ComparativaPlanes, la versión completa) y el
// home (PreciosDestacados, que muestra tagline + incluye, sin "ideal para").
export interface ItemIncluye {
  titulo: string
  detalle?: string
}

export interface CopyPlan {
  /** Frase corta para el teaser del home (una línea). */
  tagline: string
  /** Párrafo de propuesta de valor, para la comparativa completa de /planes. */
  propuesta: string
  idealPara: string[]
  /** "Lo que incluye" — decisión de negocio del cliente sobre qué mostrar,
   *  no una lista auto-generada desde `planes.features` (a diferencia del
   *  comparador anterior). Antes de publicar cada ítem se verificó contra
   *  el código real (ver CLAUDE.md, sección "Modelo de negocio" — hay 2
   *  ítems adelantados a su construcción real, marcados explícitamente ahí
   *  como pendiente urgente, no un olvido). */
  incluye: ItemIncluye[]
}

export const COPY_PLAN: Record<PlanSlug, CopyPlan> = {
  connect: {
    tagline: "Presencia digital sin fricción: catálogo, agenda y pagos.",
    propuesta:
      "Convierte cada visita en un cliente directo con una presencia digital impecable y sin fricción.",
    idealPara: [
      "Servicios profesionales independientes — abogados, contadores, consultores y terapeutas",
      "Salud, belleza y bienestar — médicos, estilistas, entrenadores personales y estudios boutique",
      "Comercios locales y artesanos — restaurantes, cafeterías, talleres y tiendas",
    ],
    incluye: [
      { titulo: "Visitas ilimitadas a tu Linkard", detalle: "Sin importar cuánta gente lo vea" },
      { titulo: "Código QR dinámico ilimitado", detalle: "Listo para descargar e imprimir" },
      {
        titulo: "Agendamiento de citas ilimitado",
        detalle: "Sincronización con Google Calendar",
      },
      {
        titulo: "Recordatorios y notificaciones ilimitadas por WhatsApp",
        detalle: "Cero ausencias",
      },
      { titulo: "Cobro de citas y servicios en línea", detalle: "Integración de pasarela directa" },
      {
        titulo: "Personalización de diseño avanzada",
        detalle: "Formas, divisores, efectos, fondos y tipografías",
      },
      { titulo: "Clics e interacciones ilimitadas", detalle: "Sin topes de tráfico" },
    ],
  },
  growth: {
    tagline: "Analítica de alto rendimiento para escalar tus conversiones.",
    propuesta:
      "Toma decisiones basadas en datos y escala tus conversiones con analítica de alto rendimiento.",
    idealPara: [
      "Creadores de contenido e influencers que reportan métricas a patrocinadores",
      "Empresas, startups y agencias que optimizan su embudo de ventas",
      "E-commerce y negocios que corren pauta paga (Meta Ads, Google Ads, TikTok)",
    ],
    incluye: [
      { titulo: "Todo lo incluido en el plan Connect" },
      {
        titulo: "Desglose de clics por enlace y botón",
        detalle: "Identifica qué servicio genera más interés",
      },
      {
        titulo: "Fuentes de tráfico y canales de procedencia",
        detalle: "Instagram, TikTok, Google, Ads, QR físico",
      },
      {
        titulo: "Analítica geográfica y de dispositivos",
        detalle: "País, ciudad y móvil vs. escritorio",
      },
      {
        titulo: "Métricas filtrables por rango de fechas personalizado",
        detalle: "Compara semanas o meses",
      },
      {
        titulo: "Medición de tasa de conversión de agenda",
        detalle: "Visitas vs. citas concretadas",
      },
      {
        titulo: "Integración de píxeles de seguimiento",
        detalle: "Meta Pixel, Google Tag Manager y TikTok Pixel para retargeting",
      },
      {
        titulo: "Exportación de métricas en CSV / Excel",
        detalle: "Para análisis contable o juntas con clientes",
      },
      {
        titulo: "Reporte mensual automatizado a tu correo",
        detalle: "Resumen ejecutivo de rendimiento, listo para presentar a socios o marcas patrocinadoras",
      },
      {
        titulo: "Parámetros UTM personalizados",
        detalle: "Para rastrear con exactitud el ROI de campañas pagadas",
      },
    ],
  },
}
