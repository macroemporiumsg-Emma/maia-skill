"""
Contrato compartido entre el orquestador (Pipe) y todos los kernels.

Este módulo define el "wrapper limpio" de comunicación: cada kernel,
independientemente de su lenguaje de implementación (Python, R, Julia),
recibe y responde en este mismo formato JSON sobre HTTP.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def new_trace_id() -> str:
    return str(uuid4())


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class KernelStatus(str, Enum):
    ok = "ok"
    error = "error"


class KernelRequest(BaseModel):
    """Payload de entrada estándar para cualquier kernel."""

    trace_id: str = Field(default_factory=new_trace_id)
    input: dict[str, Any]


class KernelResponse(BaseModel):
    """Payload de salida estándar de cualquier kernel."""

    trace_id: str
    kernel: str
    kernel_version: str
    duration_ms: float
    status: KernelStatus
    output: Optional[dict[str, Any]] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    kernel: str
    uptime_s: float


# ---------------------------------------------------------------------------
# Esquemas específicos por paso ALGONE (documentan el contrato de cada kernel,
# aunque el transporte HTTP siempre use KernelRequest/KernelResponse genéricos)
# ---------------------------------------------------------------------------


class Paso1Input(BaseModel):
    """Entrada del kernel-nlp: texto crudo del discurso + contexto histórico."""

    texto_discurso: str
    fuente: str = "manual"
    banco_central: str = "FED"
    fecha: str
    historico_tasas: list[float] = Field(
        default_factory=list,
        description="Serie histórica de tasas/decisiones para calcular el anclaje estructural",
    )


class Paso1Output(BaseModel):
    z_score: float
    distribucion_seleccionada: str
    aicc_por_familia: dict[str, float]
    magnitud_cambio_postura: float
    sesgo_detectado: str  # "hawkish" | "dovish" | "neutral"
    anclaje_estructural: float
    metodo_anclaje: str  # "mediana" | "moda"
    palabras_clave_detectadas: list[str]


class Paso2Input(BaseModel):
    """Entrada del kernel-causal: matriz de variables normalizadas."""

    variables: list[str]
    matriz_datos: list[list[float]]  # filas = observaciones, columnas = variables
    alpha: float = 0.05


class Paso2Output(BaseModel):
    dag_edges: list[dict[str, str]]  # [{"from": "A", "to": "B", "type": "directed"}]
    pag_edges: list[dict[str, str]]  # aristas con ambigüedad de FCI
    orden_causal_lingam: list[str]
    esqueleto_inicial_pc: list[dict[str, str]]
    variables_ocultas_sospechadas: list[str]


class Paso3Input(BaseModel):
    """Entrada del kernel-bayes: DAG + datos para HBM/NUTS."""

    dag_edges: list[dict[str, str]]
    variables: list[str]
    matriz_datos: list[list[float]]
    niveles_jerarquia: list[str] = Field(
        default_factory=lambda: ["global", "institucion", "regimen_actual"]
    )
    n_samples: int = 2000
    n_chains: int = 4


class Paso3Output(BaseModel):
    posterior_means: dict[str, float]
    posterior_hdi_low: dict[str, float]
    posterior_hdi_high: dict[str, float]
    probabilidad_evento_critico: float
    r_hat: dict[str, float]
    n_divergences: int


class Paso4TailsInput(BaseModel):
    serie_residuos: list[float]


class Paso4TailsOutput(BaseModel):
    distribucion: str  # "student_t" | "gev"
    grados_libertad: Optional[float] = None
    probabilidad_cisne_negro: float
    umbral_desviaciones: float


class Paso4ScmInput(BaseModel):
    variables: list[str]
    matriz_datos: list[list[float]]
    dag_edges: list[dict[str, str]]


class Paso4ScmOutput(BaseModel):
    confusores_detectados: list[str]
    fuerza_confusion: dict[str, float]


class Paso5Input(BaseModel):
    dag_edges: list[dict[str, str]]
    posterior_means: dict[str, float]
    posterior_std: dict[str, float]
    escenarios: list[dict[str, Any]]  # [{"variable": "Fed", "valor": "Hawkish"}, ...]


class Paso5Output(BaseModel):
    resultados_escenarios: list[dict[str, Any]]
    impacto_neto: float
    latencia_calculo_ms: float


class CanalConfluencia(BaseModel):
    nombre: str
    valor: float
    umbral: float
    activado: bool


class EcuacionConfluenciaOutput(BaseModel):
    canales: list[CanalConfluencia]
    confluencia_critica: bool
    regimen: str  # "estacionario" | "expansion_volatilidad"
    narrativa: str
    probabilidad_quiebre_estructural: Optional[float] = None
