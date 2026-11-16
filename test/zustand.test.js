// Zustand des Rechners ohne DOM: URL-Fragment lesen und schreiben, Eingabe für den Rechenkern,
// Aufteilung der Monate. Die Beträge sind von Hand aus den Regeln nachgerechnet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STANDARD, ausHash, alsHash, grundlage, monateMutter, vergleichsmonate, fuerPartnermonate, planhinweis } from '../site/js/ui/zustand.js';
import { ganzeDifferenz } from '../site/js/ui/diagramme.js';

/** Ergebnis für ein Fragment, so wie Schritt 2 es zeigt. */
function ergebnis(hash) {
  const z = ausHash(hash);
  const e = grundlage(z);
  const v = fuerPartnermonate(z, e, z.monB);
  return { z, e, v, ...ganzeDifferenz(v) };
}

test('URL: ohne Fragment gilt der Standard, Startwert −3.220 €', () => {
  assert.deepEqual(ausHash(''), { ...STANDARD });
  assert.deepEqual(ausHash('#'), { ...STANDARD });
  const r = ergebnis('');
  assert.deepEqual([r.alt, r.neu, r.differenz], [15300, 12080, -3220]);
});

test('URL: Werte außerhalb des Bereichs werden gekürzt, Unlesbares wird Standard', () => {
  const z = ausHash('#einkA=999999&einkB=-5&monA=40&monB=13&mehr=7&ms=2&allein=-1&lesart=9&geschw=3');
  assert.deepEqual([z.einkA, z.einkB, z.monA, z.monB, z.mehr, z.ms, z.allein, z.lesart, z.geschw], [20000, 0, 12, 12, 2, 1, 0, 1, 1]);
  assert.equal(ausHash('#einkA=abc').einkA, STANDARD.einkA);
  assert.equal(ausHash('#einkA=1830.4').einkA, 1830);
});

test('URL: alte Felder (Modus, Steuerklasse, Kirchensteuer) werden ignoriert; Brutto-Links zeigen das Standardbeispiel', () => {
  const alt = ausHash('#modus=netto&stklA=3&kirche=1&einkA=2500&monB=4');
  assert.deepEqual([alt.einkA, alt.monB], [2500, 4]);
  for (const k of ['modus', 'stklA', 'stklB', 'kirche']) assert.ok(!(k in alt));
  const brutto = ausHash('#modus=brutto&einkA=3200&einkB=5000&stklA=3&kirche=1&monB=4');
  assert.deepEqual([brutto.einkA, brutto.einkB, brutto.monB], [STANDARD.einkA, STANDARD.einkB, 4]);
  assert.equal(alsHash(brutto), 'monB=4');
});

test('URL: unbekannte Schlüssel werden übergangen (alte Links mit entfallenen Angaben öffnen sich normal)', () => {
  assert.deepEqual(ausHash('#entfallen=1&foo=2&__proto__=3'), { ...STANDARD });
  assert.deepEqual(ausHash('#entfallen=1&einkA=2000'), { ...STANDARD, einkA: 2000 });
});

test('URL: ein Elternteil nimmt keinen oder mindestens zwei Monate (1 wird 2)', () => {
  assert.equal(ausHash('#monB=1').monB, 2);
  assert.equal(ausHash('#monA=1').monA, 2);
  assert.equal(ausHash('#monB=0').monB, 0);
  assert.equal(ausHash('#monA=0').monA, 0);
});

test('URL: Fragment enthält nur Abweichungen vom Standard und lässt sich wieder lesen', () => {
  assert.equal(alsHash({ ...STANDARD }), '');
  const z = { ...STANDARD, einkA: 2000, monB: 4, allein: 1 };
  assert.equal(alsHash(z), 'einkA=2000&monB=4&allein=1');
  assert.deepEqual(ausHash(`#${alsHash(z)}`), z);
});

test('Partnermonate: Haken „mindestens 4" ab monB ≥ 4, zum Vergleich steht dann das Ergebnis mit 2, sonst mit 4', () => {
  for (const p of [0, 2, 3]) assert.deepEqual(vergleichsmonate(p), { angehakt: false, andere: 4 });
  for (const p of [4, 5, 12]) assert.deepEqual(vergleichsmonate(p), { angehakt: true, andere: 2 });
});

test('Monate der Mutter: gewählt oder so viele, wie neben den Partnermonaten möglich sind', () => {
  const auto = { ...STANDARD };
  assert.deepEqual([0, 2, 3, 4, 7, 12].map((p) => monateMutter(auto, p)), [12, 12, 11, 10, 7, 2]);
  assert.equal(monateMutter({ ...STANDARD, monA: 6 }, 4), 6);
});

test('Grundlage: Netto aus der Eingabe, Alleinerziehende ohne Partner-Netto', () => {
  assert.equal(grundlage({ ...STANDARD }).nettoA, 1800);
  assert.equal(grundlage({ ...STANDARD, allein: 1 }).nettoB, 0);
});

test('Mutterschutz: zwei Monate, bei Mehrlingen drei, ohne Haken keine', () => {
  assert.equal(grundlage({ ...STANDARD }).mutterschutzMonate, 2);
  assert.equal(grundlage({ ...STANDARD, mehr: 1 }).mutterschutzMonate, 3);
  assert.equal(grundlage({ ...STANDARD, ms: 0 }).mutterschutzMonate, 0);
});

test('Mutterschutz nur mit Einkommen der Mutter: bei 0 € zählt der Haken nicht', () => {
  assert.equal(grundlage({ ...STANDARD, einkA: 0 }).mutterschutzMonate, 0);
  assert.equal(grundlage({ ...STANDARD, einkA: 0, mehr: 2 }).mutterschutzMonate, 0);
  // 12 × 300 € + 2 × 1.800 € gegen 10 × 330 € + 2 × 1.900 €
  const paar = ergebnis('#einkA=0');
  assert.deepEqual([paar.alt, paar.neu, paar.differenz], [7200, 7100, -100]);
  // alleinerziehend ohne Einkommen: heute 12 × 300 €, im Entwurf 14 × 330 €
  const allein = ergebnis('#einkA=0&allein=1');
  assert.deepEqual([allein.alt, allein.neu, allein.differenz], [3600, 4620, 1020]);
});

test('zwei Eltern ohne Einkommen, Mutter „so viele wie möglich": heute 12 + 0 statt 10 + 2, Ergebnis +360 €', () => {
  const r = ergebnis('#einkA=0&einkB=0');
  assert.deepEqual(r.v.alt.plan, { monateA: 12, monateB: 0 });
  assert.deepEqual(r.v.neu.plan, { monateA: 10, monateB: 2 });
  assert.deepEqual([r.alt, r.neu, r.differenz], [3600, 3960, 360]);
  assert.equal(r.v.entfalleneMonate, 0);
  assert.equal(planhinweis(r.z, r.e, r.v.alt.plan), 'Ohne Einkommen vor der Geburt sind nach geltendem Recht zusammen höchstens 12 Monate möglich. Gerechnet wird heute mit Mutter 12 und Partner:in 0 Monaten.');
});

test('zwei Eltern ohne Einkommen: gestrichen werden zuerst die Partnermonate, die Summe bleibt 12 × 300 €', () => {
  // [Partnermonate, Plan heute]
  for (const [p, a, b] of [[0, 12, 0], [2, 12, 0], [3, 12, 0], [4, 10, 2], [6, 8, 4], [12, 2, 10]]) {
    const r = ergebnis(`#einkA=0&einkB=0&monB=${p}`);
    assert.deepEqual(r.v.alt.plan, { monateA: a, monateB: b }, `monB=${p}`);
    assert.equal(r.alt, 3600, `monB=${p}`);
  }
  // mit Geschwisterbonus und Mehrlingen bekommen weiter beide denselben Monatsbetrag
  const r = ergebnis('#einkA=0&einkB=0&geschw=1&mehr=1');
  assert.deepEqual(r.v.alt.plan, { monateA: 12, monateB: 0 });
  assert.equal(r.alt, 12 * (300 + 75 + 300));
});

test('zwei Eltern ohne Einkommen, Monate der Mutter fest gewählt: es bleibt bei der Kürzung des Rechenkerns, mit Hinweis', () => {
  const r = ergebnis('#einkA=0&einkB=0&monA=12');
  assert.deepEqual(r.v.alt.plan, { monateA: 10, monateB: 2 });
  assert.match(planhinweis(r.z, r.e, r.v.alt.plan), /höchstens 12 Monate möglich\. Gerechnet wird heute mit Mutter 10 und Partner:in 2 Monaten\.$/);
});

test('hat ein Elternteil Einkommen, bleibt es bei 12 + 2', () => {
  for (const hash of ['#einkA=0', '#einkB=0', '']) {
    const r = ergebnis(hash);
    assert.deepEqual(r.v.alt.plan, { monateA: 12, monateB: 2 }, hash);
    assert.equal(planhinweis(r.z, r.e, r.v.alt.plan), '', hash);
  }
});

test('Auswahl 12 + 12: gerechnet wird 7 + 7, der Hinweis sagt es', () => {
  const r = ergebnis('#monA=12&monB=12');
  assert.deepEqual(r.v.alt.plan, { monateA: 7, monateB: 7 });
  assert.deepEqual(r.v.neu.plan, { monateA: 7, monateB: 7 });
  assert.equal(planhinweis(r.z, r.e, r.v.alt.plan), 'Zusammen sind höchstens 14 Monate möglich. Gerechnet wird mit Mutter 7 und Partner:in 7 Monaten.');
});

test('kein Hinweis, wenn die Auswahl so gerechnet wird, und nie für Alleinerziehende', () => {
  for (const hash of ['#monA=10&monB=4', '#monA=7&monB=7', '#monB=12', '#monB=0', '#einkA=0&einkB=0&monA=10', '#allein=1', '#allein=1&einkA=0&monA=12&monB=12']) {
    const r = ergebnis(hash);
    assert.equal(planhinweis(r.z, r.e, r.v.alt.plan), '', hash);
  }
});

test('12 Partnermonate, Mutter „so viele wie möglich": heute 2 + 12, im Entwurf 2 + 10', () => {
  const r = ergebnis('#monB=12');
  assert.deepEqual(r.v.alt.plan, { monateA: 2, monateB: 12 });
  assert.deepEqual(r.v.neu.plan, { monateA: 2, monateB: 10 });
  // Mutter: beide Monate im Mutterschutz; Partner 12 × 1.800 € gegen 4 × 1.900 € + 6 × 1.400 €
  assert.deepEqual([r.alt, r.neu, r.differenz], [21600, 16000, -5600]);
});

test('alleinerziehend: 14 Monate, die Partnermonate aus der URL zählen nicht', () => {
  const r = ergebnis('#allein=1&einkA=2000&monB=6');
  assert.deepEqual(r.v.alt.plan, { monateA: 14, monateB: 0 });
  assert.deepEqual(r.v.neu.plan, { monateA: 14, monateB: 0 });
  assert.deepEqual([r.alt, r.neu], [12 * 1300, 6 * 1600 + 6 * 1000]);
});

test('Bonus: Standard 0, Fragment gekürzt auf 0 bis 100.000, nur in der Adresse bei Abweichung; alleinerziehend ohne Bonus Partner:in', () => {
  assert.equal(STANDARD.bonusA, 0);
  assert.equal(ausHash('#bonusB=3000').bonusB, 3000);
  assert.equal(ausHash('#bonusA=-5').bonusA, 0);
  assert.equal(ausHash('#bonusA=999999').bonusA, 100000);
  assert.equal(alsHash({ ...STANDARD, bonusB: 3000 }), 'bonusB=3000');
  const e = grundlage({ ...STANDARD, bonusA: 1800, bonusB: 3000 });
  assert.deepEqual([e.bonusA, e.bonusB], [1800, 3000]);
  assert.equal(grundlage({ ...STANDARD, bonusA: 1800, bonusB: 3000, allein: 1 }).bonusB, 0);
});
