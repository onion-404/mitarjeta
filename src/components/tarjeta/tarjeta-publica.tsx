import { AccionesTarjeta } from "@/components/tarjeta/acciones-tarjeta"
import { TarjetaCard } from "@/components/tarjeta/tarjeta-card"
import { TarjetaPreloader } from "@/components/tarjeta/tarjeta-preloader"
import type { ServicioAgendable, Tarjeta } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  const { colorPrimario, colorSecundario, avatarUrl, bannerUrl, fondoImagenUrl, tituloModo, tituloImagenUrl } =
    tarjeta.identidad_visual
  const nombrePrincipal = tarjeta.datos_contacto.nombre

  // "Arriba del pliegue" — lo que hace falta que esté listo antes de
  // destapar la tarjeta real (ver TarjetaPreloader). El banner de color/
  // preset no cuenta (no es una imagen que bajar); si hay imagen de fondo,
  // reemplaza al banner en el render real, así que tampoco tiene sentido
  // precargar los dos.
  const urlsCriticas = [
    fondoImagenUrl,
    !fondoImagenUrl ? bannerUrl : undefined,
    avatarUrl,
    tituloModo === "imagen" ? tituloImagenUrl : undefined,
  ].filter((url): url is string => Boolean(url))

  // Con imagen de fondo activa, el layer `fixed` a pantalla completa de
  // TarjetaCard (mobile) cubre TODO el viewport detrás de la tarjeta — el
  // `pb-6`/las esquinas redondeadas de abajo dejaban un hueco visible entre
  // el borde inferior de la card y el <footer> donde esa imagen se veía
  // "cortada" sin más contexto alrededor (bug real reportado, se notaba
  // sobre todo con el fondo repetido: el patrón terminaba ahí sin ninguna
  // transición). Fix: sin ese padding y con las esquinas de ABAJO cuadradas
  // (las de arriba siguen redondeadas), la tarjeta queda pegada al footer —
  // mismo borde/scrim que YA tiene el footer cuando hay imagen de fondo
  // (ver [slug]/page.tsx) hace de transición limpia, sin ningún hueco en
  // el medio donde el patrón pudiera "verse feo". Sin efecto en desktop
  // (sm:): ahí la card nunca es full-bleed, este fondo se apaga solo.
  const tieneFondoImagen = Boolean(fondoImagenUrl)

  return (
    <>
      {/* Mobile (por debajo de sm:): ancho completo, sin margin/padding
          arriba — la tarjeta arranca pegada al top. Desde sm: vuelve al
          layout centrado con blobs decorativos de siempre. */}
      <div
        className={cn(
          "relative flex flex-1 flex-col items-stretch justify-start px-0 pt-0 sm:items-center sm:justify-center sm:px-4 sm:py-16",
          tieneFondoImagen ? "pb-0" : "pb-6"
        )}
      >
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

        <TarjetaPreloader urlsCriticas={urlsCriticas}>
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
            className={cn("relative", tieneFondoImagen && "rounded-b-none")}
          />
        </TarjetaPreloader>
      </div>

      {/* Siempre `fixed` (default de AccionesTarjeta, sin override acá) —
          el botón se mantiene en el mismo lugar de la pantalla sin importar
          el scroll, decisión explícita del cliente (antes era `sticky`
          dentro de un contenedor que terminaba antes del footer). */}
      <AccionesTarjeta slug={slug} titulo={nombrePrincipal || "Linkard"} datosContacto={tarjeta.datos_contacto} />
    </>
  )
}
