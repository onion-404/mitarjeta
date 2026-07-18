import { ComparativaPlanes } from "@/components/planes/comparativa-planes"
import { getPlanesActivos } from "@/lib/planes"

export const dynamic = "force-dynamic"

export default async function PlanesPage() {
  const planes = await getPlanesActivos()

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-3 px-4 py-16 sm:px-6">
      <h1 className="text-center text-3xl font-semibold text-balance text-foreground sm:text-4xl">
        Elegí el plan para tu tarjeta
      </h1>
      <p className="max-w-lg text-center text-muted-foreground">
        Cada tarjeta tiene su propio plan y su propia suscripción — podés elegir uno
        distinto para cada una.
      </p>
      <div className="mt-6 w-full">
        <ComparativaPlanes planes={planes} />
      </div>
    </div>
  )
}
