"use client"

/**
 * Módulo 2.3 — Indicadores monetarios / bancos centrales: tasas de
 * referencia, cambio de balance (Fed/BCE, QE/QT), gauge Hawk/Dove por banco.
 * Filtrado sincronizado con el Módulo 1.1.
 */
import { Landmark } from "lucide-react"
import { CENTRAL_BANK_INDICATORS } from "@/data/emporium/mockData"
import { countryByCode } from "@/data/emporium/countries"
import { useEmporiumFilter, matchesCountryFilter } from "@/components/emporium/EmporiumContext"
import { EmporiumGauge } from "@/components/emporium/EmporiumGauge"
import { biasColorClass, biasLabel, formatSigned } from "@/lib/emporium/format"
import { cn } from "@/lib/utils"

export function CentralBankPanel() {
  const { selectedCountries } = useEmporiumFilter()
  const rows = matchesCountryFilter(CENTRAL_BANK_INDICATORS, selectedCountries)

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((cb) => {
        const country = countryByCode(cb.countryCode)
        const rateChange = cb.referenceRate - cb.previousRate
        return (
          <div key={cb.id} className="rounded-lg border border-[var(--emp-border)] bg-[var(--emp-surface)]/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span aria-hidden>{country?.flag}</span>
                <span className="text-xs font-semibold text-[var(--emp-foreground)]">{cb.bank}</span>
              </div>
              <span className={cn("flex items-center gap-1 text-[11px] font-semibold", biasColorClass(cb.bias))}>
                <Landmark className="h-3 w-3" />
                {biasLabel(cb.bias)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <EmporiumGauge value={cb.biasScore} palette="hawkdove" size={92} showValue={false} />
              <div className="flex-1 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[var(--emp-muted-foreground)]">Tasa de referencia</span>
                  <span className="emp-mono font-semibold text-[var(--emp-foreground)]">{cb.referenceRate.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--emp-muted-foreground)]">Cambio último movimiento</span>
                  <span className={cn("emp-mono font-semibold", rateChange > 0 ? "text-rose-400" : rateChange < 0 ? "text-sky-400" : "text-[var(--emp-muted-foreground)]")}>
                    {formatSigned(rateChange, 2)}pp
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--emp-muted-foreground)]">Δ Balance</span>
                  <span className={cn("emp-mono font-semibold", cb.balanceSheetChangePct > 0 ? "text-rose-400" : "text-sky-400")}>
                    {formatSigned(cb.balanceSheetChangePct, 1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--emp-muted-foreground)]">Próxima reunión</span>
                  <span className="emp-mono text-[var(--emp-foreground)]">{cb.nextMeeting}</span>
                </div>
              </div>
            </div>

            <p className="mt-2 border-t border-[var(--emp-border)] pt-2 text-[11px] leading-relaxed text-[var(--emp-muted-foreground)]">
              {cb.lastStatement}
            </p>
          </div>
        )
      })}
    </div>
  )
}
