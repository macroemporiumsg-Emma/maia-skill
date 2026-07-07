"""
kernel-bayes-py: motor REAL del Paso 3 de ALGONE (Modelado Bayesiano
Jerárquico + NUTS), implementado en Python con `PyMC` — sustituto
provisional de `kernels/bayes_r` (nunca implementado en R/`rstan`,
directorio vacío) mientras no está disponible la VPS.

Construye un Modelo Estructural Lineal Bayesiano DIRECTAMENTE sobre el
DAG real que produjo el Paso 2 (kernel-causal-py / kernel-causal): cada
variable con padres en el DAG se modela como una regresión lineal sobre
sus padres, y los coeficientes (`beta_padre->hijo`) comparten un
hiper-prior global común (`mu_beta`, `sigma_beta`) — esto es exactamente
lo que define un Hierarchical Bayesian Model (HBM) de "partial pooling":
las relaciones causales individuales se regularizan hacia una tendencia
compartida, en vez de estimarse de forma completamente independiente.

El muestreo usa el algoritmo NUTS (No-U-Turn Sampler, Hoffman & Gelman
2014) vía `pymc.sample()`, idéntico en esencia al que usaría `rstan`/
`cmdstanr` en la versión R (ambos son variantes de HMC con adaptación
automática del tamaño de paso).

Referencia: "Funcionamiento ALGONE" (PDF fuente), Paso 3.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import arviz as az
import numpy as np
import pymc as pm

# Límites de seguridad para no bloquear el kernel HTTP con un muestreo
# excesivamente largo (NUTS escala mal si se piden decenas de miles de
# draws en un servicio síncrono) — documentado explícitamente en la
# respuesta si se recortan los valores pedidos.
MAX_SAMPLES = 1500
MAX_CHAINS = 4
MIN_SAMPLES = 200


class BayesEngineError(RuntimeError):
    pass


@dataclass
class Paso3Result:
    posterior_means: dict[str, float]
    posterior_hdi_low: dict[str, float]
    posterior_hdi_high: dict[str, float]
    probabilidad_evento_critico: float
    r_hat: dict[str, float]
    n_divergences: int
    motor: str = "PyMC/NUTS (Python)"
    variable_evento_critico: str | None = None
    umbral_evento_critico: float | None = None
    detalle: dict[str, Any] = field(default_factory=dict)


def _construir_grafo_padres(
    variables: list[str], dag_edges: list[dict[str, Any]]
) -> dict[str, list[str]]:
    """
    Extrae, del DAG producido por el Paso 2, el mapa hijo -> [padres],
    usando SOLO aristas dirigidas (`type == "directed"`). Las aristas
    `undirected`/`undirected_fallback` (cuando LiNGAM no pudo orientar
    todas las relaciones) se ignoran para la regresión, ya que no
    determinan una dirección causa->efecto usable como predictor.
    """
    padres: dict[str, list[str]] = {v: [] for v in variables}
    for edge in dag_edges:
        if edge.get("type") != "directed":
            continue
        origen, destino = edge.get("from"), edge.get("to")
        if origen in padres and destino in padres and origen not in padres[destino]:
            padres[destino].append(origen)
    return padres


def _detectar_ciclo(padres: dict[str, list[str]]) -> list[str] | None:
    """DFS con detección de ciclo; devuelve el ciclo encontrado o None."""
    color: dict[str, int] = {v: 0 for v in padres}  # 0=blanco,1=gris,2=negro
    pila: list[str] = []

    def visitar(v: str) -> list[str] | None:
        color[v] = 1
        pila.append(v)
        for p in padres[v]:
            if color[p] == 1:
                inicio = pila.index(p)
                return pila[inicio:] + [p]
            if color[p] == 0:
                ciclo = visitar(p)
                if ciclo:
                    return ciclo
        pila.pop()
        color[v] = 2
        return None

    for v in padres:
        if color[v] == 0:
            ciclo = visitar(v)
            if ciclo:
                return ciclo
    return None


def procesar_paso3(
    variables: list[str],
    matriz_datos: list[list[float]],
    dag_edges: list[dict[str, Any]],
    niveles_jerarquia: list[str] | None = None,
    n_samples: int = 1000,
    n_chains: int = 4,
) -> Paso3Result:
    """
    Ajusta el Modelo Estructural Lineal Bayesiano jerárquico sobre el DAG
    real del Paso 2, muestrea la posterior con NUTS, y calcula:

      - posterior_means / posterior_hdi_low / posterior_hdi_high de cada
        coeficiente estructural (beta_padre->hijo) e intercepto.
      - probabilidad_evento_critico: P(nodo terminal del DAG > su
        percentil 90 histórico), estimada vía muestreo predictivo
        posterior REAL (no una heurística fija) sobre el nodo "sumidero"
        (sin hijos) del grafo — el nodo más "aguas abajo" en la cadena
        causal, análogo al "régimen" final que ALGONE intenta predecir.
      - r_hat (Gelman-Rubin) y n_divergences: diagnósticos estándar de
        convergencia de NUTS (si r_hat > 1.01 o hay divergencias, el
        resultado se marca pero NO se descarta silenciosamente — el
        detalle queda expuesto para que el consumidor decida).
    """
    p = len(variables)
    datos = np.asarray(matriz_datos, dtype=float)
    if datos.ndim != 2 or datos.shape[1] != p:
        raise BayesEngineError(
            f"La matriz de datos ({datos.shape}) no coincide con el número de variables ({p})."
        )
    n = datos.shape[0]
    if n < 10 or p < 1:
        raise BayesEngineError(
            f"Datos insuficientes para HBM: n={n} observaciones, p={p} variables (se requieren >=10 y >=1)."
        )

    padres = _construir_grafo_padres(variables, dag_edges)
    ciclo = _detectar_ciclo(padres)
    if ciclo:
        raise BayesEngineError(
            f"El DAG de entrada contiene un ciclo ({' -> '.join(ciclo)}); "
            "un modelo estructural lineal requiere un grafo acíclico."
        )

    n_samples_usado = int(np.clip(n_samples, MIN_SAMPLES, MAX_SAMPLES))
    n_chains_usado = int(np.clip(n_chains, 1, MAX_CHAINS))
    idx_por_var = {v: i for i, v in enumerate(variables)}

    coords = {"obs": np.arange(n)}
    with pm.Model(coords=coords) as modelo:
        # Hiper-priors globales compartidos: esto es lo que hace el
        # modelo "jerárquico" (partial pooling) en vez de ajustar cada
        # coeficiente de forma completamente independiente.
        mu_beta = pm.Normal("mu_beta_global", mu=0.0, sigma=1.0)
        sigma_beta = pm.HalfNormal("sigma_beta_global", sigma=1.0)

        nombres_beta: dict[tuple[str, str], Any] = {}
        for hijo, lista_padres in padres.items():
            for padre in lista_padres:
                nombre = f"beta__{padre}__to__{hijo}"
                nombres_beta[(padre, hijo)] = pm.Normal(nombre, mu=mu_beta, sigma=sigma_beta)

        for var in variables:
            i = idx_por_var[var]
            columna_obs = datos[:, i]
            intercepto = pm.Normal(f"intercepto__{var}", mu=0.0, sigma=5.0)
            sigma_var = pm.HalfNormal(f"sigma__{var}", sigma=2.0)

            lista_padres = padres[var]
            if lista_padres:
                mu_var = intercepto
                for padre in lista_padres:
                    j = idx_por_var[padre]
                    mu_var = mu_var + nombres_beta[(padre, var)] * datos[:, j]
            else:
                mu_var = intercepto

            pm.Normal(f"obs__{var}", mu=mu_var, sigma=sigma_var, observed=columna_obs, dims="obs")

        idata = pm.sample(
            draws=n_samples_usado,
            tune=n_samples_usado,
            chains=n_chains_usado,
            cores=1,
            target_accept=0.9,
            progressbar=False,
            random_seed=42,
        )

    resumen = az.summary(
        idata, ci_prob=0.90, ci_kind="hdi", round_to="none", var_names=None, kind="stats"
    )
    parametros_estructurales = [
        nombre
        for nombre in resumen.index
        if nombre.startswith("beta__") or nombre.startswith("intercepto__")
    ]

    posterior_means = {nombre: round(float(resumen.loc[nombre, "mean"]), 6) for nombre in parametros_estructurales}
    posterior_hdi_low = {
        nombre: round(float(resumen.loc[nombre, "hdi90_lb"]), 6) for nombre in parametros_estructurales
    }
    posterior_hdi_high = {
        nombre: round(float(resumen.loc[nombre, "hdi90_ub"]), 6) for nombre in parametros_estructurales
    }

    rhat_dataarray = az.rhat(idata, var_names=parametros_estructurales) if parametros_estructurales else None
    r_hat: dict[str, float] = {}
    if rhat_dataarray is not None:
        for nombre in parametros_estructurales:
            try:
                r_hat[nombre] = round(float(rhat_dataarray[nombre].values), 6)
            except (KeyError, TypeError):
                pass

    n_divergences = int(idata.sample_stats["diverging"].sum().item()) if "diverging" in idata.sample_stats else 0

    # --- Probabilidad de "evento crítico" sobre el nodo sumidero (Paso 3
    # también alimenta el canal macro de la Ecuación de Confluencia). ---
    nodos_con_hijos = {padre for lista in padres.values() for padre in lista}
    sumideros = [v for v in variables if v not in nodos_con_hijos]
    variable_evento = sorted(sumideros)[0] if sumideros else variables[-1]

    idx_evento = idx_por_var[variable_evento]
    columna_evento = datos[:, idx_evento]
    umbral = float(np.percentile(columna_evento, 90))

    with modelo:
        ppc = pm.sample_posterior_predictive(
            idata, var_names=[f"obs__{variable_evento}"], progressbar=False, random_seed=42
        )
    muestras_predictivas = ppc.posterior_predictive[f"obs__{variable_evento}"].values.reshape(-1, n)
    # Probabilidad de que, en un "draw" posterior típico, la MEDIA de la
    # serie generada supere el percentil 90 histórico (evento de régimen
    # sostenido, no un solo punto ruidoso).
    medias_por_draw = muestras_predictivas.mean(axis=1)
    probabilidad_evento_critico = round(float(np.mean(medias_por_draw > umbral)), 6)

    return Paso3Result(
        posterior_means=posterior_means,
        posterior_hdi_low=posterior_hdi_low,
        posterior_hdi_high=posterior_hdi_high,
        probabilidad_evento_critico=probabilidad_evento_critico,
        r_hat=r_hat,
        n_divergences=n_divergences,
        variable_evento_critico=variable_evento,
        umbral_evento_critico=round(umbral, 6),
        detalle={
            "n_observaciones": n,
            "n_variables": p,
            "n_samples_solicitado": n_samples,
            "n_samples_usado": n_samples_usado,
            "n_chains_solicitado": n_chains,
            "n_chains_usado": n_chains_usado,
            "niveles_jerarquia_documentados": niveles_jerarquia
            or ["global", "institucion", "regimen_actual"],
            "n_coeficientes_estructurales": len(parametros_estructurales),
        },
    )
