"""
Conector REAL (no simulado) a Yahoo Finance Chart API.

Esta es la primera pieza concreta del "DataSourceRegistry" (18 fuentes)
diseñado conceptualmente en sesiones anteriores. A diferencia de ese
diseño, este módulo SÍ hace peticiones HTTP reales a un endpoint público
y gratuito (sin API key) y devuelve velas OHLCV reales.

Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
No requiere autenticación, pero requiere un User-Agent de navegador
(Yahoo bloquea peticiones sin uno).
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import httpx
import pandas as pd

BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
HEADERS = {"User-Agent": "Mozilla/5.0 (ALGONE/MAIA market-agent; +https://github.com)"}


class YahooFinanceError(RuntimeError):
    pass


@dataclass
class Vela(object):
    """Una vela OHLCV con su timestamp Unix (segundos, UTC)."""

    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: int


def fetch_intraday(
    symbol: str,
    interval: str = "5m",
    range_: str = "1d",
    timeout: float = 10.0,
    max_retries: int = 2,
) -> pd.DataFrame:
    """
    Descarga velas intradía REALES de Yahoo Finance para `symbol`.

    Parámetros:
        symbol: ticker de Yahoo (ej. "AAPL", "EURUSD=X", "BTC-USD", "^GSPC")
        interval: "1m", "5m", "15m", "1h", etc.
        range_: "1d", "5d", "1mo", etc. (rango total de historia a traer)

    Devuelve un DataFrame con columnas [timestamp, open, high, low, close,
    volume] ordenado cronológicamente, indexado por timestamp UTC.

    Lanza YahooFinanceError si el símbolo no existe o la API falla tras
    los reintentos (nunca devuelve datos falsos/interpolados como
    fallback silencioso).
    """
    url = BASE_URL.format(symbol=symbol)
    params = {"interval": interval, "range": range_, "includePrePost": "false"}

    last_error: Optional[Exception] = None
    for intento in range(max_retries + 1):
        try:
            resp = httpx.get(url, params=params, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            payload = resp.json()
            return _parse_chart_payload(payload, symbol)
        except (httpx.HTTPError, YahooFinanceError) as exc:
            last_error = exc
            if intento < max_retries:
                time.sleep(0.5 * (intento + 1))
                continue
    raise YahooFinanceError(
        f"No se pudo obtener datos intradía reales para '{symbol}' tras "
        f"{max_retries + 1} intentos: {last_error}"
    )


# Orden de rangos a probar cuando el rango solicitado no trae suficientes
# velas para indicadores estables (p. ej. futuros como MNQ=F, cuya sesión
# intradía reportada por Yahoo en range="1d" puede traer solo ~15 velas de
# 5m en vez de las ~78 esperadas de una sesión regular de equities).
RANGE_FALLBACK_ORDEN = ["1d", "5d", "1mo"]


def fetch_intraday_suficiente(
    symbol: str,
    interval: str = "5m",
    range_: str = "1d",
    min_velas: int = 30,
    timeout: float = 10.0,
    max_retries: int = 2,
) -> pd.DataFrame:
    """
    Igual que `fetch_intraday`, pero si el rango solicitado no trae al
    menos `min_velas` velas (p. ej. algunos futuros como MNQ=F, cuya
    sesión de trading reportada por Yahoo en range="1d" es demasiado
    corta), reintenta automáticamente con rangos progresivamente más
    amplios (1d -> 5d -> 1mo) hasta conseguir suficientes velas.

    Esto es un fallback TRANSPARENTE, no un parche silencioso: el
    DataFrame devuelto expone en `df.attrs["range_solicitado"]` y
    `df.attrs["range_usado"]` cuál rango se pidió originalmente y cuál
    terminó usándose, para que el resto del sistema (y el frontend) lo
    pueda comunicar al usuario en vez de ocultarlo.

    Nunca inventa velas: si ni siquiera el rango más amplio alcanza
    `min_velas`, devuelve igualmente el mejor DataFrame obtenido (el más
    largo) — la validación final de `>=30 velas` sigue siendo
    responsabilidad de `technical_engine.calcular_indicadores`.
    """
    rangos_a_probar = [range_]
    for r in RANGE_FALLBACK_ORDEN:
        if r not in rangos_a_probar:
            rangos_a_probar.append(r)

    mejor_df: Optional[pd.DataFrame] = None
    mejor_rango = range_
    ultimo_error: Optional[Exception] = None

    for r in rangos_a_probar:
        try:
            df = fetch_intraday(symbol, interval=interval, range_=r, timeout=timeout, max_retries=max_retries)
        except YahooFinanceError as exc:
            ultimo_error = exc
            continue
        if mejor_df is None or len(df) > len(mejor_df):
            mejor_df = df
            mejor_rango = r
        if len(df) >= min_velas:
            break

    if mejor_df is None:
        raise ultimo_error or YahooFinanceError(
            f"No se pudo obtener datos intradía reales para '{symbol}' con ningún rango de fallback."
        )

    mejor_df.attrs["range_solicitado"] = range_
    mejor_df.attrs["range_usado"] = mejor_rango
    return mejor_df


def _parse_chart_payload(payload: dict, symbol: str) -> pd.DataFrame:
    chart = payload.get("chart", {})
    if chart.get("error"):
        raise YahooFinanceError(f"Yahoo devolvió error para '{symbol}': {chart['error']}")

    results = chart.get("result") or []
    if not results:
        raise YahooFinanceError(f"Yahoo no devolvió resultados para '{symbol}' (símbolo inválido?)")

    result = results[0]
    timestamps = result.get("timestamp")
    if not timestamps:
        raise YahooFinanceError(f"Yahoo no devolvió velas para '{symbol}' (mercado cerrado o rango vacío)")

    quote = result["indicators"]["quote"][0]
    df = pd.DataFrame(
        {
            "timestamp": timestamps,
            "open": quote["open"],
            "high": quote["high"],
            "low": quote["low"],
            "close": quote["close"],
            "volume": quote["volume"],
        }
    )
    # Yahoo a veces devuelve None en velas incompletas (mercado recién abierto);
    # las descartamos en vez de rellenarlas con datos falsos.
    df = df.dropna(subset=["open", "high", "low", "close"]).reset_index(drop=True)
    if df.empty:
        raise YahooFinanceError(f"Todas las velas de '{symbol}' llegaron incompletas (sin OHLC válido)")

    df["datetime_utc"] = pd.to_datetime(df["timestamp"], unit="s", utc=True)
    meta = result.get("meta", {})
    df.attrs["symbol"] = symbol
    df.attrs["currency"] = meta.get("currency")
    df.attrs["exchange"] = meta.get("fullExchangeName")
    df.attrs["regular_market_price"] = meta.get("regularMarketPrice")
    df.attrs["fifty_two_week_high"] = meta.get("fiftyTwoWeekHigh")
    df.attrs["fifty_two_week_low"] = meta.get("fiftyTwoWeekLow")
    return df
