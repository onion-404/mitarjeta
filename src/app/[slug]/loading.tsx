import { TarjetaSkeleton } from "@/components/tarjeta/tarjeta-skeleton"

export default function CargandoTarjeta() {
  return (
    <div className="relative flex w-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <TarjetaSkeleton />
    </div>
  )
}
