"use client"

import { Download, Share, X } from "lucide-react"
import * as React from "react"

const CLAVE_DESCARTADO = "linkard_instalar_descartado"

// Chrome/Android (y Chrome/Edge de escritorio) disparan este evento cuando
// el sitio cumple los criterios de instalación (manifest.ts + un rato de
// uso real) — no está tipado en el DOM estándar todavía.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

/** Tarjeta llamativa en /mi-cuenta invitando a "Agregar a pantalla de
 *  inicio" (2026-09-04, pedido explícito) — dos caminos reales, sin forma
 *  de unificarlos: en Android/Chrome (y escritorio Chrome/Edge) se puede
 *  DISPARAR el instalador nativo con un clic (`beforeinstallprompt`); en
 *  iOS/Safari no existe ese evento — Apple nunca lo expuso, la única forma
 *  es que el usuario lo haga a mano desde Compartir, así que ahí se
 *  muestra la instrucción en vez de un botón. Se oculta sola si: ya está
 *  instalada (`display-mode: standalone`), el usuario la cerró una vez
 *  (localStorage, no vuelve a insistir), o ninguno de los dos caminos
 *  aplica (navegador de escritorio sin soporte, ej. Firefox/Safari
 *  desktop). */
export function InstalarAppCard() {
  const [promptEvento, setPromptEvento] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [instalando, setInstalando] = React.useState(false)
  // Arranca "todo oculto" (instalado=true) hasta que el efecto confirme lo
  // contrario — evita un flash de la tarjeta en el primer render (server y
  // primer paint no saben si ya está instalada). Un solo estado combinado
  // en vez de 3 sueltos: setState directo y síncrono dentro de un efecto
  // dispara react-hooks/set-state-in-effect — se difiere con
  // `window.setTimeout(..., 0)`, mismo patrón que ya usa el resto del
  // proyecto (ver /admin/tarjetas/[id]/page.tsx, `cargar()`).
  const [estado, setEstado] = React.useState({ instalado: true, esIOS: false, descartado: true })

  React.useEffect(() => {
    window.setTimeout(() => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      setEstado({
        instalado: standalone,
        esIOS: /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !standalone,
        descartado: window.localStorage.getItem(CLAVE_DESCARTADO) === "1",
      })
    }, 0)

    function alCapturarPrompt(e: Event) {
      e.preventDefault()
      setPromptEvento(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", alCapturarPrompt)
    return () => window.removeEventListener("beforeinstallprompt", alCapturarPrompt)
  }, [])
  const { instalado, esIOS, descartado } = estado

  function descartar() {
    window.localStorage.setItem(CLAVE_DESCARTADO, "1")
    setEstado((prev) => ({ ...prev, descartado: true }))
  }

  async function instalar() {
    if (!promptEvento) return
    setInstalando(true)
    await promptEvento.prompt()
    await promptEvento.userChoice
    setInstalando(false)
    setPromptEvento(null)
  }

  if (instalado || descartado) return null
  if (!promptEvento && !esIOS) return null

  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg dark:border-white/10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-3xl"
      />
      <button
        type="button"
        onClick={descartar}
        aria-label="Cerrar"
        className="absolute right-3 top-3 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" />
      </button>

      <div className="relative flex items-start gap-3 pr-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Download className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Instala Linkard en tu celular</p>
          <p className="mt-0.5 text-xs text-white/80">
            Agrega el ícono a tu pantalla de inicio y entra directo a tu cuenta, sin buscar el
            navegador cada vez.
          </p>
        </div>
      </div>

      {promptEvento ? (
        <button
          type="button"
          onClick={instalar}
          disabled={instalando}
          className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-white/90 disabled:opacity-60"
        >
          {instalando ? "Instalando..." : "Agregar a pantalla de inicio"}
        </button>
      ) : (
        <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-medium">
          <Share className="size-3.5 shrink-0" /> Toca Compartir → &quot;Agregar a inicio&quot;
        </p>
      )}
    </div>
  )
}
