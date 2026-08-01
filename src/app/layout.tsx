import type { Metadata } from "next";
import {
  Baloo_2,
  Bebas_Neue,
  Caveat,
  Geist,
  Geist_Mono,
  Lora,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Quicksand,
  Sora,
  Space_Mono,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Exclusiva para los titulares de marketing del home (--font-display) — NO
// reemplaza a Baloo 2, que sigue siendo la opción "creativa" real que
// cualquier usuario puede elegir para personalizar SU tarjeta (feature ya
// shippeada, sistema tipográfico aparte). Geométrica/premium en vez de
// redonda/juguetona, para la dirección "premium llamativo" del rediseño del
// home — ver CLAUDE.md.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const sora = Sora({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-elegante",
  subsets: ["latin"],
});

const baloo2 = Baloo_2({
  variable: "--font-creativa",
  subsets: ["latin"],
  weight: ["500", "700"],
});

// Las 6 fuentes de acá abajo son para el sistema de tipografía ampliado del
// editor de tarjetas (9 estilos, ver ESTILOS_TIPOGRAFIA en
// lib/personalizacion.ts) — sin relación con --font-display (Plus Jakarta
// Sans, exclusiva del home) ni --font-geist-mono (fuente de UI del propio
// producto). NO se verificó con un build real en esta sesión (sandbox sin
// acceso al proyecto montado, ver CLAUDE.md) — los pesos elegidos abajo
// asumen el soporte conocido de next/font/google para cada familia (Lora/
// Quicksand/Caveat variables, sin necesidad de `weight`; Poppins/Space Mono/
// Bebas Neue estáticas, con `weight` explícito) — confirmar con
// `npm run build` antes de dar por bueno.
const lora = Lora({
  variable: "--font-clasica",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-geometrica",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const quicksand = Quicksand({
  variable: "--font-redondeada",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-tipografia-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-card-display",
  subsets: ["latin"],
  weight: ["400"],
});

const caveat = Caveat({
  variable: "--font-manuscrita",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://linkard.mx"),
  title: "Linkard · Tarjeta digital en segundos",
  description:
    "Crea tu tarjeta de presentación o de negocio digital, compartila con un enlace y un QR. Sin apps, sin imprimir: tu contacto siempre a un toque de distancia.",
  openGraph: {
    title: "Linkard · Tarjeta digital en segundos",
    description:
      "Crea tu tarjeta de presentación o de negocio digital, compartila con un enlace y un QR.",
    siteName: "Linkard",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linkard · Tarjeta digital en segundos",
    description:
      "Crea tu tarjeta de presentación o de negocio digital, compartila con un enlace y un QR.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${baloo2.variable} ${plusJakartaSans.variable} ${sora.variable} ${lora.variable} ${poppins.variable} ${quicksand.variable} ${spaceMono.variable} ${bebasNeue.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
