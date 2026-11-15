// Briefvorlage: Beträge aus dem Rechner stehen je Familie im Text; läuft ohne DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { vergleiche } from '../site/js/calc/szenario.js';
import { brief, mailto, ADRESSATEN, MAILTO_GRENZE } from '../site/js/ui/brief.js';

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

test('Brief bei Gewinn: Betrag mit „mehr" und der Grund, trotzdem zu schreiben', () => {
  // Warentest-Beispiel 1.800/2.500 € netto, 10 + 4 Monate: +560 €
  const e = { nettoA: 1800, nettoB: 2500, monateA: 10, monateB: 4 };
  const { text } = brief({ eingabe: e, vergleich: vergleiche(e), an: 'ministerin', datum });
  assert.ok(text.includes('nach dem Entwurf 18.760 €, also 560 € mehr. Ich schreibe Ihnen trotzdem:'));
  assert.doesNotMatch(text, /weniger\.|fallen ganz weg|fällt ganz weg/);
});

test('Brief bei Differenz 0: ein Betrag für beide Fassungen, kein „0 € weniger"', () => {
  // 500 € und 3.450 € netto, 7 + 7 Monate, 2 im Mutterschutz: 14.900 € nach beiden Fassungen
  const e = { nettoA: 500, nettoB: 3450, monateA: 7, monateB: 7, mutterschutzMonate: 2 };
  const v = vergleiche(e);
  assert.equal(v.differenz, 0);
  const { text } = brief({ eingabe: e, vergleich: v, an: 'mdb', datum });
  assert.ok(text.includes('Nach geltendem Recht und nach dem Entwurf bekämen wir dafür 14.900 €. Ich schreibe Ihnen trotzdem:'));
  assert.doesNotMatch(text, /0 € (weniger|mehr)/);
});

test('Brief: Differenz und Prozent aus den gerundeten Summen', () => {
  const v = { ...vergleiche(eingabe), alt: { ...vergleiche(eingabe).alt, summe: 15657.5 }, neu: { ...vergleiche(eingabe).neu, summe: 12333.4 }, differenz: -3324.1, differenzProzent: -21.2 };
  const { text } = brief({ eingabe, vergleich: v, an: 'mdb', datum });
  assert.ok(text.includes('dafür 15.658 €, nach dem Entwurf 12.333 €. Das sind 3.325 € oder 21,2 Prozent weniger.'));
});

test('mailto: kurzer Brief steht im Link, die Adresse des Ausschusses auch', () => {
  const b = brief({ eingabe, vergleich: vergleiche(eingabe), an: 'ausschuss', datum });
  const m = mailto(b);
  assert.ok(m.href.startsWith('mailto:bildungundfamilie@bundestag.de?subject='));
  assert.equal(m.mitText, m.href.includes('&body='));
});

test('mailto: der Standardbrief steht für jeden Adressaten und jede Situation vollständig im Link', () => {
  for (const a of ADRESSATEN) {
    for (const situation of ['erwartet', 'eltern', 'solidarisch']) {
      const b = brief({ eingabe, vergleich: vergleiche(eingabe), an: a.id, mdbName: 'Maria Mustermann-Beispielname', name: 'Alexandra Musterfrau-Langname', ort: 'Garmisch-Partenkirchen', situation, forderungen: ['rate', 'monate', 'mutterschutz', 'inflation'], datum });
      const m = mailto(b);
      assert.ok(m.mitText, `${a.id}/${situation}: ${m.href.length} Zeichen`);
      assert.equal(decodeURIComponent(m.href.split('&body=')[1]), b.text);
    }
  }
});

test('mailto: über der Grenze nur Betreff und Adresse, der Text bleibt draußen', () => {
  const m = mailto({ betreff: 'Betreff', text: 'ä'.repeat(MAILTO_GRENZE), email: 'a@example.org' });
  assert.equal(m.mitText, false);
  assert.equal(m.href, 'mailto:a@example.org?subject=Betreff');
});
