"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Clock,
  ChevronDown,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Barometer } from "@/components/ui/barometer"
import { SymbolSearch, type SimboloSeleccionado } from "@/components/intraday/SymbolSearch"
import { PriceChart } from "@/components/intraday/PriceChart"

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

const SELECCION_DEFECTO: SimboloSeleccionado[] = [
  { simbolo: "AAPL", nombre: "Apple Inc.", tipo: "EQUITY" },
  { simbolo: "BTC-USD", nombre: "Bitcoin USD", tipo: "CRYPTOCURRENCY" },
  { simbolo: "EURUSD=X", nombre: "EUR/USD", tipo: "CURRENCY" },
  { simbolo: "^GSPC", nombre: "S&P 500", tipo: "INDEX" },
  { simbolo: "NVDA", nombre: "NVIDIA Corporation", tipo: "EQUITY" },
]

const REFRESCO_MS = 180_000 // 3 min — el análisis LLM es costoso por símbolo

const VEREDICTO_TECNICO_ESTILO: Record<string, { text: string; bg: string; ring: string; icon: typeof TrendingUp }> = {
  alcista: { text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/25", icon: TrendingUp },
  bajista: { text: "text-red-700 dark:text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/25", icon: TrendingDown },
  neutral: { text: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-500/10", ring: "ring-zinc-500/20", icon: Minus },
}

const VEREDICTO_CAUSAL_ESTILO: Record<string, { text: string; bg: string; ring: string }> = {
  comprar: { text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/25" },
  vender: { text: "text-red-700 dark:text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/25" },
  mantener: { text: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-500/10", ring: "ring-zinc-500/20" },
}

const CONFIANZA_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  alta: "default",
  media: "secondary",
  baja: "outline",
}

const FUENTE_ETIQUETA: Record<string, string> = {
  yahoo_finance_precios: "Precios · Yahoo Finance",
  fred_macro: "Macro · FRED",
  yahoo_finance_noticias: "Noticias · Yahoo Finance",
  coingecko_cripto: "Cripto · CoinGecko",
}

function FuentesBadges({ fuentes }: { fuentes: AnalisisCompleto["fuentes_disponibles"] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(fuentes).map(([clave, disponible]) => (
        <span
          key={clave}
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
            disponible
              ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
              : "bg-muted text-muted-foreground/40"
          }`}
          title={disponible ? "Fuente real consultada con éxito" : "No disponible en esta consulta"}
        >
          <span className={`size-1.5 rounded-full ${disponible ? "bg-sky-500" : "bg-muted-foreground/30"}`} />
          {FUENTE_ETIQUETA[clave] ?? clave}
        </span>
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 rounded bg-muted" />
          <div className="h-6 w-24 rounded-full bg-muted" />
        </div>
        <div className="mt-2 h-3 w-40 rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="mx-auto h-32 w-40 rounded-full bg-muted/70" />
        <div className="mt-4 h-16 rounded bg-muted/60" />
      </CardContent>
    </Card>
  )
}

function ErrorCard({ item }: { item: ResultadoItem }) {
  return (
    <Card className="border-destructive/25 bg-destructive/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-destructive" />
          <CardTitle className="font-mono text-base">{item.symbol ?? "?"}</CardTitle>
        </div>
        <CardDescription className="text-destructive/90">{item.error}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function AnalysisCard({ item }: { item: ResultadoItem }) {
  const [detalleAbierto, setDetalleAbierto] = useState(false)

  if (!item.ok || !item.data) {
    return <ErrorCard item={item} />
  }

  const d = item.data
  const tecnica = d.señal_tecnica
  const causal = d.analisis_causal

  const estiloTecnico = VEREDICTO_TECNICO_ESTILO[tecnica.veredicto] ?? VEREDICTO_TECNICO_ESTILO.neutral
  const estiloCausal = VEREDICTO_CAUSAL_ESTILO[causal.veredicto] ?? VEREDICTO_CAUSAL_ESTILO.mantener
  const IconoTecnico = estiloTecnico.icon

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-mono text-lg tracking-tight">{d.simbolo}</CardTitle>
            <CardDescription className="mt-0.5">
              <span className="font-mono text-foreground/80">
                {tecnica.indicadores.precio_actual.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </CardDescription>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${estiloTecnico.bg} ${estiloTecnico.text} ${estiloTecnico.ring}`}
          >
            <IconoTecnico className="size-3.5" />
            {tecnica.veredicto.toUpperCase()}
          </span>
        </div>
        <div className="pt-1">
          <FuentesBadges fuentes={d.fuentes_disponibles} />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* --- Gráfico de precio real (velas + EMA9/EMA21 + volumen) --- */}
        <PriceChart simbolo={d.simbolo} className="mb-4" />

        {/* --- Recomendación del agente causal + barómetro --- */}
        <div className="mb-4 flex flex-col items-center rounded-xl border border-border/60 bg-gradient-to-b from-muted/40 to-transparent py-4">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Brain className="size-3.5" />
            Recomendación del agente causal
          </p>
          <Barometer puntuacion={causal.puntuacion} etiqueta={causal.veredicto} />
          <Badge variant={CONFIANZA_VARIANT[causal.confianza]} className="mt-1">
            Confianza {causal.confianza}
          </Badge>
        </div>

        {/* --- Razonamiento causal --- */}
        <div className={`mb-4 rounded-lg border-l-[3px] px-3 py-2.5 ${estiloCausal.bg}`} style={{ borderLeftColor: "currentColor" }}>
          <p className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold ${estiloCausal.text}`}>
            <Sparkles className="size-3.5" />
            Razonamiento causal
          </p>
          <p className="text-sm leading-relaxed text-foreground/85">{causal.razonamiento_causal}</p>
        </div>

        {(causal.factores_clave.length > 0 || causal.riesgos.length > 0) && (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {causal.factores_clave.length > 0 && (
              <div className="rounded-lg bg-emerald-500/5 p-2.5">
                <p className="mb-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Factores clave
                </p>
                <ul className="space-y-1 text-xs leading-snug text-muted-foreground">
                  {causal.factores_clave.map((f, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-emerald-500">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {causal.riesgos.length > 0 && (
              <div className="rounded-lg bg-amber-500/5 p-2.5">
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-3" />
                  Riesgos
                </p>
                <ul className="space-y-1 text-xs leading-snug text-muted-foreground">
                  {causal.riesgos.map((r, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* --- Detalle técnico colapsable --- */}
        <div className="rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => setDetalleAbierto((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <span>
              Detalle técnico (EMA/RSI/MACD) · Puntuación {tecnica.puntuacion} · Confianza {tecnica.confianza}
            </span>
            <ChevronDown className={`size-4 shrink-0 transition-transform ${detalleAbierto ? "rotate-180" : ""}`} />
          </button>
          {detalleAbierto && (
            <div className="border-t border-border/60 px-3 py-3">
              <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <IndicadorMini nombre="EMA9" valor={tecnica.indicadores.ema9} />
                <IndicadorMini nombre="EMA21" valor={tecnica.indicadores.ema21} />
                <IndicadorMini nombre="RSI14" valor={tecnica.indicadores.rsi14} />
                <IndicadorMini nombre="ATR14" valor={tecnica.indicadores.atr14} />
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {tecnica.razones.map((razon, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-foreground/30">•</span>
                    <span>{razon}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="mt-3 border-t border-border/60 pt-2.5 text-[11px] leading-snug text-muted-foreground/70">
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

function useCountdown(intervaloMs: number, activo: boolean, resetKey: number) {
  const [restanteS, setRestanteS] = useState(Math.round(intervaloMs / 1000))

  useEffect(() => {
    setRestanteS(Math.round(intervaloMs / 1000))
    if (!activo) return
    const id = setInterval(() => {
      setRestanteS((s) => (s <= 1 ? Math.round(intervaloMs / 1000) : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [intervaloMs, activo, resetKey])

  return restanteS
}

export default function IntradayPage() {
  const [seleccionados, setSeleccionados] = useState<SimboloSeleccionado[]>(SELECCION_DEFECTO)
  const [respuesta, setRespuesta] = useState<ApiResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const seleccionadosRef = useRef(seleccionados)
  seleccionadosRef.current = seleccionados

  const cargar = useCallback((lista: SimboloSeleccionado[]) => {
    if (lista.length === 0) {
      setRespuesta({ resultados: [] })
      setCargando(false)
      return
    }
    const simbolosQuery = lista.map((s) => s.simbolo).join(",")
    setCargando(true)
    setError(null)
    fetch(`/api/intraday-analysis?symbols=${encodeURIComponent(simbolosQuery)}&interval=5m&range=1d`, {
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
      .finally(() => {
        setCargando(false)
        setRefreshTick((t) => t + 1)
      })
  }, [])

  // Carga inicial.
  useEffect(() => {
    cargar(seleccionadosRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recarga cuando cambia la selección de símbolos (con pequeño debounce
  // implícito porque el usuario suele añadir/quitar varios seguidos).
  const primerRenderRef = useRef(true)
  useEffect(() => {
    if (primerRenderRef.current) {
      primerRenderRef.current = false
      return
    }
    const id = setTimeout(() => cargar(seleccionados), 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionados])

  // Auto-refresco periódico.
  useEffect(() => {
    const id = setInterval(() => cargar(seleccionadosRef.current), REFRESCO_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const restanteS = useCountdown(REFRESCO_MS, !cargando, refreshTick)

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* --- Encabezado --- */}
      <header className="mb-7 border-b border-border/60 pb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Brain className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Señales Intradía + Agente Causal</h1>
            <p className="text-sm text-muted-foreground">
              Datos reales (Yahoo Finance, FRED, CoinGecko, Yahoo News) analizados por un agente LLM
            </p>
          </div>
        </div>
      </header>

      {/* --- Buscador de activos --- */}
      <section className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Activos a analizar ({seleccionados.length}/8)
        </label>
        <SymbolSearch seleccionados={seleccionados} onChange={setSeleccionados} maxSimbolos={8} />
        <p className="mt-2 text-xs text-muted-foreground/70">
          Escribe un nombre (&quot;apple&quot;, &quot;bitcoin&quot;, &quot;nvidia&quot;) o un ticker — cada
          selección se añade sin borrar las anteriores. Pulsa <kbd className="rounded border px-1">⌫</kbd> con
          el campo vacío para quitar la última.
        </p>
      </section>

      {/* --- Barra de estado --- */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {respuesta?.generado_en_utc ? (
            <span>
              Actualizado {new Date(respuesta.generado_en_utc).toLocaleTimeString()} · próximo en {restanteS}s
            </span>
          ) : (
            <span>Cargando datos reales…</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => cargar(seleccionados)}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${cargando ? "animate-spin" : ""}`} />
          {cargando ? "Analizando con LLM…" : "Actualizar ahora"}
        </button>
      </div>

      {/* --- Error --- */}
      {error && (
        <Card className="mb-6 border-destructive/30 bg-destructive/[0.03]">
          <CardContent className="flex items-start gap-2 pt-4 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* --- Vacío --- */}
      {!cargando && seleccionados.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Busca al menos un activo arriba para ver su señal técnica y análisis causal.
          </p>
        </div>
      )}

      {/* --- Resultados / Skeleton --- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cargando && (!respuesta?.resultados || respuesta.resultados.length === 0)
          ? seleccionados.map((s) => <SkeletonCard key={s.simbolo} />)
          : respuesta?.resultados?.map((item, i) => (
              <AnalysisCard key={item.symbol ?? item.data?.simbolo ?? i} item={item} />
            ))}
      </div>
    </main>
  )
}
