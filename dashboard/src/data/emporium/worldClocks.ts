/**
 * Ciudades para la fila de relojes mundiales del header institucional
 * (NUE, LON, FRA, PAR, TOK, ...). Cálculo de hora vía `Intl.DateTimeFormat`
 * en el componente `WorldClocks` — no requiere backend.
 */
export interface WorldClockCity {
  code: string
  /** Abreviatura de 3 letras para la UI compacta, ej. "NUE", "LON". */
  abbr: string
  city: string
  flag: string
  timeZone: string
}

export const WORLD_CLOCK_CITIES: WorldClockCity[] = [
  { code: "US", abbr: "NUE", city: "Nueva York", flag: "🇺🇸", timeZone: "America/New_York" },
  { code: "GB", abbr: "LON", city: "Londres", flag: "🇬🇧", timeZone: "Europe/London" },
  { code: "DE", abbr: "FRA", city: "Frankfurt", flag: "🇩🇪", timeZone: "Europe/Berlin" },
  { code: "FR", abbr: "PAR", city: "París", flag: "🇫🇷", timeZone: "Europe/Paris" },
  { code: "JP", abbr: "TOK", city: "Tokio", flag: "🇯🇵", timeZone: "Asia/Tokyo" },
  { code: "AU", abbr: "SYD", city: "Sídney", flag: "🇦🇺", timeZone: "Australia/Sydney" },
  { code: "CH", abbr: "ZUR", city: "Zúrich", flag: "🇨🇭", timeZone: "Europe/Zurich" },
  { code: "HK", abbr: "HKG", city: "Hong Kong", flag: "🇭🇰", timeZone: "Asia/Hong_Kong" },
]
