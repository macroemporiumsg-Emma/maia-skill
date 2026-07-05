"""
Agente LLM "causal" para análisis de mercado intradía.

A diferencia de `signal_agent.py` (heurística técnica pura, puntos fijos
por regla), este módulo usa un modelo de lenguaje grande (gpt-5 vía el
proxy OpenAI-compatible de GenSpark) para RAZONAR sobre la relación
causal probable entre:

  1. Los indicadores técnicos reales (EMA/RSI/MACD/ATR, calculados por
     technical_engine.py sobre velas reales de Yahoo Finance).
  2. El contexto macroeconómico real (tasas de interés, curva de
     rendimientos, VIX — de FRED, fred.py).
  3. Las noticias reales más recientes del símbolo (Yahoo Finance News
     RSS, yahoo_news.py).
  4. (Si aplica) datos de mercado cripto detallados (CoinGecko).

Se llama "causal" en el sentido de que se le pide EXPLÍCITAMENTE al LLM
que no solo correlacione señales, sino que articule una cadena causal
plausible (ej. "la Fed no ha bajado tasas -> bonos suben -> presión sobre
múltiplos de crecimiento -> explica parcialmente la debilidad técnica").
Esto complementa (no sustituye) la heurística técnica transparente de
signal_agent.py: aquí la "caja" se mantiene abierta pidiendo que la
respuesta incluya el razonamiento textual completo, no solo un veredicto.

Salida: siempre JSON estructurado y validado, con:
  - veredicto: "comprar" | "vender" | "mantener"
  - puntuacion: -100..100 (el valor que alimenta el "barómetro" visual)
  - confianza: "alta" | "media" | "baja"
  - razonamiento_causal: texto libre explicando la cadena causal
  - factores_clave: lista corta de los factores que más pesaron
  - riesgos: lista corta de riesgos/incertidumbres a vigilar

Nunca se inventa una recomendación si el LLM falla o los datos de
entrada son insuficientes: se lanza CausalAgentError explícitamente.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Optional

from openai import APIError, APITimeoutError, AuthenticationError, OpenAI

MODELO_DEFECTO = "gpt-5-mini"
BASE_URL_DEFECTO = "https://www.genspark.ai/api/llm_proxy/v1"

VEREDICTOS_VALIDOS = {"comprar", "vender", "mantener"}
CONFIANZAS_VALIDAS = {"alta", "media", "baja"}


class CausalAgentError(RuntimeError):
    pass


def _resolver_credenciales() -> tuple[str, str]:
    """
    Resuelve la API key y base_url del proxy LLM de GenSpark.

    IMPORTANTE (hallazgo de esta sesión): la variable de entorno
    `OPENAI_API_KEY` inyectada por defecto puede estar desincronizada del
    token realmente válido para el proxy `llm_proxy`. La variable
    `GSK_API_KEY` es la que se ha verificado funcional (HTTP 200) contra
    `https://www.genspark.ai/api/llm_proxy/v1/chat/completions`. Se usa
    esa con prioridad, y solo se cae a `OPENAI_API_KEY` como último
    recurso si `GSK_API_KEY` no está definida.
    """
    api_key = os.environ.get("GSK_API_KEY") or os.environ.get("OPENAI_API_KEY")
    base_url = (
        os.environ.get("GSK_BASE_URL")
        or os.environ.get("OPENAI_BASE_URL")
        or BASE_URL_DEFECTO
    )
    # GSK_BASE_URL apunta al dominio raíz (https://www.genspark.ai), no al
    # path completo del proxy; hay que completar el path si hace falta.
    if base_url.rstrip("/").endswith("genspark.ai"):
        base_url = base_url.rstrip("/") + "/api/llm_proxy/v1"

    if not api_key:
        raise CausalAgentError(
            "No se encontró ninguna credencial LLM válida (GSK_API_KEY / "
            "OPENAI_API_KEY). Configura la API key de GenSpark en el "
            "panel del proyecto."
        )
    return api_key, base_url


@dataclass
class ContextoAnalisis:
    """Todo el material real (no simulado) que se le da al LLM para razonar."""

    simbolo: str
    señal_tecnica: dict[str, Any]
    contexto_macro: list[dict[str, Any]] = field(default_factory=list)
    noticias: list[dict[str, Any]] = field(default_factory=list)
    datos_cripto: Optional[dict[str, Any]] = None


@dataclass
class AnalisisCausal:
    simbolo: str
    veredicto: str  # "comprar" | "vender" | "mantener"
    puntuacion: float  # -100..100, alimenta el barómetro
    confianza: str  # "alta" | "media" | "baja"
    razonamiento_causal: str
    factores_clave: list[str] = field(default_factory=list)
    riesgos: list[str] = field(default_factory=list)
    modelo_usado: str = MODELO_DEFECTO
    generado_en_utc: str = ""
    advertencia: str = (
        "Análisis generado por un modelo de lenguaje (LLM) que razona sobre "
        "datos reales de mercado, macroeconomía y noticias. Es una opinión "
        "algorítmica de apoyo, NO asesoría financiera profesional ni una "
        "garantía de resultados; el LLM puede cometer errores de razonamiento."
    )


def _construir_prompt(ctx: ContextoAnalisis) -> str:
    señal = ctx.señal_tecnica
    partes = [
        f"Eres un analista financiero cuantitativo. Analiza el símbolo {ctx.simbolo} "
        "para trading INTRADÍA (horizonte de horas, no meses) usando ÚNICAMENTE los "
        "datos reales que se te dan a continuación. No inventes datos ni cites fuentes "
        "externas que no estén aquí.",
        "",
        "=== 1. SEÑAL TÉCNICA (heurística EMA/RSI/MACD sobre velas reales) ===",
        f"Veredicto técnico: {señal.get('veredicto')}",
        f"Puntuación técnica: {señal.get('puntuacion')} (rango -100..100)",
        f"Confianza técnica: {señal.get('confianza')}",
        "Razones técnicas:",
    ]
    for r in señal.get("razones", []):
        partes.append(f"  - {r}")
    ind = señal.get("indicadores", {})
    partes.append(
        f"Indicadores: precio_actual={ind.get('precio_actual')}, ema9={ind.get('ema9')}, "
        f"ema21={ind.get('ema21')}, rsi14={ind.get('rsi14')}, "
        f"macd_linea={ind.get('macd_linea')}, macd_señal={ind.get('macd_señal')}, "
        f"macd_histograma={ind.get('macd_histograma')}, atr14={ind.get('atr14')}"
    )

    partes.append("")
    partes.append("=== 2. CONTEXTO MACROECONÓMICO REAL (FRED, EE.UU.) ===")
    if ctx.contexto_macro:
        for serie in ctx.contexto_macro:
            partes.append(
                f"  - {serie['descripcion']} ({serie['series_id']}): "
                f"actual={serie['valor_actual']} (fecha {serie['fecha_actual']}), "
                f"anterior={serie.get('valor_anterior')}, "
                f"variación={serie.get('variacion')}"
            )
    else:
        partes.append("  (No se pudo obtener contexto macro real en este momento.)")

    partes.append("")
    partes.append("=== 3. NOTICIAS RECIENTES REALES (Yahoo Finance RSS) ===")
    if ctx.noticias:
        for n in ctx.noticias:
            partes.append(f"  - [{n['fecha_publicacion']}] {n['titulo']}")
    else:
        partes.append("  (Sin noticias recientes disponibles para este símbolo.)")

    if ctx.datos_cripto:
        c = ctx.datos_cripto
        partes.append("")
        partes.append("=== 4. DATOS DE MERCADO CRIPTO REALES (CoinGecko) ===")
        partes.append(
            f"  - Precio: ${c['precio_usd']}, Market cap: ${c['market_cap_usd']:,.0f} "
            f"(rank #{c.get('market_cap_rank')}), Volumen 24h: ${c['volumen_24h_usd']:,.0f}, "
            f"Variación 24h: {c.get('variacion_24h_pct')}%, "
            f"Rango 24h: ${c['low_24h_usd']}-${c['high_24h_usd']}, "
            f"ATH: ${c['ath_usd']} ({c['ath_variacion_pct']}% desde ATH)"
        )

    partes.append("")
    partes.append(
        "=== TAREA ===\n"
        "1. Identifica relaciones CAUSALES plausibles entre el contexto macro, las "
        "noticias y la señal técnica (no solo correlación: explica el MECANISMO, "
        "ej. 'tasas altas -> presión sobre múltiplos de crecimiento -> explica "
        "debilidad técnica en tech').\n"
        "2. Da un veredicto final para intradía: 'comprar', 'vender' o 'mantener'.\n"
        "3. Da una puntuación de convicción de -100 (vender fuerte) a +100 "
        "(comprar fuerte), coherente con tu veredicto y con la evidencia.\n"
        "4. Da un nivel de confianza: 'alta', 'media' o 'baja'.\n"
        "5. Sé conservador: si la evidencia es contradictoria o insuficiente, usa "
        "'mantener' y confianza 'baja'.\n\n"
        "Responde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional, "
        "con exactamente estas claves:\n"
        "{\n"
        '  "veredicto": "comprar" | "vender" | "mantener",\n'
        '  "puntuacion": <número entre -100 y 100>,\n'
        '  "confianza": "alta" | "media" | "baja",\n'
        '  "razonamiento_causal": "<explicación en español, 3-6 frases, citando '
        'el mecanismo causal>",\n'
        '  "factores_clave": ["<factor 1>", "<factor 2>", "..."],\n'
        '  "riesgos": ["<riesgo 1>", "<riesgo 2>"]\n'
        "}"
    )
    return "\n".join(partes)


def generar_analisis_causal(
    ctx: ContextoAnalisis,
    modelo: str = MODELO_DEFECTO,
    timeout: float = 30.0,
) -> AnalisisCausal:
    """
    Llama al LLM (gpt-5 family vía proxy GenSpark) para producir un
    análisis causal estructurado sobre el contexto real dado.

    Lanza CausalAgentError si las credenciales faltan, la llamada falla,
    o la respuesta del LLM no es un JSON válido con las claves esperadas
    (nunca se devuelve una recomendación fabricada localmente como
    fallback silencioso: si el LLM falla, el llamador debe saberlo).
    """
    api_key, base_url = _resolver_credenciales()
    client = OpenAI(api_key=api_key, base_url=base_url, timeout=timeout)

    prompt = _construir_prompt(ctx)

    try:
        resp = client.chat.completions.create(
            model=modelo,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres un analista financiero cuantitativo experto en razonamiento "
                        "causal y trading intradía. Respondes siempre en JSON estricto, "
                        "sin markdown ni texto fuera del objeto JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
    except AuthenticationError as exc:
        raise CausalAgentError(f"Fallo de autenticación con el proxy LLM: {exc}") from exc
    except APITimeoutError as exc:
        raise CausalAgentError(f"Timeout esperando respuesta del LLM: {exc}") from exc
    except APIError as exc:
        raise CausalAgentError(f"Error del proxy LLM: {exc}") from exc

    contenido = resp.choices[0].message.content
    if not contenido:
        raise CausalAgentError("El LLM devolvió una respuesta vacía")

    try:
        datos = json.loads(contenido)
    except json.JSONDecodeError as exc:
        raise CausalAgentError(
            f"El LLM no devolvió JSON válido: {exc}. Contenido crudo: {contenido[:300]}"
        ) from exc

    veredicto = str(datos.get("veredicto", "")).strip().lower()
    if veredicto not in VEREDICTOS_VALIDOS:
        raise CausalAgentError(f"Veredicto LLM inválido/inesperado: '{veredicto}'")

    confianza = str(datos.get("confianza", "")).strip().lower()
    if confianza not in CONFIANZAS_VALIDAS:
        raise CausalAgentError(f"Confianza LLM inválida/inesperada: '{confianza}'")

    try:
        puntuacion = float(datos.get("puntuacion"))
    except (TypeError, ValueError) as exc:
        raise CausalAgentError(f"Puntuación LLM no numérica: {datos.get('puntuacion')}") from exc
    puntuacion = max(-100.0, min(100.0, puntuacion))

    razonamiento = str(datos.get("razonamiento_causal", "")).strip()
    if not razonamiento:
        raise CausalAgentError("El LLM no proporcionó razonamiento_causal")

    return AnalisisCausal(
        simbolo=ctx.simbolo,
        veredicto=veredicto,
        puntuacion=round(puntuacion, 2),
        confianza=confianza,
        razonamiento_causal=razonamiento,
        factores_clave=[str(f) for f in datos.get("factores_clave", [])][:8],
        riesgos=[str(r) for r in datos.get("riesgos", [])][:8],
        modelo_usado=modelo,
        generado_en_utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


def analisis_causal_a_dict(analisis: AnalisisCausal) -> dict[str, Any]:
    return asdict(analisis)
