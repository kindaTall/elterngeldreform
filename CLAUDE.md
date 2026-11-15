# elterngeldreform

@deploy.yaml

**Deploy** nur wie in `deploy.yaml` (`kind`, `how`, `targets`): nie Dateien von Hand auf den Server laden oder dort ändern.

Statische Kampagnenseite: Vergleich Elterngeld geltendes Recht vs. Gesetzentwurf vom 12.11.2026 (Geburten ab 01.11.2027).

- Seite: `site/` (kein Build-Schritt, direkt deploybar) — lokal: `npm run dev` (`dev-server.py`, sendet `Cache-Control: no-store`) → http://localhost:8137
- Tests: `npm test` (Node-Testrunner, `test/*.test.js`)
- CI: `.github/workflows/ci.yml` (GitHub Actions, `npm ci && npm test`)
- Sicherheits-Header: `site/.htaccess` (Apache) und CSP-Meta in den drei HTML-Seiten, beide müssen gleich lauten
- Rechenkern: `site/js/calc/` — Regeln und Quellen in `regeln.js`, Annahmen in den Dateiköpfen von `szenario.js`, `bevoelkerung.js`, `netto.js`
- Oberfläche: `site/js/main.js`, `site/js/ui/`
- Schrift liegt in `site/fonts/` (Schibsted Grotesk aus `@fontsource-variable/*`), keine externen Anfragen beim Laden
- Geldbeträge und Differenzen immer je Familie/Paar zeigen, nie getrennt nach Mutter und Vater (Rechner, Statistik, Brief, Teilen)
- Aufbau der Seite: drei Schritte (Problem → Ergebnis → Handeln), danach aufklappbarer Hintergrund; der Rechner vergleicht dieselbe Aufteilung der Monate nach geltendem Recht und nach dem Entwurf (Partnermonate in Schritt 2, Monate der Mutter unter „Genauer rechnen“)
- Gestaltung: Regeln im Kopf von `site/css/style.css` (weiß, eine Schrift, Farbe nur für mehr/weniger, dezente Bewegung)
- Hosting: Hetzner Webhosting S, Domain elterngeld2027.de
- Veröffentlichen: GitHub Actions → `veroeffentlichen.yml` von Hand starten (`gh workflow run veroeffentlichen.yml`), lädt `site/` per SFTP zu Hetzner; Zugang über Repository-Variablen `SFTP_HOST`, `SFTP_USER` und Secret `SFTP_PASSWORD`; angehefteter Host-Schlüssel in `.github/known_hosts`
- Platzhalter: `.offen` markiert Stellen, die vor einer Veröffentlichung zu klären sind (derzeit keine)
- Anschrift des Betreibers: nicht im Repo; Platzhalter `{{ANSCHRIFT_STRASSE}}`/`{{ANSCHRIFT_ORT}}` in Impressum und Datenschutz, ersetzt beim Veröffentlichen aus den Secrets `IMPRESSUM_STRASSE`/`IMPRESSUM_ORT`
- Vorschaubild `site/og.png` (1200×630) nach Designänderungen neu erzeugen
- Ändert sich der Entwurf im Bundestag: `regeln.js` anpassen, Testfälle in `test/` nachziehen, Stand-Datum in `site/index.html`
