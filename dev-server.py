#!/usr/bin/env python3
"""Lokaler Entwicklungsserver für site/ (nur zum Entwickeln, wird nicht veröffentlicht).

Wie `python3 -m http.server`, aber jede Antwort trägt `Cache-Control: no-store`.
Ohne den Header schätzt Safari aus `Last-Modified` selbst eine Cache-Dauer und mischt nach
Änderungen altes CSS oder alte JS-Module mit neuem HTML. Zusätzlich werden bedingte Anfragen
(`If-Modified-Since`) ignoriert, damit nie ein 304 auf einen alten Cache-Eintrag zeigt.

Start: `npm run dev` oder `python3 dev-server.py` -> http://localhost:8137 (nur 127.0.0.1)
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8137
VERZEICHNIS = Path(__file__).resolve().parent / "site"


class OhneCache(SimpleHTTPRequestHandler):
    def send_head(self):
        for kopf in ("If-Modified-Since", "If-None-Match"):
            del self.headers[kopf]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = partial(OhneCache, directory=str(VERZEICHNIS))
    with ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"http://localhost:{PORT} -> {VERZEICHNIS} (Cache-Control: no-store)")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
