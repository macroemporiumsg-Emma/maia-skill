/**
 * Proxy server-side hacia el endpoint `/search` del servicio Python
 * `market-agent-signals` (búsqueda de activos por nombre real, Yahoo
 * Finance Search API — sin API key).
 *
 * Resuelve el problema de UX de que el usuario tuviera que escribir el
 * ticker exacto (ej. "AAPL"): permite escribir "apple", "bitcoin",
 * "nvidia"... y el backend real resuelve los símbolos correspondientes.
 *
 * Mismo patrón CSP-safe que el resto de rutas /api/intraday-*.
 */
import { NextRequest, NextResponse } from "next/server"

const SIGNALS_BACKEND_URL =
  process.env.SIGNALS_BACKEND_URL ?? "http://127.0.0.1:9100"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") ?? ""
  const limit = searchParams.get("limit") ?? "8"

  if (!q.trim()) {
    return NextResponse.json({ query: q, resultados: [] })
  }

  const upstream = new URL(`${SIGNALS_BACKEND_URL}/search`)
  upstream.searchParams.set("q", q)
  upstream.searchParams.set("limit", limit)

  try {
    const res = await fetch(upstream.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Backend de búsqueda respondió ${res.status}: ${text}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `No se pudo contactar al backend de búsqueda: ${message}` },
      { status: 502 }
    )
  }
}
