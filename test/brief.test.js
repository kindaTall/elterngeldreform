// Briefvorlage: Beträge aus dem Rechner stehen je Familie im Text; läuft ohne DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { vergleiche } from '../site/js/calc/szenario.js';
import { brief, mailto, ADRESSATEN } from '../site/js/ui/brief.js';

const eingabe = { nettoA: 1800, nettoB: 2800, monateA: 12, monateB: 2, mutterschutzMonate: 2 };
const datum = new Date(2026, 10, 15);

test('Brief: 1.800 € und 2.800 € netto, 12 + 2 Monate – Beträge, Prozent und entfallende Monate', () => {
  const { betreff, text } = brief({ eingabe, vergleich: vergleiche(eingabe), an: 'mdb', forderungen: ['rate', 'monate'], datum });
  for (const teil of ['15.300 €', '12.080 €', '3.220 €', '21 Prozent', 'Zwei Monate fallen ganz weg', '15. November 2026']) {
    assert.ok(text.includes(teil), `fehlt: ${teil}`);
  }
  assert.ok(text.includes(betreff));
});

test('Brief enthält für keinen Adressaten und keine Situation „undefined" oder „NaN"', () => {
  const faelle = [eingabe, { nettoA: 2000, monateA: 14, monateB: 0, alleinerziehend: true }, { nettoA: 1800, nettoB: 2500, monateA: 10, monateB: 4 }];
  for (const e of faelle) {
    for (const { id } of ADRESSATEN) {
      for (const situation of ['erwartet', 'eltern', 'solidarisch']) {
        const b = brief({ eingabe: e, vergleich: vergleiche(e), an: id, situation, datum });
        assert.doesNotMatch(`${b.betreff}\n${b.text}`, /undefined|NaN/);
      }
    }
  }
});

test('Brief: Parameter voll wird ignoriert', () => {
  const p = { eingabe, vergleich: vergleiche(eingabe), an: 'ausschuss', datum };
  assert.deepEqual(brief({ ...p, voll: { differenz: 580 } }), brief(p));
});

test('mailto: kurzer Brief steht im Link, die Adresse des Ausschusses auch', () => {
  const b = brief({ eingabe, vergleich: vergleiche(eingabe), an: 'ausschuss', datum });
  const m = mailto(b);
  assert.ok(m.href.startsWith('mailto:bildungundfamilie@bundestag.de?subject='));
  assert.equal(m.mitText, m.href.includes('&body='));
});
