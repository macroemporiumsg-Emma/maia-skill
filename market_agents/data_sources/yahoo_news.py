"""
Conector REAL (no simulado) al feed RSS de noticias de Yahoo Finance por
ticker, sin API key.

Endpoint: https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}

Se usa como entrada de "noticias/sentimiento" para el agente LLM causal:
en vez de un score de sentimiento numérico opaco, se extraen los
titulares reales y más recientes, y es el propio LLM quien los lee y
razona sobre su posible impacto causal en el precio — manteniendo la
transparencia (la evidencia cruda queda expuesta, no un número mágico).
"""
from __future__ import annotations

import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Optional

import httpx

BASE_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline"
HEADERS = {"User-Agent": "Mozilla/5.0 (ALGONE/MAIA market-agent; +https://github.com)"}


class YahooNewsError(RuntimeError):
    pass


@dataclass
class Noticia:
    titulo: str
    descripcion: str
    enlace: str
    fecha_publicacion: str


def fetch_news(
    symbol: str,
    max_items: int = 8,
    timeout: float = 10.0,
    max_retries: int = 2,
) -> list[Noticia]:
    """
    Descarga titulares de noticias REALES para `symbol` desde el RSS de
    Yahoo Finance.

    Devuelve una lista (posiblemente vacía si el ticker no tiene noticias
    recientes) de las `max_items` noticias más recientes. Lanza
    YahooNewsError solo si la petición HTTP falla o el XML es inválido
    (un feed vacío pero bien formado NO es un error: simplemente no hay
    noticias recientes para ese símbolo).
    """
    params = {"s": symbol}
    last_error: Optional[Exception] = None
    for intento in range(max_retries + 1):
        try:
            resp = httpx.get(BASE_URL, params=params, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            return _parse_rss(resp.text, max_items)
        except (httpx.HTTPError, ET.ParseError) as exc:
            last_error = exc
            if intento < max_retries:
                time.sleep(0.5 * (intento + 1))
                continue
    raise YahooNewsError(
        f"No se pudo obtener noticias reales para '{symbol}' tras "
        f"{max_retries + 1} intentos: {last_error}"
    )


def _parse_rss(xml_text: str, max_items: int) -> list[Noticia]:
    root = ET.fromstring(xml_text)
    items = root.findall("./channel/item")
    noticias: list[Noticia] = []
    for item in items[:max_items]:
        noticias.append(
            Noticia(
                titulo=(item.findtext("title") or "").strip(),
                descripcion=(item.findtext("description") or "").strip(),
                enlace=(item.findtext("link") or "").strip(),
                fecha_publicacion=(item.findtext("pubDate") or "").strip(),
            )
        )
    return noticias
