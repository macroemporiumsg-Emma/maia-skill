import type { Metadata } from "next"
import { DM_Sans, JetBrains_Mono } from "next/font/google"
import "./emporium-theme.css"

/**
 * Layout de ámbito local para `/noticias-eventos`: aplica el tema oscuro
 * institucional de Emporium (`.emporium-theme`, ver `emporium-theme.css`)
 * SOLO dentro de esta subruta, sin tocar `src/app/globals.css` ni afectar el
 * tema claro usado por el resto del dashboard (`/`, `/intraday`).
 *
 * Nota: Next.js App Router permite anidar `<html>`/`<body>` únicamente en el
 * layout raíz; aquí en su lugar envolvemos con un `<div>` con la clase de
 * tema, que es el patrón recomendado para theming por-ruta.
 */
const dmSans = DM_Sans({
  variable: "--emp-font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const jetBrainsMono = JetBrains_Mono({
  variable: "--emp-font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Emporium Macro Analytics — Noticias y Eventos",
  description:
    "Análisis de sentimiento, datos macro de alta densidad y contexto corporativo cross-regional. Proyecto: Bandonax IA.",
}

export default function NoticiasEventosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`emporium-theme ${dmSans.variable} ${jetBrainsMono.variable}`}>
      {children}
    </div>
  )
}
