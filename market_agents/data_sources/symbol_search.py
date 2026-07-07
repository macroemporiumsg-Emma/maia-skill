"""
Conector REAL (no simulado) al buscador de símbolos de Yahoo Finance,
sin API key. Resuelve el problema de UX de que el usuario deba conocer
el ticker exacto (ej. "AAPL") de antemano: permite buscar por nombre de
empresa/activo ("apple", "bitcoin", "euro dolar", "nvidia"...) y devuelve
los símbolos reales correspondientes con su nombre completo, tipo de
activo y bolsa/mercado.

Endpoint: https://query1.finance.yahoo.com/v1/finance/search
No requiere autenticación, pero requiere un User-Agent de navegador.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import httpx

BASE_URL = "https://query1.finance.yahoo.com/v1/finance/search"
HEADERS = {"User-Agent": "Mozilla/5.0 (ALGONE/MAIA market-agent; +https://github.com)"}

# Tipos de activo relevantes para trading intradía (se filtran ETFs de
# opciones exóticas, índices sintéticos, etc. que no aportan valor aquí).
TIPOS_RELEVANTES = {"EQUITY", "CRYPTOCURRENCY", "CURRENCY", "ETF", "INDEX", "FUTURE"}


class SymbolSearchError(RuntimeError):
    pass


@dataclass
class ResultadoBusqueda:
    simbolo: str
    nombre: str
    tipo: str  # "EQUITY" | "CRYPTOCURRENCY" | "CURRENCY" | "ETF" | "INDEX" | "FUTURE"
    tipo_display: str  # etiqueta legible, ej. "Equity", "Cryptocurrency"
    bolsa: str  # ej. "NASDAQ", "CCY", "CCC"


def buscar_simbolos(
    consulta: str,
    max_resultados: int = 8,
    timeout: float = 8.0,
    max_retries: int = 2,
) -> list[ResultadoBusqueda]:
    """
    Busca símbolos REALES en Yahoo Finance a partir de un texto libre
    (nombre de empresa, cripto, par de divisas, etc.).

    Devuelve una lista (posiblemente vacía si no hay coincidencias) de
    resultados ordenados por relevancia (score de Yahoo), filtrados a
    tipos de activo relevantes para trading intradía.

    Lanza SymbolSearchError solo si la petición HTTP falla tras
    reintentos; una búsqueda sin resultados NO es un error.
    """
    consulta = consulta.strip()
    if not consulta:
        return []

    params = {
        "q": consulta,
        "quotesCount": max_resultados * 2,  # se pide de más porque luego se filtra por tipo
        "newsCount": 0,
        "listsCount": 0,
    }

    last_error: Optional[Exception] = None
    for intento in range(max_retries + 1):
        try:
            resp = httpx.get(BASE_URL, params=params, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            payload = resp.json()
            return _parse_resultados(payload, max_resultados)
        except httpx.HTTPError as exc:
            last_error = exc
            if intento < max_retries:
                time.sleep(0.4 * (intento + 1))
                continue
    raise SymbolSearchError(
        f"No se pudo buscar símbolos reales para '{consulta}' tras "
        f"{max_retries + 1} intentos: {last_error}"
    )


def _parse_resultados(payload: dict, max_resultados: int) -> list[ResultadoBusqueda]:
    quotes = payload.get("quotes") or []
    resultados: list[ResultadoBusqueda] = []
    for q in quotes:
        tipo = q.get("quoteType", "")
        simbolo = q.get("symbol")
        if not simbolo or tipo not in TIPOS_RELEVANTES:
            continue
        nombre = q.get("longname") or q.get("shortname") or simbolo
        resultados.append(
            ResultadoBusqueda(
                simbolo=simbolo,
                nombre=nombre,
                tipo=tipo,
                tipo_display=q.get("typeDisp", tipo.title()),
                bolsa=q.get("exchDisp", q.get("exchange", "")),
            )
        )
        if len(resultados) >= max_resultados:
            break
    return resultados
