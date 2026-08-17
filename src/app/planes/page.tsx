import { HeaderGlobal } from "@/components/header-global"
import { ComparativaPlanes } from "@/components/planes/comparativa-planes"
import { getPlanesActivos } from "@/lib/planes"

export const dynamic = "force-dynamic"

interface PlanesPageProps {
  // "cupon" llega desde el botón "Obtener mi descuento" del home
  // (/planes?cupon=LINKARD15) — se reenvía a /crear al elegir un plan, ver
  // ComparativaPlanes. "nombre" llega del input "Reclama tu link" del hero
  // del home, mismo criterio de reenvío. Ambos solo viajan en la URL, ver
  // CLAUDE.md.
  searchParams: Promise<{ cupon?: string; nombre?: string }>
}

export default async function PlanesPage({ searchParams }: PlanesPageProps) {
  const [planes, { cupon, nombre }] = await Promise.all([getPlanesActivos(), searchParams])

  return (
    <div className="flex flex-1 flex-col">
      <HeaderGlobal />
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-3 px-4 py-16 sm:px-6">
        <h1 className="text-center text-3xl font-semibold text-balance text-foreground sm:text-4xl">
          Elige el plan para tu Linkard
        </h1>
        <p className="max-w-lg text-center text-muted-foreground">
          Cada Linkard tiene su propio plan y su propia suscripción — puedes elegir uno
          distinto para cada uno.
        </p>
        {cupon && (
          <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Código {cupon.toUpperCase()} listo para aplicarse al crear tu tarjeta
          </p>
        )}
        <div className="mt-6 w-full">
          <ComparativaPlanes planes={planes} cuponCodigo={cupon} nombreInicial={nombre} />
        </div>
      </div>
    </div>
  )
}
