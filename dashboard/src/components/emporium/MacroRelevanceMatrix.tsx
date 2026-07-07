"use client"

/**
 * Módulo 2.1 — Matriz de Relevancia Macro: tabla de alta densidad con
 * columnas [País][Evento][Categoría][Actual][Consenso][Previo][Z-Score].
 * Las filas de países presentes en el filtro del Módulo 1.1 quedan
 * resaltadas (sincronización cross-módulo confirmada por el usuario).
 */
import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MACRO_INDICATORS } from "@/data/emporium/mockData"
import { countryByCode } from "@/data/emporium/countries"
import { useEmporiumFilter } from "@/components/emporium/EmporiumContext"
import { formatValueUnit, formatZScore } from "@/lib/emporium/format"
import { cn } from "@/lib/utils"
import type { MacroCategory } from "@/types/emporium"

const CATEGORY_STYLES: Record<MacroCategory, string> = {
  Inflación: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  Empleo: "bg-sky-500/10 text-sky-300 border-sky-500/25",
  Crecimiento: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
}

function zScoreClass(z: number | null): string {
  if (z == null) return "text-[var(--emp-muted-foreground)]"
  if (Math.abs(z) >= 2) return z > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"
  if (Math.abs(z) >= 1) return z > 0 ? "text-emerald-400" : "text-rose-400"
  return "text-[var(--emp-muted-foreground)]"
}

export function MacroRelevanceMatrix() {
  const { selectedCountries, isAll } = useEmporiumFilter()
  const [categoryFilter, setCategoryFilter] = React.useState<MacroCategory | "all">("all")

  const rows = React.useMemo(() => {
    let items = MACRO_INDICATORS
    if (categoryFilter !== "all") items = items.filter((i) => i.category === categoryFilter)
    return [...items].sort((a, b) => Math.abs(b.zScore ?? 0) - Math.abs(a.zScore ?? 0))
  }, [categoryFilter])

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["all", "Inflación", "Empleo", "Crecimiento"] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              categoryFilter === cat
                ? "border-[var(--emp-primary)] bg-[var(--emp-primary)]/15 text-[var(--emp-primary)]"
                : "border-[var(--emp-border-strong)] text-[var(--emp-muted-foreground)] hover:text-[var(--emp-foreground)]"
            )}
          >
            {cat === "all" ? "Todas las categorías" : cat}
          </button>
        ))}
        {!isAll && (
          <span className="ml-auto text-[10px] text-[var(--emp-muted-foreground)]">
            Filas resaltadas según selección del Módulo 1.1
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--emp-border)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--emp-border)] hover:bg-transparent">
              <TableHead className="text-[var(--emp-muted-foreground)]">País</TableHead>
              <TableHead className="text-[var(--emp-muted-foreground)]">Evento</TableHead>
              <TableHead className="text-[var(--emp-muted-foreground)]">Categoría</TableHead>
              <TableHead className="text-right text-[var(--emp-muted-foreground)]">Actual</TableHead>
              <TableHead className="text-right text-[var(--emp-muted-foreground)]">Consenso</TableHead>
              <TableHead className="text-right text-[var(--emp-muted-foreground)]">Previo</TableHead>
              <TableHead className="text-right text-[var(--emp-muted-foreground)]">Z-Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const country = countryByCode(row.countryCode)
              const highlighted = selectedCountries.includes(row.countryCode)
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-[var(--emp-border)] transition-colors",
                    highlighted && "bg-[var(--emp-primary)]/8 hover:bg-[var(--emp-primary)]/12"
                  )}
                >
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-[var(--emp-foreground)]">
                      <span aria-hidden>{country?.flag}</span>
                      {row.countryCode}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-[var(--emp-foreground)]">{row.event}</TableCell>
                  <TableCell>
                    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", CATEGORY_STYLES[row.category])}>
                      {row.category}
                    </span>
                  </TableCell>
                  <TableCell className="emp-mono text-right text-[var(--emp-foreground)]">
                    {formatValueUnit(row.actual, row.unit)}
                  </TableCell>
                  <TableCell className="emp-mono text-right text-[var(--emp-muted-foreground)]">
                    {formatValueUnit(row.consensus, row.unit)}
                  </TableCell>
                  <TableCell className="emp-mono text-right text-[var(--emp-muted-foreground)]">
                    {formatValueUnit(row.previous, row.unit)}
                  </TableCell>
                  <TableCell className={cn("emp-mono text-right", zScoreClass(row.zScore))}>
                    {formatZScore(row.zScore)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
