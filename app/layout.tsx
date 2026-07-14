import type { Metadata } from "next";
import { Lexend, Source_Sans_3, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Pareo tipográfico "Corporate Trust" (ver explicación en README de diseño /
 * conversación con el usuario): Lexend para titulares — geométrica, diseñada
 * para máxima legibilidad, transmite un carácter tech-premium sin caer en el
 * lujo ornamental de una serif inmobiliaria clásica. Source Sans 3 para
 * cuerpo de texto — neutra, extremadamente legible en párrafos largos y
 * números tabulares, estándar de facto en fintech/banca.
 */
const lexend = Lexend({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nodrix — Plataforma Inmobiliaria Inteligente",
  description:
    "Evalúa tu capacidad de inversión inmobiliaria en minutos con scoring impulsado por datos, seguimiento en tiempo real y asesoría experta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${lexend.variable} ${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
