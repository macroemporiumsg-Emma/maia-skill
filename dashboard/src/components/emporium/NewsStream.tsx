"use client"

/**
 * Módulo 1.2 — Stream de noticias NLP en orden cronológico inverso, estilo
 * feed Bloomberg/Investing.com: bloques de alta legibilidad, tags de
 * categoría automáticos e indicador de urgencia algorítmica.
 */
import * as React from "react"
import { AlertTriangle, Flame } from "lucide-react"
import { EMPORIUM_NEWS } from "@/data/emporium/mockData"
import { countryByCode } from "@/data/emporium/countries"
import { useEmporiumFilter, matchesCountryFilter } from "@/components/emporium/EmporiumContext"
import { categoryLabel, impactBadgeClass, impactLabel, relativeTime, sentimentColorClass } from "@/lib/emporium/format"
import { cn } from "@/lib/utils"

function NewsCard({ item }: { item: (typeof EMPORIUM_NEWS)[number] }) {
  const country = countryByCode(item.countryCode)

  return (
    <article
      className={cn(
        "group relative rounded-lg border border-[var(--emp-border)] bg-[var(--emp-surface)]/50 p-3 transition-colors hover:border-[var(--emp-primary)]/30 hover:bg-[var(--emp-card-hover)]",
        item.urgent && "border-l-2 border-l-[var(--emp-hawkish)]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--emp-muted-foreground)]">
          <span aria-hidden>{country?.flag}</span>
          <span className="font-medium">{item.source}</span>
          <span aria-hidden>·</span>
          <time dateTime={item.publishedAt} suppressHydrationWarning>
            {relativeTime(item.publishedAt)}
          </time>
          {item.urgent && (
            <span className="flex items-center gap-0.5 rounded bg-rose-500/15 px-1.5 py-0.5 font-semibold text-rose-300">
              <Flame className="h-2.5 w-2.5" />
              URGENTE
            </span>
          )}
        </div>
        <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", impactBadgeClass(item.impact))}>
          {impactLabel(item.impact)}
        </span>
      </div>

      <h4 className="mt-1.5 text-[13px] font-semibold leading-snug text-[var(--emp-foreground)]">
        {item.title}
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-[var(--emp-muted-foreground)]">{item.summary}</p>

      <div className="mt-2 flex items-center gap-2 text-[10px]">
        <span className="rounded-full border border-[var(--emp-border-strong)] px-2 py-0.5 text-[var(--emp-muted-foreground)]">
          {categoryLabel(item.category)}
        </span>
        <span className={cn("flex items-center gap-1 font-semibold", sentimentColorClass(item.sentiment))}>
          {item.sentiment === "bullish" ? "▲" : item.sentiment === "bearish" ? "▼" : "•"}
          {item.sentimentScore > 0 ? "+" : ""}
          {item.sentimentScore}
        </span>
      </div>
    </article>
  )
}

const CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "central_bank", label: "Bancos Centrales" },
  { id: "macro", label: "Macro" },
  { id: "forex", label: "Divisas" },
  { id: "equities", label: "Renta Variable" },
  { id: "commodities", label: "Materias Primas" },
  { id: "geopolitics", label: "Geopolítica" },
] as const

export function NewsStream() {
  const { selectedCountries } = useEmporiumFilter()
  const [category, setCategory] = React.useState<(typeof CATEGORIES)[number]["id"]>("all")

  const filtered = React.useMemo(() => {
    let items = matchesCountryFilter(EMPORIUM_NEWS, selectedCountries)
    if (category !== "all") {
      items = items.filter((n) => n.category === category)
    }
    return [...items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  }, [selectedCountries, category])

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              category === c.id
                ? "border-[var(--emp-primary)] bg-[var(--emp-primary)]/15 text-[var(--emp-primary)]"
                : "border-[var(--emp-border-strong)] text-[var(--emp-muted-foreground)] hover:text-[var(--emp-foreground)]"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--emp-muted-foreground)]">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs">Sin noticias para el filtro seleccionado.</span>
          </div>
        ) : (
          filtered.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
