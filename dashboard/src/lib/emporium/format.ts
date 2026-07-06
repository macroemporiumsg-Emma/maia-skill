import type { MonetaryBias, NewsImpact, NewsSentiment, RegimeState } from "@/types/emporium"

/** Formatea un número con signo, ej. "+2.9", "-1.8". */
export function formatSigned(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(decimals)}`
}

export function formatZScore(value: number | null): string {
  if (value == null) return "—"
  return `${formatSigned(value, 1)}σ`
}

export function formatValueUnit(value: number | null, unit: string): string {
  if (value == null) return "—"
  const clean = unit && unit !== "N/A" ? unit : ""
  return `${value.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}${clean}`
}

export function sentimentColorClass(sentiment: NewsSentiment): string {
  switch (sentiment) {
    case "bullish":
      return "text-emerald-400"
    case "bearish":
      return "text-rose-400"
    default:
      return "text-amber-400"
  }
}

export function sentimentToScore(sentiment: NewsSentiment): number {
  if (sentiment === "bullish") return 70
  if (sentiment === "bearish") return -70
  return 0
}

export function impactBadgeClass(impact: NewsImpact): string {
  switch (impact) {
    case "high":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30"
    case "medium":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30"
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30"
  }
}

export function impactLabel(impact: NewsImpact): string {
  if (impact === "high") return "Alto Impacto"
  if (impact === "medium") return "Impacto Medio"
  return "Bajo Impacto"
}

export function biasColorClass(bias: MonetaryBias): string {
  if (bias === "hawkish") return "text-rose-400"
  if (bias === "dovish") return "text-sky-400"
  return "text-amber-400"
}

export function biasLabel(bias: MonetaryBias): string {
  if (bias === "hawkish") return "🦅 Hawkish"
  if (bias === "dovish") return "🕊️ Dovish"
  return "⚖️ Neutral"
}

export function regimeLabel(regime: RegimeState): string {
  if (regime === 1) return "Expansión (+1)"
  if (regime === -1) return "Contracción (-1)"
  return "Estacionario (0)"
}

export function regimeColorClass(regime: RegimeState): string {
  if (regime === 1) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
  if (regime === -1) return "text-rose-400 bg-rose-500/10 border-rose-500/30"
  return "text-amber-400 bg-amber-500/10 border-amber-500/30"
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    macro: "Macro",
    forex: "Divisas",
    equities: "Renta Variable",
    commodities: "Materias Primas",
    central_bank: "Banco Central",
    geopolitics: "Geopolítica",
  }
  return labels[category] ?? category
}

/** Tiempo relativo compacto ("hace 5m", "hace 2h"), útil para el stream de noticias. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  const diffMs = now.getTime() - then
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "ahora"
  if (diffMin < 60) return `hace ${diffMin}m`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `hace ${diffH}h`
  const diffD = Math.round(diffH / 24)
  return `hace ${diffD}d`
}
