// Karte ohne DOM: Zuordnung der Einkommen zu Feldern, Feldtext, Pfeiltasten, „Euer Ergebnis".
// Die Beträge der Felder sind mit vergleiche() (calc/szenario.js) für die Einkommen des Felds nachgerechnet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { feldFuer, feldNetto, eigenesFeld, feldText, naechstesFeld, ergebnisKarte, planZeile } from '../site/js/ui/karte.js';
import { RASTER, ganzeDifferenz } from '../site/js/ui/diagramme.js';
import { vergleiche } from '../site/js/calc/szenario.js';
import { STANDARD, ausHash, grundlage, fuerPartnermonate } from '../site/js/ui/zustand.js';

/** Differenz des Felds (Netto, Plan) wie heatmap() sie bildet. */
const feld = (nettoA, nettoB, monateA, monateB) =>
  ganzeDifferenz(vergleiche({ nettoA, nettoB, monateA, monateB, mutterschutzMonate: nettoA > 0 ? 2 : 0, mutterschutzVerbraucht80: true })).differenz;

test('Feldzuordnung: nächstes Feld, am Rand begrenzt', () => {
  assert.equal(feldFuer(1800), 7); // 1.750 €
  assert.equal(feldFuer(2800), 11); // 2.750 €
  assert.equal(feldFuer(1875), 8); // genau dazwischen: aufrunden
  assert.equal(feldFuer(0), 0);
  assert.equal(feldFuer(5000), RASTER.n - 1);
  assert.equal(feldFuer(9000), RASTER.n - 1);
  assert.equal(feldNetto(7), 1750);
  assert.deepEqual(eigenesFeld(1800, 2800), { i: 7, j: 11 });
  assert.deepEqual(eigenesFeld(0, 20000), { i: 0, j: RASTER.n - 1 });
});

test('Feldtext: Einkommen des Felds und Ergebnis je Familie', () => {
  assert.equal(feldText({ nettoA: 2000, nettoB: 3000, differenz: -3600 }), 'Mutter 2.000 € netto · Partner:in 3.000 € netto · Ergebnis: −3.600 €');
  assert.equal(feldText({ nettoA: 0, nettoB: 0, differenz: 360 }), 'Mutter 0 € netto · Partner:in 0 € netto · Ergebnis: +360 €');
  assert.equal(feldText({ nettoA: 500, nettoB: 500, differenz: 0 }), 'Mutter 500 € netto · Partner:in 500 € netto · Ergebnis: 0 €');
});

test('Felder gegen den Rechenkern: fünf Felder, Plan 12 + 2 und andere', () => {
  assert.equal(feld(2000, 3000, 12, 2), -3600);
  assert.equal(feld(0, 0, 12, 2), 360);
  assert.equal(feld(1750, 2750, 12, 2), -3100);
  assert.equal(feld(500, 4500, 10, 4), -30);
  assert.equal(feld(5000, 250, 7, 7), 710);
  assert.equal(feld(3000, 0, 12, 0), -5200);
  assert.equal(feldText({ nettoA: 1750, nettoB: 2750, differenz: feld(1750, 2750, 12, 2) }), 'Mutter 1.750 € netto · Partner:in 2.750 € netto · Ergebnis: −3.100 €');
});

test('Pfeiltasten: oben = mehr Netto Partner:in, rechts = mehr Netto Mutter, am Rand Halt', () => {
  assert.deepEqual(naechstesFeld({ i: 3, j: 4 }, 'ArrowRight'), { i: 4, j: 4 });
  assert.deepEqual(naechstesFeld({ i: 3, j: 4 }, 'ArrowLeft'), { i: 2, j: 4 });
  assert.deepEqual(naechstesFeld({ i: 3, j: 4 }, 'ArrowUp'), { i: 3, j: 5 });
  assert.deepEqual(naechstesFeld({ i: 3, j: 4 }, 'ArrowDown'), { i: 3, j: 3 });
  assert.deepEqual(naechstesFeld({ i: 0, j: 0 }, 'ArrowLeft'), { i: 0, j: 0 });
  assert.deepEqual(naechstesFeld({ i: RASTER.n - 1, j: RASTER.n - 1 }, 'ArrowUp'), { i: RASTER.n - 1, j: RASTER.n - 1 });
  assert.equal(naechstesFeld({ i: 1, j: 1 }, 'Tab'), null);
});

test('Euer Ergebnis: Kontrollfall 1.800 € / 2.800 € / 2 Partnermonate = −3.220 € wie der Rechner', () => {
  const z = ausHash('');
  const e = grundlage(z);
  const gezeigt = fuerPartnermonate(z, e, z.monB);
  const r = ergebnisKarte(e, gezeigt, 12, 2);
  assert.deepEqual([r.gleich, r.alt, r.neu, r.differenz], [true, 15300, 12080, -3220]);
  assert.equal(planZeile(12, 2, gezeigt), 'Aufteilung wie im Rechner: Mutter 12, Partner:in 2 Monate.');
});

test('Euer Ergebnis: andere Aufteilung der Karte wird benannt und gerechnet', () => {
  const z = ausHash('');
  const e = grundlage(z);
  const gezeigt = fuerPartnermonate(z, e, z.monB);
  const r = ergebnisKarte(e, gezeigt, 7, 7);
  const direkt = ganzeDifferenz(vergleiche({ ...e, monateA: 7, monateB: 7 }));
  assert.equal(r.gleich, false);
  assert.equal(r.differenz, direkt.differenz);
  assert.notEqual(r.differenz, -3220);
  assert.match(planZeile(7, 7, gezeigt), /Aufteilung der Karte: Mutter 7, Partner:in 7 Monate\. Der Rechner in Schritt 2 rechnet mit Mutter 12, Partner:in 2 Monaten\./);
});

test('Euer Ergebnis folgt dem Rechner: 4 Partnermonate = 10 + 4, Geschwisterbonus fließt ein', () => {
  const z = ausHash('#monB=4&geschw=1');
  const e = grundlage(z);
  const gezeigt = fuerPartnermonate(z, e, z.monB);
  const r = ergebnisKarte(e, gezeigt, 10, 4);
  assert.equal(r.gleich, true);
  assert.equal(r.differenz, ganzeDifferenz(gezeigt).differenz);
  assert.notEqual(r.differenz, ergebnisKarte(grundlage({ ...STANDARD, monB: 4 }), fuerPartnermonate(STANDARD, grundlage({ ...STANDARD, monB: 4 }), 4), 10, 4).differenz);
});

import { feldWert, ergebnisBeste, plaeneText } from '../site/js/ui/karte.js';
test('Karte, beste Aufteilung: Feldwert unterm Strich samt Plänen; Euer Ergebnis', () => {
  const w = feldWert({ mutterschutz: 2, mutterschutzVerbraucht80: true });
  assert.deepEqual(w(1800, 2800), { differenz: -1420, alt: { monateA: 12, monateB: 2 }, neu: { monateA: 10, monateB: 4 } });
  assert.equal(w(1800, 2800), w(1800, 2800)); // gemerkt
  assert.equal(plaeneText({ monateA: 12, monateB: 2 }, { monateA: 10, monateB: 4 }), 'heute 12 + 2, geplant 10 + 4');
  const e = grundlage(STANDARD);
  const r = ergebnisBeste(e, fuerPartnermonate(STANDARD, e, 2));
  assert.deepEqual([r.differenz, r.lohn, r.unterm, r.plaene], [580, -2000, -1420, 'heute 12 + 2, geplant 10 + 4']);
});
