"""
Base compartida para kernels Python de ALGONE.

Implementa el "wrapper limpio" del lado Python: cualquier kernel Python
(nlp, tails, scm) hereda este esqueleto FastAPI que ya implementa el
contrato HTTP estándar (POST /run, GET /health) descrito en
docs/ARCHITECTURE.md.
"""
from __future__ import annotations

import time
import traceback
from typing import Any, Callable

from fastapi import FastAPI
from pydantic import BaseModel


class GenericRequest(BaseModel):
    trace_id: str
    input: dict[str, Any]


class GenericResponse(BaseModel):
    trace_id: str
    kernel: str
    kernel_version: str
    duration_ms: float
    status: str
    output: dict[str, Any] | None = None
    error: str | None = None


def build_kernel_app(
    kernel_name: str,
    kernel_version: str,
    handler: Callable[[dict[str, Any]], dict[str, Any]],
) -> FastAPI:
    """
    Construye una app FastAPI mínima que expone /run y /health siguiendo
    el contrato ALGONE. `handler` recibe el dict `input` crudo y debe
    devolver un dict serializable que se coloca en `output`.
    """
    app = FastAPI(title=f"ALGONE kernel: {kernel_name}", version=kernel_version)
    start_time = time.monotonic()

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "kernel": kernel_name,
            "uptime_s": round(time.monotonic() - start_time, 3),
        }

    @app.post("/run", response_model=GenericResponse)
    def run(req: GenericRequest) -> GenericResponse:
        t0 = time.perf_counter()
        try:
            output = handler(req.input)
            duration_ms = (time.perf_counter() - t0) * 1000.0
            return GenericResponse(
                trace_id=req.trace_id,
                kernel=kernel_name,
                kernel_version=kernel_version,
                duration_ms=round(duration_ms, 3),
                status="ok",
                output=output,
            )
        except Exception as exc:  # noqa: BLE001 - queremos capturar todo y reportar
            duration_ms = (time.perf_counter() - t0) * 1000.0
            tb = traceback.format_exc(limit=5)
            return GenericResponse(
                trace_id=req.trace_id,
                kernel=kernel_name,
                kernel_version=kernel_version,
                duration_ms=round(duration_ms, 3),
                status="error",
                error=f"{exc}\n{tb}",
            )

    return app
