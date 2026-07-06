"""
kernel-causal-py: motor REAL del Paso 2 de ALGONE, implementado en Python
con `causal-learn` — sustituto provisional de `kernels/causal_r` (R +
`pcalg`) mientras no está disponible la VPS con R instalado.

Reproduce el mismo pipeline en 3 fases descrito en
`kernels/causal_r/engine.R` (ver ese archivo para la referencia original
en R, que se mantiene intacta como ruta alternativa futura):

  Fase A (PC):     descubre el ESQUELETO no dirigido vía pruebas de
                    independencia condicional (algoritmo Peter-Clark).
  Fase B (FCI):     asume posibles CONFUSORES OCULTOS y produce un PAG
                    (Partial Ancestral Graph) con marcas de incertidumbre
                    (círculo/flecha/cola).
  Fase C (LiNGAM):  para las aristas no dirigidas, usa la NO-gaussianidad
                    de los residuos (DirectLiNGAM, vía ICA) para
                    determinar la dirección causal final.

Implementado con `causal_learn.search.ConstraintBased.PC/FCI` y
`causal_learn.search.FCMBased.lingam.DirectLiNGAM` — librerías reales,
no simuladas. Mismo contrato de salida que `Paso2Output`
(orchestrator/schemas.py): dag_edges, pag_edges, orden_causal_lingam,
esqueleto_inicial_pc, variables_ocultas_sospechadas.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from causallearn.graph.Endpoint import Endpoint
from causallearn.search.ConstraintBased.FCI import fci
from causallearn.search.ConstraintBased.PC import pc
from causallearn.search.FCMBased.lingam import DirectLiNGAM

# Mapa de marcas de endpoint de causal-learn a las etiquetas textuales que
# ya usa el kernel R (mantiene compatibilidad de contrato con el
# orquestador, que no debería notar la diferencia de motor).
# Nota: `Endpoint` (enum de causal-learn) no es hasheable directamente en
# esta versión de la librería, así que se indexa por `.value` (int).
_MARCA_TEXTO = {
    Endpoint.TAIL.value: "tail",
    Endpoint.ARROW.value: "arrow",
    Endpoint.CIRCLE.value: "circle",
    Endpoint.NULL.value: "none",
}


class CausalEngineError(RuntimeError):
    pass


@dataclass
class Paso2Result:
    dag_edges: list[dict[str, Any]]
    pag_edges: list[dict[str, Any]]
    orden_causal_lingam: list[str]
    esqueleto_inicial_pc: list[dict[str, str]]
    variables_ocultas_sospechadas: list[str]
    lingam_error: str | None = None
    motor: str = "causal-learn (Python)"
    detalle: dict[str, Any] = field(default_factory=dict)


def _marca(endpoint: Endpoint | None) -> str:
    if endpoint is None:
        return "none"
    return _MARCA_TEXTO.get(endpoint.value, "desconocida")


def procesar_paso2(
    variables: list[str],
    matriz_datos: list[list[float]],
    alpha: float = 0.05,
) -> Paso2Result:
    """
    Ejecuta el pipeline causal completo PC -> FCI -> LiNGAM sobre datos
    reales (no simulados). Lanza `CausalEngineError` con mensaje explícito
    si los datos son insuficientes — igual que la versión R, nunca
    devuelve un grafo inventado silenciosamente.
    """
    p = len(variables)
    datos = np.asarray(matriz_datos, dtype=float)
    if datos.ndim != 2 or datos.shape[1] != p:
        raise CausalEngineError(
            f"La matriz de datos ({datos.shape}) no coincide con el número de variables ({p})."
        )
    n = datos.shape[0]

    if n < 5 or p < 2:
        raise CausalEngineError(
            f"Datos insuficientes para descubrimiento causal: n={n} observaciones, "
            f"p={p} variables (se requieren >=5 y >=2)."
        )

    # -----------------------------------------------------------------
    # FASE A: PC — esqueleto no dirigido inicial (test de independencia
    # condicional gaussiano estándar, equivalente a gaussCItest de pcalg).
    # -----------------------------------------------------------------
    cg = pc(datos, alpha=alpha, indep_test="fisherz", show_progress=False, verbose=False)
    pc_amat = cg.G.graph  # convención causal-learn: ver docstring de GeneralGraph

    esqueleto_inicial_pc: list[dict[str, str]] = []
    for i in range(p):
        for j in range(i + 1, p):
            if pc_amat[i, j] != 0 or pc_amat[j, i] != 0:
                esqueleto_inicial_pc.append(
                    {"from": variables[i], "to": variables[j], "type": "undirected"}
                )

    # -----------------------------------------------------------------
    # FASE B: FCI — asume confusores ocultos; produce un PAG con marcas
    # (circle/arrow/tail) en cada extremo de cada arista.
    # -----------------------------------------------------------------
    g_fci, edges_fci = fci(datos, alpha=alpha, indep_test="fisherz", show_progress=False, verbose=False)

    pag_edges: list[dict[str, Any]] = []
    variables_ocultas: set[str] = set()
    for edge in edges_fci:
        nombre1 = edge.get_node1().get_name()
        nombre2 = edge.get_node2().get_name()
        idx1 = int(nombre1.lstrip("X")) - 1
        idx2 = int(nombre2.lstrip("X")) - 1
        marca_en_1 = _marca(edge.get_endpoint1())
        marca_en_2 = _marca(edge.get_endpoint2())
        pag_edges.append(
            {
                "from": variables[idx1],
                "to": variables[idx2],
                "marca_en_from": marca_en_1,
                "marca_en_to": marca_en_2,
            }
        )
        # Marca <-> (flecha en ambos extremos) es la firma clásica de un
        # confusor oculto no observado en el PAG de FCI (igual criterio
        # que la versión R).
        if marca_en_1 == "arrow" and marca_en_2 == "arrow":
            variables_ocultas.add(variables[idx1])
            variables_ocultas.add(variables[idx2])

    # -----------------------------------------------------------------
    # FASE C: LiNGAM — orientación final vía no-gaussianidad (ICA).
    # -----------------------------------------------------------------
    orden_causal_lingam = list(variables)
    dag_edges: list[dict[str, Any]] = []
    lingam_error: str | None = None
    try:
        modelo = DirectLiNGAM()
        modelo.fit(datos)
        # adjacency_matrix_[i, j] != 0  =>  variable j causa a variable i
        # (misma convención que Bpruned de pcalg::lingam en la versión R).
        adj = modelo.adjacency_matrix_
        for i in range(p):
            for j in range(p):
                if i != j and abs(adj[i, j]) > 1e-8:
                    dag_edges.append(
                        {
                            "from": variables[j],
                            "to": variables[i],
                            "type": "directed",
                            "peso": round(float(adj[i, j]), 6),
                        }
                    )
        orden_causal_lingam = [variables[k] for k in modelo.causal_order_]
    except Exception as exc:  # noqa: BLE001 - degradamos con fallback documentado
        lingam_error = str(exc)

    if not dag_edges and lingam_error is not None:
        # Fallback: si LiNGAM no converge (común con muestras pequeñas o
        # datos casi-Gaussianos, donde LiNGAM pierde identificabilidad),
        # degradamos a las aristas no dirigidas de PC — igual que R.
        dag_edges = [
            {"from": e["from"], "to": e["to"], "type": "undirected_fallback"}
            for e in esqueleto_inicial_pc
        ]

    return Paso2Result(
        dag_edges=dag_edges,
        pag_edges=pag_edges,
        orden_causal_lingam=orden_causal_lingam,
        esqueleto_inicial_pc=esqueleto_inicial_pc,
        variables_ocultas_sospechadas=sorted(variables_ocultas),
        lingam_error=lingam_error,
        detalle={"n_observaciones": n, "n_variables": p, "alpha": alpha},
    )
