/**
 * Proxy server-side hacia el endpoint `/analyses` del servicio Python
 * `market-agent-signals` (market_agents/server.py, puerto 9100 en local).
 *
 * `/analyses` combina, para cada símbolo:
 *   - la señal técnica real (EMA/RSI/MACD sobre velas de Yahoo Finance),
 *   - contexto macro real (FRED: tasas, curva de rendimientos, VIX),
 *   - noticias reales (Yahoo Finance News RSS),
 *   - datos cripto reales si aplica (CoinGecko),
 * y llama a un agente LLM causal (gpt-5 vía proxy GenSpark) que produce
 * una recomendación comprar/vender/mantener con puntuación (-100..100)
 * para el barómetro y un razonamiento causal explícito.
 *
 * Mismo patrón de proxy que `intraday-signals/route.ts`: el navegador
 * solo llama a esta ruta de mismo origen (respetando la CSP), y es el
 * servidor Next.js quien habla con el servicio Python.
 */
import { NextRequest, NextResponse } from "next/server"

const SIGNALS_BACKEND_URL =
  process.env.SIGNALS_BACKEND_URL ?? "http://127.0.0.1:9100"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get("symbols") ?? "AAPL,BTC-USD,EURUSD=X,^GSPC"
  const interval = searchParams.get("interval") ?? "5m"
  const range = searchParams.get("range") ?? "1d"

  const upstream = new URL(`${SIGNALS_BACKEND_URL}/analyses`)
  upstream.searchParams.set("symbols", symbols)
  upstream.searchParams.set("interval", interval)
  upstream.searchParams.set("range", range)

  try {
    // El análisis causal LLM tarda más que la señal técnica pura
    // (llamada real a gpt-5 por símbolo) — timeout más generoso.
    const res = await fetch(upstream.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Backend de análisis respondió ${res.status}: ${text}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        error: `No se pudo contactar al backend de análisis en ${SIGNALS_BACKEND_URL}: ${message}`,
        hint: "¿Está corriendo 'uvicorn market_agents.server:app --port 9100'?",
      },
      { status: 502 }
    )
  }
}
