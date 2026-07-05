"""
Agente de señales de trading intradía.

Combina los indicadores técnicos REALES (technical_engine.py, calculados
sobre velas REALES de data_sources/) en un veredicto explícito
alcista/bajista/neutral, con:
  - una puntuación numérica de convicción (-100 a +100),
  - el razonamiento de CADA regla que disparó (transparente, no caja negra),
  - un nivel de confianza cualitativo derivado de cuántas señales concuerdan.

Reglas de votación (cada una aporta puntos a la puntuación compuesta):
  1. Cruce EMA9/EMA21 reciente (últimas 3 velas)      -> ±35 puntos
  2. Posición EMA9 vs EMA21 (tendencia de fondo)        -> ±15 puntos
  3. RSI14: sobrecompra (>70) / sobreventa (<30)         -> ±20 puntos
     (en sobreventa el RSI es señal ALCISTA de rebote, y viceversa)
  4. MACD: histograma positivo/negativo y su pendiente   -> ±30 puntos

Puntuación final en [-100, 100]:
  > +20  -> "alcista"
  < -20  -> "bajista"
  resto  -> "neutral"

Esto es una heurística técnica clásica (no un modelo de ML entrenado);
se documenta así explícitamente para no sobre-representar su fiabilidad.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from market_agents.technical_engine import IndicadoresResultado


@dataclass
class SeñalResultado:
    simbolo: str
    veredicto: str  # "alcista" | "bajista" | "neutral"
    puntuacion: float  # -100..100
    confianza: str  # "alta" | "media" | "baja"
    razones: list[str] = field(default_factory=list)
    indicadores: dict[str, Any] = field(default_factory=dict)
    advertencia: str = (
        "Señal generada por heurística técnica clásica (EMA/RSI/MACD) sobre "
        "datos intradía reales de Yahoo Finance. No es asesoría financiera; "
        "es análisis educativo de corto plazo, no garantiza resultados futuros."
    )


def generar_señal(simbolo: str, indicadores: IndicadoresResultado) -> SeñalResultado:
    puntos = 0.0
    razones: list[str] = []

    # --- Regla 1: cruce EMA9/EMA21 reciente ---
    if indicadores.cruce_ema == "alcista":
        puntos += 35
        razones.append(
            f"Cruce alcista reciente de EMA9 ({indicadores.ema9}) sobre EMA21 "
            f"({indicadores.ema21}) en las últimas velas — señal clásica de "
            "cambio de momentum a corto plazo."
        )
    elif indicadores.cruce_ema == "bajista":
        puntos -= 35
        razones.append(
            f"Cruce bajista reciente de EMA9 ({indicadores.ema9}) bajo EMA21 "
            f"({indicadores.ema21}) en las últimas velas — señal clásica de "
            "pérdida de momentum a corto plazo."
        )

    # --- Regla 2: posición relativa EMA9 vs EMA21 (tendencia de fondo) ---
    diff_ema = indicadores.ema9 - indicadores.ema21
    if diff_ema > 0:
        puntos += 15
        razones.append(
            f"EMA9 ({indicadores.ema9}) por encima de EMA21 ({indicadores.ema21}): "
            "tendencia de fondo de corto plazo alcista."
        )
    elif diff_ema < 0:
        puntos -= 15
        razones.append(
            f"EMA9 ({indicadores.ema9}) por debajo de EMA21 ({indicadores.ema21}): "
            "tendencia de fondo de corto plazo bajista."
        )

    # --- Regla 3: RSI14 (sobrecompra/sobreventa -> señal de reversión) ---
    if indicadores.rsi14 >= 70:
        puntos -= 20
        razones.append(
            f"RSI14={indicadores.rsi14} en zona de sobrecompra (>=70): "
            "aumenta el riesgo de una corrección/retroceso de corto plazo."
        )
    elif indicadores.rsi14 <= 30:
        puntos += 20
        razones.append(
            f"RSI14={indicadores.rsi14} en zona de sobreventa (<=30): "
            "aumenta la probabilidad de un rebote técnico de corto plazo."
        )
    else:
        razones.append(f"RSI14={indicadores.rsi14} en zona neutral (30-70), sin señal de reversión.")

    # --- Regla 4: MACD (momentum y su aceleración) ---
    if indicadores.macd_histograma > 0 and indicadores.macd_linea > indicadores.macd_señal:
        puntos += 30
        razones.append(
            f"MACD ({indicadores.macd_linea}) por encima de su señal "
            f"({indicadores.macd_señal}) con histograma positivo "
            f"({indicadores.macd_histograma}): momentum alcista confirmado."
        )
    elif indicadores.macd_histograma < 0 and indicadores.macd_linea < indicadores.macd_señal:
        puntos -= 30
        razones.append(
            f"MACD ({indicadores.macd_linea}) por debajo de su señal "
            f"({indicadores.macd_señal}) con histograma negativo "
            f"({indicadores.macd_histograma}): momentum bajista confirmado."
        )
    else:
        razones.append(
            f"MACD ({indicadores.macd_linea}) y su señal ({indicadores.macd_señal}) "
            "sin confirmación clara de dirección (divergencia interna)."
        )

    puntos = max(-100.0, min(100.0, puntos))

    if puntos > 20:
        veredicto = "alcista"
    elif puntos < -20:
        veredicto = "bajista"
    else:
        veredicto = "neutral"

    n_señales_fuertes = sum(1 for r in razones if "reciente" in r or "confirmado" in r)
    if abs(puntos) >= 60:
        confianza = "alta"
    elif abs(puntos) >= 30:
        confianza = "media"
    else:
        confianza = "baja"

    return SeñalResultado(
        simbolo=simbolo,
        veredicto=veredicto,
        puntuacion=round(puntos, 2),
        confianza=confianza,
        razones=razones,
        indicadores={
            "ema9": indicadores.ema9,
            "ema21": indicadores.ema21,
            "rsi14": indicadores.rsi14,
            "macd_linea": indicadores.macd_linea,
            "macd_señal": indicadores.macd_señal,
            "macd_histograma": indicadores.macd_histograma,
            "atr14": indicadores.atr14,
            "precio_actual": indicadores.precio_actual,
            "cruce_ema": indicadores.cruce_ema,
            "velas_usadas": indicadores.velas_usadas,
        },
    )
