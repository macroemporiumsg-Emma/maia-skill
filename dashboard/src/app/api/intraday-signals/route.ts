/**
 * Proxy server-side hacia el servicio Python `market-agent-signals`
 * (market_agents/server.py, puerto 9100 en local).
 *
 * Este proxy existe por dos razones:
 * 1. La CSP del dashboard restringe `connect-src` a 'self'; en vez de
 *    abrir la CSP a un puerto externo, el navegador solo llama a esta
 *    ruta de mismo origen, y es el servidor Next.js (no el navegador)
 *    quien habla con el servicio Python.
 * 2. Permite cambiar la URL del backend de señales (env var) sin tocar
 *    el cliente.
 *
 * El backend real (market_agents/server.py) consulta datos REALES de
 * Yahoo Finance (sin API key) y calcula EMA/RSI/MACD reales — este
 * endpoint NO genera ni simula ningún dato, solo reenvía la respuesta.
 */
import { NextRequest, NextResponse } from "next/server"

const SIGNALS_BACKEND_URL =
  process.env.SIGNALS_BACKEND_URL ?? "http://127.0.0.1:9100"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get("symbols") ?? "AAPL,BTC-USD,EURUSD=X,^GSPC"
  const interval = searchParams.get("interval") ?? "5m"
  const range = searchParams.get("range") ?? "1d"

  const upstream = new URL(`${SIGNALS_BACKEND_URL}/signals`)
  upstream.searchParams.set("symbols", symbols)
  upstream.searchParams.set("interval", interval)
  upstream.searchParams.set("range", range)

  try {
    const res = await fetch(upstream.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Backend de señales respondió ${res.status}: ${text}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        error: `No se pudo contactar al backend de señales en ${SIGNALS_BACKEND_URL}: ${message}`,
        hint: "¿Está corriendo 'uvicorn market_agents.server:app --port 9100'?",
      },
      { status: 502 }
    )
  }
}
