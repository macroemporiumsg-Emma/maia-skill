"""
Motor matemático real del Paso 1 de ALGONE:
Ingesta, Clasificación y Selección del DGP (Data Generating Process).

Implementa, con librerías reales (no simuladas):

1. Tokenización léxica hawkish/dovish del discurso.
2. Anclaje Estructural: mediana o moda de la serie histórica de tasas
   (nunca la media, por su sensibilidad a valores extremos — ver PDF fuente).
3. Ajuste de múltiples Modelos Lineales Generalizados (GLM) vía
   `statsmodels.genmod.GLM` sobre la serie histórica, con familias
   Binomial (logit), Poisson (log) y Gamma (log).
4. Selección del modelo óptimo mediante AICc (AIC corregido para
   muestras pequeñas), penalizando el número de parámetros.
5. Emisión de un Z-score estandarizado, calibrado según la distribución
   ganadora (no un z-score gaussiano genérico).

Referencia: "Funcionamiento ALGONE" (PDF fuente), Paso 1.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import statsmodels.api as sm
from scipy import stats

# ---------------------------------------------------------------------------
# Léxico hawkish / dovish (extensible; en producción se sustituiría por un
# modelo de embeddings financiero, p.ej. FinBERT, pero el mecanismo de
# combinación con el GLM es el mismo).
# ---------------------------------------------------------------------------

HAWKISH_TERMS = [
    "aumentos adicionales", "endurecimiento", "elevar tasas", "subir tasas",
    "restrictiv", "inflación persistente", "más restrictivo", "hawkish",
    "combatir la inflación", "necesitemos aumentos", "mantendremos altas",
    "vigilancia", "presión inflacionaria", "sobrecalentamiento",
    "rate hike", "tightening", "restrictive", "further increases",
]

DOVISH_TERMS = [
    "recortar tasas", "flexibilización", "bajar tasas", "pausa",
    "dovish", "estímulo", "relajación monetaria", "riesgos a la baja",
    "desaceleración", "rate cut", "easing", "pause", "accommodative",
    "acomodaticia",
]

RATE_PATTERN = re.compile(r"(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:%|puntos? b[aá]sicos|bps)")


@dataclass
class Paso1Result:
    z_score: float
    distribucion_seleccionada: str
    aicc_por_familia: dict[str, float]
    magnitud_cambio_postura: float
    sesgo_detectado: str
    anclaje_estructural: float
    metodo_anclaje: str
    palabras_clave_detectadas: list[str]
    detalle_modelos: dict[str, Any] = field(default_factory=dict)


def _tokenizar_sesgo(texto: str) -> tuple[float, str, list[str]]:
    """Cuenta términos hawkish/dovish y devuelve un score normalizado en [-1, 1]."""
    texto_low = texto.lower()
    encontrados: list[str] = []
    hawkish_count = 0
    dovish_count = 0
    for term in HAWKISH_TERMS:
        if term in texto_low:
            hawkish_count += 1
            encontrados.append(f"hawkish:{term}")
    for term in DOVISH_TERMS:
        if term in texto_low:
            dovish_count += 1
            encontrados.append(f"dovish:{term}")

    total = hawkish_count + dovish_count
    if total == 0:
        score = 0.0
        sesgo = "neutral"
    else:
        score = (hawkish_count - dovish_count) / total
        sesgo = "hawkish" if score > 0.15 else ("dovish" if score < -0.15 else "neutral")

    return score, sesgo, encontrados


def _extraer_senal_numerica(texto: str) -> float:
    """Extrae menciones numéricas de tasas/porcentajes y las combina en una señal."""
    matches = RATE_PATTERN.findall(texto)
    if not matches:
        return 0.0
    valores = [float(m.replace(",", ".")) for m in matches]
    # Señal = desviación del promedio de las cifras mencionadas respecto a un
    # punto de referencia neutro (asumimos que valores muy altos implican
    # postura más agresiva en términos relativos).
    return float(np.mean(valores))


def _anclaje_estructural(historico: np.ndarray) -> tuple[float, str]:
    """
    Calcula el Anclaje Estructural: usa la MODA si existe un valor claramente
    dominante (régimen de estabilidad), o la MEDIANA en caso contrario.
    Nunca la media aritmética (sensible a shocks extremos pasados).
    """
    if historico.size == 0:
        return 0.0, "mediana"

    moda_result = stats.mode(historico, keepdims=True)
    moda_valor = float(moda_result.mode[0])
    moda_conteo = int(moda_result.count[0])

    # Si la moda representa más del 30% de las observaciones, el banco central
    # ha estado "estancado" en ese nivel -> usamos la moda como ancla.
    if historico.size > 0 and (moda_conteo / historico.size) >= 0.30:
        return moda_valor, "moda"

    return float(np.median(historico)), "mediana"


def _aicc(aic: float, n: int, k: int) -> float:
    """AIC corregido para muestras pequeñas (Sugiura / Hurvich & Tsai)."""
    denom = n - k - 1
    if denom <= 0:
        # No hay suficientes grados de libertad; penalizamos fuertemente
        return aic + 1e6
    return aic + (2.0 * k * (k + 1)) / denom


def _ajustar_glms(historico: np.ndarray) -> dict[str, Any]:
    """
    Ajusta 3 familias GLM sobre la serie histórica de tasas/decisiones y
    devuelve, para cada una, el modelo ajustado + su AICc.

    - Binomial (logit): evento dicotómico (¿la tasa subió respecto al paso
      anterior?), captura la "naturaleza dicotómica" mencionada en el PDF.
    - Poisson (log): conteo de movimientos hawkish en una ventana móvil.
    - Gamma (log): magnitud continua y positiva del cambio (|delta|).
    """
    n = historico.size
    idx = np.arange(n)
    resultados: dict[str, Any] = {}

    if n < 4:
        # Serie histórica insuficiente: devolvemos AICc infinito para todas
        # salvo un fallback simple, y avisamos en el resultado.
        return {
            "insuficiente_historico": True,
            "n_observaciones": n,
        }

    deltas = np.diff(historico)
    eventos_binomiales = (deltas > 0).astype(int)  # 1 = subida (hawkish), 0 = no
    magnitudes = np.abs(deltas) + 1e-6  # Gamma requiere estrictamente positivo
    ventana = max(2, n // 5)
    conteos_poisson = np.array(
        [int(np.sum(eventos_binomiales[max(0, i - ventana):i + 1])) for i in range(len(eventos_binomiales))]
    )

    X = sm.add_constant(idx[: len(deltas)].astype(float))

    # --- Binomial (logit) ---
    try:
        modelo_binom = sm.GLM(eventos_binomiales, X, family=sm.families.Binomial())
        fit_binom = modelo_binom.fit()
        k_binom = len(fit_binom.params)
        aicc_binom = _aicc(fit_binom.aic, len(eventos_binomiales), k_binom)
        resultados["binomial"] = {
            "fit": fit_binom,
            "aic": float(fit_binom.aic),
            "aicc": float(aicc_binom),
            "media_ajustada": float(np.mean(fit_binom.fittedvalues)),
            "std_respuesta": float(np.std(eventos_binomiales)) or 1e-6,
        }
    except Exception as exc:  # noqa: BLE001
        resultados["binomial"] = {"error": str(exc), "aicc": float("inf")}

    # --- Poisson (log) ---
    try:
        modelo_poisson = sm.GLM(conteos_poisson, X, family=sm.families.Poisson())
        fit_poisson = modelo_poisson.fit()
        k_poisson = len(fit_poisson.params)
        aicc_poisson = _aicc(fit_poisson.aic, len(conteos_poisson), k_poisson)
        lam = float(np.mean(fit_poisson.fittedvalues)) or 1e-6
        resultados["poisson"] = {
            "fit": fit_poisson,
            "aic": float(fit_poisson.aic),
            "aicc": float(aicc_poisson),
            "lambda_ajustado": lam,
        }
    except Exception as exc:  # noqa: BLE001
        resultados["poisson"] = {"error": str(exc), "aicc": float("inf")}

    # --- Gamma (log) ---
    try:
        modelo_gamma = sm.GLM(magnitudes, X, family=sm.families.Gamma(link=sm.families.links.Log()))
        fit_gamma = modelo_gamma.fit()
        k_gamma = len(fit_gamma.params)
        aicc_gamma = _aicc(fit_gamma.aic, len(magnitudes), k_gamma)
        resultados["gamma"] = {
            "fit": fit_gamma,
            "aic": float(fit_gamma.aic),
            "aicc": float(aicc_gamma),
            "media_ajustada": float(np.mean(fit_gamma.fittedvalues)),
            "std_magnitudes": float(np.std(magnitudes)) or 1e-6,
        }
    except Exception as exc:  # noqa: BLE001
        resultados["gamma"] = {"error": str(exc), "aicc": float("inf")}

    return resultados


def _zscore_calibrado(familia: str, shock: float, detalle: dict[str, Any]) -> float:
    """
    Estandariza el shock según la familia ganadora, en vez de usar un
    z-score gaussiano genérico (que asumiría una campana de Gauss
    inadecuada para eventos discretos/asimétricos).
    """
    info = detalle.get(familia, {})

    if familia == "binomial":
        media = info.get("media_ajustada", 0.5)
        std = info.get("std_respuesta", 1e-6) or 1e-6
        # Convertimos el shock (magnitud continua) a una pseudo-probabilidad
        # vía función logística antes de estandarizar.
        p_shock = 1.0 / (1.0 + np.exp(-shock))
        return float((p_shock - media) / std)

    if familia == "poisson":
        lam = info.get("lambda_ajustado", 1.0) or 1e-6
        conteo_shock = max(0.0, shock)
        return float((conteo_shock - lam) / np.sqrt(lam))

    if familia == "gamma":
        media = info.get("media_ajustada", 1.0)
        std = info.get("std_magnitudes", 1.0) or 1e-6
        magnitud_shock = abs(shock)
        return float((magnitud_shock - media) / std)

    # Fallback: z-score clásico si no hay suficiente histórico para GLM.
    return float(shock)


def procesar_paso1(
    texto_discurso: str,
    historico_tasas: list[float],
    fecha: str = "",
    banco_central: str = "FED",
) -> Paso1Result:
    """Punto de entrada del kernel-nlp: ejecuta el Paso 1 completo."""
    score_lexico, sesgo, palabras = _tokenizar_sesgo(texto_discurso)
    senal_numerica = _extraer_senal_numerica(texto_discurso)

    historico = np.array(historico_tasas, dtype=float)
    anclaje, metodo_anclaje = _anclaje_estructural(historico)

    # Magnitud del cambio de postura: combina señal léxica (escalada a rango
    # comparable con el histórico) y señal numérica explícita si existe.
    escala = float(np.std(historico)) if historico.size > 1 else 1.0
    escala = escala if escala > 1e-6 else 1.0
    magnitud_cambio_postura = score_lexico * escala + (senal_numerica - anclaje if senal_numerica else 0.0)

    detalle_glm = _ajustar_glms(historico)

    if detalle_glm.get("insuficiente_historico"):
        # Sin histórico suficiente para GLM: degradamos a z-score clásico
        # documentando la limitación explícitamente.
        std_fallback = escala
        z = float((magnitud_cambio_postura - anclaje) / std_fallback)
        return Paso1Result(
            z_score=round(z, 4),
            distribucion_seleccionada="fallback_insuficiente_historico",
            aicc_por_familia={},
            magnitud_cambio_postura=round(magnitud_cambio_postura, 4),
            sesgo_detectado=sesgo,
            anclaje_estructural=round(anclaje, 4),
            metodo_anclaje=metodo_anclaje,
            palabras_clave_detectadas=palabras,
            detalle_modelos={"aviso": "histórico < 4 observaciones; se usó z-score clásico"},
        )

    aicc_por_familia = {
        fam: (info["aicc"] if "aicc" in info else float("inf"))
        for fam, info in detalle_glm.items()
    }
    familia_ganadora = min(aicc_por_familia, key=aicc_por_familia.get)

    z = _zscore_calibrado(familia_ganadora, magnitud_cambio_postura, detalle_glm)

    resumen_modelos = {
        fam: {k: v for k, v in info.items() if k != "fit"}
        for fam, info in detalle_glm.items()
    }

    return Paso1Result(
        z_score=round(z, 4),
        distribucion_seleccionada=familia_ganadora,
        aicc_por_familia={k: round(v, 4) for k, v in aicc_por_familia.items()},
        magnitud_cambio_postura=round(magnitud_cambio_postura, 4),
        sesgo_detectado=sesgo,
        anclaje_estructural=round(anclaje, 4),
        metodo_anclaje=metodo_anclaje,
        palabras_clave_detectadas=palabras,
        detalle_modelos=resumen_modelos,
    )
