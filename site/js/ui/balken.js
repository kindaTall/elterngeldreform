/**
 * Schritt 2: zwei senkrechte Balken „Heute" und „Geplant" für dieselbe Aufteilung der Monate.
 *
 * balkenmodell(vergleich) ist reine Geometrie ohne DOM; dieselben Werte nutzt die Seite (main.js,
 * HTML/CSS) und später das Teilen-Bild (Canvas). Alle Zahlen kommen aus dem Rechenkern
 * (vergleiche() bzw. fuerPartnermonate() in ui/zustand.js), Euro über ganzeDifferenz/euro/euroDiff.
 *
 * Geometrie (alle Höhen als Anteil 0…1 der vollen Balkenhöhe, gemessen von der Grundlinie):
 *  - heute.hoehe, geplant.hoehe: Summe im Verhältnis zur größeren der beiden; die größere ist 1.
 *  - stueck: der Unterschied über dem rechten Balken, von `von` bis `bis`. art 'fehlt' (rot,
 *    rechter Balken niedriger, das Stück reicht bis zur Höhe des linken), 'mehr' (grün, das
 *    obere Stück des rechten Balkens) oder null bei Gleichstand.
 *  - segmente je Balken, von unten nach oben: Mutter, dann Partner:in. anteil = Anteil an der
 *    Höhe dieses Balkens (nach Elterngeld-Summe der Person), text nennt nur Monate: Geld steht
 *    immer je Familie, nie je Person. Ohne Partnermonate (oder alleinerziehend) nur ein Segment.
 *    Die Mutter trägt dazu mutterschutz/nurMutterschutz (siehe segmente()).
 *  - deltaText („−3.220 €", „+580 €", „±0 €"), prozentText (ganze Prozent, „−21 %"; unter 1 %
 *    „< 1 %"), vorzeichen 'minus' | 'plus' | 'null'.
 *  - verfallenText: Monate, die im Entwurf ganz entfallen („− 2 Monate ohne Elterngeld"), sonst ''.
 *  - beschreibung: ein Satz für Screenreader und Bildbeschreibung.
 *  - beste Aufteilung (v aus vergleicheBeste(), v.beste): die Balken zeigen weiter das Elterngeld
 *    mit den Monaten der jeweils besten Aufteilung; delta, deltaText und vorzeichen (Farbe) richten
 *    sich aber nach „unterm Strich" (Elterngeld und Lohn), prozentText ist dann „unterm Strich",
 *    neutral = true (das Stück über dem rechten Balken ohne Rot/Grün, weil es nur das Elterngeld
 *    zeigt) und bilanz ist die Zeile dazu („580 € mehr Elterngeld, aber 2.000 € weniger Lohn.").
 *    Sonst bilanz = '' und neutral = false.
 * Tests: test/balken.test.js
 */
import { euro, euroDiff, ganzeBilanz } from './diagramme.js';

const monate = (n) => (n === 1 ? '1 Monat' : `${n} Monate`);

/**
 * Segmente eines Balkens (Ergebnis von berechne()), von unten nach oben. Bei der Mutter zusätzlich
 * `mutterschutz` (Zahl ihrer Monate mit Mutterschaftsgeld statt Elterngeld, aus monate.A) und
 * `nurMutterschutz` (alle ihre Monate sind solche, ihr Elterngeld ist 0 €, etwa wenn der Partner
 * 12 Monate nimmt): dann sagt der Text, warum kein Geld dahintersteht. Die Seite zeigt jedes
 * Segment mit Monaten mindestens so hoch wie seine Beschriftung (main.js, zeigeBalken).
 */
function segmente(r, allein) {
  const schutz = (r.monate?.A ?? []).filter((m) => m.mutterschutz).length;
  const nurMutterschutz = r.plan.monateA > 0 && schutz === r.plan.monateA && !(r.summeA > 0);
  const mutter = {
    wer: 'mutter',
    monate: r.plan.monateA,
    mutterschutz: schutz,
    nurMutterschutz,
    text: `Mutter · ${monate(r.plan.monateA)}${nurMutterschutz ? ' (Mutterschaftsgeld)' : ''}`,
  };
  const summe = r.summeA + r.summeB;
  if (allein || r.plan.monateB === 0 || !(summe > 0)) return [{ ...mutter, anteil: 1 }];
  const partner = r.summeB / summe;
  return [
    { ...mutter, anteil: 1 - partner },
    { wer: 'partner', monate: r.plan.monateB, anteil: partner, text: `Partner:in · ${monate(r.plan.monateB)}` },
  ];
}

/**
 * @param {object} v Ergebnis von vergleiche() / fuerPartnermonate(): {alt, neu, entfalleneMonate}
 * @param {{alleinerziehend?: boolean}} [o]
 */
export function balkenmodell(v, { alleinerziehend = false } = {}) {
  const g = ganzeBilanz(v);
  const beste = !!v.beste;
  const max = Math.max(g.alt, g.neu);
  const hoehe = (x) => (max > 0 ? x / max : 0);
  const heute = { summe: g.alt, summeText: euro(g.alt), hoehe: hoehe(g.alt), segmente: segmente(v.alt, alleinerziehend) };
  const geplant = { summe: g.neu, summeText: euro(g.neu), hoehe: hoehe(g.neu), segmente: segmente(v.neu, alleinerziehend) };
  const delta = beste ? g.unterm : g.differenz;
  const vorzeichen = delta < 0 ? 'minus' : delta > 0 ? 'plus' : 'null';
  // Das Stück folgt immer dem Elterngeld (Geometrie), die Farbe dem gezeigten Ergebnis
  const stueck =
    g.differenz === 0
      ? { art: null, von: heute.hoehe, bis: heute.hoehe }
      : { art: g.differenz < 0 ? 'fehlt' : 'mehr', von: Math.min(heute.hoehe, geplant.hoehe), bis: Math.max(heute.hoehe, geplant.hoehe) };
  const prozent = Math.round(g.prozent) || 0;
  const prozentText = beste ? 'unterm Strich' : g.differenz === 0 ? '' : prozent === 0 ? '< 1 %' : `${prozent < 0 ? '−' : '+'}${Math.abs(prozent)} %`;
  const verfallen = Math.max(0, v.entfalleneMonate || 0);
  const verfallenText = verfallen > 0 ? `− ${monate(verfallen)} ohne Elterngeld` : '';
  const deltaText = vorzeichen === 'null' ? '±0 €' : euroDiff(delta);
  const aussage =
    g.differenz === 0 ? 'gleich viel' : `${euro(Math.abs(g.differenz))} ${g.differenz < 0 ? 'weniger' : 'mehr'}${beste ? '' : ` (${prozentText.replace(/^[−+] ?/, '')})`}`;
  const plaene = beste ? ` bei der jeweils besten Aufteilung (heute ${planKurz(v.alt.plan)}, geplant ${planKurz(v.neu.plan)} Monate)` : '';
  const bilanz = beste ? bilanzSatz(v) : '';
  return {
    heute,
    geplant,
    stueck,
    neutral: beste,
    bilanz,
    delta,
    deltaText,
    prozent,
    prozentText,
    vorzeichen,
    verfallen,
    verfallenText,
    beschreibung: `Elterngeld für die Familie${plaene}: heute ${euro(g.alt)}, geplant ${euro(g.neu)}, ${aussage}.${verfallen > 0 ? ` ${monate(verfallen)} ohne Elterngeld.` : ''}${beste ? ` Unterm Strich mit Lohn: ${deltaText}.` : ''}`,
  };
}

/** „12 + 2": Monate Mutter + Partner:in. */
export const planKurz = (p) => `${p.monateA} + ${p.monateB}`;

const betragWort = (x, wort) => (x > 0 ? `${euro(x)} mehr ${wort}` : x < 0 ? `${euro(-x)} weniger ${wort}` : `gleich viel ${wort}`);

/**
 * Zeile unter den Summen bei der besten Aufteilung, je Familie in ganzen Euro (ganzeBilanz):
 * „580 € mehr Elterngeld, aber 2.000 € weniger Lohn." („aber" bei entgegengesetzter Richtung).
 */
export function bilanzSatz(v) {
  const g = ganzeBilanz(v);
  const verbinder = g.differenz * g.lohn < 0 ? ', aber ' : g.differenz * g.lohn > 0 ? ' und ' : ', ';
  return `${betragWort(g.differenz, 'Elterngeld')}${verbinder}${betragWort(g.lohn, 'Lohn')}.`;
}
