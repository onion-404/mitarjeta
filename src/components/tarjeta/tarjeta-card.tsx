"use client"

import {
  ChevronDown,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react"
import Image from "next/image"
import * as React from "react"

import { obtenerBannerPreset } from "@/lib/banner-presets"
import {
  construirUrlWhatsapp,
  normalizarBotones,
  obtenerBotonIcono,
  ordenContactoNormalizado,
  resolverTipografiaBoton,
} from "@/lib/boton-cta"
import { obtenerColorContraste } from "@/lib/contraste"
import { esUrlOptimizable, estiloImagenPosicionada } from "@/lib/imagen-posicion"
import {
  normalizarMultimedia,
  obtenerInstagramReelEmbedUrl,
  resolverEmbedVideo,
} from "@/lib/multimedia"
import { DIVISORES_BANNER, ESTILOS_TIPOGRAFIA } from "@/lib/personalizacion"
import { obtenerPlataforma } from "@/lib/redes"
import { registrarEvento, type TipoEventoCliente } from "@/lib/track-evento"
import { cn } from "@/lib/utils"
import type {
  Boton,
  BotonAgenda,
  BotonArchivo,
  BotonCatalogo,
  BotonEnlace,
  BotonHijo,
  BotonOpciones,
  BotonWhatsapp,
  DatosContacto,
  IdentidadVisual,
  ServicioAgendable,
  TarjetaTipo,
} from "@/lib/types"
import { AvatarForma } from "@/components/tarjeta/avatar-forma"
import { BotonCtaModal, ContenidoBotonCta, estiloTexturaBoton, type BotonVistaPrevia } from "@/components/tarjeta/boton-cta-modal"
import { CatalogoItemModal } from "@/components/tarjeta/catalogo-item-modal"
import { ReservarServicio } from "@/components/tarjeta/reservar-servicio"
import { SOCIAL_ICONS } from "@/components/tarjeta/social-icons"

// Alto fijo (no atado al alto dinámico del panel) del layer de "imagen de
// fondo de toda la tarjeta" — ver la nota larga en IdentidadVisual.fondoImagenPosicion
// (lib/types.ts) sobre por qué no puede ser `inset-0`. Generoso a propósito:
// ninguna tarjeta real (agenda + varias secciones de servicios + productos)
// debería superar esto de alto.
const ALTO_FONDO_IMAGEN = 3000

interface TarjetaCardProps {
  tipo: TarjetaTipo
  datosContacto: DatosContacto
  identidadVisual: IdentidadVisual
  /** Enlace personalizado (el mismo de "Datos esenciales") — se muestra en el
   *  badge en vez del tipo de tarjeta. Sin slug (ej. antes de escribirlo al
   *  crear), el badge no se muestra. */
  slug?: string
  className?: string
  /** Ancho completo + sin rounded/border/shadow por debajo de `sm:` (la
   *  tarjeta pública real, `[slug]/page.tsx`) — el resto de los consumidores
   *  (demo del home, preview del editor) no lo pasan y se ven exactamente
   *  igual que siempre en cualquier viewport. */
  pantallaCompleta?: boolean
  /** Servicios agendables activos, para la sección "Agendar" (no viene de datosContacto: son filas propias, no JSONB). */
  agendaServicios?: ServicioAgendable[]
  /** Habilita la reserva interactiva por servicio (solo la tarjeta pública real la pasa;
   *  el preview del editor y el demo del home quedan igual que siempre, solo informativos). */
  permitirAgendar?: boolean
  /** Requeridos junto con permitirAgendar para llamar a /api/citas*. */
  tarjetaId?: string
  zonaHoraria?: string
}

export function formatDuracion(minutos: number) {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

// Gradientes en HEX (no oklch/lab) para compatibilidad con el exportador de PDF
const GRADIENTE_PLACEHOLDER: Record<TarjetaTipo, string> = {
  personal: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)",
  empresarial: "linear-gradient(135deg, #f59e0b, #f97316, #f43f5e)",
}

function iniciales(nombre?: string) {
  if (!nombre?.trim()) return "?"
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("")
}

function soloDigitos(valor: string) {
  return valor.replace(/[^\d]/g, "")
}

// Compartir/QR/contacto viven en un FAB separado (AccionesTarjeta), no
// adentro de este componente — así el mismo botón sirve tanto para la
// tarjeta pública real como para el preview "Ver tarjeta" del editor, sin
// duplicar esa lógica en cada lugar.
export function TarjetaCard({
  tipo,
  datosContacto,
  identidadVisual,
  slug,
  className,
  pantallaCompleta = false,
  agendaServicios,
  permitirAgendar = false,
  tarjetaId,
  zonaHoraria,
}: TarjetaCardProps) {
  const agendaInteractiva = permitirAgendar && Boolean(tarjetaId) && Boolean(zonaHoraria)

  // Solo la tarjeta pública real pasa tarjetaId (el preview del editor y el
  // demo del home no) — track() queda en no-op ahí, sin pegarle a /api/eventos.
  const vistaRegistradaRef = React.useRef(false)
  React.useEffect(() => {
    if (!tarjetaId || vistaRegistradaRef.current) return
    vistaRegistradaRef.current = true
    registrarEvento(tarjetaId, "vista_tarjeta")
  }, [tarjetaId])

  function track(tipoEvento: TipoEventoCliente, metadata?: Record<string, unknown>) {
    if (!tarjetaId) return
    registrarEvento(tarjetaId, tipoEvento, metadata)
  }

  const {
    nombre,
    empresa,
    puesto,
    telefono,
    whatsapp,
    email,
    direccion,
    direccionMapsUrl,
    horarios,
    redes,
  } = datosContacto
  const {
    colorPrimario,
    colorSecundario,
    avatarUrl,
    avatarPosicion,
    bannerUrl,
    bannerPreset,
    temaModo,
    avatarForma,
    estiloTipografia,
    colorTitulo,
    tituloTamano,
    tituloPeso,
    colorBotones,
    colorBadges,
    modoColorAvanzado,
    colorTextoBotones,
    colorTextoBadges,
    colorTextoGeneral,
    modoTipografiaAvanzado,
    estiloTipografiaCuerpo,
    divisorBanner,
    glassmorfismo,
    bannerPosicion,
    bannerAltura,
    fondoImagenUrl,
    fondoImagenPosicion,
    fondoImagenRepetir,
    fondoTarjetaModo,
    fondoTarjetaColor,
    fondoTarjetaColorSecundario,
    fondoTarjetaTipoDegradado,
    fondoTarjetaDireccionGrados,
    colorTextoSecundario,
    ubicacionCentrada,
    ordenContacto,
    badgeIconoActivo,
    badgeIconoId,
    tituloModo,
    tituloImagenUrl,
    tituloImagenAltura,
  } = identidadVisual
  // Ícono del badge "@enlace" — opcional (default: mostrado, con Sparkles
  // si no se eligió otro, para que una tarjeta vieja sin este campo se
  // vea exactamente igual que siempre).
  const IconoBadge =
    badgeIconoActivo === false ? null : (obtenerBotonIcono(badgeIconoId)?.Icono ?? Sparkles)

  // Unificación de Botones/Servicios/Productos (2026-08-09) — normalizarBotones
  // es la única fuente de verdad de "qué botones tiene esta tarjeta" (incluida
  // la migración en memoria de tarjetas viejas), reusada tal cual del editor.
  const botonesNormalizados = React.useMemo(
    () => normalizarBotones(datosContacto, identidadVisual),
    [datosContacto, identidadVisual]
  )
  // Un solo Set de ids "abiertos" para cualquier botón colapsable (catálogo u
  // opciones) — reemplaza los 3 estados separados que tenía cada sección
  // antes de la unificación (productosAbiertos/serviciosAbiertos/
  // seccionesServiciosAbiertas).
  const [abiertos, setAbiertos] = React.useState<Set<string>>(() => new Set())
  // Ítem de catálogo con su modal de detalle abierto — null cuando está
  // cerrado. Se busca por id de botón + índice en vez de guardar el ítem
  // completo, así el modal siempre refleja el dato más reciente.
  const [itemCatalogoAbierto, setItemCatalogoAbierto] = React.useState<{
    botonId: string
    indice: number
  } | null>(null)

  function toggleAbierto(id: string) {
    setAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  // Tipo único: "nombre" es el Título, "empresa" el Rol o descripción (línea
  // corta bajo el nombre) y "puesto" la Bio (párrafo largo, hasta 160
  // caracteres) — ver lib/types.ts y la sección "Datos Esenciales" del editor.
  const nombrePrincipal = nombre
  const telefonoPrincipal = telefono
  const multimediaNormalizada = React.useMemo(
    () => normalizarMultimedia(datosContacto),
    [datosContacto]
  )
  // Con un "Fondo de la tarjeta" personalizado, el contraste de TODO el
  // texto/bordes del panel (ya atados a dark: en vez de duplicarse por
  // elemento) sigue al color elegido en vez de a temaModo — mismo criterio
  // de auto-contraste que ya usan botones/badges, aplicado acá a nivel de
  // toggle .dark en vez de por className individual.
  const esOscuro = fondoTarjetaColor
    ? obtenerColorContraste(fondoTarjetaColor) === "#ffffff"
    : temaModo === "oscuro"

  // Reusa la metadata de ESTILOS_TIPOGRAFIA (lib/personalizacion.ts) en vez
  // de repetir el mapeo id → CSS var acá — con 9 estilos (ampliado
  // 2026-08-01) mantener un ternario manual duplicado se vuelve frágil.
  function fuentePorEstilo(estilo: typeof estiloTipografia) {
    return ESTILOS_TIPOGRAFIA.find((e) => e.id === estilo)?.fuente
  }
  const fuenteEncabezado = fuentePorEstilo(estiloTipografia)
  // Modo simple (default): el cuerpo usa la fuente del sistema, igual que
  // siempre. Modo avanzado: el cuerpo puede tener su propia fuente,
  // independiente de la de título — si no se eligió ninguna, cae en
  // ESTILOS_TIPOGRAFIA[0] ("moderna", sin fuente especial).
  const fuenteCuerpo = modoTipografiaAvanzado
    ? fuentePorEstilo(estiloTipografiaCuerpo ?? ESTILOS_TIPOGRAFIA[0].id)
    : undefined

  const preset = obtenerBannerPreset(bannerPreset)
  const gradienteInline =
    colorPrimario && colorSecundario
      ? `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`
      : undefined
  const fondoBanner = preset?.background ?? gradienteInline

  // Imagen de fondo de TODA la tarjeta (banner + detrás del panel) — cuando
  // está activa, tiene prioridad sobre el banner (color/preset/upload) Y
  // sobre "Fondo de la tarjeta" de abajo (mutuamente excluyentes, ver
  // CLAUDE.md). Los valores de banner/fondo-de-tarjeta NO se borran al
  // activarla — solo se ignoran en el render, así desactivarla no pierde
  // la configuración previa.
  const tieneFondoImagen = Boolean(fondoImagenUrl)
  const estiloBannerImagen = estiloImagenPosicionada(bannerPosicion)
  const estiloFondoImagen = estiloImagenPosicionada(fondoImagenPosicion)
  // "Repetir fondo": ancho 100% (alto proporcional) repitiendo hacia abajo
  // para llenar la pantalla, en vez de recortarse con object-fit:cover — no
  // usa next/image (no soporta background-repeat), se resuelve con un div
  // con background-image plano. `fondoImagenPosicion` SÍ aplica en este
  // modo (2026-08-12, antes quedaba fijo en "arriba centro" y el botón
  // "Reposicionar" ni se mostraba) — mismo campo x/y/escala que el modo sin
  // repetir, reinterpretado como background-position/background-size en
  // vez de object-position/transform: escala > 1 ensancha el ancho más
  // allá del 100% (equivalente a "acercar" antes de que el patrón se
  // repita), x/y desplazan desde dónde arranca esa imagen ensanchada.
  const escalaFondoRepetido = fondoImagenPosicion?.escala ?? 1
  const estiloFondoImagenRepetido: React.CSSProperties | undefined = fondoImagenRepetir
    ? {
        backgroundImage: `url(${fondoImagenUrl})`,
        backgroundRepeat: "repeat-y",
        backgroundSize: `${100 * escalaFondoRepetido}% auto`,
        backgroundPosition: `${fondoImagenPosicion?.x ?? 50}% ${fondoImagenPosicion?.y ?? 50}%`,
      }
    : undefined
  const alturaBanner = bannerAltura ?? 192

  // Fondo del panel de contenido (separado del fondo del banner de arriba).
  const fondoTarjetaInline =
    !tieneFondoImagen && fondoTarjetaColor
      ? fondoTarjetaModo === "avanzado" && fondoTarjetaColorSecundario
        ? fondoTarjetaTipoDegradado === "radial"
          ? `radial-gradient(circle, ${fondoTarjetaColor}, ${fondoTarjetaColorSecundario})`
          : `linear-gradient(${fondoTarjetaDireccionGrados ?? 135}deg, ${fondoTarjetaColor}, ${fondoTarjetaColorSecundario})`
        : fondoTarjetaColor
      : undefined

  // Botones/badges: colorBotones/colorBadges son nuevos, con default =
  // colorPrimario/colorSecundario para que una tarjeta que nunca los seteó
  // se vea exactamente igual que antes de este sistema.
  const colorBotonesFinal = colorBotones ?? colorPrimario
  const colorBadgesFinal = colorBadges ?? colorSecundario
  // Vidrio: fondo translúcido (sufijo de alfa en HEX) + blur. Sin soporte
  // de backdrop-filter en el navegador, el blur simplemente no aplica y
  // queda el fondo translúcido solo — se sigue viendo intencional, no
  // roto (fallback gratis, sin @supports ni JS).
  const alfaVidrio = glassmorfismo ? "cc" : ""
  const estiloVidrio = glassmorfismo
    ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
    : undefined
  const colorTextoCta =
    modoColorAvanzado && colorTextoBotones
      ? colorTextoBotones
      : colorBotonesFinal
        ? obtenerColorContraste(colorBotonesFinal)
        : undefined
  const estiloCta = colorBotonesFinal
    ? {
        backgroundColor: `${colorBotonesFinal}${alfaVidrio}`,
        color: colorTextoCta,
        ...estiloVidrio,
      }
    : undefined
  // Modo simple: badge "tintado" (fondo al 10% del color, texto sólido del
  // mismo color) — look de siempre. Modo avanzado: badge sólido con texto
  // propio, más gráfico/con más peso (ver "Mono Bold" en las plantillas).
  const colorTextoBadgeFinal =
    modoColorAvanzado && colorTextoBadges
      ? colorTextoBadges
      : colorBadgesFinal
        ? obtenerColorContraste(colorBadgesFinal)
        : undefined
  const estiloBadge = colorBadgesFinal
    ? modoColorAvanzado
      ? {
          backgroundColor: `${colorBadgesFinal}${alfaVidrio}`,
          color: colorTextoBadgeFinal,
          ...estiloVidrio,
        }
      : { backgroundColor: `${colorBadgesFinal}1a`, color: colorBadgesFinal, ...estiloVidrio }
    : undefined
  const estiloTextoGeneral = modoColorAvanzado && colorTextoGeneral ? { color: colorTextoGeneral } : undefined

  const divisorMeta = DIVISORES_BANNER.find((d) => d.id === divisorBanner)
  const estiloDivisor = divisorMeta?.clipPath ? { clipPath: divisorMeta.clipPath } : undefined

  // Colores en HEX/RGBA (no oklch/color-mix) para que html2canvas pueda exportar el PDF
  const accionClase = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
    glassmorfismo
      ? "border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.3)] text-[#3f3f46] backdrop-blur-lg dark:border-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#f4f4f5]"
      : "border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.8)] text-[#3f3f46] backdrop-blur dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#f4f4f5]"
  )

  // En pantallaCompleta (mobile), el panel de contenido nunca queda más
  // bajo que la pantalla menos el banner — así una tarjeta con poco
  // contenido (solo redes + dirección, por ej.) no deja un hueco de fondo
  // plano de la página entre el final de la tarjeta y el footer: el fondo
  // del panel (color/degradado/imagen) llena la pantalla igual. Variable
  // CSS + clase con `sm:` para apagarlo desde tablet/desktop (ahí la
  // tarjeta vuelve a ser una card chica centrada, no debe ocupar la
  // pantalla entera). `100dvh` en vez de `100vh`: en mobile real el
  // toolbar del navegador cambia el alto visible, dvh se ajusta con eso.
  const estiloAltoMinimo = pantallaCompleta
    ? ({ "--alto-min-divisor": `calc(100dvh - ${alturaBanner}px)` } as React.CSSProperties)
    : undefined


  // Contacto/Redes/Botones: extraídas a funciones (en vez de quedar
  // embebidas directo en el JSX de más abajo). "Servicios"/"Productos"
  // dejaron de ser bloques propios (2026-08-09) — ahora son botones
  // `tipo: "catalogo"` dentro de "Botones" (ver renderBotones más abajo);
  // "Agenda" siguió el mismo camino (2026-08-10, `tipo: "agenda"`, ver
  // renderBotonAgenda) — ya no queda más de un bloque a este nivel, así
  // que `renderBotones()` se llama directo en el JSX, sin ninguna capa de
  // "orden entre secciones" (esa maquinaria quedó deprecada, ver
  // `SeccionOrdenable` en lib/types.ts). "Contacto"/"Redes" se separaron
  // en dos secciones reordenables independientes (2026-08-10) — antes eran
  // una sola fila fija con los pills de teléfono/WhatsApp/email/ubicación
  // mezclados con las redes. Orden ENTRE los 4 pills fijos (no de la
  // sección en sí, que sigue en posición fija — ver ContactoOrdenable/
  // ordenContactoNormalizado en lib/boton-cta.ts): un Record de renders
  // puntuales recorrido según el orden que eligió el dueño.
  const RENDER_CONTACTO: Record<string, () => React.ReactNode> = {
    telefono: () =>
      telefonoPrincipal && (
        <a
          key="telefono"
          data-campo="contacto"
          href={`tel:${telefonoPrincipal}`}
          onClick={() => track("click_enlace", { tipo_enlace: "tel" })}
          className={accionClase}
        >
          <Phone className="size-3.5" /> Llamar
        </a>
      ),
    whatsapp: () =>
      whatsapp && (
        <a
          key="whatsapp"
          data-campo="contacto"
          href={`https://wa.me/${soloDigitos(whatsapp)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("click_enlace", { tipo_enlace: "whatsapp" })}
          className={accionClase}
        >
          <SOCIAL_ICONS.whatsapp className="size-3.5" /> WhatsApp
        </a>
      ),
    email: () =>
      email && (
        <a
          key="email"
          data-campo="contacto"
          href={`mailto:${email}`}
          onClick={() => track("click_enlace", { tipo_enlace: "email" })}
          className={accionClase}
        >
          <Mail className="size-3.5" /> Email
        </a>
      ),
    ubicacion: () =>
      direccionMapsUrl && (
        <a
          key="ubicacion"
          data-campo="ubicacion"
          href={direccionMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("click_enlace", { tipo_enlace: "ubicacion" })}
          className={accionClase}
        >
          <MapPin className="size-3.5" /> Cómo llegar
        </a>
      ),
  }

  function renderContacto(): React.ReactNode {
    return ordenContactoNormalizado(ordenContacto).map((id) => RENDER_CONTACTO[id]())
  }

  function renderRedes(): React.ReactNode {
    if (!redes?.length) return null
    return redes.map((red) => {
      if (!red.url) return null
      const Icono = SOCIAL_ICONS[red.plataforma] ?? Globe
      const etiqueta =
        red.plataforma === "personalizado" ? red.label || "Enlace" : obtenerPlataforma(red.plataforma).nombre
      return (
        <a
          key={red.url}
          data-campo="redes"
          href={red.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("click_enlace", { tipo_enlace: "red_social", red: red.plataforma })}
          className={accionClase}
        >
          <Icono className="size-3.5" /> {etiqueta}
        </a>
      )
    })
  }

  /** Contacto y redes van SIEMPRE en una sola fila, uno junto al otro (nunca
   *  dos bloques apilados) — el "arriba/abajo" del editor solo decide el
   *  ORDEN de los ítems dentro de este mismo contenedor, no separa nada. */
  function renderContactoYRedes(): React.ReactNode {
    if (!(telefonoPrincipal || whatsapp || email || direccionMapsUrl || redes?.length)) return null
    return (
      <div className="mt-5 flex w-full flex-wrap items-center justify-center gap-2">
        {renderContacto()}
        {renderRedes()}
      </div>
    )
  }

  // Botón "agenda" (2026-08-10) — reemplaza a la vieja sección "Agenda"
  // (siempre visible, sin colapsar): ahora comparte la misma cabecera
  // toggle de ancho completo que catálogo/opciones (ícono/color/textura
  // propios, posición reordenable entre el resto de los botones). Sigue
  // ocultándose ENTERO sin servicios agendables activos (gating real de
  // plan ya resuelto río arriba, en cómo llega `agendaServicios`) — mismo
  // criterio de siempre, ahora aplicado al botón completo en vez de a un
  // bloque fijo.
  function renderBotonAgenda(boton: BotonAgenda): React.ReactNode {
    if (!agendaServicios?.length) return null
    const abierta = abiertos.has(boton.id)
    return (
      <div key={boton.id} className="flex flex-col gap-2.5">
        {renderCabeceraToggle(boton, abierta, () => toggleAbierto(boton.id))}
        {abierta && (
          <div className="flex flex-col gap-2 pl-4">
            {agendaServicios.map((servicio) =>
              agendaInteractiva ? (
                <ReservarServicio
                  key={servicio.id}
                  tarjetaId={tarjetaId!}
                  zonaHoraria={zonaHoraria!}
                  servicio={servicio}
                />
              ) : (
                <div
                  key={servicio.id}
                  style={estiloTextoGeneral}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(0,0,0,0.05)] p-3 dark:border-[rgba(255,255,255,0.08)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#18181b] dark:text-[#fafafa]">
                      {servicio.nombre}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                      <Clock className="size-3" /> {formatDuracion(servicio.duracion_minutos)}
                      {" · "}
                      {servicio.requiere_pago_inmediato ? "Pago al agendar" : "Pago contra entrega"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#18181b] dark:text-[#fafafa]">
                    ${servicio.precio}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    )
  }

  // Resuelve el estilo (fondo/texto/borde/textura/vidrio/fuente) de
  // CUALQUIER botón de ancho completo (enlace/whatsapp/archivo/opciones/
  // catálogo/agenda) — un solo lugar en vez de repetir el cálculo por tipo.
  // `padre` solo se pasa cuando `boton` es un hijo de "opciones" — hace
  // falta para resolver la tipografía heredada (ver resolverTipografiaBoton,
  // lib/boton-cta.ts); el resto de los campos no dependen del padre.
  // Devuelve el estilo del CONTENEDOR (incluye fontFamily, que cascada bien
  // hacia el subtítulo) separado del estilo del TÍTULO (fontWeight, que no
  // debe cascadear al subtítulo — mismo peso fijo que tenían todos los
  // botones antes de esta feature).
  function estiloDeBoton(
    boton: Boton | BotonHijo,
    opts?: { padre?: BotonOpciones }
  ): { contenedor: React.CSSProperties; titulo: React.CSSProperties } {
    const colorFondoBoton = boton.colorFondo || colorBotonesFinal
    const colorTextoBoton =
      boton.colorTexto || (boton.colorFondo ? obtenerColorContraste(boton.colorFondo) : colorTextoCta)
    const tipografia = resolverTipografiaBoton(boton, {
      padre: opts?.padre,
      primero: botonesNormalizados[0],
      fuenteCard: estiloTipografia ?? "moderna",
      pesoCard: 600,
    })
    return {
      contenedor: {
        backgroundColor: colorFondoBoton ? `${colorFondoBoton}${alfaVidrio}` : undefined,
        color: colorTextoBoton,
        borderColor: boton.colorBorde,
        fontFamily: fuentePorEstilo(tipografia.fuente),
        ...estiloVidrio,
        ...estiloTexturaBoton(boton.textura),
      },
      titulo: { fontWeight: tipografia.peso },
    }
  }

  const claseBotonBase =
    "flex w-full items-center gap-3 overflow-hidden rounded-2xl border py-3 text-left shadow-sm transition-all duration-200 ease-out"

  // Botón de ancho completo tipo enlace/whatsapp/archivo — mismo CTA de
  // siempre, resolviendo la url final según el tipo (whatsapp arma
  // wa.me/... recién acá, nunca se persiste armada). El "⋮" (BotonCtaModal)
  // es un elemento hermano del <a>, no un hijo — un <button> anidado
  // dentro de un <a> es HTML inválido y además complica evitar que el
  // click del menú dispare la navegación. Vive del lado DERECHO (pr-9),
  // en la misma posición que el chevron de "opciones"/"catalogo" — así
  // cualquier tipo de botón se ve consistente sin importar si es
  // desplegable o no. `opts` cubre el caso de un hijo de "opciones"
  // (metadata de tracking distinta, mismo render).
  function renderBotonSimple(
    boton: BotonEnlace | BotonWhatsapp | BotonArchivo,
    opts?: { tipoEnlace?: string; padre?: BotonOpciones }
  ): React.ReactNode {
    const url =
      boton.tipo === "enlace" ? boton.url : boton.tipo === "whatsapp" ? construirUrlWhatsapp(boton.waNumero, boton.waMensaje ?? "") : boton.archivoUrl
    const estiloBoton = estiloDeBoton(boton, { padre: opts?.padre })
    const vistaPrevia: BotonVistaPrevia = {
      titulo: boton.titulo,
      subtitulo: boton.subtitulo,
      iconoTipo: boton.iconoTipo,
      imagenUrl: boton.imagenUrl,
      iconoId: boton.iconoId,
      url,
      estiloTitulo: estiloBoton.titulo,
    }
    const tieneUrl = Boolean(url.trim())
    const tipoEnlace = opts?.tipoEnlace ?? `boton_${boton.tipo}`
    return (
      <div key={boton.id} className="relative">
        <BotonCtaModal boton={vistaPrevia} estiloCta={estiloBoton.contenedor} />
        <a
          {...(tieneUrl ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {})}
          onClick={() =>
            track("click_enlace", {
              tipo_enlace: tipoEnlace,
              boton_titulo: boton.titulo,
              ...(opts?.padre ? { boton_padre: opts.padre.titulo } : {}),
            })
          }
          style={estiloBoton.contenedor}
          className={cn(
            claseBotonBase,
            "pl-4 pr-9",
            tieneUrl && "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
            !boton.colorBorde && "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.12)]",
            !(boton.colorFondo || colorBotonesFinal) &&
              "bg-[rgba(255,255,255,0.85)] text-[#18181b] dark:bg-[rgba(255,255,255,0.06)] dark:text-[#fafafa]"
          )}
        >
          <ContenidoBotonCta boton={vistaPrevia} />
        </a>
      </div>
    )
  }

  // Cabecera-toggle compartida por "opciones" y "catalogo" — mismo look que
  // cualquier otro botón de ancho completo (icono/imagen + título/subtítulo
  // + color/borde/textura propios), con el chevron a la derecha en vez de
  // navegar. Unificada acá a pedido del cliente: el botón catálogo antes se
  // veía distinto (título chico en mayúsculas + contador), ahora es
  // indistinguible de "opciones" salvo por lo que despliega.
  function renderCabeceraToggle(
    boton: BotonOpciones | BotonCatalogo | BotonAgenda,
    abierta: boolean,
    onClick: () => void,
    opts?: { padre?: BotonOpciones }
  ): React.ReactNode {
    const estiloBoton = estiloDeBoton(boton, { padre: opts?.padre })
    const vistaPrevia: BotonVistaPrevia = {
      titulo: boton.titulo,
      subtitulo: boton.subtitulo,
      iconoTipo: boton.iconoTipo,
      imagenUrl: boton.imagenUrl,
      iconoId: boton.iconoId,
      url: "",
      estiloTitulo: estiloBoton.titulo,
    }
    return (
      <button
        type="button"
        onClick={onClick}
        style={estiloBoton.contenedor}
        className={cn(
          claseBotonBase,
          "px-4",
          !boton.colorBorde && "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.12)]",
          !(boton.colorFondo || colorBotonesFinal) &&
            "bg-[rgba(255,255,255,0.85)] text-[#18181b] dark:bg-[rgba(255,255,255,0.06)] dark:text-[#fafafa]"
        )}
      >
        <ContenidoBotonCta boton={vistaPrevia} />
        <ChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 transition-transform duration-200 ease-out",
            abierta && "rotate-180"
          )}
        />
      </button>
    )
  }

  // Botón "opciones" — despliega/colapsa (toggle inline, no modal) sus
  // hijos, cada uno renderizado con el mismo switch que un botón top-level
  // (un hijo "catalogo" reusa renderBotonCatalogo, el resto renderBotonSimple
  // con tracking marcado como "hijo de opciones"). Sin "⋮"/modal propio: no
  // es un link, no hay nada que compartir.
  function renderBotonOpciones(boton: BotonOpciones): React.ReactNode {
    const abierta = abiertos.has(boton.id)
    return (
      <div key={boton.id} className="flex flex-col gap-2.5">
        {renderCabeceraToggle(boton, abierta, () => toggleAbierto(boton.id))}
        {abierta && (
          <div className="flex flex-col gap-2.5 pl-4">
            {boton.hijos.map((hijo) =>
              hijo.tipo === "catalogo"
                ? renderBotonCatalogo(hijo, { padre: boton })
                : renderBotonSimple(hijo, { tipoEnlace: "boton_opciones_hijo", padre: boton })
            )}
          </div>
        )}
      </div>
    )
  }

  // Botón "catalogo" — reemplaza a "Servicios"/"Productos": misma cabecera
  // de ancho completo que el resto de los botones (ver renderCabeceraToggle)
  // + grid de 2 columnas o lista de 1 por línea (elegido por el dueño) —
  // cada ítem abre el modal de detalle en vez de mostrar descripción/
  // precio/enlace apretado en el tile.
  function renderBotonCatalogo(boton: BotonCatalogo, opts?: { padre?: BotonOpciones }): React.ReactNode {
    const abierta = abiertos.has(boton.id)
    // El "chip" de título de cada ítem adopta el color del botón padre (o el
    // color de botones por defecto), igual criterio que estiloDeBoton pero
    // sin vidrio/textura — acá es solo una etiqueta de texto, no el CTA.
    const colorFondoTitulo = boton.colorFondo || colorBotonesFinal
    const colorTextoTitulo = boton.colorTexto || (colorFondoTitulo ? obtenerColorContraste(colorFondoTitulo) : undefined)
    return (
      <div key={boton.id} className="flex flex-col gap-2.5">
        {renderCabeceraToggle(boton, abierta, () => toggleAbierto(boton.id), opts)}
        {abierta && boton.items.length > 0 && (
          <div
            className={cn(
              "gap-2.5 pl-4",
              boton.vista === "lista1" ? "flex flex-col" : "grid grid-cols-2"
            )}
          >
            {boton.items.map((item, indice) => (
              <button
                type="button"
                key={indice}
                onClick={() => setItemCatalogoAbierto({ botonId: boton.id, indice })}
                className={cn(
                  "overflow-hidden rounded-xl border border-[rgba(0,0,0,0.05)] text-left dark:border-[rgba(255,255,255,0.08)]",
                  // items-stretch (no items-center): el fondo del chip de
                  // título (ver más abajo) es un hermano de la imagen en el
                  // mismo eje flex — con items-center quedaba con la altura
                  // de su propio contenido (angosto, centrado en el medio
                  // de la fila) en vez de estirarse a la altura real de la
                  // imagen (size-16), bug real reportado ("no cubre todo el
                  // fondo del ítem" en vista Lista).
                  boton.vista === "lista1" ? "flex items-stretch gap-3" : "flex flex-col"
                )}
              >
                {item.imagenUrl ? (
                  <div
                    className={cn(
                      "relative shrink-0",
                      boton.vista === "lista1" ? "size-16" : "aspect-square w-full"
                    )}
                  >
                    <Image
                      src={item.imagenUrl}
                      alt={item.titulo}
                      fill
                      sizes="(max-width: 640px) 45vw, 160px"
                      unoptimized={!esUrlOptimizable(item.imagenUrl)}
                      className="object-cover"
                      style={estiloImagenPosicionada(item.imagenPosicion)}
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "shrink-0 bg-[#f4f4f5] dark:bg-[#27272a]",
                      boton.vista === "lista1" ? "size-16" : "aspect-square w-full"
                    )}
                  />
                )}
                {/* El fondo/color vive en este contenedor, NUNCA en el <p>
                    de abajo: `line-clamp-2` fuerza `display: -webkit-box`,
                    un modo de caja legacy que no siempre respeta
                    `flex-1`/ancho completo — el fondo terminaba encogido al
                    ancho del texto (se veía como un subrayado en vez de un
                    chip, bug real reportado en vista "Lista"). Separando
                    ambos roles, este `<div>` (block/flex normal) sí llena
                    el ancho disponible siempre, sin importar cuántas líneas
                    ocupe el título adentro. */}
                <div
                  style={{ backgroundColor: colorFondoTitulo, color: colorTextoTitulo, ...estiloTextoGeneral }}
                  className={cn(
                    "flex items-center",
                    boton.vista === "lista1" ? "flex-1 px-3 py-1" : "w-full justify-center px-1.5 py-1.5",
                    !colorFondoTitulo && "text-[#18181b] dark:text-[#fafafa]"
                  )}
                >
                  <p
                    className={cn(
                      "line-clamp-2 text-[11px] font-medium",
                      boton.vista !== "lista1" && "text-center"
                    )}
                  >
                    {item.titulo}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Ítem de catálogo con el modal de detalle abierto — se busca por id en
  // vez de guardar el ítem completo en el estado, así el modal siempre
  // muestra el dato más reciente (top-level o anidado dentro de "opciones").
  function buscarBotonCatalogo(id: string): BotonCatalogo | null {
    for (const boton of botonesNormalizados) {
      if (boton.tipo === "catalogo" && boton.id === id) return boton
      if (boton.tipo === "opciones") {
        const hijo = boton.hijos.find((h): h is BotonCatalogo => h.tipo === "catalogo" && h.id === id)
        if (hijo) return hijo
      }
    }
    return null
  }
  const catalogoDelItemAbierto = itemCatalogoAbierto ? buscarBotonCatalogo(itemCatalogoAbierto.botonId) : null
  const itemCatalogoActivo =
    catalogoDelItemAbierto && itemCatalogoAbierto
      ? (catalogoDelItemAbierto.items[itemCatalogoAbierto.indice] ?? null)
      : null

  // "Contenido multimedia" (2026-08-13) — reemplaza el video único de
  // YouTube de siempre: lista tipada de ítems "video" (YouTube o Vimeo,
  // auto-detectado) y "reels" (slide horizontal de reels de Instagram).
  // El slide usa scroll-snap nativo de CSS, sin librería de carrusel —
  // mismo criterio de "sin dependencia nueva si CSS alcanza" que el resto
  // del proyecto. Cada reel usa el embed directo por iframe de Instagram
  // (obtenerInstagramReelEmbedUrl), no el script oficial embed.js — evita
  // cargar/ejecutar JS de terceros en la tarjeta pública.
  function renderMultimedia(): React.ReactNode {
    if (!multimediaNormalizada.length) return null
    return (
      <div data-campo="video" className="mt-5 flex w-full flex-col gap-4">
        {multimediaNormalizada.map((item) => {
          if (item.tipo === "video") {
            const embed = resolverEmbedVideo(item.url)
            if (!embed) return null
            return (
              <div
                key={item.id}
                className="aspect-video w-full overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.1)]"
              >
                <iframe
                  src={embed.embedUrl}
                  title={`Video de ${nombrePrincipal || "la tarjeta"}`}
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )
          }
          const embeds = item.urls
            .map((url) => obtenerInstagramReelEmbedUrl(url))
            .filter((url): url is string => Boolean(url))
          if (!embeds.length) return null
          return (
            <div
              key={item.id}
              className="scrollbar-hide -mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1"
            >
              {embeds.map((embedUrl, indice) => (
                <div
                  key={indice}
                  className="aspect-[9/16] w-[62%] shrink-0 snap-center overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-md dark:border-[rgba(255,255,255,0.1)] sm:w-[45%]"
                >
                  <iframe
                    src={embedUrl}
                    title={`Reel de Instagram ${indice + 1}`}
                    className="size-full"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  function renderBotones(): React.ReactNode {
    if (!botonesNormalizados.length) return null
    return (
      <div data-campo="botones" className="mt-5 flex w-full flex-col gap-2.5">
        {botonesNormalizados.map((boton) => (
          <React.Fragment key={boton.id}>
            {boton.tipo === "catalogo"
              ? renderBotonCatalogo(boton)
              : boton.tipo === "opciones"
                ? renderBotonOpciones(boton)
                : boton.tipo === "agenda"
                  ? renderBotonAgenda(boton)
                  : renderBotonSimple(boton)}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", esOscuro && "dark")}>
      <article
        className={cn(
          "relative min-w-[320px] overflow-hidden border border-[rgba(0,0,0,0.05)] bg-white shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#18181b]",
          pantallaCompleta
            ? "w-full rounded-2xl border-0 shadow-none sm:max-w-sm sm:rounded-[2rem] sm:border sm:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)]"
            : "w-full max-w-sm rounded-[2rem]",
          className
        )}
      >
        {tieneFondoImagen &&
          (pantallaCompleta ? (
            // Pantalla completa (tarjeta pública real / preview "Ver
            // tarjeta"): la imagen cubre el viewport entero en `fixed`, no
            // solo el alto de la tarjeta — así se ve como un fondo real de
            // página en vez de una imagen "adentro" de la card, y de paso
            // no depende en absoluto de cuánto crezca el contenido. Se
            // apaga en sm: (la card vuelve a ser chica y centrada, un
            // fondo a pantalla completa detrás no tendría sentido ahí).
            // Alto explícito en `100svh` (small viewport height, NO
            // `inset-0`/`100dvh`): al llegar al final del scroll — donde
            // vive el <footer>, fuera de este componente — el navegador
            // mobile suele reaparecer su barra de herramientas, lo que
            // recalcula un alto dinámico al vuelo y hacía que la imagen
            // "saltara"/se reacomodara en ese instante (bug real
            // reportado). `svh` usa el viewport más chico posible (barra
            // siempre visible) y no cambia con ese reflow — el precio es
            // que puede quedar un margen angosto debajo en el momento en
            // que la barra se oculta, preferible al salto.
            <div className="fixed inset-x-0 top-0 z-0 h-[100svh] sm:hidden" aria-hidden>
              {fondoImagenRepetir ? (
                <div className="size-full" style={estiloFondoImagenRepetido} />
              ) : (
                <Image
                  src={fondoImagenUrl!}
                  alt=""
                  fill
                  priority
                  sizes="100vw"
                  unoptimized={!esUrlOptimizable(fondoImagenUrl!)}
                  className="object-cover"
                  style={estiloFondoImagen}
                />
              )}
            </div>
          ) : null)}
        {tieneFondoImagen && (
          // Versión contenida (siempre en desktop/sm:, y la única versión
          // en cualquier consumidor que no sea pantallaCompleta — preview
          // chico del editor, demo del home): alto FIJO
          // (ALTO_FONDO_IMAGEN), no `inset-0` atado al alto dinámico del
          // panel — ver el comentario largo en
          // IdentidadVisual.fondoImagenPosicion (lib/types.ts). El
          // `<article>` recorta con overflow-hidden todo lo que exceda el
          // alto real de la tarjeta, así que esto no desborda nada. Sin
          // `priority`: en pantallaCompleta ya la tiene la versión `fixed`
          // de arriba (mismo src, no hace falta preload duplicado).
          <div
            className={cn(
              "absolute inset-x-0 top-0 z-0",
              pantallaCompleta && "hidden sm:block"
            )}
            style={{ height: ALTO_FONDO_IMAGEN }}
            aria-hidden
          >
            {fondoImagenRepetir ? (
              <div className="size-full" style={estiloFondoImagenRepetido} />
            ) : (
              <Image
                src={fondoImagenUrl!}
                alt=""
                fill
                priority={!pantallaCompleta}
                sizes="(max-width: 640px) 100vw, 384px"
                unoptimized={!esUrlOptimizable(fondoImagenUrl!)}
                className="object-cover"
                style={estiloFondoImagen}
              />
            )}
          </div>
        )}

        <div
          data-campo="banner"
          className="relative z-10 w-full overflow-hidden"
          style={{ height: alturaBanner }}
        >
          {!tieneFondoImagen &&
            (bannerUrl ? (
              <Image
                src={bannerUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 640px) 100vw, 384px"
                unoptimized={!esUrlOptimizable(bannerUrl)}
                className="object-cover"
                style={estiloBannerImagen}
              />
            ) : (
              <div
                className={cn(
                  "size-full",
                  !fondoBanner && `bg-gradient-to-br ${GRADIENTE_PLACEHOLDER[tipo]}`
                )}
                style={fondoBanner ? { background: fondoBanner } : undefined}
              />
            ))}
        </div>

        {/* Avatar: SIEMPRE al frente de todo (banner y tarjeta de
            contenido incluidos), sin excepción — por eso vive como
            hermano posicionado absoluto con el z-index más alto, en vez de
            hijo del panel de contenido (`data-campo="divisor"` más abajo).
            La razón real: `clip-path` en un elemento recorta también a
            TODOS sus descendientes — si el avatar fuera hijo del panel
            (que lleva el clip-path del divisor), quedaba recortado
            exactamente donde coincidía con la muesca de la forma,
            "detrás" del banner que se revelaba ahí (bug real reportado).
            Posición calculada a mano para calzar con el look de siempre
            (mismo -mt-14 doble que tenía anidado: -56px de "subir sobre
            el banner" + 12px del padding-top del panel + -56px propios =
            -100px desde el borde inferior del banner). */}
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
          style={{ top: alturaBanner - 100 }}
        >
          <div data-campo="avatar">
            <AvatarForma
              forma={avatarForma}
              tamanoPx={96}
              imagenUrl={avatarUrl}
              imagenPosicion={avatarPosicion}
              alt={nombrePrincipal ?? "Avatar"}
              iniciales={iniciales(nombrePrincipal)}
              unoptimized={avatarUrl ? !esUrlOptimizable(avatarUrl) : undefined}
            />
          </div>
        </div>

        <div
          data-campo="divisor"
          style={{
            ...estiloAltoMinimo,
            ...estiloDivisor,
            ...(tieneFondoImagen ? undefined : { background: fondoTarjetaInline }),
          }}
          className={cn(
            "relative z-10 -mt-14 border-t px-6 pb-7 pt-3 text-center shadow-[0_-8px_30px_-25px_rgba(0,0,0,0.4)] backdrop-blur-xl",
            // Jerarquía de capas: banner atrás, esta tarjeta de contenido
            // adelante (se superpone al banner con -mt-14, tapándolo salvo
            // donde el clip-path del divisor la recorta). El avatar va
            // SIEMPRE más adelante todavía que ambas — por eso ya NO vive
            // acá adentro (ver el div absoluto z-20 justo arriba de este,
            // hermano en vez de hijo): un `clip-path` en este div recorta
            // también a sus descendientes, así que un avatar anidado acá
            // quedaba recortado exactamente donde coincidía con la muesca
            // del divisor (bug real reportado — "el avatar queda detrás
            // del banner"). La FORMA (onda/diagonal/zigzag) es el borde
            // superior de esta tarjeta — nunca se aplica al banner en sí
            // (el banner nunca lleva clip-path) — y al recortarla queda
            // visible el banner de atrás, tal cual es, sin ninguna capa de
            // color agregada encima (sin colores, solo la forma).
            !estiloDivisor && (pantallaCompleta ? "rounded-2xl sm:rounded-t-[2rem]" : "rounded-t-[2rem]"),
            tieneFondoImagen
              ? "border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.55)] dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(24,24,27,0.55)]"
              : fondoTarjetaInline
                ? "border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.1)]"
                : "border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.85)] dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(24,24,27,0.85)]"
          )}
        >
          {/* Espaciador: el avatar real ya no vive acá (ver el div
              absoluto z-20 más arriba) pero el layout del panel sigue
              necesitando el mismo hueco de siempre arriba del badge/
              nombre — mismo alto que el wrapper que reemplazó (96px de
              avatar - 14*4px de margen negativo que tenía = 40px netos). */}
          <div className="h-10" aria-hidden />

          {slug?.trim() && (
            <span
              style={estiloBadge}
              className={cn(
                "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
                !estiloBadge &&
                  "bg-[rgba(24,24,27,0.05)] text-[#71717a] dark:bg-[rgba(255,255,255,0.1)] dark:text-[#a1a1aa]"
              )}
            >
              {IconoBadge && <IconoBadge className="size-3" />}
              @{slug.trim()}
            </span>
          )}

          {tituloModo === "imagen" && tituloImagenUrl ? (
            // Logo en vez de texto — a propósito SIN recortar a ninguna
            // forma (a diferencia del avatar): ancho libre, alto fijo, se
            // ve "como si fuera texto" en su proporción natural.
            // eslint-disable-next-line @next/next/no-img-element -- alto variable elegido por el dueño, next/image exige dimensiones fijas
            <img
              data-campo="nombre"
              src={tituloImagenUrl}
              alt={nombrePrincipal?.trim() || "Logo"}
              style={{ height: `${tituloImagenAltura ?? 32}px` }}
              // mx-auto: Tailwind Preflight pone `img { display: block }`
              // por defecto, así que el `text-center` del panel (que sí
              // centra el <h1> de texto) no alcanza para centrar un
              // elemento block — hace falta centrarlo explícito.
              className="mx-auto mt-2 w-auto max-w-full object-contain"
            />
          ) : (
            <h1
              data-campo="nombre"
              style={{
                fontFamily: fuenteEncabezado,
                ...estiloTextoGeneral,
                fontSize: tituloTamano ? `${tituloTamano}px` : undefined,
                fontWeight: tituloPeso ?? undefined,
                ...(colorTitulo ? { color: colorTitulo } : undefined),
              }}
              className="mt-2 text-xl font-semibold text-balance text-[#18181b] dark:text-[#fafafa]"
            >
              {nombrePrincipal?.trim() || "Sin nombre"}
            </h1>
          )}
          {empresa?.trim() && (
            <p
              style={{
                fontFamily: fuenteCuerpo,
                ...estiloTextoGeneral,
                ...(colorTextoSecundario ? { color: colorTextoSecundario } : undefined),
              }}
              className="text-sm font-medium text-[#3f3f46] dark:text-[#d4d4d8]"
            >
              {empresa}
            </p>
          )}
          {puesto?.trim() && (
            // Antes era un párrafo gris chico, del mismo peso visual (o
            // menos) que la dirección/horario de abajo — para un texto
            // relevante (la Bio es la presentación del dueño), eso lee
            // como "sin jerarquía". Ahora: una regla corta con el color de
            // acento de la tarjeta (mismo que botones/badges, siempre
            // coherente con la identidad elegida) la introduce como un
            // elemento de diseño deliberado, y el texto en sí sube de
            // tamaño/peso/contraste — ya no compite en el mismo nivel que
            // el dato de ubicación (que además ahora vive en su propia
            // card, ver más abajo).
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <span
                aria-hidden
                className="h-0.5 w-8 rounded-full"
                style={{ backgroundColor: colorBotonesFinal || "#a1a1aa" }}
              />
              <p
                data-campo="bio"
                style={{ fontFamily: fuenteCuerpo, ...estiloTextoGeneral }}
                className="max-w-xs text-[15px] leading-relaxed font-medium whitespace-pre-line text-[#3f3f46] dark:text-[#e4e4e7]"
              >
                {puesto}
              </p>
            </div>
          )}

          {(direccion?.trim() || horarios?.trim()) && (
            // Card con borde propia (mismo lenguaje visual que agenda/
            // servicios/productos) — antes esto era texto plano centrado
            // pegado debajo de la Bio, sin ningún límite visual entre
            // ambos: Bio, dirección y horario se leían como un solo bloque
            // de texto gris. El borde + fondo tenue separan claramente
            // "esto es un dato estructurado", no una continuación de la
            // Bio. Alineación izquierda/centro elegible (`ubicacionCentrada`,
            // 2026-08-12) — izquierda sigue siendo el default, sin cambios
            // para tarjetas que nunca tocaron este campo. `whitespace-pre-
            // line` en cada valor: el editor permite hasta 3 líneas por
            // campo.
            <div
              data-campo="ubicacion"
              style={estiloTextoGeneral}
              className={cn(
                "mt-4 flex w-full flex-col gap-1.5 rounded-xl border border-[rgba(0,0,0,0.05)] bg-[rgba(0,0,0,0.02)] px-3 py-2.5 text-xs text-[#71717a] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.03)] dark:text-[#a1a1aa]",
                ubicacionCentrada ? "items-center text-center" : "items-start text-left"
              )}
            >
              {direccion?.trim() && (
                <span className="inline-flex items-start gap-1.5">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span className="whitespace-pre-line">{direccion}</span>
                </span>
              )}
              {horarios?.trim() && (
                <span className="inline-flex items-start gap-1.5">
                  <Clock className="mt-0.5 size-3.5 shrink-0" />
                  <span className="whitespace-pre-line">{horarios}</span>
                </span>
              )}
            </div>
          )}

          {renderContactoYRedes()}

          {renderMultimedia()}

          {renderBotones()}
        </div>
      </article>

      <CatalogoItemModal
        item={itemCatalogoActivo}
        open={Boolean(itemCatalogoAbierto)}
        onOpenChange={(open) => {
          if (!open) setItemCatalogoAbierto(null)
        }}
        estiloCta={estiloCta}
        onAbrirEnlace={() => itemCatalogoActivo && track("click_producto", { producto_titulo: itemCatalogoActivo.titulo })}
      />
    </div>
  )
}
