"""
market-agent-signals: servidor HTTP del Agente de Señales de Trading Intradía.

Expone, sobre datos REALES (Yahoo Finance, sin API key), un endpoint
sencillo para que el dashboard MAIA consulte veredictos alcista/bajista
en vivo. Sigue el mismo espíritu de "wrapper limpio" usado en ALGONE
(kernels/_shared/kernel_base.py), pero con una API orientada a REST
(GET con query params) en vez del contrato genérico POST /run, porque
aquí el consumidor es directamente el navegador/frontend.

Ejecución local:
    uvicorn market_agents.server:app --host 0.0.0.0 --port 9100

Endpoints:
    GET /health
    GET /signal?symbol=AAPL&interval=5m&range=1d
    GET /signals?symbols=AAPL,BTC-USD,EURUSD=X&interval=5m&range=1d
"""
from __future__ import annotations

import time
from dataclasses import asdict
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from market_agents.data_sources.yahoo_finance import YahooFinanceError, fetch_intraday
from market_agents.signal_agent import generar_señal
from market_agents.technical_engine import calcular_indicadores

KERNEL_NAME = "market-agent-signals"
KERNEL_VERSION = "1.0.0"
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
