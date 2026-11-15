# elterngeldreform

Statische Kampagnenseite: Vergleich Elterngeld geltendes Recht vs. Gesetzentwurf vom 12.11.2026 (Geburten ab 01.11.2027).

- Seite: `site/` (kein Build-Schritt, direkt deploybar) — lokal: `npm run dev` → http://localhost:8137
- Tests: `npm test` (Node-Testrunner, `test/*.test.js`)
- CI: `.github/workflows/ci.yml` (GitHub Actions, `npm ci && npm test`)
- Rechenkern: `site/js/calc/` — Regeln und Quellen in `regeln.js`, Annahmen in den Dateiköpfen von `szenario.js`, `bevoelkerung.js`, `netto.js`
- Oberfläche: `site/js/main.js`, `site/js/ui/`
- Schrift liegt in `site/fonts/` (Schibsted Grotesk aus `@fontsource-variable/*`), keine externen Anfragen beim Laden
- Geldbeträge und Differenzen immer je Familie/Paar zeigen, nie getrennt nach Mutter und Vater (Rechner, Statistik, Brief, Teilen)
- Aufbau der Seite: drei Schritte (Problem → Ergebnis → Handeln), danach aufklappbarer Hintergrund; der Rechner zeigt immer zwei Fälle: umgeplant (12+2 → 10+4) und Aufteilung wie bisher
- Gestaltung: Regeln im Kopf von `site/css/style.css` (weiß, eine Schrift, Farbe nur für mehr/weniger, dezente Bewegung)
- Vor Veröffentlichung: gelb markierte Platzhalter (`.offen`) in `site/impressum.html` und `site/datenschutz.html` ersetzen; Empfänger für Fehlermeldungen in `site/js/config.js` eintragen
- Vorschaubild `site/og.png` (1200×630) nach Designänderungen neu erzeugen
- Ändert sich der Entwurf im Bundestag: `regeln.js` anpassen, Testfälle in `test/` nachziehen, Stand-Datum in `site/index.html`
