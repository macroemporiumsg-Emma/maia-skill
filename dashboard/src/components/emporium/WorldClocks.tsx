"use client"

/**
 * Fila de relojes de las principales sesiones de mercado (NUE, LON, FRA,
 * PAR, TOK, ...). Cálculo 100% en cliente vía `Intl.DateTimeFormat`, sin
 * backend — según lo confirmado por el usuario ("punto 4" de su respuesta).
 */
import * as React from "react"
import { WORLD_CLOCK_CITIES, type WorldClockCity } from "@/data/emporium/worldClocks"
import { cn } from "@/lib/utils"

function formatTime(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now)
}

/** Aproximación simple de sesión abierta: horario local 09:00–17:00, L-V. */
function isMarketOpen(timeZone: string, now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now)

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? ""
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0"
  const hour = parseInt(hourStr, 10)

  const isWeekday = !["Sat", "Sun"].includes(weekday)
  return isWeekday && hour >= 9 && hour < 17
}

function ClockChip({ city, now }: { city: WorldClockCity; now: Date }) {
  const open = isMarketOpen(city.timeZone, now)
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--emp-border)] bg-[var(--emp-surface)]/60 px-2 py-1 text-[11px]"
      )}
      title={`${city.city} — sesión ${open ? "abierta" : "cerrada"}`}
    >
      <span aria-hidden>{city.flag}</span>
      <span className="font-semibold tracking-wide text-[var(--emp-muted-foreground)]">{city.abbr}</span>
      <span className="emp-mono text-[var(--emp-foreground)]">{formatTime(city.timeZone, now)}</span>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          open ? "bg-[var(--emp-success)] emp-pulse-dot" : "bg-[var(--emp-muted-foreground)]/40"
        )}
      />
    </div>
  )
}

export function WorldClocks({ className }: { className?: string }) {
  const [now, setNow] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Evita mismatch de hidratación: solo renderiza horas tras montar en cliente.
  if (!now) {
    return <div className={cn("h-[26px]", className)} aria-hidden />
  }

  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto", className)}>
      {WORLD_CLOCK_CITIES.map((city) => (
        <ClockChip key={city.code} city={city} now={now} />
      ))}
    </div>
  )
}
