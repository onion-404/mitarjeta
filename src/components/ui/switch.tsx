import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

function Switch({ checked, onCheckedChange, disabled, className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      data-slot="switch"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-muted transition-colors duration-200 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[checked]:bg-foreground disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-3.5 translate-x-1 rounded-full bg-background shadow-sm transition-transform duration-200 ease-out data-[checked]:translate-x-4.5 dark:bg-white"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
