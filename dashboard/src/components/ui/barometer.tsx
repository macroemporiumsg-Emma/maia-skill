"use client"

/**
 * Barómetro (gauge semicircular) de recomendación comprar/vender.
 *
 * Visualiza una puntuación real en el rango [-100, 100] (proveniente del
 * agente LLM causal o de la señal técnica) como una aguja sobre un arco
 * de 5 zonas: Venta fuerte, Venta, Neutral, Compra, Compra fuerte.
 *
 * Implementado en SVG puro (sin librerías de gráficos adicionales) para
 * mantener el bundle ligero y evitar problemas de hidratación con
 * componentes de terceros que dependen de medir el DOM (como ya se vio
 * con `recharts` en este mismo proyecto).
 */
import { cn } from "@/lib/utils"

interface BarometerProps {
  /** Puntuación en el rango -100 (vender fuerte) .. 100 (comprar fuerte). */
  puntuacion: number
  /** Etiqueta central, ej. "COMPRAR", "VENDER", "MANTENER". */
  etiqueta: string
  /** Texto secundario opcional bajo la etiqueta, ej. nivel de confianza. */
  subetiqueta?: string
  className?: string
  size?: number
}

const ZONAS = [
  { desde: -100, hasta: -60, color: "#dc2626" }, // venta fuerte
  { desde: -60, hasta: -20, color: "#f97316" }, // venta
  { desde: -20, hasta: 20, color: "#a1a1aa" }, // neutral
  { desde: 20, hasta: 60, color: "#84cc16" }, // compra
  { desde: 60, hasta: 100, color: "#16a34a" }, // compra fuerte
]

// Arco semicircular: de 180° (izquierda, -100) a 0° (derecha, +100).
function puntuacionAAngulo(puntuacion: number): number {
  const clamped = Math.max(-100, Math.min(100, puntuacion))
  const t = (clamped + 100) / 200 // 0..1
  return 180 - t * 180 // grados: 180 (izq) .. 0 (der)
}

function puntoEnArco(cx: number, cy: number, radio: number, anguloDeg: number) {
  const rad = (anguloDeg * Math.PI) / 180
  return {
    x: cx + radio * Math.cos(rad),
    y: cy - radio * Math.sin(rad),
  }
}

function describirArco(cx: number, cy: number, radio: number, anguloInicio: number, anguloFin: number) {
  const inicio = puntoEnArco(cx, cy, radio, anguloInicio)
  const fin = puntoEnArco(cx, cy, radio, anguloFin)
  const largo = anguloInicio - anguloFin > 180 ? 1 : 0
  return `M ${inicio.x} ${inicio.y} A ${radio} ${radio} 0 ${largo} 1 ${fin.x} ${fin.y}`
}

export function Barometer({ puntuacion, etiqueta, subetiqueta, className, size = 220 }: BarometerProps) {
  const cx = size / 2
  const cy = size / 2
  const radioArco = size * 0.42
  const grosorArco = size * 0.09

  const anguloAguja = puntuacionAAngulo(puntuacion)
  const puntaAguja = puntoEnArco(cx, cy, radioArco - grosorArco * 0.6, anguloAguja)

  const colorAguja =
    puntuacion >= 20 ? "#16a34a" : puntuacion <= -20 ? "#dc2626" : "#71717a"

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.58}`}>
        {ZONAS.map((zona) => {
          const anguloInicio = puntuacionAAngulo(zona.desde)
          const anguloFin = puntuacionAAngulo(zona.hasta)
          return (
            <path
              key={zona.color}
              d={describirArco(cx, cy, radioArco, anguloInicio, anguloFin)}
              fill="none"
              stroke={zona.color}
              strokeWidth={grosorArco}
              strokeLinecap="butt"
              opacity={0.85}
            />
          )
        })}

        {/* Aguja */}
        <line
          x1={cx}
          y1={cy}
          x2={puntaAguja.x}
          y2={puntaAguja.y}
          stroke={colorAguja}
          strokeWidth={size * 0.018}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={size * 0.03} fill={colorAguja} />

        {/* Etiquetas de extremos */}
        <text x={cx - radioArco - grosorArco * 0.2} y={cy + size * 0.06} fontSize={size * 0.045} fill="currentColor" opacity={0.55} textAnchor="start">
          VENDER
        </text>
        <text x={cx + radioArco + grosorArco * 0.2} y={cy + size * 0.06} fontSize={size * 0.045} fill="currentColor" opacity={0.55} textAnchor="end">
          COMPRAR
        </text>
      </svg>

      <div className="-mt-1 flex flex-col items-center">
        <span
          className="text-xl font-bold tracking-wide"
          style={{ color: colorAguja }}
        >
          {etiqueta.toUpperCase()}
        </span>
        <span className="font-mono text-sm text-muted-foreground">
          {puntuacion > 0 ? "+" : ""}
          {puntuacion.toFixed(1)}
        </span>
        {subetiqueta && (
          <span className="text-xs text-muted-foreground/70">{subetiqueta}</span>
        )}
      </div>
    </div>
  )
}
