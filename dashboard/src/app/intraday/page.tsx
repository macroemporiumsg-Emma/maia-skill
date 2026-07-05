"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Barometer } from "@/components/ui/barometer"

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

interface AnalisisCausal {
  simbolo: string
  veredicto: "comprar" | "vender" | "mantener"
  puntuacion: number
  confianza: "alta" | "media" | "baja"
  razonamiento_causal: string
  factores_clave: string[]
  riesgos: string[]
  modelo_usado: string
  generado_en_utc: string
  advertencia: string
}

interface AnalisisCompleto {
  simbolo: string
  señal_tecnica: SeñalData
  analisis_causal: AnalisisCausal
  fuentes_disponibles: {
    yahoo_finance_precios: boolean
    fred_macro: boolean
    yahoo_finance_noticias: boolean
    coingecko_cripto: boolean
  }
  generado_en_utc: string
}

interface ResultadoItem {
  ok: boolean
  symbol?: string
  error?: string
  data?: AnalisisCompleto
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
  comprar: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  bajista: "bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30",
  vender: "bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30",
  neutral: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-500/30",
  mantener: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-500/30",
}

const VEREDICTO_FLECHA: Record<string, string> = {
  alcista: "▲",
  comprar: "▲",
  bajista: "▼",
  vender: "▼",
  neutral: "▬",
  mantener: "▬",
}

const FUENTE_ETIQUETA: Record<string, string> = {
  yahoo_finance_precios: "Precios (Yahoo Finance)",
  fred_macro: "Macro (FRED)",
  yahoo_finance_noticias: "Noticias (Yahoo Finance)",
  coingecko_cripto: "Cripto (CoinGecko)",
}

function FuentesBadges({ fuentes }: { fuentes: AnalisisCompleto["fuentes_disponibles"] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(fuentes).map(([clave, disponible]) => (
        <span
          key={clave}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            disponible
              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
              : "bg-muted text-muted-foreground/50 line-through"
          }`}
          title={disponible ? "Fuente real consultada con éxito" : "Fuente no disponible en esta consulta"}
        >
          {FUENTE_ETIQUETA[clave] ?? clave}
        </span>
      ))}
    </div>
  )
}

function AnalysisCard({ item }: { item: ResultadoItem }) {
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
  const tecnica = d.señal_tecnica
  const causal = d.analisis_causal

  const estiloTecnico = VEREDICTO_ESTILO[tecnica.veredicto] ?? VEREDICTO_ESTILO.neutral
  const flechaTecnica = VEREDICTO_FLECHA[tecnica.veredicto] ?? "▬"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-lg">{d.simbolo}</CardTitle>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${estiloTecnico}`}>
            {flechaTecnica} TÉCNICO: {tecnica.veredicto.toUpperCase()}
          </span>
        </div>
        <CardDescription>
          Precio actual: <span className="font-mono">{tecnica.indicadores.precio_actual}</span>
          {"  ·  "}Modelo: <span className="font-mono">{causal.modelo_usado}</span>
        </CardDescription>
        <div className="pt-1">
          <FuentesBadges fuentes={d.fuentes_disponibles} />
        </div>
      </CardHeader>
      <CardContent>
        {/* --- Barómetro del veredicto del agente LLM causal --- */}
        <div className="mb-4 flex flex-col items-center rounded-lg border bg-muted/30 py-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recomendación del agente causal (LLM)
          </p>
          <Barometer
            puntuacion={causal.puntuacion}
            etiqueta={causal.veredicto}
            subetiqueta={`Confianza: ${causal.confianza}`}
          />
        </div>

        {/* --- Razonamiento causal del LLM --- */}
        <div className="mb-4 rounded-md border-l-2 border-primary/40 bg-primary/5 px-3 py-2">
          <p className="mb-1 text-xs font-semibold text-primary/80">Razonamiento causal</p>
          <p className="text-sm text-foreground/90">{causal.razonamiento_causal}</p>
        </div>

        {(causal.factores_clave.length > 0 || causal.riesgos.length > 0) && (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {causal.factores_clave.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Factores clave
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {causal.factores_clave.map((f, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span>·</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {causal.riesgos.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-amber-600 dark:text-amber-400">Riesgos</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {causal.riesgos.map((r, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span>·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* --- Detalle técnico (heurística EMA/RSI/MACD) --- */}
        <details className="rounded-md border">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
            Ver detalle técnico (EMA/RSI/MACD) · Puntuación: {tecnica.puntuacion} · Confianza:{" "}
            {tecnica.confianza}
          </summary>
          <div className="border-t px-3 py-2">
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <IndicadorMini nombre="EMA9" valor={tecnica.indicadores.ema9} />
              <IndicadorMini nombre="EMA21" valor={tecnica.indicadores.ema21} />
              <IndicadorMini nombre="RSI14" valor={tecnica.indicadores.rsi14} />
              <IndicadorMini nombre="ATR14" valor={tecnica.indicadores.atr14} />
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {tecnica.razones.map((razon, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-foreground/40">•</span>
                  <span>{razon}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <p className="mt-3 border-t pt-2 text-[11px] leading-snug text-muted-foreground/70">
          {causal.advertencia}
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
    fetch(`/api/intraday-analysis?symbols=${encodeURIComponent(simbolosConsulta)}&interval=5m&range=1d`, {
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
    // Auto-refresco cada 3 minutos — el análisis LLM causal es más
    // costoso (llamada real a gpt-5 por símbolo) que la señal técnica
    // pura, así que se refresca con menor frecuencia.
    const id = setInterval(() => cargar(simbolos), 180_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Señales Intradía en Vivo + Agente Causal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos reales de Yahoo Finance (precios), FRED (macro), Yahoo Finance News (noticias)
          y CoinGecko (cripto) · Indicadores EMA9/EMA21, RSI14 y MACD calculados en tiempo real
          · Recomendación comprar/vender sintetizada por un agente LLM (gpt-5) que razona
          causalmente sobre todas las fuentes · Sin datos de demostración.
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
          disabled={cargando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {cargando ? "Analizando con LLM…" : "Actualizar"}
        </button>
      </form>

      {cargando && !respuesta && (
        <p className="text-sm text-muted-foreground">
          Consultando datos reales de mercado y generando análisis causal con LLM (puede tardar
          unos segundos por símbolo)…
        </p>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {respuesta?.resultados && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {respuesta.resultados.map((item, i) => (
            <AnalysisCard key={item.symbol ?? item.data?.simbolo ?? i} item={item} />
          ))}
        </div>
      )}
    </main>
  )
}
