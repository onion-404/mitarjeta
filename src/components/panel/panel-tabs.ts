import {
  BarChart3,
  Banknote,
  CreditCard,
  LayoutDashboard,
  Layers,
  Settings,
  Tag,
  User,
} from "lucide-react"

import type { PanelTab } from "@/components/panel/panel-shell"

export const ADMIN_TABS: PanelTab[] = [
  { href: "/admin/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/tarjetas", label: "Tarjetas", icon: Layers },
  { href: "/admin/suscripciones", label: "Suscripciones", icon: CreditCard },
  { href: "/admin/cupones", label: "Cupones y Precios", icon: Tag },
  { href: "/admin/cobro-manual", label: "Cobro Manual", icon: Banknote },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
]

export const MI_CUENTA_TABS: PanelTab[] = [
  { href: "/mi-cuenta", label: "Resumen", icon: LayoutDashboard },
  { href: "/mi-cuenta/tarjetas", label: "Mis Tarjetas", icon: Layers },
  { href: "/mi-cuenta/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/mi-cuenta/suscripcion", label: "Suscripción y Pago", icon: CreditCard },
  { href: "/mi-cuenta/cuenta", label: "Cuenta", icon: User },
]
