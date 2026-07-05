"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SeñalIndicadores {
  ema9: number
  ema21: number
  rsi14: number
  macd_linea: number
  macd_señal: number
  macd_histograma: number
  atr14: number
  precio_actual: number
  cruce_ema: string
  velas_usadas: number
}

interface SeñalData {
  simbolo: string
  veredicto: "alcista" | "bajista" | "neutral"
  puntuacion: number
  confianza: "alta" | "media" | "baja"
  razones: string[]
  indicadores: SeñalIndicadores
  advertencia: string
}

interface ResultadoItem {
  ok: boolean
  symbol?: string
  error?: string
  data?: SeñalData
}

interface ApiResponse {
  generado_en_utc?: string
  resultados?: ResultadoItem[]
  error?: string
  hint?: string
}

const SIMBOLOS_DEFAULT = "AAPL,BTC-USD,EURUSD=X,^GSPC,NVDA"

const VEREDICTO_ESTILO: Record<string, string> = {
  alcista: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  bajista: "bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30",
  neutral: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-500/30",
}

const VEREDICTO_FLECHA: Record<string, string> = {
  alcista: "▲",
  bajista: "▼",
  neutral: "▬",
}

function SignalCard({ item }: { item: ResultadoItem }) {
  if (!item.ok || !item.data) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-mono">{item.symbol ?? "?"}</CardTitle>
          <CardDescription className="text-destructive">{item.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const d = item.data
  const estilo = VEREDICTO_ESTILO[d.veredicto] ?? VEREDICTO_ESTILO.neutral
  const flecha = VEREDICTO_FLECHA[d.veredicto] ?? "▬"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-lg">{d.simbolo}</CardTitle>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${estilo}`}>
            {flecha} {d.veredicto.toUpperCase()}
          </span>
        </div>
        <CardDescription>
          Precio actual: <span className="font-mono">{d.indicadores.precio_actual}</span>
          {"  ·  "}Puntuación: <span className="font-mono">{d.puntuacion}</span>
          {"  ·  "}Confianza:{" "}
          <Badge variant={d.confianza === "alta" ? "default" : d.confianza === "media" ? "secondary" : "outline"}>
            {d.confianza}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <IndicadorMini nombre="EMA9" valor={d.indicadores.ema9} />
          <IndicadorMini nombre="EMA21" valor={d.indicadores.ema21} />
          <IndicadorMini nombre="RSI14" valor={d.indicadores.rsi14} />
          <IndicadorMini nombre="ATR14" valor={d.indicadores.atr14} />
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {d.razones.map((razon, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-foreground/40">•</span>
              <span>{razon}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t pt-2 text-[11px] leading-snug text-muted-foreground/70">
          {d.advertencia}
        </p>
      </CardContent>
    </Card>
  )
}

function IndicadorMini({ nombre, valor }: { nombre: string; valor: number }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
      <div className="text-muted-foreground">{nombre}</div>
      <div className="font-mono font-medium">{valor}</div>
    </div>
  )
}

export default function IntradayPage() {
  const [respuesta, setRespuesta] = useState<ApiResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [simbolos, setSimbolos] = useState(SIMBOLOS_DEFAULT)

  const cargar = useCallback((simbolosConsulta: string) => {
    setCargando(true)
    setError(null)
    fetch(`/api/intraday-signals?symbols=${encodeURIComponent(simbolosConsulta)}&interval=5m&range=1d`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        if (data.error) {
          setError(`${data.error}${data.hint ? " — " + data.hint : ""}`)
        } else {
          setRespuesta(data)
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    cargar(simbolos)
    // Auto-refresco cada 60s — velas de 5m no cambian más rápido que eso.
    const id = setInterval(() => cargar(simbolos), 60_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Señales Intradía en Vivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos reales de Yahoo Finance (velas de 5 minutos) · Indicadores EMA9/EMA21, RSI14
          y MACD calculados en tiempo real · Sin datos de demostración.
        </p>
        {respuesta?.generado_en_utc && (
          <p className="mt-1 text-xs text-muted-foreground/70">
            Última actualización: {new Date(respuesta.generado_en_utc).toLocaleString()}
          </p>
        )}
      </header>

      <form
        className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault()
          cargar(simbolos)
        }}
      >
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:max-w-md"
          value={simbolos}
          onChange={(e) => setSimbolos(e.target.value)}
          placeholder="AAPL,BTC-USD,EURUSD=X"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Actualizar
        </button>
      </form>

      {cargando && !respuesta && (
        <p className="text-sm text-muted-foreground">Consultando datos reales de mercado…</p>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {respuesta?.resultados && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {respuesta.resultados.map((item, i) => (
            <SignalCard key={item.symbol ?? item.data?.simbolo ?? i} item={item} />
          ))}
        </div>
      )}
    </main>
  )
}
