"use client"

/**
 * Módulo 1.3 — Señales cualitativas: barómetro lateral de sentimiento
 * agregado + vectores cualitativos por categoría + panel de interrogación en
 * lenguaje natural (agentes EMMA/NEXUS). El chat es una interfaz de
 * demostración de UX: no llama a un backend real (fuera de alcance actual,
 * la ingesta/orquestación de agentes se resuelve en otra capa del proyecto).
 */
import * as React from "react"
import { Bot, Send, Sparkles } from "lucide-react"
import { EMPORIUM_NEWS } from "@/data/emporium/mockData"
import { useEmporiumFilter, matchesCountryFilter } from "@/components/emporium/EmporiumContext"
import { EmporiumGauge } from "@/components/emporium/EmporiumGauge"
import { VectorBar } from "@/components/emporium/VectorBar"
import { categoryLabel } from "@/lib/emporium/format"
import { cn } from "@/lib/utils"

function useAggregatedSentiment() {
  const { selectedCountries } = useEmporiumFilter()
  return React.useMemo(() => {
    const items = matchesCountryFilter(EMPORIUM_NEWS, selectedCountries)
    if (items.length === 0) return { score: 0, byCategory: [] as { category: string; score: number; count: number }[] }

    const score = Math.round(items.reduce((sum, n) => sum + n.sentimentScore, 0) / items.length)

    const grouped = new Map<string, { total: number; count: number }>()
    for (const n of items) {
      const g = grouped.get(n.category) ?? { total: 0, count: 0 }
      g.total += n.sentimentScore
      g.count += 1
      grouped.set(n.category, g)
    }
    const byCategory = Array.from(grouped.entries())
      .map(([category, { total, count }]) => ({ category, score: Math.round(total / count), count }))
      .sort((a, b) => b.count - a.count)

    return { score, byCategory }
  }, [selectedCountries])
}

const SUGGESTED_PROMPTS = [
  "¿Qué está impulsando el sentimiento bajista en la Eurozona hoy?",
  "Compara el sesgo hawkish/dovish entre la Fed y el BCE.",
  "¿Qué eventos de alto impacto vienen esta semana?",
]

export function QualitativeSignals() {
  const { score, byCategory } = useAggregatedSentiment()
  const [messages, setMessages] = React.useState<{ role: "user" | "agent"; text: string }[]>([
    {
      role: "agent",
      text: "Hola, soy EMMA. Preguntame sobre el sentimiento agregado, un país específico o un evento macro reciente.",
    },
  ])
  const [draft, setDraft] = React.useState("")

  const send = (text: string) => {
    if (!text.trim()) return
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      {
        role: "agent",
        text: `Analizando ${categoryLabel("macro").toLowerCase()} y noticias recientes relacionadas con "${text}"... (interrogación IA — la orquestación de agentes EMMA/NEXUS se conecta en la capa de datos ya en desarrollo).`,
      },
    ])
    setDraft("")
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr_260px]">
      {/* Barómetro lateral */}
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--emp-border)] bg-[var(--emp-surface)]/40 p-4">
        <EmporiumGauge value={score} palette="sentiment" label="Sentimiento Agregado" size={150} />
        <p className="mt-2 text-center text-[11px] text-[var(--emp-muted-foreground)]">
          Basado en el filtro de país activo del Módulo 1.1
        </p>
      </div>

      {/* Vectores cualitativos por categoría */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--emp-muted-foreground)]">
          Vectores cualitativos por categoría
        </h4>
        <div className="flex flex-col gap-2">
          {byCategory.length === 0 && (
            <p className="text-xs text-[var(--emp-muted-foreground)]">Sin datos para el filtro seleccionado.</p>
          )}
          {byCategory.map((row) => {
            const positive = row.score >= 0
            return (
              <div key={row.category} className="flex items-center gap-2.5">
                <span className="w-32 shrink-0 text-xs text-[var(--emp-foreground)]">{categoryLabel(row.category)}</span>
                <VectorBar value={row.score} />
                <span className={cn("emp-mono w-10 text-right text-xs font-semibold", positive ? "text-emerald-400" : "text-rose-400")}>
                  {row.score > 0 ? "+" : ""}
                  {row.score}
                </span>
                <span className="w-6 text-right text-[10px] text-[var(--emp-muted-foreground)]">×{row.count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interrogación IA EMMA/NEXUS */}
      <div className="flex flex-col rounded-lg border border-[var(--emp-border)] bg-[var(--emp-surface)]/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--emp-primary)]">
          <Bot className="h-3.5 w-3.5" />
          EMMA / NEXUS
          <Sparkles className="h-3 w-3 text-[var(--emp-gold)]" />
        </div>

        <div className="mb-2 flex flex-1 flex-col gap-2 overflow-y-auto text-xs" style={{ maxHeight: 180 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[92%] rounded-lg px-2.5 py-1.5 leading-snug",
                m.role === "agent"
                  ? "self-start bg-[var(--emp-secondary)] text-[var(--emp-foreground)]"
                  : "self-end bg-[var(--emp-primary)]/20 text-[var(--emp-foreground)]"
              )}
            >
              {m.text}
            </div>
          ))}
        </div>

        <div className="mb-2 flex flex-wrap gap-1">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              className="rounded-full border border-[var(--emp-border-strong)] px-2 py-0.5 text-[10px] text-[var(--emp-muted-foreground)] hover:border-[var(--emp-primary)]/40 hover:text-[var(--emp-foreground)]"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="flex items-center gap-1.5"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Preguntá en lenguaje natural..."
            className="h-8 flex-1 rounded-md border border-[var(--emp-border-strong)] bg-transparent px-2 text-xs text-[var(--emp-foreground)] outline-none placeholder:text-[var(--emp-muted-foreground)] focus:border-[var(--emp-primary)]"
          />
          <button
            type="submit"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--emp-primary)] text-[var(--emp-primary-foreground)] transition-opacity hover:opacity-90"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
