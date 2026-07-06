import type { EmporiumCountry } from "@/types/emporium"

/**
 * Universo de países soportado por el selector del Módulo 1.1. Alineado con
 * el conjunto G8 + China usado en los paneles macro/cambiarios de Emporium.
 */
export const EMPORIUM_COUNTRIES: EmporiumCountry[] = [
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", currency: "USD" },
  { code: "EU", name: "Eurozona", flag: "🇪🇺", currency: "EUR" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", currency: "GBP" },
  { code: "JP", name: "Japón", flag: "🇯🇵", currency: "JPY" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", currency: "CAD" },
  { code: "CH", name: "Suiza", flag: "🇨🇭", currency: "CHF" },
  { code: "NZ", name: "Nueva Zelanda", flag: "🇳🇿", currency: "NZD" },
  { code: "CN", name: "China", flag: "🇨🇳", currency: "CNY" },
]

export function countryByCode(code: string) {
  return EMPORIUM_COUNTRIES.find((c) => c.code === code)
}
