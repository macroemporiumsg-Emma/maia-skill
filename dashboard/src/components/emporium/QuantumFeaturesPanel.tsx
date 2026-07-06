"use client"

/**
 * Módulo 2.4 — Quantum Mathematical Features: variables normalizadas listas
 * para inyección en modelos cuantitativos. Cada tarjeta muestra:
 *  - Mini traza tipo KDE (densidad) de la distribución del indicador.
 *  - Cálculo de desviación D_t vs ancla estructural (Moda/Media/Mediana).
 *  - Ponderación de volatilidad basada en ATR.
 *  - Percentil de severidad + función de enlace GLM (familia exponencial).
 *  - Mapeo de régimen de transición ALGONE ONE (+1 / 0 / -1).
 */
import { QUANTUM_FEATURES } from "@/data/emporium/mockData"
import { countryByCode } from "@/data/emporium/countries"
import { useEmporiumFilter, matchesCountryFilter } from "@/components/emporium/EmporiumContext"
import { KdeSparkline } from "@/components/emporium/KdeSparkline"
import { regimeColorClass, regimeLabel, formatSigned } from "@/lib/emporium/format"
import { cn } from "@/lib/utils"

const LINK_FUNCTION_COLOR: Record<string, string> = {
  Normal: "#38bdf8",
  Gamma: "#f59e0b",
  Beta: "#a78bfa",
  Poisson: "#22c55e",
}

export function QuantumFeaturesPanel() {
  const { selectedCountries } = useEmporiumFilter()
  const rows = matchesCountryFilter(QUANTUM_FEATURES, selectedCountries)

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((f) => {
        const country = countryByCode(f.countryCode)
        const color = LINK_FUNCTION_COLOR[f.linkFunction] ?? "#38bdf8"
        return (
          <div key={f.id} className="rounded-lg border border-[var(--emp-border)] bg-[var(--emp-surface)]/40 p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--emp-foreground)]">
                <span aria-hidden>{country?.flag}</span>
                {f.label}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", regimeColorClass(f.regime))}>
                {regimeLabel(f.regime)}
              </span>
            </div>

            <KdeSparkline values={f.kde} color={color} width={220} height={48} className="w-full" />

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[var(--emp-muted-foreground)]">Dₜ vs {f.anchorType}</span>
                <span className={cn("emp-mono font-semibold", f.deviation >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {formatSigned(f.deviation, 1)}σ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--emp-muted-foreground)]">Peso ATR</span>
                <span className="emp-mono font-semibold text-[var(--emp-foreground)]">{f.atrWeight.toFixed(2)}×</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--emp-muted-foreground)]">Percentil severidad</span>
                <span className="emp-mono font-semibold text-[var(--emp-foreground)]">{f.severityPercentile}º</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--emp-muted-foreground)]">Enlace GLM</span>
                <span className="emp-mono font-semibold" style={{ color }}>
                  {f.linkFunction}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
