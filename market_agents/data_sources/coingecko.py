"""
Conector REAL (no simulado) a la API pública de CoinGecko, sin API key,
para datos detallados de criptomonedas: precio, market cap, volumen 24h,
variación 24h, rango 24h, all-time-high/low.

A diferencia de yahoo_finance.py (que también sirve tickers cripto como
"BTC-USD"), CoinGecko aporta métricas específicas del mercado cripto que
Yahoo no expone (market cap real, dominancia, volumen agregado de todos
los exchanges) — útil como señal adicional para el agente LLM causal.

Endpoint: https://api.coingecko.com/api/v3/coins/markets
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import httpx

BASE_URL = "https://api.coingecko.com/api/v3/coins/markets"
HEADERS = {"User-Agent": "Mozilla/5.0 (ALGONE/MAIA market-agent; +https://github.com)"}

# Mapeo de símbolos comunes (tal como los usaría un usuario o el ticker
# de Yahoo sin sufijo) a los "id" internos de CoinGecko.
SIMBOLO_A_ID = {
    "BTC": "bitcoin",
    "BTC-USD": "bitcoin",
    "ETH": "ethereum",
    "ETH-USD": "ethereum",
    "SOL": "solana",
    "SOL-USD": "solana",
    "XRP": "ripple",
    "XRP-USD": "ripple",
    "DOGE": "dogecoin",
    "DOGE-USD": "dogecoin",
    "ADA": "cardano",
    "ADA-USD": "cardano",
    "BNB": "binancecoin",
    "BNB-USD": "binancecoin",
}


class CoinGeckoError(RuntimeError):
    pass


@dataclass
class DatosCripto:
    id_coingecko: str
    simbolo: str
    nombre: str
    precio_usd: float
    market_cap_usd: float
    market_cap_rank: Optional[int]
    volumen_24h_usd: float
    variacion_24h_pct: Optional[float]
    high_24h_usd: float
    low_24h_usd: float
    ath_usd: float
    ath_variacion_pct: float
    actualizado_en: str


def resolver_id(simbolo_o_ticker: str) -> str:
    """Traduce un símbolo/ticker de usuario (BTC, BTC-USD...) al id de CoinGecko."""
    clave = simbolo_o_ticker.strip().upper()
    if clave in SIMBOLO_A_ID:
        return SIMBOLO_A_ID[clave]
    # Si ya viene en formato id de CoinGecko (minúsculas, ej. "bitcoin"), se usa tal cual.
    return simbolo_o_ticker.strip().lower()


def fetch_market_data(
    simbolo_o_ticker: str,
    vs_currency: str = "usd",
    timeout: float = 10.0,
    max_retries: int = 2,
) -> DatosCripto:
    """
    Descarga datos de mercado REALES de CoinGecko para una criptomoneda.

    Lanza CoinGeckoError si el símbolo no se reconoce o la API falla tras
    reintentos (nunca fabrica datos de repuesto).
    """
    coin_id = resolver_id(simbolo_o_ticker)
    params = {
        "vs_currency": vs_currency,
        "ids": coin_id,
        "order": "market_cap_desc",
        "per_page": 1,
        "page": 1,
        "sparkline": "false",
        "price_change_percentage": "24h",
    }

    last_error: Optional[Exception] = None
    for intento in range(max_retries + 1):
        try:
            resp = httpx.get(BASE_URL, params=params, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            payload = resp.json()
            if not payload:
                raise CoinGeckoError(
                    f"CoinGecko no devolvió datos para '{simbolo_o_ticker}' "
                    f"(id resuelto: '{coin_id}') — ¿símbolo cripto no soportado?"
                )
            m = payload[0]
            return DatosCripto(
                id_coingecko=m["id"],
                simbolo=m["symbol"].upper(),
                nombre=m["name"],
                precio_usd=float(m["current_price"]),
                market_cap_usd=float(m["market_cap"]),
                market_cap_rank=m.get("market_cap_rank"),
                volumen_24h_usd=float(m["total_volume"]),
                variacion_24h_pct=(
                    float(m["price_change_percentage_24h"])
                    if m.get("price_change_percentage_24h") is not None
                    else None
                ),
                high_24h_usd=float(m["high_24h"]),
                low_24h_usd=float(m["low_24h"]),
                ath_usd=float(m["ath"]),
                ath_variacion_pct=float(m["ath_change_percentage"]),
                actualizado_en=m["last_updated"],
            )
        except (httpx.HTTPError, CoinGeckoError, KeyError, ValueError) as exc:
            last_error = exc
            if intento < max_retries:
                time.sleep(0.5 * (intento + 1))
                continue
    raise CoinGeckoError(
        f"No se pudo obtener datos reales de CoinGecko para '{simbolo_o_ticker}' "
        f"tras {max_retries + 1} intentos: {last_error}"
    )


def es_simbolo_cripto(simbolo: str) -> bool:
    """Heurística simple para saber si un ticker corresponde a una cripto conocida."""
    clave = simbolo.strip().upper()
    return clave in SIMBOLO_A_ID
