import { Sparkles } from "lucide-react"

import { CandadoPlan } from "@/components/tarjeta/candado-plan"
import { SwatchForma } from "@/components/tarjeta/opcion-personalizacion"
import {
  FORMAS_AVATAR,
  PLANTILLAS,
  bloqueoMasRestrictivo,
  calcularBloqueos,
  type Plantilla,
  type PlanFeaturesPersonalizacion,
} from "@/lib/personalizacion"
import { obtenerBannerPreset } from "@/lib/banner-presets"
import type { IdentidadVisual } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PlantillasGaleriaProps {
  identidadVisual: IdentidadVisual
  guardado: IdentidadVisual | null
  features: PlanFeaturesPersonalizacion
  onAplicar: (plantilla: Plantilla) => void
  onEmpezarDeCero: () => void
}

export function PlantillasGaleria({
  identidadVisual,
  guardado,
  features,
  onAplicar,
  onEmpezarDeCero,
}: PlantillasGaleriaProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
      <p className="text-xs text-muted-foreground">
        Elige una plantilla como punto de partida y sigue personalizando, o empieza de cero.
        Puedes probar cualquiera aunque tenga algo bloqueado para tu plan — se aplica en la
        vista previa igual, solo el guardado queda condicionado.
      </p>

      <button
        type="button"
        onClick={onEmpezarDeCero}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors duration-200 ease-out hover:border-foreground hover:text-foreground"
      >
        <Sparkles className="size-4" /> Empezar de cero
      </button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLANTILLAS.map((plantilla) => {
          const bloqueos = calcularBloqueos(
            { ...guardado, ...plantilla.valores },
            guardado,
            features
          )
          const bloqueo = bloqueoMasRestrictivo(bloqueos)
          const activa = identidadVisual.plantillaBase === plantilla.id
          const preset = plantilla.valores.bannerPreset
            ? obtenerBannerPreset(plantilla.valores.bannerPreset)
            : undefined
          const fondo =
            preset?.background ??
            (plantilla.valores.colorPrimario && plantilla.valores.colorSecundario
              ? `linear-gradient(135deg, ${plantilla.valores.colorPrimario}, ${plantilla.valores.colorSecundario})`
              : plantilla.valores.colorPrimario)
          const formaMeta = FORMAS_AVATAR.find((f) => f.id === plantilla.valores.avatarForma)

          return (
            <div
              key={plantilla.id}
              className={cn(
                "relative flex flex-col gap-3 rounded-2xl border-2 p-4",
                activa ? "border-foreground" : "border-border"
              )}
            >
              {bloqueo && <CandadoPlan plan={bloqueo.plan} className="absolute -right-1.5 -top-1.5" />}

              <div className="flex items-center gap-3">
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: fondo }}
                >
                  {formaMeta && <SwatchForma forma={formaMeta} />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{plantilla.nombre}</p>
                  <p className="text-xs text-muted-foreground">{plantilla.vibe}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAplicar(plantilla)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out",
                  activa
                    ? "bg-foreground text-background"
                    : "border border-border hover:bg-muted"
                )}
              >
                {activa ? "En uso" : "Usar esta plantilla"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
