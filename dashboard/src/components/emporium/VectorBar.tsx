"use client"

/**
 * Barra vectorial bidireccional compartida: un track oscuro con línea central
 * de referencia (cero/neutral) y un marcador tipo píldora que flota en la
 * posición correspondiente al valor (-100..100). Valores cercanos a cero se
 * representan con una línea fina cian en vez de la píldora de color, igual
 * que en "Vectores cualitativos por categoría" (Sub-módulo 1.3).
 *
 * Reutilizado tanto por las Señales Cualitativas como por los Indicadores
 * Cuantitativos para mantener una única línea de diseño consistente.
 */
import { cn } from "@/lib/utils"

interface VectorBarProps {
  /** Valor en el rango -100..100; 0 = centro (neutral/referencia). */
  value: number
  /** Clase Tailwind de color de fondo para la píldora (ej. "bg-emerald-400"). Si se omite, se infiere del signo. */
  colorClass?: string
  /** Umbral absoluto por debajo del cual se muestra la línea fina cian en vez de la píldora de color. */
  thinThreshold?: number
  className?: string
}

export function VectorBar({ value, colorClass, thinThreshold = 5, className }: VectorBarProps) {
  const clamped = Math.max(-100, Math.min(100, value))
  const isThin = Math.abs(clamped) < thinThreshold
  // Deja margen a los costados para que la píldora nunca quede cortada en los extremos.
  const positionPct = 50 + (clamped / 100) * 42
  const markerColor = isThin ? "bg-sky-400" : (colorClass ?? (clamped >= 0 ? "bg-emerald-400" : "bg-rose-400"))

  return (
    <div className={cn("relative h-1.5 flex-1 rounded-full bg-[var(--emp-secondary)]", className)}>
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--emp-border-strong)]" />
      <div
        className={cn(
          "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left]",
          isThin ? "h-2.5 w-0.5" : "h-2.5 w-2",
          markerColor
        )}
        style={{ left: `${positionPct}%` }}
      />
    </div>
  )
}
