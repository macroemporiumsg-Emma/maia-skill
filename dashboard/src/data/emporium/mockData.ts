import type {
  CentralBankIndicator,
  CrossRegionalLink,
  EmporiumNewsItem,
  FxTick,
  MacroIndicator,
  QuantumFeature,
} from "@/types/emporium"

/**
 * Datos estáticos representativos para la sección Noticias y Eventos.
 *
 * Alcance explícito: la ingesta de datos en vivo (Bloomberg/Investing.com,
 * feeds macro, FX) ya se gestiona en otra capa del proyecto. Este módulo solo
 * necesita datos realistas y con la forma correcta para validar el
 * diseño/UX; sustituir por un fetch real no debería requerir cambios en los
 * componentes que consumen estos tipos (`@/types/emporium`).
 */

// ---------------------------------------------------------------------------
// Módulo 1: Stream de noticias NLP
// ---------------------------------------------------------------------------

export const EMPORIUM_NEWS: EmporiumNewsItem[] = [
  {
    id: "n-01",
    title: "La Fed mantiene tasas sin cambios pero señala apertura a recortes en 2025",
    source: "Bloomberg",
    countryCode: "US",
    category: "central_bank",
    impact: "high",
    sentiment: "bullish",
    sentimentScore: 62,
    summary:
      "El FOMC mantuvo el rango de tasas en 4.25%-4.50%, pero el dot-plot revisado sugiere dos recortes adicionales para 2025. Powell enfatizó dependencia de datos y riesgos balanceados de inflación/empleo.",
    publishedAt: "2026-07-06T13:42:00Z",
    urgent: true,
  },
  {
    id: "n-02",
    title: "IPC subyacente de la Eurozona sorprende a la baja en junio",
    source: "Investing.com",
    countryCode: "EU",
    category: "macro",
    impact: "high",
    sentiment: "bearish",
    sentimentScore: -18,
    summary:
      "La inflación subyacente se ubicó en 2.1% interanual frente al 2.4% esperado por el consenso, reforzando las apuestas de un recorte del BCE en la próxima reunión de julio.",
    publishedAt: "2026-07-06T09:15:00Z",
  },
  {
    id: "n-03",
    title: "PMI Manufacturero Flash de Japón cae por debajo de 50 por primera vez en 4 meses",
    source: "Reuters",
    countryCode: "JP",
    category: "macro",
    impact: "medium",
    sentiment: "bearish",
    sentimentScore: -34,
    summary:
      "El índice se situó en 48.7, señalando contracción en el sector manufacturero. El yen se debilitó frente al dólar tras la publicación, presionando al BoJ a mantener su postura acomodaticia.",
    publishedAt: "2026-07-06T02:30:00Z",
  },
  {
    id: "n-04",
    title: "El RBA sorprende con una postura más hawkish de lo esperado",
    source: "Bloomberg",
    countryCode: "AU",
    category: "central_bank",
    impact: "high",
    sentiment: "bullish",
    sentimentScore: 45,
    summary:
      "El banco central australiano mantuvo la tasa en 4.35% pero el comunicado eliminó referencias a 'paciencia', lo que el mercado interpreta como preparación para un ciclo de subidas si la inflación persiste.",
    publishedAt: "2026-07-05T05:00:00Z",
  },
  {
    id: "n-05",
    title: "Nóminas no agrícolas de EE.UU. superan ampliamente el consenso",
    source: "Investing.com",
    countryCode: "US",
    category: "macro",
    impact: "high",
    sentiment: "bullish",
    sentimentScore: 71,
    summary:
      "Se crearon 289K empleos frente a los 180K esperados. La tasa de desempleo se mantuvo en 3.9%. El dato refuerza la narrativa de aterrizaje suave y presiona al alza los rendimientos del Tesoro.",
    publishedAt: "2026-07-04T12:30:00Z",
    urgent: true,
  },
  {
    id: "n-06",
    title: "Tensiones geopolíticas en el Mar Rojo elevan la prima de riesgo del crudo",
    source: "Reuters",
    countryCode: "GB",
    category: "geopolitics",
    impact: "medium",
    sentiment: "bearish",
    sentimentScore: -22,
    summary:
      "Ataques a rutas comerciales clave elevan las primas de seguro marítimo, con impacto directo en WTI y Brent. Los analistas vigilan una posible transmisión hacia la inflación importada de la Eurozona.",
    publishedAt: "2026-07-04T08:05:00Z",
  },
  {
    id: "n-07",
    title: "El SNB sorprende con un recorte de 25pb citando fortaleza excesiva del franco",
    source: "Bloomberg",
    countryCode: "CH",
    category: "central_bank",
    impact: "high",
    sentiment: "bearish",
    sentimentScore: -40,
    summary:
      "El Banco Nacional Suizo bajó su tasa de referencia a 1.00%, sorprendiendo al 70% de analistas que esperaban una pausa. El USD/CHF reaccionó con un salto inmediato de 60 pips.",
    publishedAt: "2026-07-03T07:30:00Z",
  },
  {
    id: "n-08",
    title: "Ventas minoristas de Canadá decepcionan por tercer mes consecutivo",
    source: "Investing.com",
    countryCode: "CA",
    category: "macro",
    impact: "low",
    sentiment: "bearish",
    sentimentScore: -15,
    summary:
      "Las ventas minoristas cayeron -0.3% m/m frente a un +0.2% esperado. El consumo débil añade presión al Banco de Canadá para continuar su ciclo de recortes.",
    publishedAt: "2026-07-02T13:00:00Z",
  },
  {
    id: "n-09",
    title: "Bolsas asiáticas al alza tras estímulo fiscal adicional en China",
    source: "Reuters",
    countryCode: "CN",
    category: "equities",
    impact: "medium",
    sentiment: "bullish",
    sentimentScore: 38,
    summary:
      "Pekín anunció un paquete de estímulo de 500B CNY orientado al sector inmobiliario. El CSI 300 subió 2.1% y el cobre repuntó ante expectativas de mayor demanda industrial.",
    publishedAt: "2026-07-01T23:10:00Z",
  },
  {
    id: "n-10",
    title: "El oro alcanza nuevo máximo histórico ante demanda de refugio",
    source: "Bloomberg",
    countryCode: "US",
    category: "commodities",
    impact: "medium",
    sentiment: "bullish",
    sentimentScore: 28,
    summary:
      "XAU/USD superó los $2,480 impulsado por la combinación de expectativas de recortes de la Fed y tensiones geopolíticas persistentes. Los ETFs de oro registraron entradas netas de $1.2B en la semana.",
    publishedAt: "2026-07-01T10:20:00Z",
  },
]

// ---------------------------------------------------------------------------
// Módulo 2.1: Matriz de relevancia macro
// ---------------------------------------------------------------------------

export const MACRO_INDICATORS: MacroIndicator[] = [
  { id: "m-us-cpi", countryCode: "US", event: "IPC Subyacente (YoY)", category: "Inflación", actual: 3.1, consensus: 3.3, previous: 3.4, unit: "%", zScore: -1.8, reportDate: "2026-07-05", sentiment: "bullish" },
  { id: "m-us-ppi", countryCode: "US", event: "IPP (MoM)", category: "Inflación", actual: 0.2, consensus: 0.3, previous: 0.1, unit: "%", zScore: -0.6, reportDate: "2026-07-04", sentiment: "neutral" },
  { id: "m-us-nfp", countryCode: "US", event: "Nóminas No Agrícolas (NFP)", category: "Empleo", actual: 289, consensus: 180, previous: 206, unit: "K", zScore: 2.9, reportDate: "2026-07-04", sentiment: "bullish" },
  { id: "m-us-ur", countryCode: "US", event: "Tasa de Desempleo", category: "Empleo", actual: 3.9, consensus: 3.9, previous: 3.9, unit: "%", zScore: 0.0, reportDate: "2026-07-04", sentiment: "neutral" },
  { id: "m-us-gdp", countryCode: "US", event: "PIB Real (Anualizado)", category: "Crecimiento", actual: 2.8, consensus: 2.4, previous: 2.1, unit: "%", zScore: 1.6, reportDate: "2026-06-27", sentiment: "bullish" },
  { id: "m-us-pmi", countryCode: "US", event: "PMI Flash Manufactura", category: "Crecimiento", actual: 51.2, consensus: 50.5, previous: 49.8, unit: "pts", zScore: 1.1, reportDate: "2026-07-06", sentiment: "bullish" },

  { id: "m-eu-cpi", countryCode: "EU", event: "IPC Subyacente (YoY)", category: "Inflación", actual: 2.1, consensus: 2.4, previous: 2.5, unit: "%", zScore: -2.1, reportDate: "2026-07-06", sentiment: "bearish" },
  { id: "m-eu-ppi", countryCode: "EU", event: "IPP (MoM)", category: "Inflación", actual: -0.1, consensus: 0.0, previous: 0.1, unit: "%", zScore: -0.9, reportDate: "2026-07-03", sentiment: "bearish" },
  { id: "m-eu-ur", countryCode: "EU", event: "Tasa de Desempleo", category: "Empleo", actual: 6.4, consensus: 6.4, previous: 6.5, unit: "%", zScore: 0.2, reportDate: "2026-07-02", sentiment: "neutral" },
  { id: "m-eu-gdp", countryCode: "EU", event: "PIB Trimestral", category: "Crecimiento", actual: 0.3, consensus: 0.2, previous: 0.1, unit: "%", zScore: 0.8, reportDate: "2026-06-29", sentiment: "bullish" },
  { id: "m-eu-pmi", countryCode: "EU", event: "PMI Flash Servicios", category: "Crecimiento", actual: 52.4, consensus: 51.8, previous: 51.0, unit: "pts", zScore: 0.7, reportDate: "2026-07-06", sentiment: "bullish" },

  { id: "m-gb-cpi", countryCode: "GB", event: "IPC Interanual", category: "Inflación", actual: 2.6, consensus: 2.4, previous: 2.3, unit: "%", zScore: 1.4, reportDate: "2026-07-03", sentiment: "bearish" },
  { id: "m-gb-ur", countryCode: "GB", event: "Tasa de Desempleo", category: "Empleo", actual: 4.3, consensus: 4.4, previous: 4.4, unit: "%", zScore: -0.5, reportDate: "2026-07-01", sentiment: "bullish" },
  { id: "m-gb-gdp", countryCode: "GB", event: "PIB Mensual", category: "Crecimiento", actual: 0.1, consensus: 0.2, previous: 0.4, unit: "%", zScore: -0.7, reportDate: "2026-06-30", sentiment: "bearish" },
  { id: "m-gb-pmi", countryCode: "GB", event: "PMI Flash Compuesto", category: "Crecimiento", actual: 53.1, consensus: 52.5, previous: 51.9, unit: "pts", zScore: 0.9, reportDate: "2026-07-06", sentiment: "bullish" },

  { id: "m-jp-cpi", countryCode: "JP", event: "IPC Nacional (YoY)", category: "Inflación", actual: 2.8, consensus: 2.6, previous: 2.5, unit: "%", zScore: 1.2, reportDate: "2026-07-05", sentiment: "bearish" },
  { id: "m-jp-ur", countryCode: "JP", event: "Tasa de Desempleo", category: "Empleo", actual: 2.5, consensus: 2.5, previous: 2.6, unit: "%", zScore: 0.0, reportDate: "2026-06-28", sentiment: "neutral" },
  { id: "m-jp-gdp", countryCode: "JP", event: "PIB Trimestral", category: "Crecimiento", actual: -0.2, consensus: 0.1, previous: 0.5, unit: "%", zScore: -1.5, reportDate: "2026-06-27", sentiment: "bearish" },
  { id: "m-jp-pmi", countryCode: "JP", event: "PMI Flash Manufactura", category: "Crecimiento", actual: 48.7, consensus: 50.1, previous: 50.4, unit: "pts", zScore: -2.0, reportDate: "2026-07-06", sentiment: "bearish" },

  { id: "m-au-cpi", countryCode: "AU", event: "IPC Trimestral", category: "Inflación", actual: 1.0, consensus: 0.8, previous: 0.6, unit: "%", zScore: 1.7, reportDate: "2026-06-25", sentiment: "bearish" },
  { id: "m-au-employment", countryCode: "AU", event: "Cambio en el Empleo", category: "Empleo", actual: 48.2, consensus: 20.0, previous: 12.5, unit: "K", zScore: 2.2, reportDate: "2026-07-04", sentiment: "bullish" },
  { id: "m-au-gdp", countryCode: "AU", event: "PIB Trimestral", category: "Crecimiento", actual: 0.5, consensus: 0.4, previous: 0.3, unit: "%", zScore: 0.6, reportDate: "2026-06-05", sentiment: "bullish" },

  { id: "m-ca-cpi", countryCode: "CA", event: "IPC Interanual", category: "Inflación", actual: 2.9, consensus: 2.9, previous: 2.7, unit: "%", zScore: 0.0, reportDate: "2026-06-25", sentiment: "neutral" },
  { id: "m-ca-employment", countryCode: "CA", event: "Cambio en el Empleo", category: "Empleo", actual: -5.2, consensus: 22.0, previous: 27.9, unit: "K", zScore: -1.9, reportDate: "2026-07-05", sentiment: "bearish" },
  { id: "m-ca-gdp", countryCode: "CA", event: "PIB Mensual", category: "Crecimiento", actual: 0.1, consensus: 0.2, previous: 0.3, unit: "%", zScore: -0.6, reportDate: "2026-06-28", sentiment: "bearish" },

  { id: "m-ch-cpi", countryCode: "CH", event: "IPC Interanual", category: "Inflación", actual: 1.2, consensus: 1.3, previous: 1.4, unit: "%", zScore: -0.5, reportDate: "2026-07-03", sentiment: "bullish" },
  { id: "m-ch-gdp", countryCode: "CH", event: "PIB Trimestral", category: "Crecimiento", actual: 0.4, consensus: 0.3, previous: 0.3, unit: "%", zScore: 0.5, reportDate: "2026-06-02", sentiment: "bullish" },

  { id: "m-nz-cpi", countryCode: "NZ", event: "IPC Trimestral", category: "Inflación", actual: 0.5, consensus: 0.6, previous: 0.6, unit: "%", zScore: -0.4, reportDate: "2026-07-16", sentiment: "bullish" },
  { id: "m-nz-employment", countryCode: "NZ", event: "Cambio en el Empleo", category: "Empleo", actual: -0.2, consensus: 0.1, previous: 0.3, unit: "%", zScore: -1.1, reportDate: "2026-05-07", sentiment: "bearish" },

  { id: "m-cn-pmi", countryCode: "CN", event: "PMI Manufacturero Oficial", category: "Crecimiento", actual: 49.3, consensus: 49.6, previous: 49.5, unit: "pts", zScore: -0.6, reportDate: "2026-06-30", sentiment: "bearish" },
  { id: "m-cn-cpi", countryCode: "CN", event: "IPC Interanual", category: "Inflación", actual: 0.3, consensus: 0.4, previous: 0.3, unit: "%", zScore: -0.3, reportDate: "2026-07-09", sentiment: "bearish" },
]

// ---------------------------------------------------------------------------
// Módulo 2.2: Resumen ejecutivo macro (widget)
// ---------------------------------------------------------------------------

export const MACRO_EXECUTIVE_SUMMARY = {
  headline:
    "Sorpresa de datos duros en EE.UU. fuerza revaluación institucional masiva",
  body:
    "El NFP de junio (+289K vs +180K consensuado, Z=+2.9) desencadenó un reajuste algorítmico simultáneo en las curvas de tasas y en el USD, mientras la sorpresa desinflacionaria de la Eurozona (IPC subyacente Z=-2.1) amplía el diferencial de política monetaria BCE-Fed. El PMI manufacturero de Japón cayendo por debajo de 50 (Z=-2.0) confirma la pérdida de tracción del sector externo asiático, coincidiendo con el recorte sorpresa del SNB. Divergencia de régimen: expansión en EE.UU./Australia, contracción en Japón/Canadá.",
  regimeGlobal: 1 as const,
  keyDrivers: [
    { label: "EE.UU. — Empleo", zScore: 2.9, direction: "up" as const },
    { label: "Eurozona — Inflación", zScore: -2.1, direction: "down" as const },
    { label: "Japón — PMI Manufactura", zScore: -2.0, direction: "down" as const },
    { label: "Australia — Empleo", zScore: 2.2, direction: "up" as const },
  ],
  updatedAt: "2026-07-06T14:00:00Z",
}

// ---------------------------------------------------------------------------
// Módulo 2.3: Indicadores monetarios / bancos centrales
// ---------------------------------------------------------------------------

export const CENTRAL_BANK_INDICATORS: CentralBankIndicator[] = [
  {
    id: "cb-us",
    countryCode: "US",
    bank: "Reserva Federal (Fed)",
    referenceRate: 4.5,
    previousRate: 4.5,
    balanceSheetChangePct: -0.8,
    bias: "dovish",
    biasScore: -22,
    nextMeeting: "2026-07-29",
    lastStatement:
      "Sostiene tasas, pero el dot-plot abre la puerta a dos recortes en 2026 si la desinflación se confirma.",
  },
  {
    id: "cb-eu",
    countryCode: "EU",
    bank: "Banco Central Europeo (BCE)",
    referenceRate: 3.25,
    previousRate: 3.5,
    balanceSheetChangePct: -1.4,
    bias: "dovish",
    biasScore: -48,
    nextMeeting: "2026-07-18",
    lastStatement:
      "Recorte de 25pb confirmado; Lagarde señala trayectoria de flexibilización gradual mientras el IPC subyacente converge a la meta.",
  },
  {
    id: "cb-gb",
    countryCode: "GB",
    bank: "Banco de Inglaterra (BoE)",
    referenceRate: 4.75,
    previousRate: 4.75,
    balanceSheetChangePct: -0.5,
    bias: "neutral",
    biasScore: 5,
    nextMeeting: "2026-08-06",
    lastStatement:
      "Mantiene tasas; el comité está dividido ante una inflación de servicios persistente y un mercado laboral que se enfría.",
  },
  {
    id: "cb-jp",
    countryCode: "JP",
    bank: "Banco de Japón (BoJ)",
    referenceRate: 0.5,
    previousRate: 0.25,
    balanceSheetChangePct: 0.3,
    bias: "hawkish",
    biasScore: 30,
    nextMeeting: "2026-07-31",
    lastStatement:
      "Sube tasas por segunda vez en el año pese a la debilidad del PMI, priorizando la normalización tras años de política ultra-laxa.",
  },
  {
    id: "cb-au",
    countryCode: "AU",
    bank: "Reserve Bank of Australia (RBA)",
    referenceRate: 4.35,
    previousRate: 4.35,
    balanceSheetChangePct: -0.2,
    bias: "hawkish",
    biasScore: 38,
    nextMeeting: "2026-08-05",
    lastStatement:
      "Retira la referencia a 'paciencia' del comunicado; deja la puerta abierta a una subida si la inflación de servicios no cede.",
  },
  {
    id: "cb-ca",
    countryCode: "CA",
    bank: "Banco de Canadá (BoC)",
    referenceRate: 4.25,
    previousRate: 4.5,
    balanceSheetChangePct: -1.1,
    bias: "dovish",
    biasScore: -55,
    nextMeeting: "2026-07-24",
    lastStatement:
      "Cuarto recorte consecutivo; el consumo débil y el deterioro del mercado laboral justifican una flexibilización más agresiva.",
  },
  {
    id: "cb-ch",
    countryCode: "CH",
    bank: "Banco Nacional Suizo (SNB)",
    referenceRate: 1.0,
    previousRate: 1.25,
    balanceSheetChangePct: -0.6,
    bias: "dovish",
    biasScore: -60,
    nextMeeting: "2026-09-24",
    lastStatement:
      "Recorte sorpresa de 25pb citando fortaleza excesiva del franco y riesgos deflacionarios de exportación.",
  },
]

// ---------------------------------------------------------------------------
// Módulo 2.4: Features matemáticos cuánticos (KDE / GLM / régimen ALGONE ONE)
// ---------------------------------------------------------------------------

/** Genera una muestra determinista tipo KDE (curva suave 0..1) para el sparkline. */
function kdeSample(seedShift: number, skew: number): number[] {
  const n = 24
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1 // -1..1
    const base = Math.exp(-Math.pow((x - skew) * 2.2, 2))
    const wiggle = 0.06 * Math.sin(i * 1.3 + seedShift)
    out.push(Math.max(0, Math.min(1, base + wiggle)))
  }
  return out
}

export const QUANTUM_FEATURES: QuantumFeature[] = [
  {
    id: "q-us-nfp",
    indicatorId: "m-us-nfp",
    label: "NFP — Desvío vs Ancla Estructural",
    countryCode: "US",
    deviation: 2.9,
    anchorType: "Mediana",
    atrWeight: 1.35,
    severityPercentile: 96,
    linkFunction: "Poisson",
    regime: 1,
    kde: kdeSample(0, 0.55),
  },
  {
    id: "q-eu-cpi",
    indicatorId: "m-eu-cpi",
    label: "IPC Subyacente EZ — Desvío vs Ancla Estructural",
    countryCode: "EU",
    deviation: -2.1,
    anchorType: "Media",
    atrWeight: 0.92,
    severityPercentile: 91,
    linkFunction: "Gamma",
    regime: -1,
    kde: kdeSample(1, -0.5),
  },
  {
    id: "q-jp-pmi",
    indicatorId: "m-jp-pmi",
    label: "PMI Manufactura JP — Desvío vs Ancla Estructural",
    countryCode: "JP",
    deviation: -2.0,
    anchorType: "Moda",
    atrWeight: 1.05,
    severityPercentile: 89,
    linkFunction: "Beta",
    regime: -1,
    kde: kdeSample(2, -0.45),
  },
  {
    id: "q-au-employment",
    indicatorId: "m-au-employment",
    label: "Empleo AU — Desvío vs Ancla Estructural",
    countryCode: "AU",
    deviation: 2.2,
    anchorType: "Mediana",
    atrWeight: 1.18,
    severityPercentile: 93,
    linkFunction: "Normal",
    regime: 1,
    kde: kdeSample(3, 0.48),
  },
  {
    id: "q-ca-employment",
    indicatorId: "m-ca-employment",
    label: "Empleo CA — Desvío vs Ancla Estructural",
    countryCode: "CA",
    deviation: -1.9,
    anchorType: "Media",
    atrWeight: 1.02,
    severityPercentile: 88,
    linkFunction: "Gamma",
    regime: -1,
    kde: kdeSample(4, -0.4),
  },
  {
    id: "q-gb-cpi",
    indicatorId: "m-gb-cpi",
    label: "IPC UK — Desvío vs Ancla Estructural",
    countryCode: "GB",
    deviation: 1.4,
    anchorType: "Mediana",
    atrWeight: 0.78,
    severityPercentile: 74,
    linkFunction: "Normal",
    regime: 0,
    kde: kdeSample(5, 0.3),
  },
]

// ---------------------------------------------------------------------------
// Módulo 3: Contexto corporativo entre regiones
// ---------------------------------------------------------------------------

export const CROSS_REGIONAL_LINKS: CrossRegionalLink[] = [
  {
    id: "cr-01",
    sourceRegion: "EU",
    targetAsset: "Micro Nasdaq 100 (MNQ)",
    targetType: "index",
    impactScore: -28,
    description:
      "Shock de oferta europeo (energía/semiconductores) se transmite a compañías tecnológicas estadounidenses con exposición a cadenas de suministro del continente.",
    etfFlowM: -340,
    tedSpreadBps: 18,
    yieldCurveDeltaBps: -4,
  },
  {
    id: "cr-02",
    sourceRegion: "AU",
    targetAsset: "AUD/USD",
    targetType: "fx",
    impactScore: 41,
    description:
      "Sorpresa positiva de empleo doméstico y postura hawkish del RBA fortalecen el diferencial de tasas frente al dólar estadounidense.",
    etfFlowM: 120,
    tedSpreadBps: 12,
    yieldCurveDeltaBps: 6,
  },
  {
    id: "cr-03",
    sourceRegion: "JP",
    targetAsset: "Nikkei 225 Futures",
    targetType: "index",
    impactScore: -19,
    description:
      "La debilidad del PMI manufacturero junto con la postura hawkish del BoJ presiona a exportadores japoneses vía apreciación del yen.",
    etfFlowM: -95,
    tedSpreadBps: 9,
    yieldCurveDeltaBps: 3,
  },
  {
    id: "cr-04",
    sourceRegion: "CN",
    targetAsset: "Cobre (HG) / Materiales Base",
    targetType: "commodity",
    impactScore: 33,
    description:
      "El estímulo fiscal chino orientado al sector inmobiliario reaviva expectativas de demanda industrial, transmitiéndose a materias primas y equities de materiales.",
    etfFlowM: 210,
    tedSpreadBps: 15,
    yieldCurveDeltaBps: -2,
  },
  {
    id: "cr-05",
    sourceRegion: "CH",
    targetAsset: "EUR/CHF",
    targetType: "fx",
    impactScore: -36,
    description:
      "El recorte sorpresa del SNB busca contener la fortaleza del franco, generando divergencia inmediata con la política del BCE.",
    etfFlowM: -60,
    tedSpreadBps: 7,
    yieldCurveDeltaBps: -1,
  },
  {
    id: "cr-06",
    sourceRegion: "US",
    targetAsset: "Curva de Rendimientos Global (10Y)",
    targetType: "rates",
    impactScore: 52,
    description:
      "El NFP sorpresivamente fuerte eleva los rendimientos del Tesoro americano, arrastrando al alza las curvas soberanas de mercados desarrollados y emergentes.",
    etfFlowM: -180,
    tedSpreadBps: 22,
    yieldCurveDeltaBps: 8,
  },
]

// ---------------------------------------------------------------------------
// Header: ticker "FX LIVE"
// ---------------------------------------------------------------------------

export const FX_LIVE_TICKS: FxTick[] = [
  { pair: "EUR/USD", base: "EU", quote: "US", rate: 1.0842, changePct: 0.18 },
  { pair: "GBP/USD", base: "GB", quote: "US", rate: 1.2761, changePct: -0.12 },
  { pair: "USD/JPY", base: "US", quote: "JP", rate: 158.34, changePct: 0.42 },
  { pair: "AUD/USD", base: "AU", quote: "US", rate: 0.6712, changePct: 0.55 },
  { pair: "USD/CAD", base: "US", quote: "CA", rate: 1.3695, changePct: 0.09 },
  { pair: "USD/CHF", base: "US", quote: "CH", rate: 0.8967, changePct: 0.31 },
  { pair: "NZD/USD", base: "NZ", quote: "US", rate: 0.6089, changePct: -0.24 },
  { pair: "EUR/GBP", base: "EU", quote: "GB", rate: 0.8496, changePct: 0.06 },
  { pair: "USD/CNY", base: "US", quote: "CN", rate: 7.2618, changePct: 0.03 },
  { pair: "EUR/JPY", base: "EU", quote: "JP", rate: 171.68, changePct: 0.61 },
]
