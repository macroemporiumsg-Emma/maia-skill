"""
Conector REAL (no simulado) a FRED (Federal Reserve Economic Data)
usando el endpoint público de descarga CSV del graficador, que NO
requiere API key (a diferencia de la API JSON oficial de FRED).

Endpoint: https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}

Se usa para dar "contexto macro" al agente LLM causal: tipos de interés,
inflación, etc. — series que pueden explicar movimientos de mercado que
los indicadores técnicos puros (EMA/RSI/MACD) no capturan.

Series por defecto soportadas (id FRED real, verificado):
    DFF     -> Federal Funds Effective Rate (diario)
    DGS10   -> 10-Year Treasury Constant Maturity Rate (diario)
    DGS2    -> 2-Year Treasury Constant Maturity Rate (diario)
    T10Y2Y  -> Spread 10Y-2Y (indicador clásico de curva invertida/recesión)
    VIXCLS  -> CBOE Volatility Index (VIX) de cierre
    DTWEXBGS-> Índice del dólar (trade-weighted, broad)
"""
from __future__ import annotations

import io
import time
from dataclasses import dataclass
from typing import Optional

import httpx
import pandas as pd

BASE_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv"
HEADERS = {"User-Agent": "Mozilla/5.0 (ALGONE/MAIA market-agent; +https://github.com)"}

SERIES_DESCRIPCION = {
    "DFF": "Tasa de fondos federales (Fed Funds Effective Rate)",
    "DGS10": "Rendimiento bono del Tesoro EE.UU. a 10 años",
    "DGS2": "Rendimiento bono del Tesoro EE.UU. a 2 años",
    "T10Y2Y": "Spread de curva 10Y-2Y (negativo = curva invertida, señal recesiva)",
    "VIXCLS": "Índice de volatilidad VIX (CBOE), cierre diario",
    "DTWEXBGS": "Índice del dólar estadounidense ponderado por comercio (broad)",
}


class FredError(RuntimeError):
    pass


@dataclass
class SerieMacro:
    series_id: str
    descripcion: str
    valor_actual: float
    valor_anterior: Optional[float]
    variacion: Optional[float]
    fecha_actual: str
    fecha_anterior: Optional[str]
    n_observaciones_usadas: int


def fetch_series(
    series_id: str,
    timeout: float = 10.0,
    max_retries: int = 2,
) -> pd.DataFrame:
    """
    Descarga una serie temporal REAL de FRED en formato CSV (sin API key).

    Devuelve un DataFrame con columnas [observation_date, value], solo con
    filas donde el valor es numérico (FRED usa "." para huecos/festivos,
    que se descartan explícitamente en vez de rellenarse).

    Lanza FredError si la serie no existe o la petición falla tras
    reintentos.
    """
    params = {"id": series_id}
    last_error: Optional[Exception] = None
    for intento in range(max_retries + 1):
        try:
            resp = httpx.get(BASE_URL, params=params, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            texto = resp.text
            if not texto.strip().lower().startswith("observation_date"):
                raise FredError(
                    f"FRED no devolvió un CSV válido para la serie '{series_id}' "
                    "(¿id de serie incorrecto?)"
                )
            df = pd.read_csv(io.StringIO(texto))
            valor_col = df.columns[1]
            df[valor_col] = pd.to_numeric(df[valor_col], errors="coerce")
            df = df.dropna(subset=[valor_col]).reset_index(drop=True)
            if df.empty:
                raise FredError(f"La serie FRED '{series_id}' no tiene observaciones numéricas válidas")
            df = df.rename(columns={valor_col: "value"})
            return df
        except (httpx.HTTPError, FredError) as exc:
            last_error = exc
            if intento < max_retries:
                time.sleep(0.5 * (intento + 1))
                continue
    raise FredError(
        f"No se pudo obtener la serie FRED real '{series_id}' tras "
        f"{max_retries + 1} intentos: {last_error}"
    )


def obtener_contexto_macro(series_ids: Optional[list[str]] = None) -> list[SerieMacro]:
    """
    Descarga varias series macro REALES de FRED y devuelve, por cada una,
    el último valor observado, el anterior, y la variación — pensado para
    alimentar directamente al agente LLM causal como "contexto macro".

    Si una serie individual falla, se omite (con un aviso implícito vía
    longitud de la lista devuelta) en vez de abortar todo el contexto
    macro por un solo fallo de red.
    """
    if series_ids is None:
        series_ids = ["DFF", "DGS10", "T10Y2Y", "VIXCLS"]

    resultados: list[SerieMacro] = []
    for sid in series_ids:
        try:
            df = fetch_series(sid)
            ultimo = df.iloc[-1]
            anterior = df.iloc[-2] if len(df) >= 2 else None
            resultados.append(
                SerieMacro(
                    series_id=sid,
                    descripcion=SERIES_DESCRIPCION.get(sid, sid),
                    valor_actual=round(float(ultimo["value"]), 4),
                    valor_anterior=round(float(anterior["value"]), 4) if anterior is not None else None,
                    variacion=(
                        round(float(ultimo["value"]) - float(anterior["value"]), 4)
                        if anterior is not None
                        else None
                    ),
                    fecha_actual=str(ultimo["observation_date"]),
                    fecha_anterior=str(anterior["observation_date"]) if anterior is not None else None,
                    n_observaciones_usadas=len(df),
                )
            )
        except FredError:
            # Se omite la serie individual; el resto del contexto macro
            # sigue siendo válido y real (no se rellena con datos falsos).
            continue
    return resultados
