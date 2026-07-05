"""
Motor de indicadores técnicos REALES para señales de trading intradía.

Calcula, sobre velas OHLCV reales (obtenidas de data_sources/), los
indicadores técnicos clásicos con sus fórmulas matemáticas estándar
(no simulados, no aleatorios):

- EMA (Exponential Moving Average) 9 y 21 periodos: cruce rápido/lento,
  la señal de tendencia intradía más usada.
- RSI (Relative Strength Index) 14 periodos: sobrecompra/sobreventa.
- MACD (Moving Average Convergence Divergence) 12/26/9: momentum e
  histograma de aceleración de tendencia.
- ATR (Average True Range) 14 periodos: volatilidad, usado para
  dimensionar el "umbral" de significancia de un movimiento.

Todas las fórmulas siguen la definición estándar de Wilder/Appel;
ver referencias en cada función.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd


def ema(serie: pd.Series, periodo: int) -> pd.Series:
    """Media móvil exponencial estándar: alpha = 2 / (periodo + 1)."""
    return serie.ewm(span=periodo, adjust=False).mean()


def rsi(serie: pd.Series, periodo: int = 14) -> pd.Series:
    """
    RSI de Wilder (1978): compara la magnitud de ganancias vs pérdidas
    recientes. RSI = 100 - 100 / (1 + RS), RS = media_ganancias / media_perdidas
    (medias suavizadas exponencialmente al estilo Wilder, alpha = 1/periodo).
    """
    delta = serie.diff()
    ganancia = delta.clip(lower=0.0)
    perdida = -delta.clip(upper=0.0)

    media_ganancia = ganancia.ewm(alpha=1.0 / periodo, adjust=False, min_periods=periodo).mean()
    media_perdida = perdida.ewm(alpha=1.0 / periodo, adjust=False, min_periods=periodo).mean()

    rs = media_ganancia / media_perdida.replace(0.0, np.nan)
    resultado = 100.0 - (100.0 / (1.0 + rs))
    # Cuando la media de pérdidas es 0 (solo subidas), RSI = 100 por definición.
    resultado = resultado.where(media_perdida != 0.0, 100.0)
    return resultado


def macd(serie: pd.Series, rapida: int = 12, lenta: int = 26, señal: int = 9) -> pd.DataFrame:
    """
    MACD de Appel (1979): línea MACD = EMA_rápida - EMA_lenta;
    línea de señal = EMA(MACD, señal); histograma = MACD - señal.
    """
    ema_rapida = ema(serie, rapida)
    ema_lenta = ema(serie, lenta)
    linea_macd = ema_rapida - ema_lenta
    linea_señal = ema(linea_macd, señal)
    histograma = linea_macd - linea_señal
    return pd.DataFrame({"macd": linea_macd, "señal": linea_señal, "histograma": histograma})


def atr(df: pd.DataFrame, periodo: int = 14) -> pd.Series:
    """
    Average True Range de Wilder (1978): TR = max(high-low, |high-close_prev|,
    |low-close_prev|); ATR = media móvil suavizada de Wilder del TR.
    """
    high, low, close = df["high"], df["low"], df["close"]
    close_prev = close.shift(1)
    tr = pd.concat(
        [(high - low), (high - close_prev).abs(), (low - close_prev).abs()], axis=1
    ).max(axis=1)
    return tr.ewm(alpha=1.0 / periodo, adjust=False, min_periods=periodo).mean()


@dataclass
class IndicadoresResultado:
    ema9: float
    ema21: float
    rsi14: float
    macd_linea: float
    macd_señal: float
    macd_histograma: float
    atr14: float
    precio_actual: float
    cruce_ema: str  # "alcista" | "bajista" | "sin_cruce_reciente"
    velas_usadas: int
    detalle_serie: dict = field(default_factory=dict)


def calcular_indicadores(df: pd.DataFrame) -> IndicadoresResultado:
    """
    Calcula el set completo de indicadores sobre un DataFrame OHLCV real
    (tal como lo devuelve data_sources.yahoo_finance.fetch_intraday).

    Requiere un mínimo de 30 velas para que EMA21/RSI14 sean numéricamente
    estables (si no, lanza ValueError explícito en vez de devolver NaN
    silenciosamente).
    """
    n = len(df)
    if n < 30:
        raise ValueError(
            f"Se requieren >=30 velas para indicadores estables, se recibieron {n}. "
            "Aumenta el rango/periodo de la consulta a la fuente de datos."
        )

    cierre = df["close"].astype(float)

    ema9_serie = ema(cierre, 9)
    ema21_serie = ema(cierre, 21)
    rsi_serie = rsi(cierre, 14)
    macd_df = macd(cierre)
    atr_serie = atr(df, 14)

    # Detectar si hubo un cruce EMA9/EMA21 en las últimas 3 velas (señal de
    # cambio de tendencia reciente, más útil para intradía que el estado
    # estático "EMA9 > EMA21" que puede llevar horas sin cambiar).
    diff = (ema9_serie - ema21_serie).tail(4).to_numpy()
    cruce = "sin_cruce_reciente"
    for i in range(1, len(diff)):
        if diff[i - 1] <= 0 and diff[i] > 0:
            cruce = "alcista"
        elif diff[i - 1] >= 0 and diff[i] < 0:
            cruce = "bajista"

    return IndicadoresResultado(
        ema9=round(float(ema9_serie.iloc[-1]), 4),
        ema21=round(float(ema21_serie.iloc[-1]), 4),
        rsi14=round(float(rsi_serie.iloc[-1]), 2),
        macd_linea=round(float(macd_df["macd"].iloc[-1]), 6),
        macd_señal=round(float(macd_df["señal"].iloc[-1]), 6),
        macd_histograma=round(float(macd_df["histograma"].iloc[-1]), 6),
        atr14=round(float(atr_serie.iloc[-1]), 4),
        precio_actual=round(float(cierre.iloc[-1]), 4),
        cruce_ema=cruce,
        velas_usadas=n,
    )
