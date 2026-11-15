// Plausibilität des Überschlags: Summe nach geltendem Recht muss in der Größenordnung der
// tatsächlichen Bundesausgaben für Elterngeld liegen (Ist 2023: 7,44 Mrd. €, 2024: 7,17 Mrd. €).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ueberschlag, spanne, FAMILIEN, EINKOMMEN, OHNE_EINKOMMEN, DAUER, OBERSTE_KLASSE } from '../site/js/calc/bevoelkerung.js';

test('Personenzahlen stimmen mit den Destatis-Summen überein', () => {
  for (const [wer, gesamt] of [['muetter', 642965], ['vaeter', 302135]]) {
    assert.equal(EINKOMMEN.reduce((s, k) => s + k[wer], 0) + OHNE_EINKOMMEN[wer], gesamt);
    assert.equal(DAUER.reduce((s, k) => s + k[wer], 0), gesamt);
  }
});

test('Summe nach geltendem Recht liegt nahe an den Bundesausgaben', () => {
  const r = ueberschlag();
  assert.ok(r.alt > 6.8e9 && r.alt < 8.0e9, `alt = ${r.alt}`);
});

test('Entwurf ergibt in allen Varianten weniger als geltendes Recht', () => {
  for (const obersteKlasse of Object.values(OBERSTE_KLASSE)) {
    for (const mutterschutzVerbraucht80 of [true, false]) {
      const r = ueberschlag({ obersteKlasse, mutterschutzVerbraucht80 });
      assert.ok(r.differenz < 0);
      assert.ok(r.jeFamilie < 0);
      assert.ok(r.anteilVerlierer > 0.5 && r.anteilVerlierer + r.anteilGewinner <= 1 + 1e-9);
    }
  }
});

test('Auswertungen je Familie ergeben zusammen die Gesamtsumme', () => {
  const r = ueberschlag();
  for (const gruppen of [r.nachAufteilung, r.nachEinkommen]) {
    assert.ok(Math.abs(gruppen.reduce((s, g) => s + g.familien * g.differenz, 0) - r.differenz) < 1);
    assert.ok(Math.abs(gruppen.reduce((s, g) => s + g.familien, 0) - FAMILIEN) < 1e-6);
  }
  assert.ok(Math.abs(r.jeFamilie * FAMILIEN - r.differenz) < 1);
});

test('Schritt 1 nennt als Stand ohne Skript dieselben Schätzwerte wie das Modell', () => {
  // main.js (statistik()) setzt die Werte aus dem Modell; im HTML stehen sie für den Fall ohne Skript
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const steht = (id) => html.match(new RegExp(`id="${id}">([^<]*)<`))[1].replace(/\u00a0/g, ' ');
  const s = spanne(true);
  const prozent = (x) => Math.round(x * 100);
  const hundert = (x) => new Intl.NumberFormat('de-DE').format(Math.round(Math.abs(x) / 100) * 100);
  const verlierer = (r) => r.anteilVerlierer;
  const jeFamilie = (r) => -r.jeFamilie;
  assert.equal(steht('vorspann-anteil'), String(Math.round(s.mitte.anteilVerlierer * 10) * 10));
  assert.equal(steht('quellen-spanne-anteil'), `${prozent(s.von(verlierer))} bis ${prozent(s.bis(verlierer))}`);
  assert.equal(steht('plakat-schnitt'), `−${hundert(s.mitte.jeFamilie)} €`);
  assert.equal(steht('quellen-spanne-betrag'), `${hundert(s.von(jeFamilie))} bis ${hundert(s.bis(jeFamilie))} €`);
  // Zeile „Wie viele Familien bekommen weniger?“ in der zugeklappten Liste im Hintergrund
  assert.equal(steht('kern-anteil'), String(Math.round(s.mitte.anteilVerlierer * 10) * 10));
  assert.equal(steht('kern-betrag'), `${hundert(s.mitte.jeFamilie)} €`);
});
