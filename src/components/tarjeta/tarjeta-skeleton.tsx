import { cn } from "@/lib/utils"

interface TarjetaSkeletonProps {
  className?: string
}

const bloqueClase = "animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"

/**
 * Placeholder con la misma silueta que TarjetaCard (banner, avatar circular
 * superpuesto, nombre, botones de contacto) para que la carga real no
 * produzca un salto de layout cuando la reemplaza.
 */
export function TarjetaSkeleton({ className }: TarjetaSkeletonProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative w-full min-w-[320px] max-w-sm overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_25px_60px_-20px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-zinc-900">
        {/* Banner */}
        <div className="h-48 w-full animate-pulse bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700" />

        <div className="relative -mt-14 rounded-t-[2rem] bg-white/85 px-6 pb-7 pt-3 backdrop-blur-xl dark:bg-zinc-900/85">
          {/* Avatar */}
          <div className="-mt-14 flex justify-center">
            <div className="size-24 shrink-0 animate-pulse rounded-full bg-zinc-300 shadow-lg ring-4 ring-white dark:bg-zinc-700 dark:ring-zinc-900" />
          </div>

          {/* Badge de tipo de tarjeta */}
          <div className={cn(bloqueClase, "mx-auto mt-4 h-4 w-28")} />

          {/* Nombre y subtítulo */}
          <div className={cn(bloqueClase, "mx-auto mt-3 h-5 w-40")} />
          <div className={cn(bloqueClase, "mx-auto mt-2 h-3 w-24")} />

          {/* Botones de contacto */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <div className={cn(bloqueClase, "h-8 w-20")} />
            <div className={cn(bloqueClase, "h-8 w-24")} />
            <div className={cn(bloqueClase, "h-8 w-16")} />
          </div>

          {/* Bloque de servicios/contenido */}
          <div className="mt-6 w-full text-left">
            <div className={cn(bloqueClase, "h-3 w-20")} />
            <div className="mt-3 flex flex-col gap-2">
              <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
