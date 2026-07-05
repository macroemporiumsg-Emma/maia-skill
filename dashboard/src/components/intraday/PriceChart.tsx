"use client"

/**
 * Gráfico de velas REAL estilo TradingView/MetaTrader, usando
 * `lightweight-charts` (la librería open-source oficial de TradingView).
 *
 * Consume /api/intraday-candles (proxy a market_agents /candles), que
 * devuelve velas OHLCV reales de Yahoo Finance + EMA9/EMA21 precalculadas
 * por vela para overlay, más volumen como histograma inferior.
 *
 * Diseñado para vivir dentro de cada `AnalysisCard` de /intraday: candles
 * + EMA9/EMA21 + volumen + selector de timeframe (interval/range), todo
 * en un canvas ligero (sin problemas de medición de DOM como recharts).
 */
import { useEffect, useRef, useState, useCallback } from "react"
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts"
import { Loader2, ShieldAlert, BarChart3, TrendingUp, TrendingDown } from "lucide-react"

interface VelaApi {
  tiempo: number
  apertura: number
  maximo: number
  minimo: number
  cierre: number
  volumen: number
  ema9: number | null
  ema21: number | null
}

interface CandlesResponse {
  simbolo: string
  intervalo: string
  rango_solicitado: string
  rango_usado: string
  moneda: string | null
  bolsa: string | null
  precio_mercado_regular: number | null
  maximo_52_semanas: number | null
  minimo_52_semanas: number | null
  velas: VelaApi[]
  generado_en_utc: string
  error?: string
  hint?: string
}

export interface TimeframeOpcion {
  etiqueta: string
  interval: string
  range: string
}

export const TIMEFRAMES: TimeframeOpcion[] = [
  { etiqueta: "1D", interval: "5m", range: "1d" },
  { etiqueta: "5D", interval: "15m", range: "5d" },
  { etiqueta: "1M", interval: "1h", range: "1mo" },
  { etiqueta: "6M", interval: "1d", range: "6mo" },
]

interface PriceChartProps {
  simbolo: string
  className?: string
  height?: number
}

export function PriceChart({ simbolo, className, height = 260 }: PriceChartProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const velasSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const volumenSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)

  const [timeframe, setTimeframe] = useState<TimeframeOpcion>(TIMEFRAMES[0])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<CandlesResponse | null>(null)
  const [variacionPct, setVariacionPct] = useState<number | null>(null)

  // --- Inicialización del chart (una sola vez por montaje) ---
  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!contenedor) return

    const chart = createChart(contenedor, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(120, 120, 118, 0.9)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(120, 120, 118, 0.08)" },
        horzLines: { color: "rgba(120, 120, 118, 0.08)" },
      },
      rightPriceScale: { borderColor: "rgba(120, 120, 118, 0.15)" },
      timeScale: {
        borderColor: "rgba(120, 120, 118, 0.15)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
      height,
    })
    chartRef.current = chart

    const velasSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })
    velasSeriesRef.current = velasSeries

    const volumenSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    })
    volumenSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })
    volumenSeriesRef.current = volumenSeries

    const ema9Series = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    ema9SeriesRef.current = ema9Series

    const ema21Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    ema21SeriesRef.current = ema21Series

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    resizeObserver.observe(contenedor)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

  // --- Carga de datos (símbolo o timeframe cambiado) ---
  const cargar = useCallback(() => {
    setCargando(true)
    setError(null)
    fetch(
      `/api/intraday-candles?symbol=${encodeURIComponent(simbolo)}&interval=${timeframe.interval}&range=${timeframe.range}`,
      { cache: "no-store" }
    )
      .then((res) => res.json())
      .then((data: CandlesResponse) => {
        if (data.error) {
          setError(`${data.error}${data.hint ? " — " + data.hint : ""}`)
          return
        }
        setMeta(data)

        const velasChart = data.velas.map((v) => ({
          time: v.tiempo as UTCTimestamp,
          open: v.apertura,
          high: v.maximo,
          low: v.minimo,
          close: v.cierre,
        }))
        const volumenChart = data.velas.map((v) => ({
          time: v.tiempo as UTCTimestamp,
          value: v.volumen,
          color: v.cierre >= v.apertura ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)",
        }))
        const ema9Chart = data.velas
          .filter((v) => v.ema9 !== null)
          .map((v) => ({ time: v.tiempo as UTCTimestamp, value: v.ema9 as number }))
        const ema21Chart = data.velas
          .filter((v) => v.ema21 !== null)
          .map((v) => ({ time: v.tiempo as UTCTimestamp, value: v.ema21 as number }))

        velasSeriesRef.current?.setData(velasChart)
        volumenSeriesRef.current?.setData(volumenChart)
        ema9SeriesRef.current?.setData(ema9Chart)
        ema21SeriesRef.current?.setData(ema21Chart)
        chartRef.current?.timeScale().fitContent()

        if (data.velas.length >= 2) {
          const primera = data.velas[0].apertura
          const ultima = data.velas[data.velas.length - 1].cierre
          setVariacionPct(primera !== 0 ? ((ultima - primera) / primera) * 100 : null)
        } else {
          setVariacionPct(null)
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setCargando(false))
  }, [simbolo, timeframe])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="size-3.5" />
          Gráfico de precio
          {variacionPct !== null && (
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal ${
                variacionPct >= 0
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
              title={`Variación del precio en el rango ${timeframe.etiqueta} mostrado`}
            >
              {variacionPct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {variacionPct >= 0 ? "+" : ""}
              {variacionPct.toFixed(2)}%
            </span>
          )}
          {meta?.rango_usado && meta.rango_usado !== meta.rango_solicitado && (
            <span
              className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-amber-700 dark:text-amber-400"
              title={`Se pidió rango ${meta.rango_solicitado} pero se amplió automáticamente a ${meta.rango_usado} por datos insuficientes`}
            >
              rango ampliado a {meta.rango_usado}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.etiqueta}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                tf.etiqueta === timeframe.etiqueta
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tf.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-lg border border-border/60 bg-muted/10">
        {cargando && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error ? (
          <div className="flex items-center gap-2 p-4 text-xs text-destructive">
            <ShieldAlert className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div ref={contenedorRef} style={{ height }} />
        )}
      </div>

      {meta && !error && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/70">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-2.5 rounded-full bg-[#3b82f6]" /> EMA9
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-2.5 rounded-full bg-[#f59e0b]" /> EMA21
          </span>
          {meta.bolsa && <span>{meta.bolsa}</span>}
        </div>
      )}

      {meta && !error && meta.maximo_52_semanas != null && meta.minimo_52_semanas != null && meta.precio_mercado_regular != null && (
        <RangoAnual
          minimo={meta.minimo_52_semanas}
          maximo={meta.maximo_52_semanas}
          actual={meta.precio_mercado_regular}
        />
      )}
    </div>
  )
}

/**
 * Barra visual del rango de 52 semanas (mínimo/actual/máximo), un
 * elemento clásico de plataformas de trading (Yahoo Finance, Bloomberg)
 * que da contexto inmediato de dónde está el precio actual respecto a
 * su rango anual — sin necesitar leer números.
 */
function RangoAnual({ minimo, maximo, actual }: { minimo: number; maximo: number; actual: number }) {
  const rango = maximo - minimo
  const posicionPct = rango > 0 ? Math.min(100, Math.max(0, ((actual - minimo) / rango) * 100)) : 50

  return (
    <div className="mt-2 rounded-md bg-muted/30 px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span>Mín. 52 sem: {minimo.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        <span className="text-foreground/70">Rango 52 semanas</span>
        <span>Máx. 52 sem: {maximo.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-red-400/40 via-amber-300/40 to-emerald-400/40">
        <div
          className="absolute top-1/2 size-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background bg-foreground shadow"
          style={{ left: `${posicionPct}%` }}
          title={`Precio actual: ${actual.toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
        />
      </div>
    </div>
  )
}
