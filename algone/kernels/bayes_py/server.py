"""
kernel-bayes-py: servidor HTTP (wrapper limpio) del Paso 3 de ALGONE,
implementación PROVISIONAL en Python (`PyMC`) que reemplaza a
`kernels/bayes_r` (directorio nunca implementado en R/`rstan`) mientras
no está disponible la VPS con R/Stan instalado.

Expone `procesar_paso3()` (kernels/bayes_py/engine.py) bajo el MISMO
contrato estándar ALGONE (POST /run, GET /health) que usan el resto de
kernels — el orquestador puede apuntar a este kernel sin cambiar nada
de su lado, solo cambiando la URL/puerto de destino.

Ejecución local:
    uvicorn kernels.bayes_py.server:app --host 0.0.0.0 --port 9003

Contrato de `input` esperado en POST /run (idéntico a Paso3Input en
orchestrator/schemas.py):
    {
        "variables": ["tasas_fed", "vix", "spread_credito"],
        "matriz_datos": [[..], [..], ...],
        "dag_edges": [
            {"from": "tasas_fed", "to": "vix", "type": "directed", "peso": 0.7},
            {"from": "vix", "to": "spread_credito", "type": "directed", "peso": 0.5}
        ],
        "niveles_jerarquia": ["global", "institucion", "regimen_actual"],
        "n_samples": 2000,
        "n_chains": 4
    }
"""
from __future__ import annotations

import os
import sys
from dataclasses import asdict
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from kernels._shared.kernel_base import build_kernel_app
from kernels.bayes_py.engine import BayesEngineError, procesar_paso3

KERNEL_NAME = "kernel-bayes-py"
KERNEL_VERSION = "1.0.0-provisional-python"


def handler(payload: dict[str, Any]) -> dict[str, Any]:
    variables = payload.get("variables")
    matriz_datos = payload.get("matriz_datos")
    dag_edges = payload.get("dag_edges")
    niveles_jerarquia = payload.get("niveles_jerarquia")
    n_samples = int(payload.get("n_samples", 2000))
    n_chains = int(payload.get("n_chains", 4))

    if not variables or not matriz_datos or dag_edges is None:
        raise ValueError(
            "Campos requeridos faltantes: 'variables', 'matriz_datos' y/o 'dag_edges'"
        )

    try:
        resultado = procesar_paso3(
            variables=variables,
            matriz_datos=matriz_datos,
            dag_edges=dag_edges,
            niveles_jerarquia=niveles_jerarquia,
            n_samples=n_samples,
            n_chains=n_chains,
        )
    except BayesEngineError as exc:
        # Re-lanzamos como ValueError genérico: kernel_base.py captura
        # cualquier excepción y la reporta en el campo `error` de la
        # respuesta estándar ALGONE (status="error").
        raise ValueError(str(exc)) from exc

    return asdict(resultado)


app = build_kernel_app(KERNEL_NAME, KERNEL_VERSION, handler)
