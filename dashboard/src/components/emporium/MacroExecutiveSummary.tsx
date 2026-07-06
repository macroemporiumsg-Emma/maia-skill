"use client"

/**
 * Módulo 2.2 — Widget de resumen ejecutivo macro: fondo gris-tecnológico
 * atenuado, texto de síntesis sobre "sorpresa de datos duros" y eventos de
 * revaluación algorítmica institucional masiva.
 */
import { ArrowDownRight, ArrowUpRight, Gauge } from "lucide-react"
import { MACRO_EXECUTIVE_SUMMARY } from "@/data/emporium/mockData"
import { regimeColorClass, regimeLabel } from "@/lib/emporium/format"
import { cn } from "@/lib/utils"

export function MacroExecutiveSummary() {
  const s = MACRO_EXECUTIVE_SUMMARY

  return (
    <div className="rounded-lg border border-[var(--emp-border-strong)] bg-gradient-to-br from-[var(--emp-secondary)] to-[var(--emp-surface)] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--emp-muted-foreground)]">
          <Gauge className="h-3.5 w-3.5" />
          Situación Macro Global
        </span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", regimeColorClass(s.regimeGlobal))}>
          Régimen: {regimeLabel(s.regimeGlobal)}
        </span>
      </div>

      <h3 className="mb-1.5 text-sm font-bold leading-snug text-[var(--emp-foreground)] sm:text-base">
        {s.headline}
      </h3>
      <p className="text-xs leading-relaxed text-[var(--emp-muted-foreground)]">{s.body}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {s.keyDrivers.map((d) => (
          <div key={d.label} className="rounded-md border border-[var(--emp-border)] bg-[var(--emp-background)]/40 px-2.5 py-1.5">
            <div className="flex items-center gap-1">
              {d.direction === "up" ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-rose-400" />
              )}
              <span className={cn("emp-mono text-xs font-bold", d.direction === "up" ? "text-emerald-400" : "text-rose-400")}>
                {d.zScore > 0 ? "+" : ""}
                {d.zScore.toFixed(1)}σ
              </span>
            </div>
            <span className="text-[10px] text-[var(--emp-muted-foreground)]">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
