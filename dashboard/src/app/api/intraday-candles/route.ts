/**
 * Proxy server-side hacia el endpoint `/candles` del servicio Python
 * `market-agent-signals` (velas OHLCV reales de Yahoo Finance, con
 * EMA9/EMA21 precalculadas por vela para overlay de gráfico).
 *
 * Usado por `PriceChart.tsx` (lightweight-charts, la librería open-source
 * de TradingView) para renderizar un gráfico de velas real, estilo
 * TradingView/MetaTrader, en cada tarjeta de análisis de /intraday.
 *
 * Mismo patrón CSP-safe que el resto de rutas /api/intraday-*.
 */
import { NextRequest, NextResponse } from "next/server"

const SIGNALS_BACKEND_URL =
  process.env.SIGNALS_BACKEND_URL ?? "http://127.0.0.1:9100"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")
  const interval = searchParams.get("interval") ?? "5m"
  const range = searchParams.get("range") ?? "1d"

  if (!symbol) {
    return NextResponse.json(
      { error: "Falta el parámetro 'symbol'" },
      { status: 400 }
    )
  }

  const upstream = new URL(`${SIGNALS_BACKEND_URL}/candles`)
  upstream.searchParams.set("symbol", symbol)
  upstream.searchParams.set("interval", interval)
  upstream.searchParams.set("range", range)

  try {
    const res = await fetch(upstream.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Backend de velas respondió ${res.status}: ${text}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        error: `No se pudo contactar al backend de velas en ${SIGNALS_BACKEND_URL}: ${message}`,
        hint: "¿Está corriendo 'uvicorn market_agents.server:app --port 9100'?",
      },
      { status: 502 }
    )
  }
}
