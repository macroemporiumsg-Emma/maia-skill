"""
kernel-causal-py: servidor HTTP (wrapper limpio) del Paso 2 de ALGONE,
implementación PROVISIONAL en Python (`causal-learn`) que reemplaza a
`kernels/causal_r` (R + `pcalg`) mientras no está disponible la VPS con
R instalado.

Expone `procesar_paso2()` (kernels/causal_py/engine.py) bajo el MISMO
contrato estándar ALGONE (POST /run, GET /health) que usa el kernel R
original — el orquestador puede apuntar a este kernel sin cambiar nada
de su lado, solo cambiando la URL/puerto de destino.

Ejecución local:
    uvicorn kernels.causal_py.server:app --host 0.0.0.0 --port 9002

Contrato de `input` esperado en POST /run (idéntico a Paso2Input en
orchestrator/schemas.py, el mismo que consume kernel-causal en R):
    {
        "variables": ["tasas_fed", "vix", "spread_credito"],
        "matriz_datos": [[..], [..], ...],
        "alpha": 0.05
    }
"""
from __future__ import annotations

import os
import sys
from dataclasses import asdict
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from kernels._shared.kernel_base import build_kernel_app
from kernels.causal_py.engine import CausalEngineError, procesar_paso2

KERNEL_NAME = "kernel-causal-py"
KERNEL_VERSION = "1.0.0-provisional-python"


def handler(payload: dict[str, Any]) -> dict[str, Any]:
    variables = payload.get("variables")
    matriz_datos = payload.get("matriz_datos")
    alpha = float(payload.get("alpha", 0.05))

    if not variables or not matriz_datos:
        raise ValueError("Campos requeridos faltantes: 'variables' y/o 'matriz_datos'")

    try:
        resultado = procesar_paso2(variables=variables, matriz_datos=matriz_datos, alpha=alpha)
    except CausalEngineError as exc:
        # Re-lanzamos como ValueError genérico: kernel_base.py captura
        # cualquier excepción y la reporta en el campo `error` de la
        # respuesta estándar ALGONE (status="error"), igual que hace la
        # versión R con `stop()`.
        raise ValueError(str(exc)) from exc

    return asdict(resultado)


app = build_kernel_app(KERNEL_NAME, KERNEL_VERSION, handler)
