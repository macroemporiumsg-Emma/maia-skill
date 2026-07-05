"""
market-agent-signals: servidor HTTP del Agente de Señales de Trading Intradía.

Expone, sobre datos REALES (Yahoo Finance, FRED, CoinGecko, Yahoo News —
todos sin API key), endpoints para que el dashboard MAIA consulte:

  1. Veredictos técnicos alcista/bajista (heurística EMA/RSI/MACD).
  2. Análisis causal generado por un LLM (gpt-5 vía proxy GenSpark) que
     razona sobre la señal técnica + contexto macro + noticias reales,
     produciendo una recomendación comprar/vender/mantener con
     puntuación (-100..100) para alimentar el "barómetro" del frontend.

Sigue el mismo espíritu de "wrapper limpio" usado en ALGONE
(kernels/_shared/kernel_base.py), pero con una API orientada a REST
(GET con query params) en vez del contrato genérico POST /run, porque
aquí el consumidor es directamente el navegador/frontend.

Ejecución local:
    uvicorn market_agents.server:app --host 0.0.0.0 --port 9100

Endpoints:
    GET /health
    GET /signal?symbol=AAPL&interval=5m&range=1d
    GET /signals?symbols=AAPL,BTC-USD,EURUSD=X&interval=5m&range=1d
    GET /analysis?symbol=AAPL&interval=5m&range=1d   (técnico + macro + noticias + LLM causal)
    GET /macro                                        (contexto macro FRED real, standalone)
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import asdict
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from market_agents.causal_llm_agent import (
    CausalAgentError,
    ContextoAnalisis,
    generar_analisis_causal,
)
from market_agents.data_sources.coingecko import (
    CoinGeckoError,
    es_simbolo_cripto,
    fetch_market_data,
)
from market_agents.data_sources.fred import FredError, obtener_contexto_macro
from market_agents.data_sources.yahoo_finance import YahooFinanceError, fetch_intraday
from market_agents.data_sources.yahoo_news import YahooNewsError, fetch_news
from market_agents.signal_agent import generar_señal
from market_agents.technical_engine import calcular_indicadores

KERNEL_NAME = "market-agent-signals"
KERNEL_VERSION = "2.0.0"
_start_time = time.monotonic()

app = FastAPI(title=KERNEL_NAME, version=KERNEL_VERSION)

# CORS abierto en desarrollo para que el dashboard Next.js (puerto 3000)
# pueda consumir este servicio (puerto 9100) directamente desde el navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Cache muy simple en memoria para el contexto macro (FRED cambia como
# mucho una vez al día; no tiene sentido pedirlo en cada request de cada
# símbolo). TTL corto para no servir datos obsoletos por mucho tiempo.
_macro_cache: dict[str, Any] = {"datos": None, "expira_en": 0.0}
_MACRO_TTL_S = 300.0  # 5 minutos


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "kernel": KERNEL_NAME,
        "uptime_s": round(time.monotonic() - _start_time, 3),
    }


def _generar_señal_simbolo(symbol: str, interval: str, range_: str) -> dict[str, Any]:
    try:
        df = fetch_intraday(symbol, interval=interval, range_=range_)
        indicadores = calcular_indicadores(df)
        señal = generar_señal(symbol, indicadores)
        return {"ok": True, "data": asdict(señal)}
    except YahooFinanceError as exc:
        return {"ok": False, "symbol": symbol, "error": f"fuente_de_datos: {exc}"}
    except ValueError as exc:
        return {"ok": False, "symbol": symbol, "error": f"datos_insuficientes: {exc}"}


@app.get("/signal")
def signal(
    symbol: str = Query(..., description="Ticker Yahoo Finance, ej. AAPL, BTC-USD, EURUSD=X"),
    interval: str = Query("5m", description="Intervalo de vela: 1m, 5m, 15m, 1h..."),
    range: str = Query("1d", description="Rango histórico a traer: 1d, 5d, 1mo..."),
) -> dict[str, Any]:
    resultado = _generar_señal_simbolo(symbol, interval, range)
    if not resultado["ok"]:
        raise HTTPException(status_code=502, detail=resultado["error"])
    return resultado["data"]


@app.get("/signals")
def signals(
    symbols: str = Query(..., description="Lista de tickers separados por coma"),
    interval: str = Query("5m"),
    range: str = Query("1d"),
) -> dict[str, Any]:
    lista = [s.strip() for s in symbols.split(",") if s.strip()]
    resultados = [_generar_señal_simbolo(s, interval, range) for s in lista]
    return {
        "generado_en_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "resultados": resultados,
    }


def _obtener_contexto_macro_cacheado() -> list[dict[str, Any]]:
    ahora = time.monotonic()
    if _macro_cache["datos"] is not None and ahora < _macro_cache["expira_en"]:
        return _macro_cache["datos"]
    try:
        series = obtener_contexto_macro()
        datos = [asdict(s) for s in series]
        _macro_cache["datos"] = datos
        _macro_cache["expira_en"] = ahora + _MACRO_TTL_S
        return datos
    except FredError:
        # Si falla FRED, se devuelve lo último cacheado (si existe) o
        # lista vacía — el análisis LLM sigue siendo válido sin macro,
        # solo con menos contexto (se documenta así en el propio prompt).
        return _macro_cache["datos"] or []


@app.get("/macro")
def macro() -> dict[str, Any]:
    """Contexto macroeconómico real (FRED), expuesto también standalone."""
    datos = _obtener_contexto_macro_cacheado()
    return {
        "generado_en_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "series": datos,
    }


async def _construir_analisis_causal(symbol: str, interval: str, range_: str) -> dict[str, Any]:
    """
    Orquesta TODAS las fuentes reales (Yahoo Finance, FRED, Yahoo News,
    CoinGecko si aplica) y llama al agente LLM causal.

    Cada fuente se resuelve en paralelo (asyncio.to_thread, ya que los
    conectores son síncronos con httpx) y los fallos de fuentes
    secundarias (macro, noticias, cripto) NO abortan el análisis — solo
    la señal técnica es estrictamente necesaria. Esto se documenta
    explícitamente en la respuesta (`fuentes_disponibles`).
    """
    # 1. Señal técnica (obligatoria: sin esto no hay análisis posible)
    try:
        df = await asyncio.to_thread(fetch_intraday, symbol, interval=interval, range_=range_)
        indicadores = calcular_indicadores(df)
        señal = generar_señal(symbol, indicadores)
    except YahooFinanceError as exc:
        raise HTTPException(status_code=502, detail=f"fuente_de_datos: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"datos_insuficientes: {exc}") from exc

    # 2. Fuentes secundarias, en paralelo, tolerantes a fallo individual.
    async def _macro_segura() -> list[dict[str, Any]]:
        return await asyncio.to_thread(_obtener_contexto_macro_cacheado)

    async def _noticias_seguras() -> list[dict[str, Any]]:
        try:
            noticias = await asyncio.to_thread(fetch_news, symbol, 6)
            return [asdict(n) for n in noticias]
        except YahooNewsError:
            return []

    async def _cripto_segura() -> Optional[dict[str, Any]]:
        if not es_simbolo_cripto(symbol):
            return None
        try:
            datos = await asyncio.to_thread(fetch_market_data, symbol)
            return asdict(datos)
        except CoinGeckoError:
            return None

    contexto_macro, noticias, datos_cripto = await asyncio.gather(
        _macro_segura(), _noticias_seguras(), _cripto_segura()
    )

    # 3. Agente LLM causal.
    ctx = ContextoAnalisis(
        simbolo=symbol,
        señal_tecnica=asdict(señal),
        contexto_macro=contexto_macro,
        noticias=noticias,
        datos_cripto=datos_cripto,
    )
    try:
        analisis = await asyncio.to_thread(generar_analisis_causal, ctx)
    except CausalAgentError as exc:
        raise HTTPException(status_code=502, detail=f"agente_llm_causal: {exc}") from exc

    return {
        "simbolo": symbol,
        "señal_tecnica": asdict(señal),
        "analisis_causal": asdict(analisis),
        "fuentes_disponibles": {
            "yahoo_finance_precios": True,
            "fred_macro": len(contexto_macro) > 0,
            "yahoo_finance_noticias": len(noticias) > 0,
            "coingecko_cripto": datos_cripto is not None,
        },
        "generado_en_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/analysis")
async def analysis(
    symbol: str = Query(..., description="Ticker, ej. AAPL, BTC-USD, EURUSD=X"),
    interval: str = Query("5m"),
    range: str = Query("1d"),
) -> dict[str, Any]:
    """
    Análisis completo: señal técnica + contexto macro real (FRED) +
    noticias reales (Yahoo) + (si aplica) datos cripto (CoinGecko),
    sintetizado por un agente LLM causal en una recomendación final
    comprar/vender/mantener con puntuación para el barómetro.
    """
    return await _construir_analisis_causal(symbol, interval, range)


@app.get("/analyses")
async def analyses(
    symbols: str = Query(..., description="Lista de tickers separados por coma"),
    interval: str = Query("5m"),
    range: str = Query("1d"),
) -> dict[str, Any]:
    lista = [s.strip() for s in symbols.split(",") if s.strip()]

    async def _uno(simbolo: str) -> dict[str, Any]:
        try:
            data = await _construir_analisis_causal(simbolo, interval, range)
            return {"ok": True, "data": data}
        except HTTPException as exc:
            return {"ok": False, "symbol": simbolo, "error": str(exc.detail)}

    resultados = await asyncio.gather(*(_uno(s) for s in lista))
    return {
        "generado_en_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "resultados": resultados,
    }
