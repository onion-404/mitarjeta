"use client"

import * as React from "react"

import { AccionesTarjeta } from "@/components/tarjeta/acciones-tarjeta"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import type { ServicioAgendable, Tarjeta } from "@/lib/types"

interface TarjetaPublicaProps {
  tarjeta: Tarjeta
  slug: string
  agendaServicios: ServicioAgendable[]
}

// Client component aparte de [slug]/page.tsx (server component, no puede
// usar useRef) — el ref al <article> real de TarjetaCard se comparte entre
// dos elementos hermanos (la tarjeta y el FAB de AccionesTarjeta, que lo
// necesita para exportar el PDF), así que hace falta un ancestro cliente
// común que lo cree una sola vez.
//
// La estructura de los 2 divs de acá abajo es EXACTAMENTE la misma que
// tenía [slug]/page.tsx antes de este componente (centrado+blobs, después
// el FAB) — ya verificada para que el botón (antes 2 botones sueltos, ver
// CLAUDE.md) quede `sticky` dentro del contenedor que termina justo antes
// del <footer> en vez de `fixed` tapándolo al llegar al final del scroll.
export function TarjetaPublica({ tarjeta, slug, agendaServicios }: TarjetaPublicaProps) {
  const cardRef = React.useRef<HTMLElement>(null)
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
          ref={cardRef}
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

      <div className="sticky bottom-0 z-40 flex justify-end px-6 pb-6">
        <AccionesTarjeta
          cardRef={cardRef}
          slug={slug}
          titulo={nombrePrincipal || "Linkard"}
          datosContacto={tarjeta.datos_contacto}
          className="relative"
        />
      </div>
    </>
  )
}
