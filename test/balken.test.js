// Balkenmodell für Schritt 2 (ui/balken.js): Höhen, Segmente, Delta und verfallene Monate, ohne DOM.
// Die Euro-Werte sind die Kontrollwerte des Rechners (Mutter 1.800 €, Partner:in 2.800 € netto).
import test from 'node:test';
import assert from 'node:assert/strict';
import { balkenmodell } from '../site/js/ui/balken.js';
import { ausHash, grundlage, fuerPartnermonate } from '../site/js/ui/zustand.js';

/** Modell so, wie Schritt 2 es für ein Fragment zeigt. */
function modell(hash) {
  const z = ausHash(hash);
  const e = grundlage(z);
  return balkenmodell(fuerPartnermonate(z, e, z.monB), { alleinerziehend: e.alleinerziehend });
}
const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test('Standard (Partner 2 Monate): −3.220 €, −21 %, rechter Balken niedriger, 2 Monate verfallen', () => {
  const m = modell('');
  assert.deepEqual([m.heute.summe, m.geplant.summe, m.delta], [15300, 12080, -3220]);
  assert.equal(m.deltaText, '−3.220 €');
  assert.equal(m.prozentText, '−21 %');
  assert.equal(m.vorzeichen, 'minus');
  assert.equal(m.heute.hoehe, 1);
  nah(m.geplant.hoehe, 12080 / 15300);
  assert.deepEqual(m.stueck, { art: 'fehlt', von: m.geplant.hoehe, bis: 1 });
  assert.equal(m.verfallen, 2);
  assert.equal(m.verfallenText, '− 2 Monate ohne Elterngeld');
  assert.deepEqual(m.heute.segmente.map((s) => s.text), ['Mutter · 12 Monate', 'Partner:in · 2 Monate']);
  assert.deepEqual(m.geplant.segmente.map((s) => s.text), ['Mutter · 10 Monate', 'Partner:in · 2 Monate']);
});

test('Segmente: Anteile je Balken summieren sich zu 1, Text nennt nur Monate, nie Euro', () => {
  for (const h of ['', '#monB=4', '#monB=0', '#einkA=3000&einkB=3000', '#allein=1']) {
    const m = modell(h);
    for (const b of [m.heute, m.geplant]) {
      nah(b.segmente.reduce((s, x) => s + x.anteil, 0), 1);
      for (const s of b.segmente) assert.doesNotMatch(s.text, /€|[+−]/);
    }
  }
});

test('Partner 4 Monate: −680 €, keine Monate verfallen', () => {
  const m = modell('#monB=4');
  assert.deepEqual([m.heute.summe, m.geplant.summe, m.deltaText, m.prozentText], [16560, 15880, '−680 €', '−4 %']);
  assert.equal(m.verfallenText, '');
});

test('Partner 0 Monate und Alleinerziehend: nur eine Tönung', () => {
  const m = modell('#monB=0');
  assert.deepEqual([m.heute.summe, m.geplant.summe, m.deltaText], [11700, 8280, '−3.420 €']);
  assert.equal(m.heute.segmente.length, 1);
  assert.equal(m.geplant.segmente.length, 1);
  const a = modell('#allein=1');
  assert.equal(a.heute.segmente.length, 1);
  assert.equal(a.geplant.segmente.length, 1);
});

test('3.000 € / 3.000 €, Partner 2 Monate: −5.000 €', () => {
  assert.equal(modell('#einkA=3000&einkB=3000').deltaText, '−5.000 €');
});

test('Mehr im Entwurf: rechter Balken voll hoch, grünes Stück über der Höhe des linken', () => {
  const m = modell('#einkA=0&einkB=0&monB=4');
  assert.equal(m.vorzeichen, 'plus');
  assert.match(m.deltaText, /^\+/);
  assert.equal(m.geplant.hoehe, 1);
  assert.ok(m.heute.hoehe < 1);
  assert.deepEqual(m.stueck, { art: 'mehr', von: m.heute.hoehe, bis: 1 });
});

test('Gleichstand: zwei gleiche Balken, „±0 €", kein Stück, kein Prozent', () => {
  const r = (summeA) => ({ plan: { monateA: 12, monateB: 0 }, summeA, summeB: 0, summe: summeA });
  const m = balkenmodell({ alt: r(9000), neu: r(9000.2), entfalleneMonate: 0 });
  assert.equal(m.deltaText, '±0 €');
  assert.equal(m.prozentText, '');
  assert.equal(m.stueck.art, null);
  assert.deepEqual([m.heute.hoehe, m.geplant.hoehe], [1, 1]);
});

test('Prozent unter 1: „< 1 %" statt „−0 %"; ein verfallener Monat in der Einzahl', () => {
  const r = (summeA, monateA) => ({ plan: { monateA, monateB: 0 }, summeA, summeB: 0, summe: summeA });
  const m = balkenmodell({ alt: r(20000, 12), neu: r(19950, 11), entfalleneMonate: 1 });
  assert.equal(m.prozentText, '< 1 %');
  assert.equal(m.verfallenText, '− 1 Monat ohne Elterngeld');
});

test('Partner 12 Monate: Mutter hat nur Mutterschutz-Monate, ihr Teil heißt „(Mutterschaftsgeld)"', () => {
  const m = modell('#monB=12');
  assert.deepEqual([m.heute.summe, m.geplant.summe], [21600, 16000]);
  for (const b of [m.heute, m.geplant]) {
    const [mutter] = b.segmente;
    assert.equal(mutter.anteil, 0);
    assert.equal(mutter.mutterschutz, 2);
    assert.equal(mutter.nurMutterschutz, true);
    assert.equal(mutter.text, 'Mutter · 2 Monate (Mutterschaftsgeld)');
  }
  assert.deepEqual(m.geplant.segmente.map((s) => s.text), ['Mutter · 2 Monate (Mutterschaftsgeld)', 'Partner:in · 10 Monate']);
});

test('Nachbarfälle: Partner 10 und 11 (bezahlter Rest bei der Mutter), Partner 0, Mutter ohne Einkommen', () => {
  for (const [h, a] of [['#monB=10', 4], ['#monB=11', 3]]) {
    const [mutter] = modell(h).heute.segmente;
    assert.equal(mutter.monate, a);
    assert.equal(mutter.mutterschutz, 2);
    assert.equal(mutter.nurMutterschutz, false);
    assert.ok(mutter.anteil > 0);
    assert.equal(mutter.text, `Mutter · ${a} Monate`);
  }
  const ohne = modell('#monB=0');
  assert.equal(ohne.heute.segmente.length, 1);
  assert.equal(ohne.heute.segmente[0].nurMutterschutz, false);
  const [m0] = modell('#einkA=0&monB=12').heute.segmente;
  assert.equal(m0.mutterschutz, 0);
  assert.equal(m0.nurMutterschutz, false);
  assert.ok(m0.anteil > 0);
});
