import { AccionesTarjeta } from "@/components/tarjeta/acciones-tarjeta"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import type { ServicioAgendable, Tarjeta } from "@/lib/types"

interface TarjetaPublicaProps {
  tarjeta: Tarjeta
  slug: string
  agendaServicios: ServicioAgendable[]
}

// Server component: ya no necesita ningún estado propio (el FAB dejó de
// necesitar un ref compartido al <article>, ver acciones-tarjeta.tsx), así
// que no hace falta "use client" acá — TarjetaCard y AccionesTarjeta ya son
// client components por su cuenta, un padre server puede renderizarlos
// igual. Separado de [slug]/page.tsx solo para que el layout
// mobile-full-bleed de acá abajo quede documentado en un solo lugar.
export function TarjetaPublica({ tarjeta, slug, agendaServicios }: TarjetaPublicaProps) {
  const { colorPrimario, colorSecundario } = tarjeta.identidad_visual
  const nombrePrincipal = tarjeta.datos_contacto.nombre

  return (
    <>
      {/* Mobile (por debajo de sm:): ancho completo, sin margin/padding
          arriba — la tarjeta arranca pegada al top. Desde sm: vuelve al
          layout centrado con blobs decorativos de siempre. */}
      <div className="relative flex flex-1 flex-col items-stretch justify-start px-0 pt-0 pb-6 sm:items-center sm:justify-center sm:px-4 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 hidden size-72 rounded-full opacity-40 blur-3xl sm:block"
          style={{ backgroundColor: colorPrimario || "#6366f1" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 hidden size-72 rounded-full opacity-40 blur-3xl sm:block"
          style={{ backgroundColor: colorSecundario || "#a855f7" }}
        />

        <TarjetaCard
          tipo={tarjeta.tipo}
          datosContacto={tarjeta.datos_contacto}
          identidadVisual={tarjeta.identidad_visual}
          slug={slug}
          agendaServicios={agendaServicios}
          permitirAgendar
          tarjetaId={tarjeta.id}
          zonaHoraria={tarjeta.zona_horaria}
          pantallaCompleta
          className="relative"
        />
      </div>

      {/* Siempre `fixed` (default de AccionesTarjeta, sin override acá) —
          el botón se mantiene en el mismo lugar de la pantalla sin importar
          el scroll, decisión explícita del cliente (antes era `sticky`
          dentro de un contenedor que terminaba antes del footer). */}
      <AccionesTarjeta slug={slug} titulo={nombrePrincipal || "Linkard"} datosContacto={tarjeta.datos_contacto} />
    </>
  )
}
