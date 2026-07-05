#!/usr/bin/env Rscript
# ---------------------------------------------------------------------------
# kernel-causal: motor real del Paso 2 de ALGONE.
# Descubrimiento causal en 3 fases secuenciales (ver PDF fuente, Paso 2):
#
#   Fase A (PC):     descubre el ESQUELETO no dirigido vía pruebas de
#                     independencia condicional (algoritmo Peter-Clark).
#   Fase B (FCI):     refina ese esqueleto asumiendo posibles CONFUSORES
#                     OCULTOS (variables latentes no observadas) y produce
#                     un PAG (Partial Ancestral Graph) con marcas de
#                     incertidumbre (circulo/flecha/cola).
#   Fase C (LiNGAM):  para las aristas que PC/FCI dejan sin orientar
#                     (por asumir datos Gaussianos), LiNGAM usa la
#                     NO-gaussianidad de los residuos (vía ICA) para
#                     determinar la DIRECCION causal final.
#
# Implementado con pcalg (pc(), fci(), lingam()) — no simulado.
# ---------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(pcalg)
  library(jsonlite)
})

#' Ejecuta el pipeline causal completo PC -> FCI -> LiNGAM
#'
#' @param variables character vector con los nombres de las variables
#' @param matriz_datos lista de filas (cada fila = observacion, cada
#'   elemento = valor por variable), tal como llega desde JSON
#' @param alpha nivel de significancia para las pruebas de independencia
#' @return lista con dag_edges, pag_edges, orden_causal_lingam,
#'   esqueleto_inicial_pc, variables_ocultas_sospechadas
procesar_paso2 <- function(variables, matriz_datos, alpha = 0.05) {
  p <- length(variables)
  datos <- do.call(rbind, lapply(matriz_datos, as.numeric))
  colnames(datos) <- variables
  n <- nrow(datos)

  if (n < 5 || p < 2) {
    stop(sprintf(
      "Datos insuficientes para descubrimiento causal: n=%d observaciones, p=%d variables (se requieren >=5 y >=2)",
      n, p
    ))
  }

  # suffStat compartido por PC y FCI: usan el test de independencia
  # condicional Gaussiano estándar sobre la matriz de correlación.
  corr_mat <- cor(datos)
  suff_stat <- list(C = corr_mat, n = n)

  # ---------------------------------------------------------------------
  # FASE A: PC — esqueleto no dirigido inicial
  # ---------------------------------------------------------------------
  pc_fit <- pcalg::pc(
    suffStat = suff_stat,
    indepTest = pcalg::gaussCItest,
    alpha = alpha,
    labels = variables,
    verbose = FALSE
  )

  pc_amat <- as(pc_fit@graph, "matrix")  # 1 = arista (posiblemente no dirigida)
  esqueleto_inicial_pc <- list()
  for (i in seq_len(p)) {
    for (j in seq_len(p)) {
      if (i < j && (pc_amat[i, j] == 1 || pc_amat[j, i] == 1)) {
        esqueleto_inicial_pc[[length(esqueleto_inicial_pc) + 1]] <- list(
          from = variables[i], to = variables[j], type = "undirected"
        )
      }
    }
  }

  # ---------------------------------------------------------------------
  # FASE B: FCI — asume confusores ocultos; produce un PAG con marcas
  # (0 = sin marca/sin arista, 1 = circulo "o", 2 = flecha ">", 3 = cola "-")
  # ---------------------------------------------------------------------
  fci_fit <- pcalg::fci(
    suffStat = suff_stat,
    indepTest = pcalg::gaussCItest,
    alpha = alpha,
    labels = variables,
    verbose = FALSE
  )

  fci_amat <- fci_fit@amat
  marca_texto <- function(m) {
    switch(as.character(m), "0" = "none", "1" = "circle", "2" = "arrow", "3" = "tail", "desconocida")
  }

  pag_edges <- list()
  variables_ocultas_sospechadas <- character(0)
  for (i in seq_len(p)) {
    for (j in seq_len(p)) {
      if (i < j && (fci_amat[i, j] != 0 || fci_amat[j, i] != 0)) {
        pag_edges[[length(pag_edges) + 1]] <- list(
          from = variables[i],
          to = variables[j],
          marca_en_from = marca_texto(fci_amat[j, i]),
          marca_en_to = marca_texto(fci_amat[i, j])
        )
        # Marca <-> (flecha en ambos extremos) es la firma clasica de un
        # confusor oculto no observado en el PAG de FCI.
        if (fci_amat[i, j] == 2 && fci_amat[j, i] == 2) {
          variables_ocultas_sospechadas <- union(
            variables_ocultas_sospechadas,
            c(variables[i], variables[j])
          )
        }
      }
    }
  }

  # ---------------------------------------------------------------------
  # FASE C: LiNGAM — orientacion final via no-gaussianidad (ICA)
  # ---------------------------------------------------------------------
  orden_causal_lingam <- variables
  dag_edges <- list()
  lingam_error <- NULL
  tryCatch({
    lingam_fit <- pcalg::lingam(datos)
    # lingam_fit$Bpruned: matriz p x p, Bpruned[i, j] != 0 => j causa a i
    # (convencion pcalg: B %*% x = x, filas = variable "afectada")
    Bmat <- lingam_fit$Bpruned
    if (is.null(Bmat)) Bmat <- lingam_fit$B

    for (i in seq_len(p)) {
      for (j in seq_len(p)) {
        if (i != j && abs(Bmat[i, j]) > 1e-8) {
          dag_edges[[length(dag_edges) + 1]] <- list(
            from = variables[j],
            to = variables[i],
            type = "directed",
            peso = round(as.numeric(Bmat[i, j]), 6)
          )
        }
      }
    }

    # Orden causal: variables ordenadas de "causa raiz" a "efecto final"
    # segun el orden topologico k que produce LiNGAM internamente.
    if (!is.null(lingam_fit$k)) {
      orden_causal_lingam <- variables[lingam_fit$k]
    }
  }, error = function(e) {
    lingam_error <<- conditionMessage(e)
  })

  if (length(dag_edges) == 0 && !is.null(lingam_error)) {
    # Fallback: si LiNGAM no converge (comun con muestras pequeñas o datos
    # casi-Gaussianos, donde LiNGAM pierde identificabilidad), degradamos
    # a las aristas no dirigidas de PC, documentando la limitacion.
    dag_edges <- lapply(esqueleto_inicial_pc, function(e) {
      list(from = e$from, to = e$to, type = "undirected_fallback")
    })
  }

  list(
    dag_edges = dag_edges,
    pag_edges = pag_edges,
    orden_causal_lingam = as.list(orden_causal_lingam),
    esqueleto_inicial_pc = esqueleto_inicial_pc,
    variables_ocultas_sospechadas = as.list(variables_ocultas_sospechadas),
    lingam_error = lingam_error
  )
}
