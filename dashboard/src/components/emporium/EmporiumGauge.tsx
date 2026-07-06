"use client"

/**
 * Barómetro semicircular genérico de Emporium: mismo patrón SVG que
 * `@/components/ui/barometer.tsx` (arco 180°→0°, aguja, sin librerías de
 * gráficos), parametrizado por paleta de color para servir tanto al
 * sentimiento cualitativo (Módulo 1.3, bearish/neutral/bullish) como a la
 * clasificación Hawk/Dove de bancos centrales (Módulo 2.3).
 */
import { cn } from "@/lib/utils"

export type GaugePalette = "sentiment" | "hawkdove"

interface EmporiumGaugeProps {
  /** Puntuación en el rango -100 .. 100. */
  value: number
  palette?: GaugePalette
  label?: string
  size?: number
  showValue?: boolean
  className?: string
}

const PALETTES: Record<GaugePalette, { left: string; mid: string; right: string; leftLabel: string; rightLabel: string }> = {
  sentiment: {
    left: "#f43f5e", // bearish
    mid: "#f59e0b", // neutral
    right: "#22c55e", // bullish
    leftLabel: "BEARISH",
    rightLabel: "BULLISH",
  },
  hawkdove: {
    left: "#38bdf8", // dovish
    mid: "#f59e0b", // neutral
    right: "#f43f5e", // hawkish
    leftLabel: "DOVISH",
    rightLabel: "HAWKISH",
  },
}

function scoreToAngle(score: number): number {
  const clamped = Math.max(-100, Math.min(100, score))
  const t = (clamped + 100) / 200
  return 180 - t * 180
}

function pointOnArc(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) }
}

export function EmporiumGauge({
  value,
  palette = "sentiment",
  label,
  size = 120,
  showValue = true,
  className,
}: EmporiumGaugeProps) {
  const colors = PALETTES[palette]
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.4
  const stroke = size * 0.11

  const needleAngle = scoreToAngle(value)
  const needleTip = pointOnArc(cx, cy, radius - stroke * 0.5, needleAngle)
  const needleTail = pointOnArc(cx, cy, size * 0.05, needleAngle + 180)

  const uid = `emp-gauge-${palette}-${Math.round((value + 100) * 13)}`

  const arcStart = pointOnArc(cx, cy, radius, 180)
  const arcEnd = pointOnArc(cx, cy, radius, 0)
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`

  const needleColor = value >= 20 ? colors.right : value <= -20 ? colors.left : colors.mid

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.58}`}>
        <defs>
          <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.left} />
            <stop offset="50%" stopColor={colors.mid} />
            <stop offset="100%" stopColor={colors.right} />
          </linearGradient>
        </defs>

        <path d={arcPath} fill="none" stroke={uid ? `url(#${uid})` : colors.mid} strokeWidth={stroke} strokeLinecap="round" opacity={0.92} />

        {/* Marcas de referencia. */}
        {[-100, -50, 0, 50, 100].map((tick) => {
          const angle = scoreToAngle(tick)
          const inner = pointOnArc(cx, cy, radius - stroke * 0.75, angle)
          const outer = pointOnArc(cx, cy, radius + stroke * 0.2, angle)
          return (
            <line
              key={tick}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(148,163,184,0.35)"
              strokeWidth={1.5}
            />
          )
        })}

        <line
          x1={needleTail.x}
          y1={needleTail.y}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={needleColor}
          strokeWidth={size * 0.022}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={size * 0.045} fill="#0a0f1a" stroke={needleColor} strokeWidth={size * 0.016} />

        <text x={cx - radius - stroke * 0.1} y={cy + size * 0.09} fontSize={size * 0.055} fontWeight={700} fill="rgba(148,163,184,0.55)" textAnchor="start" letterSpacing="0.04em">
          {colors.leftLabel}
        </text>
        <text x={cx + radius + stroke * 0.1} y={cy + size * 0.09} fontSize={size * 0.055} fontWeight={700} fill="rgba(148,163,184,0.55)" textAnchor="end" letterSpacing="0.04em">
          {colors.rightLabel}
        </text>
      </svg>

      {(showValue || label) && (
        <div className="-mt-1 flex flex-col items-center">
          {showValue && (
            <span className="emp-mono text-lg font-bold" style={{ color: needleColor }}>
              {value > 0 ? "+" : ""}
              {value.toFixed(0)}
            </span>
          )}
          {label && <span className="text-[10px] uppercase tracking-wide text-[var(--emp-muted-foreground)]">{label}</span>}
        </div>
      )}
    </div>
  )
}
