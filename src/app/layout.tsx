import type { Metadata } from "next";
import { Baloo_2, Geist, Geist_Mono, Playfair_Display, Plus_Jakarta_Sans, Sora } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://linkard.mx"),
  title: "Linkard · Tarjeta digital en segundos",
  description:
    "Creá tu tarjeta de presentación o de negocio digital, compartila con un enlace y un QR. Sin apps, sin imprimir: tu contacto siempre a un toque de distancia.",
  openGraph: {
    title: "Linkard · Tarjeta digital en segundos",
    description:
      "Creá tu tarjeta de presentación o de negocio digital, compartila con un enlace y un QR.",
    siteName: "Linkard",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linkard · Tarjeta digital en segundos",
    description:
      "Creá tu tarjeta de presentación o de negocio digital, compartila con un enlace y un QR.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${baloo2.variable} ${plusJakartaSans.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
