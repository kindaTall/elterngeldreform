/**
 * Karte „Wer bekommt mehr, wer weniger?" ohne DOM: Zuordnung der Einkommen zu Feldern, Texte für
 * das gewählte Feld und für „Euer Ergebnis", Pfeiltasten. Gezeichnet wird in heatmap()
 * (ui/diagramme.js), verdrahtet in karte() (main.js). Tests: test/karte.test.js
 *
 * Das Raster rechnet je Feld an genau einem Punkt: Feld (i, j) steht für Netto der Mutter i·250 €
 * und Netto Partner:in j·250 € (Rechenwert des Felds, keine Spanne). „Euer Ergebnis" rechnet dagegen
 * mit den genauen Einkommen und derselben Aufteilung der Monate wie die Karte. Beträge nur je Familie.
 */
import { vergleiche } from '../calc/szenario.js';
import { RASTER, ganzeDifferenz, euro, euroDiff } from './diagramme.js';

const klemme = (x) => Math.max(0, Math.min(RASTER.n - 1, x));

/** Nächstes Feld (0 bis n−1) zu einem Netto in €; über 5.000 € das letzte Feld. */
export const feldFuer = (netto) => klemme(Math.round(netto / RASTER.schritt));

/** Netto in € im Rechenpunkt des Felds mit diesem Index. */
export const feldNetto = (index) => index * RASTER.schritt;

/** Feld {i, j} (i: Mutter, waagerecht; j: Partner:in, senkrecht) der eigenen Einkommen. */
export const eigenesFeld = (nettoA, nettoB) => ({ i: feldFuer(nettoA), j: feldFuer(nettoB) });

/** Zeile zu einem Feld: „Mutter 2.000 € netto · Partner:in 3.000 € netto · Ergebnis: −1.240 €". */
export const feldText = ({ nettoA, nettoB, differenz }) => `Mutter ${euro(nettoA)} netto · Partner:in ${euro(nettoB)} netto · Ergebnis: ${euroDiff(differenz)}`;

const RICHTUNG = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowDown: [0, -1], ArrowUp: [0, 1] };

/**
 * Feld nach einer Pfeiltaste (oben = mehr Netto Partner:in, rechts = mehr Netto Mutter), am Rand
 * bleibt es stehen. Andere Tasten: null.
 */
export function naechstesFeld(feld, taste) {
  const r = RICHTUNG[taste];
  return r ? { i: klemme(feld.i + r[0]), j: klemme(feld.j + r[1]) } : null;
}

/**
 * „Euer Ergebnis" für die Aufteilung der Karte (a Monate Mutter, b Partner:in): stimmt sie mit der
 * des Rechners überein (alt.plan von `gezeigt`), ist es genau dessen Ergebnis, sonst wird mit
 * denselben Eingaben `e` (grundlage() in ui/zustand.js) für a + b gerechnet.
 * @returns {{gleich: boolean, alt: number, neu: number, differenz: number, prozent: number}}
 */
export function ergebnisKarte(e, gezeigt, a, b) {
  const gleich = gezeigt.alt.plan.monateA === a && gezeigt.alt.plan.monateB === b;
  const v = gleich ? gezeigt : vergleiche({ ...e, monateA: a, monateB: b });
  return { gleich, ...ganzeDifferenz(v) };
}

/** Satz zur Aufteilung unter „Euer Ergebnis"; sagt, ob sie die des Rechners ist. */
export function planZeile(a, b, gezeigt) {
  const karte = `Mutter ${a}, Partner:in ${b} Monate`;
  const p = gezeigt.alt.plan;
  if (p.monateA === a && p.monateB === b) return `Aufteilung wie im Rechner: ${karte}.`;
  return `Aufteilung der Karte: ${karte}. Der Rechner in Schritt 2 rechnet mit Mutter ${p.monateA}, Partner:in ${p.monateB} Monaten.`;
}
