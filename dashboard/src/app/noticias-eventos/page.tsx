"use client"

/**
 * Emporium Macro Analytics — Noticias y Eventos
 *
 * Página compuesta por 3 módulos estrictos (cada sub-módulo es un
 * contenedor independiente, ver `EmporiumModuleShell`):
 *   1. Análisis de Sentimiento (filtro país + stream NLP + señales cualitativas)
 *   2. Datos Macro (matriz de relevancia + resumen ejecutivo + bancos
 *      centrales + features cuánticos)
 *   3. Contexto Corporativo entre Regiones (transmisión cross-regional)
 *
 * Todo el estado de interactividad (sincronización del filtro de país entre
 * módulos) vive en el cliente vía `EmporiumFilterProvider`, sin backend —
 * según lo confirmado por el usuario. Los datos son estáticos/representativos
 * (`@/data/emporium/mockData`): la ingesta real se gestiona en otra capa del
 * proyecto y puede sustituir estas fuentes sin tocar los componentes.
 */
import {
  Activity,
  BarChart3,
  Building2,
  Globe2,
  MessageSquareText,
  Newspaper,
  Sigma,
  Waves,
} from "lucide-react"

import { EmporiumFilterProvider } from "@/components/emporium/EmporiumContext"
import { EmporiumHeader } from "@/components/emporium/EmporiumHeader"
import { EmporiumModuleShell } from "@/components/emporium/EmporiumModuleShell"
import { CountryFilter } from "@/components/emporium/CountryFilter"
import { NewsStream } from "@/components/emporium/NewsStream"
import { QualitativeSignals } from "@/components/emporium/QualitativeSignals"
import { QuantitativeSignals } from "@/components/emporium/QuantitativeSignals"
import { MacroExecutiveSummary } from "@/components/emporium/MacroExecutiveSummary"
import { MacroRelevanceMatrix } from "@/components/emporium/MacroRelevanceMatrix"
import { CentralBankPanel } from "@/components/emporium/CentralBankPanel"
import { QuantumFeaturesPanel } from "@/components/emporium/QuantumFeaturesPanel"
import { CrossRegionalMatrix } from "@/components/emporium/CrossRegionalMatrix"

function SectionTitle({
  index,
  title,
  subtitle,
  icon,
}: {
  index: string
  title: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--emp-border-strong)] bg-[var(--emp-primary)]/10 text-[var(--emp-primary)]">
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold text-[var(--emp-primary)]">{index}</span>
          <h2 className="text-base font-bold tracking-tight text-[var(--emp-foreground)] sm:text-lg">{title}</h2>
        </div>
        <p className="text-xs text-[var(--emp-muted-foreground)]">{subtitle}</p>
      </div>
    </div>
  )
}

export default function NoticiasEventosPage() {
  return (
    <EmporiumFilterProvider>
      <div className="relative min-h-screen">
        <div className="emp-ambient-glow" />
        <div className="emp-grid-pattern absolute inset-0 z-0" />

        <div className="relative z-10">
          <EmporiumHeader />

          <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 sm:px-6">
            {/* ============ MÓDULO 1: ANÁLISIS DE SENTIMIENTO ============ */}
            <section>
              <SectionTitle
                index="MÓDULO 1"
                title="Análisis de Sentimiento (Sentiment & Qualitative Inference)"
                subtitle="Filtro por país, stream de noticias NLP y señales cualitativas correlacionadas con eventos macro."
                icon={<Newspaper className="h-4 w-4" />}
              />

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="flex flex-col gap-4">
                  <EmporiumModuleShell
                    eyebrow="Sub-módulo 1.1"
                    title="Filtro de País"
                    icon={<Globe2 className="h-3.5 w-3.5" />}
                    headerRight={<CountryFilter />}
                  >
                    <p className="text-xs text-[var(--emp-muted-foreground)]">
                      Selección múltiple. Sincroniza automáticamente el resaltado de la Matriz de
                      Relevancia Macro (Módulo 2.1) y el filtrado del Contexto Corporativo entre
                      Regiones (Módulo 3).
                    </p>
                  </EmporiumModuleShell>

                  <EmporiumModuleShell
                    eyebrow="Sub-módulo 1.2"
                    title="Stream de Noticias NLP"
                    description="Feed en orden cronológico inverso — estilo Bloomberg / Investing.com."
                    icon={<Activity className="h-3.5 w-3.5" />}
                    actionLabel="Ver investigaciones"
                  >
                    <NewsStream />
                  </EmporiumModuleShell>
                </div>

                <div className="flex flex-col gap-4">
                  <EmporiumModuleShell
                    eyebrow="Sub-módulo 1.3"
                    title="Señales Cualitativas"
                    description="Barómetro de presión, vectores por categoría e interrogación en lenguaje natural (EMMA / NEXUS)."
                    icon={<MessageSquareText className="h-3.5 w-3.5" />}
                    actionLabel="Abrir laboratorio"
                  >
                    <QualitativeSignals />
                  </EmporiumModuleShell>

                  <EmporiumModuleShell
                    eyebrow="Sub-módulo 1.3"
                    title="Indicadores Cuantitativos"
                    description="Canales de Macro, Microestructura y Estrés de Crédito — insumos del motor de normalización causal."
                    icon={<Waves className="h-3.5 w-3.5" />}
                    actionLabel="Abrir laboratorio"
                  >
                    <QuantitativeSignals />
                  </EmporiumModuleShell>
                </div>
              </div>
            </section>

            {/* ============ MÓDULO 2: DATOS MACRO ============ */}
            <section>
              <SectionTitle
                index="MÓDULO 2"
                title="Datos Macro (Hard Data Pipeline & Quantum Feeds)"
                subtitle="Matriz de relevancia, resumen ejecutivo, indicadores monetarios y features matemáticos cuánticos."
                icon={<BarChart3 className="h-4 w-4" />}
              />

              <div className="flex flex-col gap-4">
                <EmporiumModuleShell
                  eyebrow="Sub-módulo 2.2"
                  title="Resumen Ejecutivo Macro"
                  icon={<Sigma className="h-3.5 w-3.5" />}
                >
                  <MacroExecutiveSummary />
                </EmporiumModuleShell>

                <EmporiumModuleShell
                  eyebrow="Sub-módulo 2.1"
                  title="Matriz de Relevancia Macro"
                  description="Inflación (IPC, IPP) · Mercado Laboral (NFP, Tasa de Desempleo) · Crecimiento (PIB Real, PMI Flash)."
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  actionLabel="Ver investigaciones"
                >
                  <MacroRelevanceMatrix />
                </EmporiumModuleShell>

                <EmporiumModuleShell
                  eyebrow="Sub-módulo 2.3"
                  title="Indicadores Monetarios / Bancos Centrales"
                  description="Tasas de referencia, cambios de balance y clasificación Hawkish / Dovish."
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  actionLabel="Abrir laboratorio"
                >
                  <CentralBankPanel />
                </EmporiumModuleShell>

                <EmporiumModuleShell
                  eyebrow="Sub-módulo 2.4"
                  title="Quantum Mathematical Features"
                  description="Desviación Dₜ vs ancla estructural, ponderación ATR, percentil de severidad, enlace GLM y régimen ALGONE ONE."
                  icon={<Sigma className="h-3.5 w-3.5" />}
                  actionLabel="Abrir laboratorio"
                >
                  <QuantumFeaturesPanel />
                </EmporiumModuleShell>
              </div>
            </section>

            {/* ============ MÓDULO 3: CONTEXTO CORPORATIVO ENTRE REGIONES ============ */}
            <section>
              <SectionTitle
                index="MÓDULO 3"
                title="Contexto Corporativo entre Regiones"
                subtitle="Transmisión asimétrica de impacto macro/noticias hacia índices, divisas, materias primas y tasas de otras regiones."
                icon={<Globe2 className="h-4 w-4" />}
              />

              <EmporiumModuleShell
                eyebrow="Cross-Regional Corporate Context"
                title="Matriz de Transmisión Regional"
                description="Incluye flujos ETF (inflow/outflow) y diferenciales de estrés crediticio (TED Spread, curva de rendimientos)."
                icon={<Globe2 className="h-3.5 w-3.5" />}
                actionLabel="Ver investigaciones"
              >
                <CrossRegionalMatrix />
              </EmporiumModuleShell>
            </section>

            <footer className="border-t border-[var(--emp-border)] pt-4 text-center text-[10px] text-[var(--emp-muted-foreground)]">
              Emporium Macro Analytics · Proyecto Bandonax IA — Datos representativos con fines de
              diseño de interfaz. La ingesta de datos en vivo se gestiona en la capa de backend del
              proyecto.
            </footer>
          </main>
        </div>
      </div>
    </EmporiumFilterProvider>
  )
}
