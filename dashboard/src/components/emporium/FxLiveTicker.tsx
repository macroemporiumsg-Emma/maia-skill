"use client"

/**
 * Ticker "FX LIVE" en la cabecera institucional, estilo Investing/Yahoo:
 * marquee horizontal infinito con pares de divisas, variación % y flechas de
 * tendencia. Datos estáticos (`FX_LIVE_TICKS`) — la ingesta en vivo se
 * gestiona en otra capa del proyecto (fuera de alcance de esta UI).
 */
import { Globe2, TrendingDown, TrendingUp } from "lucide-react"
import { FX_LIVE_TICKS } from "@/data/emporium/mockData"
import { countryByCode } from "@/data/emporium/countries"
import { cn } from "@/lib/utils"

function TickChip({ tick }: { tick: (typeof FX_LIVE_TICKS)[number] }) {
  const base = countryByCode(tick.base)
  const quote = countryByCode(tick.quote)
  const up = tick.changePct >= 0
  const decimals = tick.pair.includes("JPY") ? 2 : 4

  return (
    <div className="flex shrink-0 items-center gap-2 px-4">
      <span className="text-sm" aria-hidden>
        {base?.flag}
        {quote?.flag}
      </span>
      <span className="emp-mono text-xs font-semibold text-[var(--emp-foreground)]">{tick.pair}</span>
      <span className="emp-mono text-xs text-[var(--emp-muted-foreground)]">{tick.rate.toFixed(decimals)}</span>
      <span
        className={cn(
          "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold",
          up ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        )}
      >
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {up ? "+" : ""}
        {tick.changePct.toFixed(2)}%
      </span>
    </div>
  )
}

export function FxLiveTicker() {
  const upCount = FX_LIVE_TICKS.filter((t) => t.changePct >= 0).length
  const downCount = FX_LIVE_TICKS.length - upCount

  return (
    <div className="relative border-b border-[var(--emp-border)] bg-gradient-to-r from-[var(--emp-background)] via-[color-mix(in_srgb,var(--emp-warning)_7%,transparent)] to-[var(--emp-background)]">
      {/* Meta bar */}
      <div className="flex h-6 items-center gap-3 px-3 text-[10px] text-[var(--emp-muted-foreground)]">
        <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[var(--emp-warning)]">
          <Globe2 className="h-3 w-3" />
          FX Live
        </span>
        <span className="flex items-center gap-1">
          <span className="emp-pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--emp-success)]" />
          en vivo
        </span>
        <span>{FX_LIVE_TICKS.length} pares</span>
        <span className="text-emerald-400">▲ {upCount}</span>
        <span className="text-rose-400">▼ {downCount}</span>
      </div>

      {/* Marquee row */}
      <div className="relative h-9 overflow-hidden">
        <div className="absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--emp-background)] to-transparent" />
        <div className="absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--emp-background)] to-transparent" />
        <div className="emp-animate-marquee flex h-full w-max items-center">
          {[...FX_LIVE_TICKS, ...FX_LIVE_TICKS].map((tick, i) => (
            <TickChip key={`${tick.pair}-${i}`} tick={tick} />
          ))}
        </div>
      </div>
    </div>
  )
}
