"use client"

import { Activity } from "lucide-react"
import { WorldClocks } from "@/components/emporium/WorldClocks"
import { FxLiveTicker } from "@/components/emporium/FxLiveTicker"

/**
 * Cabecera institucional de Emporium Macro Analytics: identidad de marca +
 * relojes de sesiones mundiales + ticker "FX LIVE". Fija (`sticky`) en la
 * parte superior de la página `/noticias-eventos`.
 */
export function EmporiumHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--emp-border)] bg-[var(--emp-background)]/95 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--emp-primary)] to-sky-500 text-[var(--emp-primary-foreground)] shadow-[var(--emp-shadow-glow)]">
            <Activity className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight text-[var(--emp-foreground)]">EMPORIUM</span>
              <span className="text-sm font-medium text-[var(--emp-muted-foreground)]">Macro Analytics</span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[var(--emp-muted-foreground)]/70">
              Noticias &amp; Eventos · Bandonax IA
            </span>
          </div>
        </div>

        <WorldClocks className="max-w-full" />
      </div>

      <FxLiveTicker />
    </header>
  )
}
