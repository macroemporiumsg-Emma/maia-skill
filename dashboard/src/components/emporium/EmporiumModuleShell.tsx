"use client"

/**
 * Contenedor modular estricto: cada sub-módulo del spec ("Estricta
 * modularidad — cada sub-módulo es un contenedor independiente, expandible")
 * se envuelve en este shell. El botón de acción secundaria ("Abrir
 * laboratorio" / "Ver investigaciones") es opcional y puramente decorativo /
 * de navegación futura — no dispara llamadas de red.
 */
import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmporiumModuleShellProps {
  eyebrow: string
  title: string
  description?: string
  icon?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  headerRight?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function EmporiumModuleShell({
  eyebrow,
  title,
  description,
  icon,
  actionLabel,
  onAction,
  headerRight,
  children,
  className,
}: EmporiumModuleShellProps) {
  return (
    <section className={cn("emp-glass emp-fade-in rounded-xl", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--emp-border)] px-4 py-3 sm:px-5">
        <div className="flex items-start gap-2.5">
          {icon && (
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--emp-primary)]/12 text-[var(--emp-primary)]">
              {icon}
            </div>
          )}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--emp-muted-foreground)]">
              {eyebrow}
            </div>
            <h3 className="text-sm font-semibold text-[var(--emp-foreground)] sm:text-base">{title}</h3>
            {description && (
              <p className="mt-0.5 max-w-2xl text-xs text-[var(--emp-muted-foreground)]">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {headerRight}
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="group flex items-center gap-1 rounded-md border border-[var(--emp-border-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--emp-muted-foreground)] transition-colors hover:border-[var(--emp-primary)]/50 hover:text-[var(--emp-primary)]"
            >
              {actionLabel}
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}
