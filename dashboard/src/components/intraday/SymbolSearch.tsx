"use client"

/**
 * Buscador de activos por NOMBRE (no solo símbolo) con autocompletado
 * y "chips" (etiquetas removibles) para la lista de símbolos seleccionados.
 *
 * Resuelve el problema de UX reportado: antes había un único <input> de
 * texto plano donde el usuario debía escribir el ticker exacto separado
 * por comas, y escribir un nombre adicional sobrescribía/rompía todo el
 * string. Ahora:
 *   - Se puede escribir un NOMBRE ("apple", "bitcoin", "nvidia"...) y el
 *     backend real (Yahoo Finance Search) resuelve el ticker.
 *   - Cada símbolo añadido se muestra como un chip independiente, así que
 *     añadir uno nuevo nunca borra los anteriores.
 *   - Autocompletado real con debounce, teclado (↑↓ Enter Esc) y ratón.
 */
import { useEffect, useRef, useState, useCallback } from "react"
import { Search, X, Loader2 } from "lucide-react"

export interface SimboloSeleccionado {
  simbolo: string
  nombre: string
  tipo: string
}

interface ResultadoBusqueda {
  simbolo: string
  nombre: string
  tipo: string
  tipo_display: string
  bolsa: string
}

const TIPO_ETIQUETA: Record<string, string> = {
  EQUITY: "Acción",
  CRYPTOCURRENCY: "Cripto",
  CURRENCY: "Divisa",
  ETF: "ETF",
  INDEX: "Índice",
  FUTURE: "Futuro",
}

interface SymbolSearchProps {
  seleccionados: SimboloSeleccionado[]
  onChange: (simbolos: SimboloSeleccionado[]) => void
  maxSimbolos?: number
}

export function SymbolSearch({ seleccionados, onChange, maxSimbolos = 8 }: SymbolSearchProps) {
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(-1)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback((consulta: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!consulta.trim()) {
      setResultados([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbol-search?q=${encodeURIComponent(consulta)}&limit=8`, {
          cache: "no-store",
        })
        const data = await res.json()
        setResultados(data.resultados ?? [])
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    buscar(texto)
    setIndiceActivo(-1)
  }, [texto, buscar])

  // Cerrar el dropdown al hacer click fuera.
  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener("mousedown", onClickFuera)
    return () => document.removeEventListener("mousedown", onClickFuera)
  }, [])

  const agregar = (r: ResultadoBusqueda) => {
    if (seleccionados.some((s) => s.simbolo === r.simbolo)) {
      setTexto("")
      setAbierto(false)
      return
    }
    if (seleccionados.length >= maxSimbolos) {
      setAbierto(false)
      return
    }
    onChange([...seleccionados, { simbolo: r.simbolo, nombre: r.nombre, tipo: r.tipo }])
    setTexto("")
    setResultados([])
    setAbierto(false)
  }

  const quitar = (simbolo: string) => {
    onChange(seleccionados.filter((s) => s.simbolo !== simbolo))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierto || resultados.length === 0) {
      if (e.key === "Backspace" && texto === "" && seleccionados.length > 0) {
        quitar(seleccionados[seleccionados.length - 1].simbolo)
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIndiceActivo((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setIndiceActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const elegido = resultados[indiceActivo] ?? resultados[0]
      if (elegido) agregar(elegido)
    } else if (e.key === "Escape") {
      setAbierto(false)
    } else if (e.key === "Backspace" && texto === "" && seleccionados.length > 0) {
      quitar(seleccionados[seleccionados.length - 1].simbolo)
    }
  }

  return (
    <div ref={contenedorRef} className="relative w-full">
      <div className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
        <Search className="ml-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

        {seleccionados.map((s) => (
          <span
            key={s.simbolo}
            className="group inline-flex items-center gap-1 rounded-lg bg-primary/8 py-1 pl-2.5 pr-1 text-xs font-medium text-primary ring-1 ring-primary/15"
          >
            <span className="font-mono">{s.simbolo}</span>
            <span className="hidden text-primary/50 sm:inline">· {s.nombre}</span>
            <button
              type="button"
              onClick={() => quitar(s.simbolo)}
              className="ml-0.5 rounded-full p-0.5 text-primary/50 hover:bg-primary/15 hover:text-primary"
              aria-label={`Quitar ${s.simbolo}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={onKeyDown}
          placeholder={
            seleccionados.length === 0
              ? "Busca por nombre o símbolo: apple, bitcoin, nvidia…"
              : "Añadir otro activo…"
          }
          className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/60"
          aria-label="Buscar activo por nombre o símbolo"
          aria-expanded={abierto}
          aria-autocomplete="list"
          role="combobox"
        />

        {buscando && <Loader2 className="mr-1 size-4 shrink-0 animate-spin text-muted-foreground/60" />}
      </div>

      {abierto && texto.trim() && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {resultados.length === 0 && !buscando && (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Sin resultados para &quot;{texto}&quot;. Prueba con el nombre en inglés o el ticker.
            </p>
          )}
          {resultados.map((r, i) => (
            <button
              key={r.simbolo}
              type="button"
              onClick={() => agregar(r)}
              onMouseEnter={() => setIndiceActivo(i)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                i === indiceActivo ? "bg-primary/8" : "hover:bg-muted/60"
              }`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-foreground">{r.nombre}</span>
                <span className="text-xs text-muted-foreground">{r.bolsa}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {TIPO_ETIQUETA[r.tipo] ?? r.tipo_display}
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">{r.simbolo}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
