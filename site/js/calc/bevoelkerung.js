/**
 * Überschlag für alle Familien eines Geburtsjahrgangs mit Elterngeld: gleiche Einkommen und
 * gleiche Bezugsdauer wie beobachtet, einmal nach ALT, einmal nach NEU gerechnet (keine
 * Verhaltensänderung). Ergebnisse gibt es nur je Familie (beide Elternteile zusammengerechnet),
 * nie getrennt nach Mutter und Vater. Tests: test/bevoelkerung.test.js
 *
 * Daten: Statistisches Bundesamt, Statistischer Bericht "Elterngeld – Beendete Leistungsbezüge
 * für im Jahr 2023 geborene Kinder" (Art.-Nr. 5229201237005), Tab. 22922-01 (Bezugsdauer) und
 * 22922-04 (Elterngeld-Netto), abgerufen 15.11.2026:
 * https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Soziales/Elterngeld/_inhalt.html
 *
 * Annahmen (die Statistik weist sie nicht aus):
 *  - Paare: Die Statistik zählt Mütter und Väter getrennt, nicht als Paare. Jeder Vater mit
 *    Elterngeld wird einer nicht alleinerziehenden Mutter mit Elterngeld zugeordnet; Einkommen
 *    und Bezugsdauer der beiden gelten als unabhängig voneinander. Eine Familie = eine Mutter
 *    mit Elterngeld (Väter ohne beziehende Mutter sind wenige und bleiben unberücksichtigt).
 *    Das Familienergebnis ist die Summe beider Elternteile, jeder für sich gerechnet.
 *  - Einkommen und Bezugsdauer sind unabhängig voneinander verteilt.
 *  - Jede Einkommensklasse wird durch einen Wert vertreten (`netto`); die Werte geben die von
 *    Destatis veröffentlichten Durchschnitte wieder. Die oberste Klasse ist bei 2.770 €
 *    abgeschnitten; wie viel darüber verdient wird, ist unbekannt (`OBERSTE_KLASSE`).
 *  - Bezugsdauer-Klassen werden durch Basis-Monate vertreten (`basisMonate`). Bezüge über 12
 *    Monate entstehen durch ElterngeldPlus (2 Plus-Monate = 1 Basis-Monat); für Mütter in diesen
 *    Klassen sind 11 bis 12 Basis-Monate plausibel (`PLUS_MONATE`). Die Werte für Väter sind so
 *    gewählt, dass der Durchschnittsanspruch je Vater nach geltendem Recht den Destatis-Wert
 *    trifft (3.890 €, Tab. 22922-03); viele Väter in den Klassen ab 3 Monaten beziehen Plus.
 *  - Alleinerziehende behalten im Entwurf 14 Monate, davon 8 zu 80 %. Ihr Anteil ist nicht
 *    veröffentlicht; 9,7 % der Mütter leben nicht mit dem anderen Elternteil zusammen
 *    (Tab. 22922-05, Obergrenze) (`ALLEINERZIEHEND`).
 *  - Mütter mit Erwerbseinkommen haben 2 Monate Mutterschaftsgeld, Mütter ohne keins.
 *  - Ohne Geschwisterbonus, Mehrlingszuschlag, Teilzeit, Partnerschaftsbonus, Sonderzahlungen.
 * Unabhängig nachgerechnet am 15.11.2026 (eigenes Python-Modell aus dem Gesetzestext).
 */
import { vergleiche } from './szenario.js';

export const JAHRGANG = 2023;
export const GEBURTEN = 692989; // GENESIS 12612-0001
export const KINDER_MIT_ELTERNGELD = 660067; // Destatis, Geburten und Väterbeteiligung 2023

// Elterngeld-Netto vor der Geburt, Beziehende mit Erwerbseinkommen (Tab. 22922-04)
export const EINKOMMEN = [
  { klasse: 'unter 500 €', netto: 300, muetter: 31577, vaeter: 3123 },
  { klasse: '500–1.000 €', netto: 750, muetter: 56935, vaeter: 5493 },
  { klasse: '1.000–1.240 €', netto: 1120, muetter: 37536, vaeter: 4766 },
  { klasse: '1.240–1.500 €', netto: 1370, muetter: 47530, vaeter: 9950 },
  { klasse: '1.500–2.000 €', netto: 1750, muetter: 103487, vaeter: 50819 },
  { klasse: '2.000–2.770 €', netto: 2385, muetter: 123341, vaeter: 103521 },
  { klasse: 'ab 2.770 €', netto: null, muetter: 80522, vaeter: 111333 },
];
export const OHNE_EINKOMMEN = { klasse: 'ohne Einkommen', netto: 0, muetter: 642965 - 480928, vaeter: 302135 - 289005 };

/** Vertreterwerte für die offene oberste Einkommensklasse. */
export const OBERSTE_KLASSE = { niedrig: 2770, mittel: 3300, hoch: 3800 };

/** Basis-Monate für Mütter in den ElterngeldPlus-Klassen (13 und mehr Bezugsmonate). */
const PLUS_MONATE = { niedrig: 11, mittel: 11, hoch: 12 };
/** Anteil alleinerziehender Mütter. */
const ALLEINERZIEHEND = { niedrig: 0, mittel: 0.05, hoch: 0.097 };

// Bezugsdauer (Tab. 22922-01); `plus`: Klasse entsteht bei Müttern durch ElterngeldPlus
export const DAUER = [
  { klasse: 'bis 2 Monate', basisMonate: { muetter: 2, vaeter: 2 }, muetter: 4867, vaeter: 219273 },
  { klasse: '3–9 Monate', basisMonate: { muetter: 6, vaeter: 4 }, muetter: 32172, vaeter: 61978 },
  { klasse: '10–12 Monate', basisMonate: { muetter: 12, vaeter: 6 }, muetter: 387617, vaeter: 14901 },
  { klasse: '13–14 Monate', plus: true, basisMonate: { muetter: 12, vaeter: 7 }, muetter: 39183, vaeter: 1777 },
  { klasse: '15–23 Monate', plus: true, basisMonate: { muetter: 12, vaeter: 7 }, muetter: 157366, vaeter: 3056 },
  { klasse: '24 und mehr', plus: true, basisMonate: { muetter: 12, vaeter: 7 }, muetter: 21760, vaeter: 1150 },
];

const KLASSEN = [OHNE_EINKOMMEN, ...EINKOMMEN];
const anzahl = (wer) => KLASSEN.reduce((s, k) => s + k[wer], 0);
export const FAMILIEN = anzahl('muetter');
export const PARTNER_MIT_BEZUG = anzahl('vaeter');

/** Bezugsdauer des Partners, zusammengefasst für die Auswertung nach Aufteilung. */
const PARTNERDAUER = [
  { klasse: 'Partner:in bis 2 Mon.', dauer: [0] },
  { klasse: 'Partner:in 3–9 Mon.', dauer: [1] },
  { klasse: 'Partner:in ab 10 Mon.', dauer: [2, 3, 4, 5] },
];

/** Zellen (Einkommen × Bezugsdauer) eines Elternteils, `anteil` = Anteil an allen Müttern bzw. Vätern. */
function zellen(wer, o) {
  const personen = anzahl(wer);
  const liste = [];
  KLASSEN.forEach((ek, einkommen) => {
    const netto = ek.netto ?? o.obersteKlasse;
    DAUER.forEach((d, dauer) => {
      const monate = wer === 'muetter' && d.plus ? o.plusMonate : d.basisMonate[wer];
      // Alleinerziehende nur unter Müttern mit langem Bezug
      const allein = wer === 'muetter' && monate >= 10 ? o.anteilAlleinerziehend : 0;
      for (const [alleinerziehend, gewicht] of [[false, 1 - allein], [true, allein]]) {
        if (gewicht === 0) continue;
        // Jeder Elternteil für sich als Elternteil A (Väter ohne Mutterschutz): Die Monate des
        // anderen beeinflussen den eigenen Betrag nicht.
        const v = vergleiche({
          nettoA: netto,
          monateA: monate,
          monateB: 0,
          alleinerziehend,
          mutterschutzMonate: wer === 'muetter' && netto > 0 ? 2 : 0,
          mutterschutzVerbraucht80: o.mutterschutzVerbraucht80,
        });
        liste.push({ einkommen, dauer, alleinerziehend, anteil: (ek[wer] / personen) * (d[wer] / personen) * gewicht, alt: v.alt.summe, neu: v.neu.summe, differenz: v.differenz });
      }
    });
  });
  return liste;
}

const summe = (zellen, f) => zellen.reduce((s, z) => s + z.anteil * f(z), 0);

/**
 * @param {{obersteKlasse?: number, plusMonate?: number, anteilAlleinerziehend?: number, mutterschutzVerbraucht80?: boolean}} [o]
 * @returns Summen in € für den Jahrgang; Anteile und Durchschnitte je Familie, auch nach
 *   Aufteilung und nach Netto der Mutter
 */
export function ueberschlag({
  obersteKlasse = OBERSTE_KLASSE.mittel,
  plusMonate = PLUS_MONATE.mittel,
  anteilAlleinerziehend = ALLEINERZIEHEND.mittel,
  mutterschutzVerbraucht80 = true,
} = {}) {
  const o = { obersteKlasse, plusMonate, anteilAlleinerziehend, mutterschutzVerbraucht80 };
  const M = zellen('muetter', o);
  const V = zellen('vaeter', o);
  const alt = FAMILIEN * summe(M, (z) => z.alt) + PARTNER_MIT_BEZUG * summe(V, (z) => z.alt);
  const neu = FAMILIEN * summe(M, (z) => z.neu) + PARTNER_MIT_BEZUG * summe(V, (z) => z.neu);

  const allein = summe(M, (z) => (z.alleinerziehend ? 1 : 0));
  // Anteil der nicht alleinerziehenden Mütter, deren Partner ebenfalls Elterngeld bezieht
  const mitPartner = PARTNER_MIT_BEZUG / (FAMILIEN * (1 - allein));
  const anteilFamilien = (bedingung) =>
    summe(M, (m) =>
      m.alleinerziehend
        ? Number(bedingung(m.differenz))
        : (1 - mitPartner) * Number(bedingung(m.differenz)) + mitPartner * summe(V, (v) => Number(bedingung(m.differenz + v.differenz))),
    );

  const paarMuetter = M.filter((z) => !z.alleinerziehend);
  const jeMutterImPaar = summe(paarMuetter, (z) => z.differenz) / (1 - allein);
  const ohnePartner = allein + (1 - allein) * (1 - mitPartner);
  const nachAufteilung = [
    {
      klasse: 'nur ein Elternteil',
      familien: FAMILIEN * ohnePartner,
      differenz: summe(M, (z) => (z.alleinerziehend ? 1 : 1 - mitPartner) * z.differenz) / ohnePartner,
    },
    ...PARTNERDAUER.map(({ klasse, dauer }) => {
      const gruppe = V.filter((z) => dauer.includes(z.dauer));
      const anteil = summe(gruppe, () => 1);
      return { klasse, familien: PARTNER_MIT_BEZUG * anteil, differenz: jeMutterImPaar + summe(gruppe, (z) => z.differenz) / anteil };
    }),
  ];
  const jePartner = (PARTNER_MIT_BEZUG / FAMILIEN) * summe(V, (z) => z.differenz);
  const nachEinkommen = KLASSEN.map((k, i) => {
    const gruppe = M.filter((z) => z.einkommen === i);
    return { klasse: k.klasse, familien: k.muetter, differenz: summe(gruppe, (z) => z.differenz) / summe(gruppe, () => 1) + jePartner };
  });

  return {
    familien: FAMILIEN,
    alt,
    neu,
    differenz: neu - alt,
    differenzProzent: ((neu - alt) / alt) * 100,
    jeFamilie: (neu - alt) / FAMILIEN,
    anteilVerlierer: anteilFamilien((d) => d < 0),
    anteilGewinner: anteilFamilien((d) => d > 0),
    nachAufteilung,
    nachEinkommen,
  };
}

/**
 * Spanne über alle Kombinationen der unsicheren Annahmen (oberste Einkommensklasse,
 * Plus-Monate, Anteil Alleinerziehender) für eine Auslegung der Mutterschutz-Frage.
 * @returns {{mitte: object, alle: object[], von: (f: Function) => number, bis: (f: Function) => number}}
 */
export function spanne(mutterschutzVerbraucht80 = true) {
  const alle = [];
  for (const obersteKlasse of Object.values(OBERSTE_KLASSE))
    for (const plusMonate of new Set(Object.values(PLUS_MONATE)))
      for (const anteilAlleinerziehend of Object.values(ALLEINERZIEHEND))
        alle.push(ueberschlag({ obersteKlasse, plusMonate, anteilAlleinerziehend, mutterschutzVerbraucht80 }));
  return {
    mitte: ueberschlag({ mutterschutzVerbraucht80 }),
    alle,
    von: (f) => Math.min(...alle.map(f)),
    bis: (f) => Math.max(...alle.map(f)),
  };
}
