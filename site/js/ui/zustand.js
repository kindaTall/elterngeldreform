/**
 * Zustand des Rechners ohne DOM: Standardwerte, URL-Fragment lesen und schreiben, Eingabe für den
 * Rechenkern und die Aufteilung der Monate. main.js hält das Zustandsobjekt und verbindet es mit
 * Formularen und Ausgaben. Tests: test/zustand.test.js
 *
 * Felder: modus ('netto' | 'brutto'), einkA/einkB (€ im Monat, je nach modus), stklA/stklB
 * (Steuerklasse, nur Brutto), kirche, monA (Monate der Mutter; 0 = so viele wie möglich), monB
 * (Partnermonate: 0 oder 2 bis 12), ms (angestellt mit Mutterschaftsgeld), allein, geschw, mehr
 * (weitere Kinder bei Mehrlingen), lesart (Mutterschutz verbraucht 80-%-Monate), bonusA/bonusB
 * (Bonus/Weihnachtsgeld netto, € im Jahr; 0 = keiner; zählt nur im Entwurf, siehe calc/szenario.js). Unbekannte
 * Schlüssel im Fragment werden übergangen.
 */
import { vergleiche, vergleicheVoll } from '../calc/szenario.js';
import { ALT, NEU } from '../calc/regeln.js';
import { elterngeldNetto } from '../calc/netto.js';

export const STANDARD = Object.freeze({ modus: 'netto', einkA: 1800, einkB: 2800, stklA: 4, stklB: 4, kirche: 0, monA: 0, monB: 2, ms: 1, allein: 0, geschw: 0, mehr: 0, lesart: 1, bonusA: 0, bonusB: 0 });
/** Zulässige Partnermonate: keiner oder mindestens zwei; der Regler läuft über die Positionen dieser Liste. */
export const PARTNERMONATE = Object.freeze([0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
/** Zulässiger Bereich je Zahl aus der URL; alles andere wird auf den Bereich gekürzt. */
const BEREICH = { einkA: [0, 20000], einkB: [0, 20000], stklA: [1, 5], stklB: [1, 5], kirche: [0, 1], monA: [0, 12], monB: [0, 12], ms: [0, 1], allein: [0, 1], geschw: [0, 1], mehr: [0, 2], lesart: [0, 1], bonusA: [0, 100000], bonusB: [0, 100000] };
/** Steuerklassen, die die Auswahlfelder #stklA und #stklB in index.html anbieten (Klasse 2 gibt es nur für die Mutter). */
export const STEUERKLASSEN = Object.freeze({ stklA: [1, 2, 3, 4, 5], stklB: [1, 3, 4, 5] });

/** Zustand aus einem URL-Fragment (`#einkA=2000&monB=4`); Fehlendes und Unlesbares wird Standard. */
export function ausHash(hash) {
  const z = { ...STANDARD };
  const p = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  for (const k of Object.keys(STANDARD)) {
    if (!p.has(k)) continue;
    if (k === 'modus') {
      z.modus = p.get(k) === 'brutto' ? 'brutto' : 'netto';
      continue;
    }
    const [min, max] = BEREICH[k];
    const v = Math.round(Number(p.get(k)));
    z[k] = Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : STANDARD[k];
  }
  for (const k of ['monA', 'monB']) if (z[k] === 1) z[k] = 2; // ein Elternteil nimmt keinen oder mindestens zwei Monate
  for (const k of ['stklA', 'stklB']) if (!STEUERKLASSEN[k].includes(z[k])) z[k] = STANDARD[k]; // sonst bliebe das Auswahlfeld leer
  return z;
}

/** Fragment (ohne `#`) mit allen Werten, die vom Standard abweichen. */
export function alsHash(z) {
  const p = new URLSearchParams();
  for (const k of Object.keys(STANDARD)) if (z[k] !== STANDARD[k]) p.set(k, z[k]);
  return p.toString();
}

/** Elterngeld-Netto eines Elternteils ('A' | 'B'), im Brutto-Modus umgerechnet wie in den Elterngeldstellen. */
export function nettoVon(z, wer) {
  const eink = z[`eink${wer}`];
  if (z.modus === 'netto') return eink;
  return elterngeldNetto(eink, { steuerklasse: z[`stkl${wer}`], kirchensteuer: !!z.kirche });
}

/** Eingabe für den Rechenkern, noch ohne Aufteilung der Monate. */
export function grundlage(z) {
  const nettoA = nettoVon(z, 'A');
  return {
    nettoA,
    nettoB: z.allein ? 0 : nettoVon(z, 'B'),
    // Mutterschaftsgeld gibt es nur mit Einkommen (wie Karte und Überschlag); Mehrlinge: 12 statt 8 Wochen Schutzfrist
    mutterschutzMonate: z.ms && nettoA > 0 ? (z.mehr > 0 ? 3 : 2) : 0,
    alleinerziehend: !!z.allein,
    geschwisterbonus: !!z.geschw,
    mehrlinge: z.mehr,
    mutterschutzVerbraucht80: !!z.lesart,
    bonusA: z.bonusA,
    bonusB: z.allein ? 0 : z.bonusB,
  };
}

/** Monate der Mutter: gewählt (`monA`) oder so viele, wie neben p Partnermonaten heute möglich sind. */
export const monateMutter = (z, p) => z.monA || Math.min(ALT.maxMonateElternteil, ALT.maxMonatePaar - p);

/** Zeile „mindestens 4 Partnermonate" in Schritt 2: angehakt ab 4; zum Vergleich steht das Ergebnis mit 2 bzw. 4. */
export function vergleichsmonate(p) {
  const angehakt = p >= NEU.reservierteMonate;
  return { angehakt, andere: angehakt ? ALT.minMonateElternteil : NEU.reservierteMonate };
}

/**
 * Dieselbe Aufteilung nach beiden Regelwerken, mit p Partnermonaten (alleinerziehend: 14 Monate).
 *
 * Sonderfall: Hat kein Elternteil Einkommen, gibt es nach geltendem Recht zusammen nur 12 Monate
 * (§ 4 Abs. 3 S. 2 BEEG). Der Rechenkern kürzt dann bei der Mutter (12 + 2 wird 10 + 2). Bei „so
 * viele wie möglich" fallen stattdessen zuerst die Partnermonate weg (12 + 0); die Summe ist
 * dieselbe, weil beide den Mindestbetrag bekommen. Der Entwurf rechnet weiter mit dem Wunschplan.
 */
export function fuerPartnermonate(z, e, p) {
  if (e.alleinerziehend) return vergleicheVoll(e);
  const wunsch = { ...e, monateA: monateMutter(z, p), monateB: p };
  const v = vergleiche(wunsch);
  if (z.monA !== 0 || e.nettoA > 0 || e.nettoB > 0) return v;
  const max = ALT.maxMonateOhneEinkommensminderung;
  const b = Math.max(...PARTNERMONATE.filter((m) => m <= p && wunsch.monateA + m <= max));
  const heute = vergleiche({ ...wunsch, monateA: max - b, monateB: b }).alt;
  return heute.summe === v.alt.summe ? { ...v, alt: heute } : v;
}

/**
 * Hinweis unter den Auswahlfeldern der Monate, wenn nach geltendem Recht mit einer anderen
 * Aufteilung gerechnet wird als gewählt; sonst ''.
 * @param {object} z Zustand
 * @param {object} e Eingabe aus grundlage()
 * @param {{monateA: number, monateB: number}} plan gerechnete Aufteilung nach geltendem Recht
 */
export function planhinweis(z, e, plan) {
  if (e.alleinerziehend) return '';
  if ((z.monA === 0 || plan.monateA === z.monA) && plan.monateB === z.monB) return '';
  const gerechnet = `Mutter ${plan.monateA} und Partner:in ${plan.monateB} Monaten`;
  if (e.nettoA > 0 || e.nettoB > 0) return `Zusammen sind höchstens ${ALT.maxMonatePaar} Monate möglich. Gerechnet wird mit ${gerechnet}.`;
  return `Ohne Einkommen vor der Geburt sind nach geltendem Recht zusammen höchstens ${ALT.maxMonateOhneEinkommensminderung} Monate möglich. Gerechnet wird heute mit ${gerechnet}.`;
}
