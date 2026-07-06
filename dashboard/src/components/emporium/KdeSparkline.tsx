"use client"

/**
 * Mini gráfico de densidad (traza tipo KDE) en SVG puro para el Módulo 2.4
 * (Quantum Mathematical Features). Deliberadamente no usa `recharts` para
 * mantener estos widgets livianos dado el alto número de instancias que se
 * renderizan simultáneamente en la grilla de features.
 */
interface KdeSparklineProps {
  values: number[]
  color: string
  width?: number
  height?: number
  className?: string
}

export function KdeSparkline({ values, color, width = 140, height = 44, className }: KdeSparklineProps) {
  if (values.length < 2) return null

  const max = Math.max(...values, 0.001)
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - (v / max) * (height - 4) - 2
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  const uid = `kde-${color.replace("#", "")}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${uid})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
