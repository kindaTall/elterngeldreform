// Familiensummen: veröffentlichte Beispiele (djb st26-37, einfach-elterngeld.de 14.11.2026,
// Stiftung Warentest 30.10.2026, gegen-hartz.de), jeweils gegen die Formel nachgerechnet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALT, NEU } from '../site/js/calc/regeln.js';
import { vergleiche, vergleicheVoll, vollerPlan, zulaessigerPlan, berechne } from '../site/js/calc/szenario.js';

test('djb: 1.800 € netto, 10 Monate, ohne Mutterschaftsleistungen −540 €', () => {
  const v = vergleiche({ nettoA: 1800, monateA: 10, monateB: 0 });
  assert.equal(v.alt.summe, 11700);
  assert.equal(v.neu.summe, 11160);
  assert.equal(v.differenz, -540);
});

test('djb: dasselbe mit 2 Mutterschutzmonaten −1.080 €', () => {
  const v = vergleiche({ nettoA: 1800, monateA: 10, monateB: 0, mutterschutzMonate: 2 });
  assert.equal(v.alt.summe, 9360);
  assert.equal(v.neu.summe, 8280);
  assert.equal(v.differenz, -1080);
});

test('günstige Lesart: Mutterschutz verbraucht keine 80-%-Monate', () => {
  const v = vergleiche({ nettoA: 1800, monateA: 10, monateB: 0, mutterschutzMonate: 2, mutterschutzVerbraucht80: false });
  assert.equal(v.neu.summe, 4 * 1440 + 4 * 900);
});

// [nettoA, nettoB, alt A+B, summe alt, summe neu] – einfach-elterngeld.de, ohne Mutterschutz
const familien = [
  [2000, 3000, [12, 2], 19200, 20000 /* neu 10+4 */, [10, 4]],
  [2000, 3000, [7, 7], 21700, 21500, [7, 7]],
  [1500, 4000, [12, 2], 15300, 16900, [10, 4]],
  [1500, 4000, [7, 7], 19425, 20350, [7, 7]],
  [2500, 2500, [12, 2], 22750, 22700, [10, 4]],
  [2500, 2500, [7, 7], 22750, 22700, [7, 7]],
];
for (const [a, b, planAlt, sAlt, sNeu, planNeu] of familien) {
  test(`Familie ${a}/${b}, alt ${planAlt.join('+')} gegen neu ${planNeu.join('+')}`, () => {
    assert.equal(berechne({ nettoA: a, nettoB: b, monateA: planAlt[0], monateB: planAlt[1] }, ALT).summe, sAlt);
    assert.equal(berechne({ nettoA: a, nettoB: b, monateA: planNeu[0], monateB: planNeu[1] }, NEU).summe, sNeu);
  });
}

test('ein Elternteil allein: alt 12 Monate, neu höchstens 10 (2.000 € netto: −3.200 €)', () => {
  const v = vergleiche({ nettoA: 2000, monateA: 12, monateB: 0 });
  assert.equal(v.alt.summe, 15600);
  assert.equal(v.neu.summe, 12400);
  assert.equal(v.neu.plan.monateA, 10);
  assert.equal(v.entfalleneMonate, 2);
});

test('Warentest: 1.800/2.500 € – 10+4 +560 €; 12+2 wird zu 10+2', () => {
  assert.equal(vergleiche({ nettoA: 1800, nettoB: 2500, monateA: 10, monateB: 4 }).differenz, 560);
  const v = vergleiche({ nettoA: 1800, nettoB: 2500, monateA: 12, monateB: 2 });
  assert.equal(v.alt.summe, 17290);
  assert.equal(v.neu.summe, 14960);
  assert.deepEqual(v.neu.plan, { monateA: 10, monateB: 2 });
});

test('Plan-Kürzung', () => {
  assert.deepEqual(zulaessigerPlan({ monateA: 12, monateB: 2 }, ALT), { monateA: 12, monateB: 2 });
  assert.deepEqual(zulaessigerPlan({ monateA: 12, monateB: 2 }, NEU), { monateA: 10, monateB: 2 });
  assert.deepEqual(zulaessigerPlan({ monateA: 7, monateB: 7 }, NEU), { monateA: 7, monateB: 7 });
  assert.deepEqual(zulaessigerPlan({ monateA: 12, monateB: 1 }, ALT), { monateA: 12, monateB: 0 });
  assert.deepEqual(zulaessigerPlan({ monateA: 14, monateB: 0, alleinerziehend: true }, NEU), { monateA: 14, monateB: 0 });
  assert.deepEqual(zulaessigerPlan({ monateA: 14, monateB: 0 }, ALT), { monateA: 12, monateB: 0 });
});

test('ohne Einkommen, Partner nimmt nichts: 12×300 € gegen 10×330 €', () => {
  const v = vergleiche({ nettoA: 0, monateA: 12, monateB: 0 });
  assert.equal(v.alt.summe, 3600);
  assert.equal(v.neu.summe, 3300);
});

test('Alleinerziehend: 14 Monate, 8 davon zu 80 % (Begründung), 2 im Mutterschutz', () => {
  const v = vergleiche({ nettoA: 2000, monateA: 14, monateB: 0, alleinerziehend: true, mutterschutzMonate: 2 });
  assert.equal(v.alt.summe, 12 * 1300);
  assert.equal(v.neu.summe, 6 * 1600 + 6 * 1000);
});

test('geltendes Recht: ohne Erwerbseinkommen keine Partnermonate (§ 4 Abs. 3 S. 2), Entwurf schon', () => {
  const v = vergleiche({ nettoA: 0, nettoB: 0, monateA: 12, monateB: 2 });
  assert.equal(v.alt.summe, 3600);
  assert.equal(v.neu.summe, 3960);
  const allein = vergleiche({ nettoA: 0, monateA: 14, monateB: 0, alleinerziehend: true });
  assert.equal(allein.alt.summe, 3600);
  assert.equal(allein.neu.summe, 4620);
  // hat ein Elternteil Einkommen, bleibt es bei 14 Monaten
  assert.equal(vergleiche({ nettoA: 0, nettoB: 2000, monateA: 12, monateB: 2 }).alt.bezugsmonate, 14);
});

test('Mutter ohne Einkommen: 12 + 2 mit 2.800 € beim Partner, −100 €', () => {
  const v = vergleiche({ nettoA: 0, nettoB: 2800, monateA: 12, monateB: 2 });
  assert.equal(v.alt.summe, 12 * 300 + 2 * 1800);
  assert.equal(v.neu.summe, 10 * 330 + 2 * 1900);
  assert.equal(v.differenz, -100);
});

test('Mutter ohne Einkommen mit Mutterschutzmonaten: der Rechenkern rechnet sie, wie sie übergeben werden', () => {
  // Die Oberfläche übergibt bei 0 € keine Mutterschutzmonate (grundlage() in ui/zustand.js, test/zustand.test.js)
  const v = vergleiche({ nettoA: 0, nettoB: 2800, monateA: 12, monateB: 2, mutterschutzMonate: 2 });
  assert.equal(v.alt.summe, 10 * 300 + 2 * 1800);
  assert.equal(v.neu.summe, 8 * 330 + 2 * 1900);
});

test('Zwillinge, 3 Mutterschutzmonate: 2.000 € netto, 12 Monate, je Monat 300 € Zuschlag', () => {
  const eingabe = { nettoA: 2000, monateA: 12, monateB: 0, mehrlinge: 1, mutterschutzMonate: 3 };
  const v = vergleiche(eingabe);
  assert.equal(v.alt.summe, 9 * (1300 + 300));
  // Entwurf: 10 Monate; von den vier 80-%-Monaten bleibt nach dem Mutterschutz einer
  assert.equal(v.neu.summe, 1 * (1600 + 300) + 6 * (1000 + 300));
  assert.deepEqual(v.neu.monate.A.map((m) => m.betrag), [0, 0, 0, 1900, 1300, 1300, 1300, 1300, 1300, 1300]);
  // günstige Lesart: die vier 80-%-Monate beginnen nach dem Mutterschutz
  const guenstig = vergleiche({ ...eingabe, mutterschutzVerbraucht80: false });
  assert.equal(guenstig.alt.summe, v.alt.summe);
  assert.equal(guenstig.neu.summe, 4 * (1600 + 300) + 3 * (1000 + 300));
});

test('Geschwisterbonus mit Mutterschutz: 10 % bzw. 5 %, mindestens 75 €, nur in ausgezahlten Monaten', () => {
  const v = vergleiche({ nettoA: 2000, monateA: 12, monateB: 0, geschwisterbonus: true, mutterschutzMonate: 2 });
  assert.equal(v.alt.summe, 10 * (1300 + 130));
  assert.equal(v.neu.summe, 2 * (1600 + 80) + 6 * (1000 + 75));
  assert.equal(v.neu.monate.A[0].betrag, 0);
});

test('Wunsch 12 + 12 wird in beiden Regelwerken zu 7 + 7', () => {
  assert.deepEqual(zulaessigerPlan({ monateA: 12, monateB: 12 }, ALT), { monateA: 7, monateB: 7 });
  assert.deepEqual(zulaessigerPlan({ monateA: 12, monateB: 12 }, NEU), { monateA: 7, monateB: 7 });
  const v = vergleiche({ nettoA: 2000, nettoB: 3000, monateA: 12, monateB: 12 });
  assert.equal(v.alt.summe, 21700);
  assert.equal(v.neu.summe, 21500);
  assert.equal(v.entfalleneMonate, 0);
});

test('2 + 12 Monate: im Entwurf höchstens 10 für den Partner, 2 Monate entfallen', () => {
  const v = vergleiche({ nettoA: 1800, nettoB: 2800, monateA: 2, monateB: 12, mutterschutzMonate: 2 });
  assert.deepEqual(v.alt.plan, { monateA: 2, monateB: 12 });
  assert.deepEqual(v.neu.plan, { monateA: 2, monateB: 10 });
  assert.equal(v.alt.summe, 12 * 1800); // beide Monate der Mutter liegen im Mutterschutz
  assert.equal(v.neu.summe, 4 * 1900 + 6 * 1400);
  assert.equal(v.entfalleneMonate, 2);
});

test('alleinerziehend ohne Einkommen, voller Plan: heute 12 × 300 €, im Entwurf 14 × 330 €', () => {
  const v = vergleicheVoll({ nettoA: 0, alleinerziehend: true });
  assert.deepEqual(v.alt.plan, { monateA: 12, monateB: 0 });
  assert.deepEqual(v.neu.plan, { monateA: 14, monateB: 0 });
  assert.equal(v.alt.summe, 3600);
  assert.equal(v.neu.summe, 4620);
  assert.equal(v.differenz, 1020);
  assert.equal(v.entfalleneMonate, -2);
});

test('halbe Cent runden kaufmännisch', () => {
  // 1.101 € × 67 % = 737,67 €; 2.001 € × 65 % = 1.300,65 €; 1.001 € × 50 % = 500,50 €
  assert.equal(vergleiche({ nettoA: 1101, monateA: 2, monateB: 0 }).alt.summe, 1475.34);
  assert.equal(vergleiche({ nettoA: 2001, monateA: 2, monateB: 0 }).alt.summe, 2601.3);
});

test('voller Plan: heute 12 + 2, im Entwurf 10 + 4, alleinerziehend 14', () => {
  assert.deepEqual(vollerPlan(ALT), { monateA: 12, monateB: 2 });
  assert.deepEqual(vollerPlan(NEU), { monateA: 10, monateB: 4 });
  assert.deepEqual(vollerPlan(ALT, true), { monateA: 14, monateB: 0 });
  assert.deepEqual(vollerPlan(NEU, true), { monateA: 14, monateB: 0 });
});

test('volle Ausschöpfung: 1.800 € und 2.800 € netto, 12 + 2 gegen 10 + 4 = +580 €', () => {
  const v = vergleicheVoll({ nettoA: 1800, nettoB: 2800, mutterschutzMonate: 2 });
  assert.equal(v.alt.summe, 15300);
  assert.equal(v.neu.summe, 15880);
  assert.equal(v.differenz, 580);
  assert.equal(v.entfalleneMonate, 0);
  assert.deepEqual(v.neu.plan, { monateA: 10, monateB: 4 });
});

test('volle Ausschöpfung: zweimal 3.000 € netto = −1.200 €, monateA/monateB der Eingabe zählen nicht', () => {
  const v = vergleicheVoll({ nettoA: 3000, nettoB: 3000, monateA: 7, monateB: 7, mutterschutzMonate: 2 });
  assert.equal(v.alt.summe, 21600);
  assert.equal(v.neu.summe, 20400);
  assert.equal(v.differenz, -1200);
});
