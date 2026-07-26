import {
  BarChart3,
  Banknote,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Layers,
  Settings,
  Tag,
  User,
  Users,
} from "lucide-react"

import type { PanelTab } from "@/components/panel/panel-shell"

export const ADMIN_TABS: PanelTab[] = [
  { href: "/admin/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/tarjetas", label: "Tarjetas", icon: Layers },
  { href: "/admin/suscripciones", label: "Suscripciones", icon: CreditCard },
  { href: "/admin/cupones", label: "Cupones y Precios", icon: Tag },
  { href: "/admin/afiliados", label: "Afiliados", icon: Users },
  { href: "/admin/cobro-manual", label: "Cobro Manual", icon: Banknote },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
]

// Base sin "Ganancias" — esa pestaña se agrega condicionalmente en
// mi-cuenta/layout.tsx solo si el email de la sesión matchea un afiliado
// activo (getAfiliadoPropio()). GANANCIAS_TAB se exporta aparte para que
// el layout la pueda insertar en el lugar que quiera sin duplicar el
// literal acá.
export const MI_CUENTA_TABS: PanelTab[] = [
  { href: "/mi-cuenta", label: "Resumen", icon: LayoutDashboard },
  { href: "/mi-cuenta/tarjetas", label: "Mis Tarjetas", icon: Layers },
  { href: "/mi-cuenta/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/mi-cuenta/suscripcion", label: "Suscripción y Pago", icon: CreditCard },
  { href: "/mi-cuenta/cuenta", label: "Cuenta", icon: User },
]

export const GANANCIAS_TAB: PanelTab = {
  href: "/mi-cuenta/ganancias",
  label: "Ganancias",
  icon: HandCoins,
}
