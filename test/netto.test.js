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
