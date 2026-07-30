import type { Metadata } from "next";
import { Newsreader, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Rediseño v3 — identidad "real-estate editorial" (navy + oro sobre base
 * cálida, ver .claude/design-system/tokens.md y Rediseño/Mejora de sitio
 * Nodrix V2/*.html, la referencia visual aportada por el negocio). Newsreader
 * (serif editorial) para titulares y cifras destacadas -- transmite
 * solidez/patrimonio, no "gamer"/fintech genérico. Manrope para cuerpo/UI --
 * neutra, muy legible, la misma familia usada en el mockup de referencia.
 */
const newsreader = Newsreader({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${newsreader.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
