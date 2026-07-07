"use client"

/**
 * Módulo 3 — Contexto Corporativo entre Regiones: matriz/heatmap que evalúa
 * la transmisión asimétrica de impacto macro/noticias desde una región de
 * origen hacia activos (índices, FX, materias primas, tasas) de otra región,
 * más flujos ETF y diferenciales de estrés crediticio (TED spread, curva de
 * rendimientos). Filtrado por región de origen, sincronizado con el Módulo 1.1.
 */
import { ArrowRight, LineChart } from "lucide-react"
import { CROSS_REGIONAL_LINKS } from "@/data/emporium/mockData"
import { countryByCode } from "@/data/emporium/countries"
import { useEmporiumFilter, matchesCountryFilter } from "@/components/emporium/EmporiumContext"
import { formatSigned } from "@/lib/emporium/format"
import { cn } from "@/lib/utils"

const ASSET_TYPE_LABEL: Record<string, string> = {
  index: "Índice",
  fx: "Divisa",
  commodity: "Materia Prima",
  rates: "Tasas",
}

function impactCellStyle(score: number): string {
  const abs = Math.min(100, Math.abs(score))
  const alpha = 0.12 + (abs / 100) * 0.35
  const color = score >= 0 ? `rgba(34,197,94,${alpha})` : `rgba(244,63,94,${alpha})`
  return color
}

export function CrossRegionalMatrix() {
  const { selectedCountries } = useEmporiumFilter()
  const rows = matchesCountryFilter(CROSS_REGIONAL_LINKS, selectedCountries, (item) => item.sourceRegion)

  return (
    <div className="grid grid-cols-1 gap-3">
      {rows.length === 0 && (
        <p className="py-6 text-center text-xs text-[var(--emp-muted-foreground)]">
          Sin transmisiones registradas para la región seleccionada.
        </p>
      )}

      {rows.map((link) => {
        const source = countryByCode(link.sourceRegion)
        return (
          <div
            key={link.id}
            className="grid grid-cols-1 items-center gap-3 rounded-lg border border-[var(--emp-border)] p-3 sm:grid-cols-[1fr_auto_1fr]"
            style={{ backgroundColor: impactCellStyle(link.impactScore) }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                {source?.flag}
              </span>
              <div>
                <div className="text-xs font-semibold text-[var(--emp-foreground)]">{source?.name}</div>
                <div className="text-[10px] text-[var(--emp-muted-foreground)]">Región de origen</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-4 w-4 text-[var(--emp-muted-foreground)]" />
              <span
                className={cn(
                  "emp-mono rounded-full border px-2 py-0.5 text-[11px] font-bold",
                  link.impactScore >= 0
                    ? "border-emerald-500/40 text-emerald-400"
                    : "border-rose-500/40 text-rose-400"
                )}
              >
                {formatSigned(link.impactScore, 0)}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--emp-foreground)]">
                <LineChart className="h-3.5 w-3.5 text-[var(--emp-primary)]" />
                {link.targetAsset}
                <span className="rounded border border-[var(--emp-border-strong)] px-1.5 py-0.5 text-[9px] font-normal text-[var(--emp-muted-foreground)]">
                  {ASSET_TYPE_LABEL[link.targetType]}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--emp-muted-foreground)]">{link.description}</p>

              <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
                <span className="text-[var(--emp-muted-foreground)]">
                  ETF Flow:{" "}
                  <span className={cn("emp-mono font-semibold", link.etfFlowM >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {link.etfFlowM >= 0 ? "+" : ""}
                    {link.etfFlowM}M
                  </span>
                </span>
                <span className="text-[var(--emp-muted-foreground)]">
                  TED Spread: <span className="emp-mono font-semibold text-[var(--emp-foreground)]">{link.tedSpreadBps}bps</span>
                </span>
                <span className="text-[var(--emp-muted-foreground)]">
                  Δ Curva 10Y:{" "}
                  <span className="emp-mono font-semibold text-[var(--emp-foreground)]">{formatSigned(link.yieldCurveDeltaBps, 0)}bps</span>
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
