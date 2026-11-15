// Monatsbeträge: Tabelle 10.4 des Recherche-Faktenblatts (aus § 2 BEEG / § 2 BEEG-E abgeleitet),
// DGB-Beispiel (Stellungnahme 30.10.2026) und Begründung des Entwurfs (S. 24, 40).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALT, NEU } from '../site/js/calc/regeln.js';
import { monatsbetrag, ersatzrate } from '../site/js/calc/elterngeld.js';

const [hoch, niedrig] = NEU.stufen;
const alt = ALT.stufen[0];

// netto, NEU Monat 1–4, NEU Monat 5+, ALT
const tabelle = [
  [0, 330, 330, 300],
  [300, 330, 330, 300],
  [400, 400, 330, 388],
  [500, 500, 375, 460],
  [600, 600, 420, 522],
  [800, 720, 480, 616],
  [900, 765, 495, 648],
  [1000, 800, 500, 670],
  [1500, 1200, 750, 975],
  [2000, 1600, 1000, 1300],
  [2375, 1900, 1187.5, 1543.75],
  [2500, 1900, 1250, 1625],
  [3000, 1900, 1500, 1800],
  [3600, 1900, 1800, 1800],
  [3800, 1900, 1900, 1800],
  [4500, 1900, 1900, 1800],
];

for (const [netto, n80, n50, a] of tabelle) {
  test(`Monatsbetrag bei ${netto} € netto`, () => {
    assert.equal(monatsbetrag(netto, hoch, NEU), n80);
    assert.equal(monatsbetrag(netto, niedrig, NEU), n50);
    assert.equal(monatsbetrag(netto, alt, ALT), a);
  });
}

test('ALT: Abschmelzung 67 → 65 % zwischen 1.200 und 1.240 €', () => {
  assert.equal(ersatzrate(1100, alt, ALT), 67);
  assert.equal(ersatzrate(1200, alt, ALT), 67);
  assert.equal(ersatzrate(1220, alt, ALT), 66);
  assert.equal(ersatzrate(1240, alt, ALT), 65);
  assert.equal(ersatzrate(5000, alt, ALT), 65);
});

test('NEU: 80 % erreicht 100 % bei 600 € (Begründung S. 40)', () => {
  assert.equal(ersatzrate(600, hoch, NEU), 100);
  assert.equal(ersatzrate(602, hoch, NEU), 99.9);
  assert.equal(ersatzrate(0, niedrig, NEU), 100);
});

test('DGB-Beispiel: 2.208 € netto', () => {
  assert.equal(monatsbetrag(2208, alt, ALT), 1435.2);
  assert.equal(monatsbetrag(2208, hoch, NEU), 1766.4);
  assert.equal(monatsbetrag(2208, niedrig, NEU), 1104);
});

test('Geschwisterbonus: 10 % / 5 %, jeweils mindestens 75 €', () => {
  assert.equal(monatsbetrag(4000, alt, ALT, { geschwisterbonus: true }), 1980);
  assert.equal(monatsbetrag(4000, hoch, NEU, { geschwisterbonus: true }), 1995);
  assert.equal(monatsbetrag(1000, alt, ALT, { geschwisterbonus: true }), 745);
  assert.equal(monatsbetrag(1000, niedrig, NEU, { geschwisterbonus: true }), 575);
});

test('Mehrlingszuschlag 300 € je weiterem Kind in beiden Regelwerken', () => {
  assert.equal(monatsbetrag(0, alt, ALT, { mehrlinge: 1 }), 600);
  assert.equal(monatsbetrag(0, hoch, NEU, { mehrlinge: 2 }), 930);
});
