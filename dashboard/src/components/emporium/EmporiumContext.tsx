"use client"

/**
 * Estado compartido de la sección Emporium: el selector de país del Módulo
 * 1.1 debe sincronizar, en el cliente y sin backend, tanto la matriz macro
 * del Módulo 2 (resaltando filas) como el heatmap cruzado del Módulo 3
 * (filtrando por región de origen). Ver confirmación del usuario: "estoy de
 * acuerdo con el punto 3" (sincronización vía estado de React en cliente).
 */
import * as React from "react"
import type { EmporiumCountryCode } from "@/types/emporium"

interface EmporiumFilterState {
  /** Vacío = "🌍 Todos". */
  selectedCountries: EmporiumCountryCode[]
  toggleCountry: (code: EmporiumCountryCode) => void
  clearCountries: () => void
  isSelected: (code: EmporiumCountryCode) => boolean
  /** true si no hay filtro activo (se muestran todos los países). */
  isAll: boolean
}

const EmporiumFilterContext = React.createContext<EmporiumFilterState | null>(null)

export function EmporiumFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedCountries, setSelectedCountries] = React.useState<EmporiumCountryCode[]>([])

  const toggleCountry = React.useCallback((code: EmporiumCountryCode) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }, [])

  const clearCountries = React.useCallback(() => setSelectedCountries([]), [])

  const isSelected = React.useCallback(
    (code: EmporiumCountryCode) => selectedCountries.includes(code),
    [selectedCountries]
  )

  const value = React.useMemo<EmporiumFilterState>(
    () => ({
      selectedCountries,
      toggleCountry,
      clearCountries,
      isSelected,
      isAll: selectedCountries.length === 0,
    }),
    [selectedCountries, toggleCountry, clearCountries, isSelected]
  )

  return <EmporiumFilterContext.Provider value={value}>{children}</EmporiumFilterContext.Provider>
}

export function useEmporiumFilter(): EmporiumFilterState {
  const ctx = React.useContext(EmporiumFilterContext)
  if (!ctx) {
    throw new Error("useEmporiumFilter debe usarse dentro de <EmporiumFilterProvider>")
  }
  return ctx
}

/**
 * Helper puro para filtrar cualquier colección por país, reutilizado por los
 * Módulos 2 y 3. `keyFn` extrae el código de país de cada item (por defecto
 * `item.countryCode`; el Módulo 3 lo usa con `item.sourceRegion`).
 */
export function matchesCountryFilter<T>(
  items: T[],
  selected: EmporiumCountryCode[],
  keyFn: (item: T) => EmporiumCountryCode = (item) => (item as { countryCode: EmporiumCountryCode }).countryCode
): T[] {
  if (selected.length === 0) return items
  return items.filter((item) => selected.includes(keyFn(item)))
}
