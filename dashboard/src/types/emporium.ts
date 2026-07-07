/**
 * Tipos de dominio para la sección "Noticias y Eventos" de Emporium Macro
 * Analytics (Proyecto: Bandonax IA).
 *
 * Nota de alcance: la ingesta de datos en vivo se gestiona en otra parte del
 * proyecto. Estos tipos describen el contrato de datos que consumirá esta UI
 * (hoy poblado con `data/emporium/mockData.ts`, mañana reemplazable por un
 * fetch real sin tocar los componentes).
 */

export type EmporiumCountryCode =
  | "US"
  | "EU"
  | "GB"
  | "JP"
  | "AU"
  | "CA"
  | "CH"
  | "NZ"
  | "CN"

export interface EmporiumCountry {
  code: EmporiumCountryCode
  name: string
  flag: string
  currency: string
}

export type NewsCategory =
  | "macro"
  | "forex"
  | "equities"
  | "commodities"
  | "central_bank"
  | "geopolitics"

export type NewsImpact = "high" | "medium" | "low"
export type NewsSentiment = "bullish" | "bearish" | "neutral"

export interface EmporiumNewsItem {
  id: string
  title: string
  source: string
  countryCode: EmporiumCountryCode
  category: NewsCategory
  impact: NewsImpact
  sentiment: NewsSentiment
  /** Puntuación cuantitativa de sentimiento en -100..100, usada por el barómetro. */
  sentimentScore: number
  summary: string
  /** ISO-8601. */
  publishedAt: string
  urgent?: boolean
}

export type MacroCategory = "Inflación" | "Empleo" | "Crecimiento"

export interface MacroIndicator {
  id: string
  countryCode: EmporiumCountryCode
  /** Ej. "IPC Subyacente (YoY)", "Nóminas No Agrícolas (NFP)", "PMI Manufacturero Flash". */
  event: string
  category: MacroCategory
  actual: number | null
  consensus: number | null
  previous: number | null
  unit: string
  /** Desviación estandarizada frente al consenso. */
  zScore: number | null
  reportDate: string
  sentiment: NewsSentiment
}

export type MonetaryBias = "hawkish" | "dovish" | "neutral"

export interface CentralBankIndicator {
  id: string
  countryCode: EmporiumCountryCode
  bank: string
  referenceRate: number
  previousRate: number
  /** % de cambio del balance del banco central (positivo = expansión / QE, negativo = contracción / QT). */
  balanceSheetChangePct: number
  bias: MonetaryBias
  /** -100 (dovish extremo) .. +100 (hawkish extremo), para el gauge. */
  biasScore: number
  nextMeeting: string
  lastStatement: string
}

/** Estados de régimen del agregador ALGONE ONE. */
export type RegimeState = -1 | 0 | 1

export interface QuantumFeature {
  id: string
  indicatorId: string
  label: string
  countryCode: EmporiumCountryCode
  /** D_t: desviación respecto al ancla estructural. */
  deviation: number
  anchorType: "Moda" | "Media" | "Mediana"
  /** Ponderación de volatilidad basada en ATR. */
  atrWeight: number
  /** Percentil de severidad 0-100 dentro de la distribución histórica. */
  severityPercentile: number
  /** Función de enlace GLM (familia exponencial) seleccionada para el DGP del indicador. */
  linkFunction: "Normal" | "Gamma" | "Beta" | "Poisson"
  regime: RegimeState
  /** Muestra de una densidad KDE normalizada (0..1) para el mini-gráfico. */
  kde: number[]
}

export type CrossAssetType = "index" | "fx" | "commodity" | "rates"

export interface CrossRegionalLink {
  id: string
  sourceRegion: EmporiumCountryCode
  targetAsset: string
  targetType: CrossAssetType
  /** Transmisión asimétrica del impacto: -100 (fuerte negativo) .. +100 (fuerte positivo). */
  impactScore: number
  description: string
  /** Flujo neto ETF en millones de USD; positivo = inflow, negativo = outflow. */
  etfFlowM: number
  tedSpreadBps: number
  yieldCurveDeltaBps: number
}

export interface FxTick {
  pair: string
  base: EmporiumCountryCode
  quote: EmporiumCountryCode
  rate: number
  changePct: number
}

/**
 * Indicadores Cuantitativos (Sub-módulo 1.3, bloque complementario a las
 * Señales Cualitativas). Basado en el documento de referencia "Indicadores
 * cuantitativos": tres canales de riesgo/volatilidad que alimentan el motor
 * de normalización y el régimen ALGONE ONE.
 */
export type QuantChannelId = "macro" | "microstructure" | "credit_stress"

export interface QuantitativeSubIndicator {
  id: string
  label: string
  /** Definición analítica resumida (fuente: documento de referencia del canal). */
  definition: string
  /** Nivel de tensión estandarizado: -100 (calma/favorable) .. +100 (alerta/estrés). */
  tension: number
  /** Lectura cualitativa puntual del estado actual del indicador. */
  status: string
}

export interface QuantitativeChannel {
  id: QuantChannelId
  label: string
  description: string
  /** Nivel de activación agregado del canal, 0..100. */
  activationLevel: number
  indicators: QuantitativeSubIndicator[]
}
