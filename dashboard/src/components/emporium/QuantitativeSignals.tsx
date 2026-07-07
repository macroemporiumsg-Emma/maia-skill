"use client"

/**
 * Sub-módulo 1.3 — Bloque "Indicadores Cuantitativos", complementario a las
 * Señales Cualitativas. Basado en el documento de referencia "Indicadores
 * cuantitativos": tres canales de riesgo/volatilidad (Macro, Microestructura,
 * Estrés de Crédito) que alimentan la capa de normalización del Súper
 * Tratamiento causal de ALGONE.
 *
 * Cada sub-indicador se representa con un barómetro tipo reloj (mismo
 * componente `EmporiumGauge` usado en Sentimiento Agregado y Hawk/Dove), y
 * cada canal es expandible (Accordion) para revelar la definición analítica
 * completa — son datos técnicos con explicación extensa, no solo un score.
 */
import * as React from "react"
import { Activity, ChevronDown, Landmark, Waves } from "lucide-react"
import { Accordion } from "@base-ui/react/accordion"
import { QUANTITATIVE_CHANNELS } from "@/data/emporium/mockData"
import { EmporiumGauge } from "@/components/emporium/EmporiumGauge"
import { tensionColorClass } from "@/lib/emporium/format"
import { cn } from "@/lib/utils"
import type { QuantChannelId } from "@/types/emporium"

const CHANNEL_ICON: Record<QuantChannelId, React.ReactNode> = {
  macro: <Activity className="h-3.5 w-3.5" />,
  microstructure: <Waves className="h-3.5 w-3.5" />,
  credit_stress: <Landmark className="h-3.5 w-3.5" />,
}

function ActivationBadge({ level }: { level: number }) {
  return (
    <span
      className={cn(
        "emp-mono shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
        level >= 65
          ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
          : level >= 40
            ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      )}
    >
      Activación {level}%
    </span>
  )
}

function IndicatorRow({
  label,
  definition,
  tension,
  status,
}: {
  label: string
  definition: string
  tension: number
  status: string
}) {
  // La tensión (0=calma .. 100=estrés máximo) se remapea a la escala
  // bidireccional -100..100 que usa EmporiumGauge.
  const gaugeValue = (tension - 50) * 2

  return (
    <div className="rounded-md border border-[var(--emp-border)] bg-[var(--emp-background)]/30 p-3">
      <div className="flex items-start gap-3">
        <EmporiumGauge value={gaugeValue} palette="tension" size={104} showValue={false} className="shrink-0" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--emp-foreground)]">{label}</span>
            <span className={cn("emp-mono shrink-0 text-xs font-semibold", tensionColorClass(tension))}>
              {tension}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--emp-muted-foreground)]">{definition}</p>
          <p className={cn("mt-1 text-[11px] font-medium", tensionColorClass(tension))}>● {status}</p>
        </div>
      </div>
    </div>
  )
}

export function QuantitativeSignals() {
  return (
    <div>
      <p className="mb-3 text-[11px] leading-relaxed text-[var(--emp-muted-foreground)]">
        Tres canales de riesgo/volatilidad que alimentan el motor de normalización del Súper
        Tratamiento causal. Cada indicador se estandariza como{" "}
        <span className="emp-mono text-[var(--emp-foreground)]">
          (Dato Real − Consenso) / Desviación Estándar Histórica
        </span>{" "}
        antes de integrarse al modelo. La confluencia de los tres canales determina si el
        régimen ALGONE ONE transiciona a Expansión de Volatilidad.
      </p>

      <Accordion.Root
        className="flex flex-col gap-2.5"
        defaultValue={["macro", "microstructure", "credit_stress"]}
        multiple
      >
        {QUANTITATIVE_CHANNELS.map((channel) => (
          <Accordion.Item
            key={channel.id}
            value={channel.id}
            className="overflow-hidden rounded-lg border border-[var(--emp-border)] bg-[var(--emp-surface)]/40"
          >
            <Accordion.Header>
              <Accordion.Trigger className="group/qtrigger flex w-full items-center gap-2.5 px-3 py-2.5 text-left outline-none">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--emp-primary)]/12 text-[var(--emp-primary)]">
                  {CHANNEL_ICON[channel.id]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--emp-foreground)]">{channel.label}</div>
                </div>
                <ActivationBadge level={channel.activationLevel} />
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--emp-muted-foreground)] transition-transform group-aria-expanded/qtrigger:rotate-180" />
              </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Panel className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
              <div className="flex flex-col gap-2 border-t border-[var(--emp-border)] px-3 pt-2.5 pb-3">
                <p className="text-[11px] leading-relaxed text-[var(--emp-muted-foreground)]">
                  {channel.description}
                </p>
                {channel.indicators.map((ind) => (
                  <IndicatorRow
                    key={ind.id}
                    label={ind.label}
                    definition={ind.definition}
                    tension={ind.tension}
                    status={ind.status}
                  />
                ))}
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  )
}
