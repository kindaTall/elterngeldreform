// Lohnsteuer: BMF-Prüftabelle zum PAP 2026 ("allgemeine Lohnsteuer", Zusatzbeitrag 2,9 %, mit
// Kinderlosenzuschlag außer Steuerklasse II) und zum geänderten PAP 2025 (2,5 %).
// Elterngeld-Netto: Ausgaben des amtlichen Elterngeldrechners (familienportal.de), 15.11.2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lohnsteuerJahr, elterngeldNetto } from '../site/js/calc/netto.js';
import { ALT } from '../site/js/calc/regeln.js';
import { monatsbetrag } from '../site/js/calc/elterngeld.js';

const tabellen = {
  2026: [2.9, { 30000: [2248, 1230, 0, 2248, 5588, 6120], 40000: [4407, 3293, 1000, 4407, 8720, 9218], 60000: [9389, 8091, 4822, 9389, 15364, 15895], 100000: [23248, 21634, 15012, 23248, 30157, 30689] }],
  2025: [2.5, { 25000: [1330, 415, 0, 1330, 4012, 4544], 40000: [4518, 3394, 1118, 4518, 8818, 9324], 60000: [9561, 8250, 5002, 9561, 15498, 16029], 100000: [23824, 22201, 15510, 23824, 30593, 31125] }],
};
for (const [jahr, [kvz, zeilen]] of Object.entries(tabellen)) {
  for (const [lohn, steuern] of Object.entries(zeilen)) {
    test(`Jahreslohnsteuer ${jahr} bei ${lohn} €, Steuerklassen I–VI`, () => {
      steuern.forEach((soll, i) => {
        const ist = lohnsteuerJahr(Number(lohn), i + 1, { year: Number(jahr), kvz, zkf: 0, rv: true, av: true, pvz: i + 1 !== 2 }).lstj;
        assert.equal(ist, soll, `Steuerklasse ${i + 1}`);
      });
    });
  }
}

const elterngeldAlt = (netto) => monatsbetrag(netto, ALT.stufen[0], ALT);

test('amtlicher Rechner: Geburt 2027, 3.000 € brutto, Steuerklasse 1 → 1.280,18 € Basiselterngeld', () => {
  assert.equal(elterngeldAlt(elterngeldNetto(3000, { steuerklasse: 1, geburtsjahr: 2027 })), 1280.18);
});
test('amtlicher Rechner: Geburt 2027, 1.500 € brutto, Steuerklasse 1 → 727,26 €', () => {
  // der amtliche Rechner rechnet den Übergangsbereich mit der Geringfügigkeitsgrenze von 2024 (538 €)
  assert.equal(elterngeldAlt(elterngeldNetto(1500, { steuerklasse: 1, geburtsjahr: 2027, geringfuegigkeitsgrenze: 538 })), 727.26);
});
test('amtlicher Rechner: Geburt 2026, 2.500 € brutto, Steuerklasse 5, Kirchensteuer → 879,64 €', () => {
  assert.equal(elterngeldAlt(elterngeldNetto(2500, { steuerklasse: 5, kirchensteuer: true, geburtsjahr: 2026 })), 879.64);
});
test('Minijob ohne Abzüge, kein Einkommen → 0', () => {
  assert.equal(elterngeldNetto(540), 437.5);
  assert.equal(elterngeldNetto(0), 0);
});

test('Minijob-Grenze 2026: bis 603 € nur der Pauschbetrag (102,50 €), ab 604 € Sozialabgaben', () => {
  assert.equal(elterngeldNetto(603), 603 - 102.5);
  // 604 €: Bemessung im Übergangsbereich 403,16 €, davon 21 % = 84,66 €; Lohnsteuer fällt keine an
  assert.equal(elterngeldNetto(604), 416.84);
  assert.ok(elterngeldNetto(604) < elterngeldNetto(603));
});

test('Übergangsbereich: 1.000 € brutto, Abgaben auf die geminderte Bemessung (856,13 €)', () => {
  // 0,6667 × 603 + (2000/1397 − 603/1397 × 0,6667) × 397 = 856,13 €; 21 % = 179,79 €; keine Lohnsteuer
  assert.equal(elterngeldNetto(1000), 717.71);
  // am Ende des Übergangsbereichs schließt die volle Bemessung ohne Sprung an
  assert.ok(elterngeldNetto(2001) - elterngeldNetto(2000) < 1);
});

test('Steuerklassen bei 3.000 € brutto: 2 um den Entlastungsbetrag, 3 um den Splittingtarif günstiger', () => {
  const netto = (steuerklasse) => elterngeldNetto(3000, { steuerklasse });
  assert.equal(netto(2), 2064.09);
  assert.equal(netto(3), 2229.17);
  assert.equal(netto(1), netto(4));
  assert.ok(netto(5) < netto(1) && netto(1) < netto(2) && netto(2) < netto(3));
  assert.equal(netto(6), netto(4)); // § 2e Abs. 3 BEEG
});
