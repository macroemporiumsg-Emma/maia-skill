"use client"

/**
 * Módulo 1.1 — Selector de país compacto, alineado a la derecha, con badges
 * dinámicos multi-selección (mejora sobre el patrón simple de un solo botón
 * activo del repo de referencia). Sincroniza, vía `EmporiumFilterProvider`,
 * el resaltado de filas del Módulo 2 y el filtrado del heatmap del Módulo 3.
 */
import { EMPORIUM_COUNTRIES } from "@/data/emporium/countries"
import { useEmporiumFilter } from "@/components/emporium/EmporiumContext"
import { cn } from "@/lib/utils"

export function CountryFilter() {
  const { selectedCountries, toggleCountry, clearCountries, isSelected, isAll } = useEmporiumFilter()

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={clearCountries}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          isAll
            ? "border-[var(--emp-primary)] bg-[var(--emp-primary)]/15 text-[var(--emp-primary)]"
            : "border-[var(--emp-border-strong)] text-[var(--emp-muted-foreground)] hover:border-[var(--emp-primary)]/40 hover:text-[var(--emp-foreground)]"
        )}
      >
        🌍 Todos
      </button>

      {EMPORIUM_COUNTRIES.map((country) => {
        const active = isSelected(country.code)
        return (
          <button
            key={country.code}
            type="button"
            onClick={() => toggleCountry(country.code)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-[var(--emp-primary)] bg-[var(--emp-primary)]/15 text-[var(--emp-primary)]"
                : "border-[var(--emp-border-strong)] text-[var(--emp-muted-foreground)] hover:border-[var(--emp-primary)]/40 hover:text-[var(--emp-foreground)]"
            )}
            aria-pressed={active}
          >
            <span aria-hidden>{country.flag}</span>
            {country.code}
          </button>
        )
      })}

      {selectedCountries.length > 0 && (
        <span className="ml-1 text-[10px] text-[var(--emp-muted-foreground)]">
          {selectedCountries.length} seleccionado{selectedCountries.length > 1 ? "s" : ""}
        </span>
      )}
    </div>
  )
}
