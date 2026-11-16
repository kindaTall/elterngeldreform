// Teilen-Text und Anzeigehelfer: Summen und Differenz in ganzen Euro, die Differenz aus den
// gerundeten Summen. Läuft ohne DOM (das Bild selbst wird im Browser geprüft).
import test from 'node:test';
import assert from 'node:assert/strict';
import { vergleiche, vergleicheVoll } from '../site/js/calc/szenario.js';
import { euro, euroDiff, ganzeDifferenz } from '../site/js/ui/diagramme.js';
import { SYMBOLE } from '../site/js/ui/symbole.js';
import { MINISTERIUM_ZITAT, TEILADRESSE, teiltext, kurztext, laengeX, laengeBluesky, KURZ_GRENZE, netzwerke, spaeterWeniger, umbrechen, bildTexte } from '../site/js/ui/teilen.js';

const URL = 'https://elterngeld2027.de/';
const fuer = (eingabe, v = eingabe.alleinerziehend ? vergleicheVoll(eingabe) : vergleiche(eingabe)) => ({ eingabe, gezeigt: v });

test('euro: ganze Euro mit Tausenderpunkt und echtem Minuszeichen', () => {
  assert.equal(euro(1234.4), '1.234 €');
  assert.equal(euro(1234.5), '1.235 €');
  assert.equal(euro(-1234.4), '−1.234 €');
  assert.equal(euro(0), '0 €');
});

test('euro und euroDiff: erst runden, dann das Vorzeichen – nie „−0 €" oder „+0 €"', () => {
  for (const x of [-0.3, -0.5, -0, 0, 0.3, 0.49]) {
    assert.equal(euro(x), '0 €', `euro(${x})`);
    assert.equal(euroDiff(x), '0 €', `euroDiff(${x})`);
  }
  assert.equal(euroDiff(0.5), '+1 €');
  assert.equal(euroDiff(-0.51), '−1 €');
  assert.equal(euroDiff(580), '+580 €');
  assert.equal(euroDiff(-3220), '−3.220 €');
});

test('ganzeDifferenz: Differenz und Prozent aus den gerundeten Summen', () => {
  // getrennt gerundet stünde −3.324 € neben 12.333 € statt 15.658 €
  const v = { alt: { summe: 15657.5 }, neu: { summe: 12333.4 }, differenz: -3324.1 };
  assert.deepEqual(ganzeDifferenz(v), { alt: 15658, neu: 12333, differenz: -3325, prozent: -21.2 });
  assert.deepEqual(ganzeDifferenz({ alt: { summe: 100.4 }, neu: { summe: 99.6 } }), { alt: 100, neu: 100, differenz: 0, prozent: 0 });
  assert.deepEqual(ganzeDifferenz({ alt: { summe: 0 }, neu: { summe: 330 } }), { alt: 0, neu: 330, differenz: 330, prozent: 0 });
});

test('ganzeDifferenz: für jedes Netto passen Summen und Differenz zusammen', () => {
  for (let nettoA = 0; nettoA <= 4000; nettoA += 137) {
    for (let nettoB = 0; nettoB <= 4000; nettoB += 211) {
      const g = ganzeDifferenz(vergleiche({ nettoA, nettoB, monateA: 12, monateB: 2, mutterschutzMonate: nettoA > 0 ? 2 : 0 }));
      assert.equal(g.neu - g.alt, g.differenz);
      assert.ok(Number.isInteger(g.alt) && Number.isInteger(g.neu));
    }
  }
});

test('Teilen-Text Paar: Differenz, beide Summen, Partnermonate und verfallende Monate', () => {
  const t = teiltext(fuer({ nettoA: 1800, nettoB: 2800, monateA: 12, monateB: 2, mutterschutzMonate: 2 }));
  assert.equal(t, `Das Familienministerium sagt, das Elterngeld solle „partnerschaftlicher, finanziell attraktiver und einfacher“ werden. Für unsere Familie hieße das −3.220 € (12.080 € statt 15.300 €), wenn der Partner 2 Monate nimmt, 2 Monate verfallen. Was wäre es bei dir? ${URL} #Elterngeld #Elterngeldreform`);
});

test('Teilen-Text beginnt mit dem Ministeriumszitat; das Zitat im Bild enthält die zitierten Worte', () => {
  const t = teiltext(fuer({ nettoA: 1800, nettoB: 2800, monateA: 12, monateB: 2, mutterschutzMonate: 2 }));
  assert.ok(t.startsWith('Das Familienministerium sagt, das Elterngeld solle „partnerschaftlicher, finanziell attraktiver und einfacher“ werden. '));
  assert.ok(MINISTERIUM_ZITAT.includes('partnerschaftlicher, finanziell attraktiver und einfacher'));
  assert.doesNotMatch(t, /Bundesregierung/);
});

test('Teilen-Text Paar mit 4 Partnermonaten: kein Monat verfällt', () => {
  const t = teiltext(fuer({ nettoA: 1800, nettoB: 2500, monateA: 10, monateB: 4 }));
  assert.ok(t.includes('hieße das +560 € ('));
  assert.ok(t.includes(', wenn der Partner 4 Monate nimmt. Was wäre es bei dir?'));
  assert.doesNotMatch(t, /verf/);
});

test('Teilen-Text mit 0 Partnermonaten: „kein Elterngeld", 2 Monate verfallen', () => {
  const t = teiltext(fuer({ nettoA: 2000, nettoB: 3000, monateA: 12, monateB: 0 }));
  assert.ok(t.includes('hieße das −3.200 € (12.400 € statt 15.600 €), wenn der Partner kein Elterngeld nimmt, 2 Monate verfallen.'));
});

test('Teilen-Text alleinerziehend: eigene Anrede, keine Bedingung', () => {
  // 3.000 € netto, 2 Monate Mutterschutz: heute 12 × 1.800 €, im Entwurf 6 × 1.900 € + 6 × 1.500 €
  const t = teiltext(fuer({ nettoA: 3000, alleinerziehend: true, mutterschutzMonate: 2 }));
  assert.ok(t.includes('Für mich hieße das −1.200 € (20.400 € statt 21.600 €). Was wäre es bei dir?'));
  assert.doesNotMatch(t, /Partner/);
});

test('Teilen-Text bei Differenz 0: „0 €" ohne Vorzeichen', () => {
  // 2.000 € netto, alleinerziehend: 12 × 1.300 € = 6 × 1.600 € + 6 × 1.000 €
  const t = teiltext(fuer({ nettoA: 2000, alleinerziehend: true, mutterschutzMonate: 2 }));
  assert.ok(t.includes('hieße das 0 € (15.600 € statt 15.600 €).'));
});

test('Teilen-Text: Summen und Differenz passen auch bei krummen Beträgen zusammen', () => {
  const eingabe = { nettoA: 1101, nettoB: 2001, monateA: 12, monateB: 2, mutterschutzMonate: 2 };
  const v = vergleiche(eingabe);
  const t = teiltext(fuer(eingabe, v));
  const zahl = (s) => Number(s.replace(/\./g, '').replace('−', '-').replace('+', ''));
  const [, d, neu, alt] = t.match(/hieße das (\S+) € \((\S+) € statt (\S+) €\)/);
  assert.equal(zahl(neu) - zahl(alt), zahl(d));
  assert.equal(zahl(alt), Math.round(v.alt.summe));
});

test('Geteilt wird die schlichte Adresse ohne Eingaben; Text und Bild nennen kein Einkommen', () => {
  assert.equal(TEILADRESSE, URL);
  for (const e of [
    { nettoA: 1900, nettoB: 3100, monateA: 12, monateB: 2, mutterschutzMonate: 2 },
    { nettoA: 2450, nettoB: 3650, monateA: 7, monateB: 7, mutterschutzMonate: 2 },
    { nettoA: 3150, alleinerziehend: true, mutterschutzMonate: 2 },
  ]) {
    const a = fuer(e);
    const texte = [teiltext(a), kurztext(a), ...Object.values(bildTexte(a)), ...netzwerke(teiltext(a), kurztext(a)).map((n) => decodeURIComponent(n.href))];
    for (const t of texte) {
      assert.doesNotMatch(t, /#\w+=|einkA|einkB/, t);
      for (const netto of [e.nettoA, e.nettoB].filter(Boolean)) assert.ok(!t.includes(euro(netto)) && !t.includes(String(netto)), `${netto} in ${t}`);
    }
    assert.ok(teiltext(a).includes(` ${URL} `) && kurztext(a).includes(` ${URL} `));
  }
});

test('Netzwerk-Links tragen Text und Adresse kodiert', () => {
  const liste = netzwerke('Text mit Leerzeichen & Zeichen');
  assert.ok(liste.length >= 6);
  for (const n of liste) assert.doesNotMatch(n.href, / /);
  for (const n of liste) assert.ok(SYMBOLE[n.symbol], `Symbol für ${n.name}`);
  assert.equal(liste.find((n) => n.name === 'WhatsApp').href, 'https://wa.me/?text=Text%20mit%20Leerzeichen%20%26%20Zeichen');
  assert.equal(liste.find((n) => n.name === 'Facebook').href, `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL)}`);
});

test('Bild für Alleinerziehende: Zeile zum 9. Bezugsmonat nur, wenn der Betrag dann niedriger ist', () => {
  // 3.000 € netto: heute 1.800 € (Höchstbetrag), im Entwurf ab dem 9. Monat 50 % = 1.500 €
  assert.equal(spaeterWeniger(vergleicheVoll({ nettoA: 3000, alleinerziehend: true, mutterschutzMonate: 2 })), 'Ab dem 9. Bezugsmonat 1.500 € statt 1.800 € im Monat');
  assert.equal(spaeterWeniger(vergleicheVoll({ nettoA: 2000, alleinerziehend: true })), 'Ab dem 9. Bezugsmonat 1.000 € statt 1.300 € im Monat');
  // 300 € netto: Mindestbetrag 330 € statt 300 €; 4.000 € netto: Höchstbetrag 1.900 € statt 1.800 €
  assert.equal(spaeterWeniger(vergleicheVoll({ nettoA: 300, alleinerziehend: true })), '');
  assert.equal(spaeterWeniger(vergleicheVoll({ nettoA: 4000, alleinerziehend: true })), '');
  // weniger als neun Monate: keine Zeile
  assert.equal(spaeterWeniger(vergleiche({ nettoA: 2000, monateA: 6, monateB: 0, alleinerziehend: true })), '');
});

test('Zeilenumbruch im Bild: keine Zeile breiter als der Platz, kein Wort geht verloren', () => {
  const messe = (t) => t.length * 10;
  const text = 'Wenn der Partner kein Elterngeld nimmt, 2 Monate verfallen';
  const zeilen = umbrechen(text, 300, messe);
  assert.deepEqual(zeilen, ['Wenn der Partner kein', 'Elterngeld nimmt, 2 Monate', 'verfallen']);
  assert.equal(zeilen.join(' '), text);
  assert.deepEqual(umbrechen('kurz', 300, messe), ['kurz']);
  assert.deepEqual(umbrechen('Donaudampfschifffahrtsgesellschaftskapitän ja', 300, messe), ['Donaudampfschifffahrtsgesellschaftskapitän', 'ja']);
  assert.deepEqual(umbrechen('', 300, messe), []);
});

test('Bildtexte Standardfall: Zitat, Differenz je Familie, Summen und Bedingung wie im Teilen-Text', () => {
  const a = fuer({ nettoA: 1800, nettoB: 2800, monateA: 12, monateB: 2, mutterschutzMonate: 2 });
  const t = bildTexte(a);
  assert.equal(t.richtung, 'weniger');
  assert.equal(t.zitat, `\u201E${MINISTERIUM_ZITAT}\u201C`);
  assert.equal(t.wer, 'Für unsere Familie hieße das:');
  assert.equal(t.differenz, '−3.220 €');
  assert.equal(t.vergleich, '12.080 € statt 15.300 €');
  assert.equal(t.bedingung, 'Wenn der Partner 2 Monate nimmt: 2 Monate verfallen');
  assert.equal(t.adresse, 'elterngeld2027.de');
  assert.ok(teiltext(a).includes(`${t.differenz} (${t.vergleich})`));
});

test('Bildtexte Plus: positive Richtung, ohne verfallende Monate keine Verfallszeile', () => {
  const t = bildTexte(fuer({ nettoA: 600, nettoB: 2000, monateA: 10, monateB: 4, mutterschutzMonate: 2 }));
  assert.equal(t.richtung, 'mehr');
  assert.equal(t.differenz, '+744 €');
  assert.equal(t.bedingung, 'Wenn der Partner 4 Monate nimmt');
});

test('Bildtexte Gleichstand: „±0 €", „wie heute", Anrede für Alleinerziehende, Frage in der Du-Form', () => {
  const t = bildTexte(fuer({ nettoA: 1800, alleinerziehend: true, mutterschutzMonate: 2 }));
  assert.equal(t.richtung, 'gleich');
  assert.equal(t.differenz, '±0 €');
  assert.match(t.vergleich, /^[\d.]+ € wie heute$/);
  assert.equal(t.wer, 'Für mich hieße das:');
  assert.equal(t.frage, 'Was wäre es bei dir?');
  assert.doesNotMatch(t.bedingung, /Partner/);
});

test('Bildtexte: Partnermonate 0 und Alleinerziehende ohne spätere Absenkung', () => {
  assert.equal(bildTexte(fuer({ nettoA: 2000, nettoB: 3000, monateA: 12, monateB: 0 })).bedingung, 'Wenn der Partner kein Elterngeld nimmt: 2 Monate verfallen');
  assert.equal(bildTexte(fuer({ nettoA: 300, alleinerziehend: true })).bedingung, '');
});

// Längen für X (280, Adresse zählt 23, „€" und „−" doppelt) und Bluesky (300, Adresse ausgeschrieben)
const fuenfstellig = (() => {
  const e = { nettoA: 6000, nettoB: 6000, monateA: 3, monateB: 11, mutterschutzMonate: 2 };
  const v = vergleiche(e);
  return fuer(e, { ...v, alt: { ...v.alt, summe: 31200 }, neu: { ...v.neu, summe: 18900 } }); // −12.300 €
})();
const faelle = [
  ['Vorgabe', fuer({ nettoA: 1800, nettoB: 2800, monateA: 12, monateB: 2, mutterschutzMonate: 2 })],
  ['eigene Zahlen', fuer({ nettoA: 1900, nettoB: 3100, monateA: 12, monateB: 2, mutterschutzMonate: 2 })],
  ['Regler 7 Partnermonate', fuer({ nettoA: 2400, nettoB: 3600, monateA: 7, monateB: 7, mutterschutzMonate: 2 })],
  ['Regler 12 Partnermonate', fuer({ nettoA: 6000, nettoB: 6000, monateA: 2, monateB: 12, mutterschutzMonate: 2 })],
  ['alleinerziehend', fuer({ nettoA: 3000, alleinerziehend: true, mutterschutzMonate: 2 })],
  ['fünfstellige Differenz', fuenfstellig],
];

test('Teilen-Text für X und Bluesky: sicher unter den Grenzen, mit Zitat, Zahl der Familie, Adresse und Hashtag', () => {
  for (const [name, a] of faelle) {
    const k = kurztext(a);
    assert.ok(laengeX(k) <= KURZ_GRENZE.x && KURZ_GRENZE.x < 280, `${name}: X ${laengeX(k)}`);
    assert.ok(laengeBluesky(k) <= KURZ_GRENZE.bluesky && KURZ_GRENZE.bluesky < 300, `${name}: Bluesky ${laengeBluesky(k)}`);
    assert.ok(k.includes('\u201Epartnerschaftlicher, finanziell attraktiver und einfacher\u201C'), name);
    assert.ok(k.includes(euroDiff(ganzeDifferenz(a.gezeigt).differenz)), name);
    assert.ok(k.includes(` ${URL} `) && k.endsWith(' #Elterngeld'), name);
  }
  // im Normalfall bleibt die Bedingung drin
  assert.ok(kurztext(faelle[0][1]).includes('−3.220 €, wenn der Partner 2 Monate nimmt, 2 Monate verfallen.'));
  assert.ok(kurztext(fuenfstellig).includes('−12.300 €'));
});

test('Zählweise: X zählt Adressen als 23 und „€"/„−" doppelt, Bluesky zählt alles einfach', () => {
  assert.equal(laengeX('ab https://example.org/#sehr-lang-sehr-lang-sehr-lang'), 26);
  assert.equal(laengeX('−3 €'), 6);
  assert.equal(laengeX('„ä“'), 3);
  assert.equal(laengeBluesky('−3 € https://example.org/'), 25);
});

test('Netzwerk-Links: X und Bluesky bekommen die Kurzfassung, die anderen den vollen Text', () => {
  const liste = netzwerke('voll', 'kurz');
  assert.equal(liste.find((n) => n.name === 'X').href, 'https://x.com/intent/post?text=kurz');
  assert.equal(liste.find((n) => n.name === 'Bluesky').href, 'https://bsky.app/intent/compose?text=kurz');
  assert.equal(liste.find((n) => n.name === 'WhatsApp').href, 'https://wa.me/?text=voll');
});

// Beste Aufteilung: Teilen nennt „unterm Strich", Elterngeld und Lohn, beide Aufteilungen
import { vergleicheBeste as besteV } from '../site/js/calc/szenario.js';
test('Teilen bei der besten Aufteilung: Zahl unterm Strich, richtig beschriftet', () => {
  const a = { eingabe: { nettoA: 1800, nettoB: 2800 }, gezeigt: besteV({ nettoA: 1800, nettoB: 2800, mutterschutzMonate: 2, mutterschutzVerbraucht80: true }) };
  assert.ok(teiltext(a).includes('Für unsere Familie hieße das unterm Strich −1.420 € (Elterngeld +580 €, Lohn −2.000 €), bei der jeweils günstigsten Aufteilung: der Partner bliebe 4 statt 2 Monate zu Hause.'));
  const k = kurztext(a);
  assert.ok(k.includes('unterm Strich −1.420 €'));
  assert.ok(laengeX(k) <= KURZ_GRENZE.x);
  const b = bildTexte(a);
  assert.equal(b.differenz, '−1.420 €');
  assert.equal(b.richtung, 'weniger');
  assert.equal(b.wer, 'Für uns hieße das unterm Strich:');
  assert.equal(b.vergleich, 'aus Elterngeld +580 € und Lohn −2.000 €');
  assert.equal(b.bedingung, 'Jeweils günstigste Aufteilung: heute Mutter 12, Partner 2 Monate; geplant Mutter 10, Partner 4');
});

test('Teilen-Bild: „mit Bonus" in der kleinen Zeile, nur wenn ein Bonus eingerechnet ist', () => {
  const e = { nettoA: 1800, nettoB: 2800, monateA: 10, monateB: 4, mutterschutzMonate: 2 };
  assert.equal(bildTexte(fuer(e)).hinweis, 'Modellrechnung zum Gesetzentwurf vom 12.11.2026, ohne Gewähr');
  assert.equal(bildTexte(fuer({ ...e, bonusB: 3000 })).hinweis, 'Modellrechnung zum Gesetzentwurf vom 12.11.2026, mit Bonus, ohne Gewähr');
});
