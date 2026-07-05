#!/usr/bin/env Rscript
# ---------------------------------------------------------------------------
# kernel-causal: servidor HTTP (wrapper limpio) del Paso 2 de ALGONE.
#
# Expone procesar_paso2() (engine.R) bajo el mismo contrato estandar de
# ALGONE (POST /run, GET /health) que usan los kernels Python y Julia,
# implementado aqui con `plumber` en vez de FastAPI/HTTP.jl.
#
# Ejecucion local:
#   Rscript kernels/causal_r/server.R
#   (arranca en 0.0.0.0:9002)
# ---------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(plumber)
  library(jsonlite)
})

.args <- commandArgs(trailingOnly = FALSE)
.script_path <- sub("^--file=", "", .args[grep("^--file=", .args)])
.script_dir <- if (length(.script_path) > 0) dirname(normalizePath(.script_path)) else getwd()
source(file.path(.script_dir, "engine.R"))

KERNEL_NAME <- "kernel-causal"
KERNEL_VERSION <- "1.0.0"
.start_time <- Sys.time()

#* @get /health
function() {
  list(
    status = "ok",
    kernel = KERNEL_NAME,
    uptime_s = round(as.numeric(difftime(Sys.time(), .start_time, units = "secs")), 3)
  )
}

#* @post /run
#* @serializer unboxedJSON
function(req, res) {
  t0 <- Sys.time()
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)

  trace_id <- if (!is.null(body) && !is.null(body$trace_id)) body$trace_id else NA
  input <- if (!is.null(body)) body$input else NULL

  respond <- function(status, output = NULL, error = NULL) {
    duration_ms <- round(as.numeric(difftime(Sys.time(), t0, units = "secs")) * 1000, 3)
    list(
      trace_id = trace_id,
      kernel = KERNEL_NAME,
      kernel_version = KERNEL_VERSION,
      duration_ms = duration_ms,
      status = status,
      output = output,
      error = error
    )
  }

  if (is.null(input) || is.null(input$variables) || is.null(input$matriz_datos)) {
    res$status <- 200
    return(respond("error", error = "Campos requeridos faltantes: 'variables' y/o 'matriz_datos'"))
  }

  variables <- unlist(input$variables)
  matriz_datos <- input$matriz_datos
  alpha <- if (!is.null(input$alpha)) as.numeric(input$alpha) else 0.05

  resultado <- tryCatch(
    list(ok = TRUE, valor = procesar_paso2(variables, matriz_datos, alpha)),
    error = function(e) list(ok = FALSE, mensaje = conditionMessage(e))
  )

  res$status <- 200
  if (isTRUE(resultado$ok)) {
    respond("ok", output = resultado$valor)
  } else {
    respond("error", error = resultado$mensaje)
  }
}
