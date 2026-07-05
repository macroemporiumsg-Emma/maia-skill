"""
kernel-nlp: servidor HTTP (wrapper limpio) del Paso 1 de ALGONE.

Expone `procesar_paso1()` (kernels/nlp/engine.py) bajo el contrato
estándar ALGONE (POST /run, GET /health) usando el scaffold compartido
`kernels/_shared/kernel_base.py`.

Ejecución local:
    uvicorn kernels.nlp.server:app --host 0.0.0.0 --port 9001

Contrato de `input` esperado en POST /run (ver Paso1Input en
orchestrator/schemas.py):
    {
        "texto_discurso": "...",
        "historico_tasas": [5.25, 5.5, ...],
        "fecha": "2026-07-01",
        "banco_central": "FED"
    }
"""
from __future__ import annotations

import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from kernels._shared.kernel_base import build_kernel_app
from kernels.nlp.engine import procesar_paso1

KERNEL_NAME = "kernel-nlp"
KERNEL_VERSION = "1.0.0"


def handler(payload: dict[str, Any]) -> dict[str, Any]:
    texto_discurso = payload.get("texto_discurso", "")
    if not texto_discurso:
        raise ValueError("Campo requerido faltante: 'texto_discurso'")

    historico_tasas = payload.get("historico_tasas", [])
    fecha = payload.get("fecha", "")
    banco_central = payload.get("banco_central", "FED")

    resultado = procesar_paso1(
        texto_discurso=texto_discurso,
        historico_tasas=historico_tasas,
        fecha=fecha,
        banco_central=banco_central,
    )
    return resultado.__dict__


app = build_kernel_app(KERNEL_NAME, KERNEL_VERSION, handler)
