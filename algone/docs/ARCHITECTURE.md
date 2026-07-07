# ALGONE — Arquitectura de Kernels y Wrappers

## Visión general

ALGONE es un pipeline de detección de régimen de volatilidad basado en shocks de
discurso de bancos centrales. Implementa 7 pasos matemáticos reales (no simulados)
distribuidos en **kernels de microservicio** especializados por lenguaje, elegidos
por el rendimiento nativo de cada uno para su tarea:

- **Python**: NLP, GLM/AICc, colas pesadas, modelos causales estructurales profundos (Pyro).
- **R**: descubrimiento causal (PC/FCI/LiNGAM vía `pcalg`) y modelado bayesiano
  jerárquico con NUTS (vía `rstan`/`cmdstanr`).
- **Julia**: simulación contrafactual `do(x)` de alto rendimiento.

## Por qué microservicios persistentes (y no `subprocess` por request)

R y Julia tienen *cold-start* costoso: Julia compila JIT en el primer uso de cada
función, y R carga librerías pesadas (`pcalg`, `rstan`) que tardan segundos en
cargar. Si el orquestador relanzara un proceso nuevo por cada shock de mercado,
perderíamos toda la ventaja de velocidad de estos lenguajes.

**Solución**: cada kernel es un servidor HTTP que arranca una vez, precalienta
sus librerías (y en el caso de Julia, fuerza la compilación JIT con una llamada
de calentamiento), y queda residente esperando requests. El *orquestador* Python
(el "Pipe" del diagrama) es el único componente que conoce el orden de la cadena
Paso 1 → Paso 7; cada kernel es ciego a los demás.

## Contrato de comunicación (el "wrapper limpio")

Todos los kernels exponen el mismo contrato HTTP/JSON, sin importar el lenguaje:

```
POST /run
Content-Type: application/json

{
  "trace_id": "uuid-v4",
  "input": { ... payload específico del kernel ... }
}
```

Respuesta:

```
{
  "trace_id": "uuid-v4",
  "kernel": "kernel-causal",
  "kernel_version": "1.0.0",
  "duration_ms": 123.4,
  "status": "ok" | "error",
  "output": { ... },
  "error": null | "mensaje"
}
```

Health check obligatorio en todos:

```
GET /health -> { "status": "ok", "kernel": "...", "uptime_s": 123.4 }
```

Esto permite:
1. **Bajo acoplamiento**: el orquestador puede sustituir cualquier kernel por
   una implementación distinta sin tocar los demás.
2. **Trazabilidad end-to-end**: el `trace_id` viaja por toda la cadena y se
   persiste en PostgreSQL junto con el payload de cada paso — auditoría
   completa del "grafo de ejecución" (Paso 6 del documento ALGONE).
3. **Escalabilidad horizontal**: cada kernel puede replicarse detrás de un
   balanceador sin cambiar el contrato.

## Mapa de kernels

| Kernel | Puerto | Lenguaje | Paso ALGONE | Librerías reales |
|---|---|---|---|---|
| `kernel-nlp` | 9001 | Python (FastAPI) | 1: NLP → GLM → AICc → Z-score | `statsmodels`, análisis léxico hawkish/dovish |
| `kernel-causal` | 9002 | **R** (`plumber`) | 2: PC → FCI → LiNGAM | `pcalg` (implementa `pc()`, `fci()`; LiNGAM vía ICA) |
| `kernel-bayes` | 9003 | **R** (`plumber`) | 3: HBM + NUTS | `rstan`/muestreador propio si `rstan` no compila |
| `kernel-tails` | 9004 | Python (FastAPI) | 4a: colas pesadas (Student-t / GEV) | `scipy.stats`, `PyMC` |
| `kernel-scm` | 9005 | Python (FastAPI) | 4b: confusores ocultos (Deep SCM) | `Pyro` |
| `kernel-counterfactual` | 9006 | **Julia** (`HTTP.jl`) | 5: simulación `do(x)` | cálculo directo sobre DAG + posterior, `Distributions.jl` |
| `orchestrator` | 8000 | Python (FastAPI) | 6-7: Pipe + Ecuación de Confluencia + webhook MT5 | — |

> **Nota (VPS pendiente)**: `kernel-causal` (R), `kernel-bayes` (R) y
> `kernel-counterfactual` (Julia) requieren una VPS con esos runtimes
> instalados, que todavía no está disponible. Mientras tanto existe una
> ruta **100% Python provisional** para no bloquear el desarrollo del
> resto del pipeline — ver sección siguiente.

## Ruta provisional 100% Python (mientras no hay VPS con R/Julia)

Mientras la VPS con R (`pcalg`, `rstan`) y Julia no está disponible, se
implementaron dos kernels **adicionales**, en Python puro, que respetan
exactamente el mismo contrato HTTP (`GET /health`, `POST /run`, mismo
`GenericRequest`/`GenericResponse` de `kernels/_shared/kernel_base.py`)
y el mismo formato de `output` que sus contrapartes originales
(`Paso2Output`, `Paso3Output` en `orchestrator/schemas.py`). El
orquestador puede apuntar a estos kernels sin ningún cambio de código,
solo cambiando la URL/puerto de destino.

Los directorios `kernels/causal_r/` (código R real, completo) y
`kernels/counterfactual_julia/` / `kernels/bayes_r/` (vacíos, nunca
implementados) **se conservan intactos** como el camino "real" para
cuando la VPS esté lista — esta ruta Python es explícitamente
**provisional**, no un reemplazo definitivo.

| Kernel provisional | Puerto | Sustituye a | Librería Python | Estado |
|---|---|---|---|---|
| `kernel-causal-py` (`kernels/causal_py`) | 9002 | `kernel-causal` (R + `pcalg`) | [`causal-learn`](https://github.com/py-why/causal-learn) — `PC()`, `FCI()`, `DirectLiNGAM` | ✅ implementado y probado (PC → FCI → LiNGAM) |
| `kernel-bayes-py` (`kernels/bayes_py`) | 9003 | `kernel-bayes` (R + `rstan`, nunca implementado) | [`PyMC`](https://www.pymc.io/) + `arviz` — HBM (partial pooling) + NUTS | ✅ implementado y probado (HBM + NUTS + prob. de evento crítico) |
| Paso 5 vía `pm.do()` (mismo `kernels/bayes_py`) | 9003 | `kernel-counterfactual` (Julia, nunca implementado) | `PyMC` — `pm.do()` para simulación `do(x)` | 🔜 pendiente |

Notas técnicas relevantes de esta ruta provisional:
- `kernel-causal-py` reproduce las 3 fases del kernel R (esqueleto PC,
  PAG vía FCI con detección de posibles confusores ocultos, y orden
  causal + pesos vía LiNGAM), devolviendo exactamente los mismos campos
  que `Paso2Output`.
- `kernel-bayes-py` construye un **Modelo Estructural Lineal Bayesiano
  Jerárquico** directamente sobre el DAG del Paso 2: cada variable con
  padres se modela como regresión lineal sobre ellos, y todos los
  coeficientes (`beta_padre→hijo`) comparten un hiper-prior global común
  (partial pooling), muestreado con NUTS (`pymc.sample`) — el mismo
  algoritmo (HMC con adaptación de paso) que usaría `rstan`/`cmdstanr`.
  Valida que el DAG de entrada sea acíclico (requisito de un modelo
  estructural lineal) antes de construir el modelo.
- Dependencias específicas documentadas en `algone/requirements.txt`
  (`causal-learn`, `pymc`, `arviz`), separadas del resto del stack Python
  del kernel-nlp/orquestador para dejar clara la naturaleza "añadida" de
  esta ruta.
- Ninguno de los kernels existentes (`kernel-nlp`, `causal_r/`,
  `market_agents/server.py`) fue modificado para construir esta ruta:
  son directorios y puertos completamente nuevos.

## Ecuación de Confluencia (Paso 7)

El orquestador NUNCA declara alerta de "Régimen de Expansión de Volatilidad"
basándose en un solo canal. Requiere la convergencia matemática de 3 canales
independientes, tal como especifica el documento fuente:

1. **Canal Macro**: Z-score de sorpresa del discurso > umbral crítico (kernel-nlp).
2. **Canal Microestructura**: liquidez/gamma negativa detectada en tiempo real
   (fuente de datos de mercado — order book / futuros).
3. **Canal Estrés de Crédito**: aplanamiento/steepening abrupto en CDS o curvas
   de rendimiento (fuente FRED / spreads de crédito).

Solo si los 3 canales confirman por encima de su umbral, se activa el webhook
hacia MetaTrader 5 (por defecto apuntando a cuenta DEMO — ver `docs/SAFETY.md`).

## Integración con el proyecto de análisis MAIA existente

ALGONE se integra como **módulo adicional** dentro del mismo dashboard:
- Reutiliza el registry de fuentes de datos (FRED, Yahoo Finance, etc.)
  planificado para el proyecto de "18 fuentes + 10 brokers".
- Expone sus alertas de confluencia como una sección nueva del dashboard
  Next.js: `/algone` — timeline de shocks detectados, mapa del DAG causal,
  y estado de los 3 canales en tiempo real.
- Comparte la misma base de datos PostgreSQL (tablas separadas por prefijo
  `algone_*`) y la misma cola de trabajos.
