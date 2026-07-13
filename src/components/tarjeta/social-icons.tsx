import { Link2, MessageCircle } from "lucide-react"
import type { ComponentType, SVGProps } from "react"

import type { PlataformaRed } from "@/lib/types"

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

function InstagramIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14 8.5h-1.5A1.5 1.5 0 0 0 11 10v2m0 0H9.5M11 12v6" />
    </svg>
  )
}

function TiktokIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15 4v9.5a3.5 3.5 0 1 1-3-3.46" />
      <path d="M15 4c.4 2.2 2 3.9 4.2 4.2" />
    </svg>
  )
}

function LinkedinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <line x1="7.5" y1="10" x2="7.5" y2="16.5" />
      <circle cx="7.5" cy="7" r="0.6" fill="currentColor" stroke="none" />
      <path d="M11 16.5V10m0 2.5c0-1.4 1-2.5 2.3-2.5S16 11.1 16 12.5v4" />
    </svg>
  )
}

function YoutubeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="4" />
      <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="4" y1="4" x2="20" y2="20" />
      <line x1="20" y1="4" x2="4" y2="20" />
    </svg>
  )
}

export const SOCIAL_ICONS: Record<PlataformaRed, ComponentType<IconProps>> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  whatsapp: MessageCircle,
  x: XIcon,
  personalizado: Link2,
}
