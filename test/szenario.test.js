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

// Beste Aufteilung (kleinster Verdienstausfall) je Rechtsstand, von Hand nachgerechnet.
import { vergleicheBeste, besterPlan, verdienstausfall, bonusGesamt } from '../site/js/calc/szenario.js';
const paar = (nettoA, nettoB) => ({ nettoA, nettoB, mutterschutzMonate: nettoA > 0 ? 2 : 0, mutterschutzVerbraucht80: true });

test('beste Aufteilung 1.800/2.800: heute 12+2, geplant 10+4, unterm Strich −1.420 €', () => {
  // heute: 10 × 1.170 + 2 × 1.800 = 15.300; Ausfall 10 × 630 + 2 × 1.000 = 8.300
  // geplant: 2 × 1.440 + 6 × 900 + 4 × 1.900 = 15.880; Ausfall 2 × 360 + 6 × 900 + 4 × 900 = 9.720
  const v = vergleicheBeste(paar(1800, 2800));
  assert.deepEqual(v.alt.plan, { monateA: 12, monateB: 2 });
  assert.deepEqual(v.neu.plan, { monateA: 10, monateB: 4 });
  assert.equal(v.alt.summe, 15300);
  assert.equal(v.neu.summe, 15880);
  assert.equal(v.alt.ausfall, 8300);
  assert.equal(v.neu.ausfall, 9720);
  assert.equal(v.differenz, 580);
  assert.equal(v.differenzLohn, -2000);
  assert.equal(v.untermStrich, -1420);
  assert.equal(v.entfalleneMonate, 0);
  assert.equal(v.beste, true);
});

test('beste Aufteilung 2.385/1.750: Partner:in nimmt heute 12, geplant 10 Monate (−270 €)', () => {
  // heute 2 + 12: nur Mutterschutz bei der Mutter, 12 × 1.137,50 = 13.650, Ausfall 12 × 612,50 = 7.350
  // geplant 4 + 10: Mutter 2 × 1.900 (Höchstbetrag), Partner:in 4 × 1.400 + 6 × 875 → 14.650, Ausfall 970 + 6.650 = 7.620
  const v = vergleicheBeste(paar(2385, 1750));
  assert.deepEqual(v.alt.plan, { monateA: 2, monateB: 12 });
  assert.deepEqual(v.neu.plan, { monateA: 4, monateB: 10 });
  assert.equal(v.alt.summe, 13650);
  assert.equal(v.neu.summe, 14650);
  assert.equal(v.alt.ausfall, 7350);
  assert.equal(v.neu.ausfall, 7620);
  assert.equal(v.differenzLohn, -1270);
  assert.equal(v.untermStrich, -270);
});

test('beste Aufteilung 0/2.385: Mutter ohne Einkommen, unterm Strich −570,50 €', () => {
  // heute 12 × 300 + 2 × 1.550,25 = 6.700,50, Ausfall −3.600 + 2 × 834,75 = −1.930,50
  // geplant 10 × 330 + 4 × 1.900 = 10.900, Ausfall −3.300 + 4 × 485 = −1.360
  const v = vergleicheBeste(paar(0, 2385));
  assert.deepEqual(v.alt.plan, { monateA: 12, monateB: 2 });
  assert.deepEqual(v.neu.plan, { monateA: 10, monateB: 4 });
  assert.equal(v.alt.summe, 6700.5);
  assert.equal(v.neu.summe, 10900);
  assert.equal(v.differenz, 4199.5);
  assert.equal(v.differenzLohn, -4770);
  assert.equal(v.untermStrich, -570.5);
});

test('beste Aufteilung 3.000/3.000: Gleichstand → weniger Partnermonate; Lohn gleich, unterm Strich = Elterngeld', () => {
  // heute kostet jede Aufteilung 12 × 1.200 = 14.400 → 12 + 2; geplant jede 15.600 → 10 + 4
  const v = vergleicheBeste(paar(3000, 3000));
  assert.deepEqual(v.alt.plan, { monateA: 12, monateB: 2 });
  assert.deepEqual(v.neu.plan, { monateA: 10, monateB: 4 });
  assert.equal(v.alt.ausfall, 14400);
  assert.equal(v.neu.ausfall, 15600);
  assert.equal(v.differenzLohn, 0);
  assert.equal(v.untermStrich, v.differenz);
  assert.equal(v.untermStrich, -1200);
});

test('beste Aufteilung ohne Einkommen: heute nur 12 Monate zulässig', () => {
  const v = vergleicheBeste(paar(0, 0));
  assert.deepEqual(v.alt.plan, { monateA: 12, monateB: 0 });
  assert.deepEqual(v.neu.plan, { monateA: 10, monateB: 4 });
  assert.equal(v.untermStrich, 1020);
  assert.equal(v.entfalleneMonate, 0);
});

test('beste Aufteilung: unterm Strich = Elterngeld + Lohn; Mutterschutz bleibt bei der Mutter', () => {
  for (const [a, b] of [[1800, 2800], [750, 3300], [1750, 0], [4000, 1000], [2500, 2500], [5000, 200]]) {
    const v = vergleicheBeste(paar(a, b));
    assert.ok(Math.abs(v.untermStrich - (v.differenz + v.differenzLohn)) < 0.01, `${a}/${b}`);
    assert.ok(v.alt.plan.monateA >= 2 && v.neu.plan.monateA >= 2, `${a}/${b}`);
    assert.equal(v.alt.plan.monateA + v.alt.plan.monateB, 14);
    assert.equal(v.neu.plan.monateA + v.neu.plan.monateB, 14);
  }
  // Mehrlinge: 3 Monate Mutterschutz
  assert.ok(besterPlan({ ...paar(4000, 1000), mutterschutzMonate: 3 }, ALT).plan.monateA >= 3);
});

test('beste Aufteilung: Verdienstausfall eines Plans; bei gleicher Aufteilung ist unterm Strich die Elterngelddifferenz', () => {
  const e = paar(1800, 2800);
  const r = berechne({ ...e, monateA: 12, monateB: 2 }, ALT);
  assert.deepEqual(verdienstausfall(r, e), { lohnausfall: 23600, ausfall: 8300 });
  // gleiche Aufteilung 10 + 4 in beiden: Lohn gleich, Unterschied nur beim Elterngeld
  const alt = berechne({ ...e, monateA: 10, monateB: 4 }, ALT), neu = berechne({ ...e, monateA: 10, monateB: 4 }, NEU);
  assert.equal(verdienstausfall(alt, e).ausfall - verdienstausfall(neu, e).ausfall, neu.summe - alt.summe);
});

test('beste Aufteilung: Alleinerziehende wie bisher (voller Plan, keine Optimierung)', () => {
  const e = { nettoA: 2000, mutterschutzMonate: 2, alleinerziehend: true };
  const v = vergleicheBeste(e);
  assert.equal(v.beste, false);
  assert.equal(v.differenz, vergleicheVoll(e).differenz);
});

// Bonus netto im Jahr (bonusA/bonusB): zählt nur im Entwurf, als Zwölftel zum Netto; von Hand nachgerechnet.
test('Bonus Partner 3.000 € bei 2.800 € netto: Bemessung 3.050 €, 80 % = 2.440 € > Höchstbetrag 1.900 € → Summe unverändert', () => {
  const plan = { nettoA: 1800, nettoB: 2800, monateA: 10, monateB: 4, mutterschutzMonate: 2 };
  const mit = berechne({ ...plan, bonusB: 3000 }, NEU);
  assert.deepEqual(mit.monate.B.map((m) => m.betrag), [1900, 1900, 1900, 1900]);
  assert.equal(mit.summe, berechne(plan, NEU).summe);
  // in einem 50-%-Monat wirkt er: 6 + 10 Monate, Partner:in 6 × 50 % von 3.050 = 1.525 statt 1.400 €
  const lang = { nettoA: 1800, nettoB: 2800, monateA: 4, monateB: 10, mutterschutzMonate: 2 };
  assert.equal(berechne({ ...lang, bonusB: 3000 }, NEU).monate.B[9].betrag, 1525);
  assert.equal(berechne(lang, NEU).monate.B[9].betrag, 1400);
});

test('Bonus Mutter 1.800 € bei 1.800 € netto: Bemessung 1.950 €, Monate 3–4 zu 80 % = 1.560 €, danach 975 €; heute unverändert', () => {
  const plan = { nettoA: 1800, nettoB: 2800, bonusA: 1800, monateA: 10, monateB: 4, mutterschutzMonate: 2 };
  const v = vergleiche(plan);
  assert.deepEqual(v.neu.monate.A.map((m) => m.betrag), [0, 0, 1560, 1560, 975, 975, 975, 975, 975, 975]);
  assert.equal(v.neu.summeA, 8970); // statt 8.280 €
  assert.equal(v.neu.summe, 16570);
  assert.equal(v.alt.summe, vergleiche({ ...plan, bonusA: 0 }).alt.summe);
});

test('Bonus: beste Aufteilung 1.800/2.800 mit Bonus Mutter 1.800 € → Verdienstausfall rechnet ohne Bonus, unterm Strich −730 €', () => {
  // geplant 10 + 4: Elterngeld 8.970 + 7.600 = 16.570; Lohn 8 × 1.800 + 4 × 2.800 = 25.600 → Ausfall 9.030 (ohne Bonus 9.720)
  const v = vergleicheBeste({ ...paar(1800, 2800), bonusA: 1800 });
  assert.deepEqual(v.neu.plan, { monateA: 10, monateB: 4 });
  assert.equal(v.neu.summe, 16570);
  assert.equal(v.neu.lohnausfall, 25600);
  assert.equal(v.neu.ausfall, 9030);
  assert.equal(v.alt.ausfall, 8300);
  assert.equal(v.differenz, 1270);
  assert.equal(v.differenzLohn, -2000);
  assert.equal(v.untermStrich, -730);
  // Bonus beim Partner (Deckel): nichts ändert sich
  assert.deepEqual(vergleicheBeste({ ...paar(1800, 2800), bonusB: 3000 }), vergleicheBeste(paar(1800, 2800)));
});

test('Bonus kann die beste Aufteilung im Entwurf verschieben: 1.800/1.800 mit Bonus Partner 3.000 € → 4 + 10 statt 10 + 4', () => {
  // ohne Bonus Gleichstand: 10 + 4 und 4 + 10 geben je 14.040 € (zuerst gefunden: weniger Partnermonate)
  const ohne = vergleicheBeste(paar(1800, 1800));
  assert.deepEqual(ohne.neu.plan, { monateA: 10, monateB: 4 });
  assert.equal(ohne.neu.summe, 14040);
  // Partner:in 2.050 € Bemessung: 4 × 1.640 + 6 × 1.025 = 12.710; Mutter 2 × 1.440 = 2.880 → 15.590; Lohn 3.600 + 18.000 → Ausfall 6.010
  // (10 + 4 gäbe 8.280 + 6.560 = 14.840, Ausfall 6.760)
  const mit = vergleicheBeste({ ...paar(1800, 1800), bonusB: 3000 });
  assert.deepEqual(mit.neu.plan, { monateA: 4, monateB: 10 });
  assert.equal(mit.neu.summe, 15590);
  assert.equal(mit.neu.ausfall, 6010);
  assert.deepEqual(mit.alt.plan, { monateA: 12, monateB: 2 });
  assert.equal(mit.alt.summe, 14040);
  assert.equal(mit.untermStrich, 1550); // Lohn gleich: dasselbe wie die Elterngelddifferenz
});

test('Bonus zählt nicht ohne Monatsnetto, nicht bei Alleinerziehenden (Partner:in) und nie negativ', () => {
  const e = { ...paar(0, 2800), monateA: 10, monateB: 4 };
  assert.equal(berechne({ ...e, bonusA: 6000 }, NEU).summe, berechne(e, NEU).summe);
  const allein = { nettoA: 2000, mutterschutzMonate: 2, alleinerziehend: true, monateA: 14, monateB: 0 };
  assert.equal(berechne({ ...allein, bonusB: 6000 }, NEU).summe, berechne(allein, NEU).summe);
  assert.ok(berechne({ ...allein, bonusA: 6000 }, NEU).summe > berechne(allein, NEU).summe);
  assert.equal(berechne({ ...e, nettoA: 1800, bonusA: -5000 }, NEU).summe, berechne({ ...e, nettoA: 1800 }, NEU).summe);
  assert.equal(bonusGesamt({ nettoA: 1800, nettoB: 2800, bonusA: 1000, bonusB: 2000 }), 3000);
  assert.equal(bonusGesamt({ nettoA: 1800, nettoB: 2800, bonusA: 1000, bonusB: 2000, alleinerziehend: true }), 1000);
  assert.equal(bonusGesamt({ nettoA: 0, nettoB: 2800, bonusA: 1000, bonusB: 2000 }), 2000);
});
