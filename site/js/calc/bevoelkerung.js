/**
 * Überschlag für alle Familien eines Geburtsjahrgangs mit Elterngeld: gleiche Einkommen und
 * gleiche Bezugsdauer wie beobachtet, einmal nach ALT, einmal nach NEU gerechnet (keine
 * Verhaltensänderung). Ergebnisse gibt es nur je Familie (beide Elternteile zusammengerechnet),
 * nie getrennt nach Mutter und Vater. Tests: test/bevoelkerung.test.js
 *
 * Daten:
 *  - Statistisches Bundesamt, Statistischer Bericht "Elterngeld – Beendete Leistungsbezüge
 *    für im Jahr 2023 geborene Kinder" (Art.-Nr. 5229201237005), Tab. 22922-01 (Bezugsdauer) und
 *    22922-04 (Elterngeld-Netto), abgerufen 15.11.2026:
 *    https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Soziales/Elterngeld/_inhalt.html
 *  - Aufteilung der Monate in Paaren, in denen beide Elterngeld beziehen: Küpper, Rübenach,
 *    Stahl, Wolff, Acht, Hänisch, Jacobs, Peter, "Paarbezüge in der Elterngeldstatistik",
 *    WISTA 1/2022, S. 108–120, Tabelle 4 (Geburtsjahrgang 2018, rund 296.000 Paare, Anteile in %,
 *    ohne Partnerschaftsbonus, ElterngeldPlus-Monate als halbe Monate) (`AUFTEILUNG_2018`):
 *    https://www.statistischebibliothek.de/mir/servlets/MCRFileNodeServlet/DEHeft_derivate_00095674/WISTA_1_2022.pdf
 *
 * Aufbau: Eine Familie = eine Mutter mit Elterngeld (FAMILIEN). Davon sind PARTNER_MIT_BEZUG
 * Familien Paare, in denen beide beziehen; der Rest sind Mütter ohne beziehenden Partner,
 * darunter die Alleinerziehenden. Jede Familie wird als Ganzes nach ALT und NEU gerechnet
 * (gemeinsamer Plan, also auch mit den Paarregeln: 14 Monate nur mit Einkommensminderung,
 * höchstens 10 Monate je Elternteil im Entwurf).
 *
 * Hauptannahme "beste Wahl je Familie" (`anpassung: 'beste'`, Standard): Ein Paar, in dem
 * beide beziehen und dessen heutige Aufteilung im Entwurf unzulässig ist (Mutter über 10
 * Monate), wählt, was unterm Strich mehr übrig lässt:
 *  - nicht umplanen: Monate der Mutter über 10 verfallen, sie bleibt trotzdem unbezahlt zu
 *    Hause (Lohn wie heute);
 *  - minimal anpassen: der Partner nimmt die überzähligen Monate, die Gesamtzahl bleibt
 *    (12 + 2 → 10 + 4, 11 + 3 → 10 + 4). Wie im Rechner (vergleicheBeste) wird das Kind 14
 *    Monate nacheinander von je einem Elternteil betreut: In den abgegebenen Monaten arbeitet
 *    die Mutter wieder, der Partner fehlt bei der Arbeit. Lohnänderung je Familie = abgegebene
 *    Monate × (Netto Mutter − Netto Partner).
 * Umplanen lohnt sich vor allem, wenn die Mutter mehr oder nicht viel weniger verdient als der
 * Partner. Optionen: `'fest'` = jedes betroffene Paar passt an (heute nehmen nur 27 % der
 * Väter mit Elterngeld mehr als 2 Monate, Tab. 22922-01; als Annahme günstig für das
 * Elterngeld des Entwurfs, unterm Strich ungünstig), `'keine'` = niemand plant um.
 * ALT rechnet immer mit der beobachteten Aufteilung. Ohne Umplanen gilt im Entwurf höchstens 10
 * Monate je Elternteil: Monate der Mutter über 10 verfallen, ebenso Partnermonate über 10.
 * Mütter ohne beziehenden Partner und Alleinerziehende planen nicht um: ohne zweiten beziehenden
 * Elternteil gibt es niemanden, zu dem Monate wandern könnten (ein Partner ohne Elterngeld nimmt
 * nach heutigem Verhalten auch künftig keins). Mütter ohne beziehenden Partner verlieren ihre
 * Monate über 10; Alleinerziehende beziehen in beiden Fassungen die beobachteten Monate, der
 * Entwurf ändert nur die Zahl der 80-%-Monate auf 8 (nicht pauschal 14 Monate).
 *
 * Maß "unterm Strich" (wie der Rechner im Modus "beste Aufteilung"): was der Familie bleibt,
 * Elterngeld plus Lohn, NEU gegen ALT. Je umgeplantem Monat kommt das Monatsnetto der Mutter
 * zurück und fehlt das des Partners (Elterngeld-Netto vor der Geburt; vereinfacht, ohne Steuer-
 * und Sozialeffekte, ohne Progressionsvorbehalt). Ohne Umplanen ändert sich am Lohn nichts:
 * Monate der Mutter, die im Entwurf entfallen, verbringt sie trotzdem zu Hause, es fehlt nur das
 * Elterngeld. Mutterschutz
 * kostet keinen Lohn (Mutterschaftsleistungen, unverändert). Anteile der Verlierer und
 * Gewinner, Beträge je Familie und Gruppen rechnen unterm Strich; die Summe für den Jahrgang
 * (`differenz`) bleibt reines Elterngeld, vergleichbar mit der Entlastung laut Entwurf.
 *
 * Annahmen (die Statistik weist sie nicht aus):
 *  - Paare: Jeder Vater mit Elterngeld 2023 bildet mit einer Mutter mit Elterngeld ein Paar
 *    (2018 bezogen rund 5 % der Väter ohne beziehende Partnerin; sie zählen hier mit).
 *  - Monate im Paar: Die Aufteilung von 2018 (Tabelle 4) gilt auch für 2023. Plus-Monate zählen
 *    als halbe Monate; das ergibt ohne Teilzeit dieselbe Summe (siehe regeln.js), wie Plus auf
 *    die 80-%-Monate angerechnet wird, regelt der Entwurf nicht. Die Tabelle summiert wegen
 *    Rundung auf 100,02 %; die Anteile werden auf 100 % normiert. Sie enthält nur Paare mit
 *    zusammen höchstens 14 Monaten, also keine mit mehr Monaten als erlaubt.
 *  - Mütter ohne beziehenden Partner: Bezugsdauer der Mütter 2023 (Tab. 22922-01) abzüglich der
 *    Monate der Mütter im Paar laut Tabelle 4 (`dauerOhnePartner`), verglichen in gewichteten
 *    Monaten: Klasse "bis 2 Monate" = 2, "3–9 Monate" = 6, alle Klassen ab 10 Monaten = 10 bis
 *    12 Monate. Die Klassen 2023 zählen Kalendermonate (Plus voll), Tabelle 4 gewichtete; eine
 *    Mutter mit 12 Plus-Monaten (6 gewichtet) steht 2023 in "10–12", hier in "3–9". Innerhalb
 *    der langen Klassen haben Mütter ohne Partner dieselbe Mischung aus Basis und Plus wie alle.
 *  - Einkommen: Netto der Mutter und des Vaters sind im Paar voneinander und von der Aufteilung
 *    der Monate unabhängig verteilt (WISTA 1/2022, Abschnitt 4.2: der Einkommensanteil der
 *    Mutter liegt bei fast allen Aufteilungen nahe 40 %). Vorgabe aus derselben Quelle: In Paaren
 *    haben knapp 12 % der Mütter kein Einkommen (`ANTEIL_OHNE_EINKOMMEN_IM_PAAR`, unter allen
 *    Müttern 2023 sind es 25 %); die übrigen Paar-Mütter verteilen sich im Verhältnis aller
 *    Mütter mit Einkommen auf die Klassen. Mütter ohne beziehenden Partner sind der Rest (alle
 *    Mütter minus Paar-Mütter je Klasse; rund 37 % ohne Einkommen), der Gesamtrand der Mütter
 *    bleibt exakt (`muetterNachEinkommen`); ihr Einkommen ist unabhängig von ihrer Bezugsdauer.
 *    Robustheit: Wie Paare nach Einkommen zusammengesetzt sind, ist unbekannt; durchgerechnet mit
 *    einer Rangkorrelation von −0,3 bis +0,6 (entwuerfe/waermefaktor.mjs) bleiben es 71 bis 74 %
 *    mit weniger unterm Strich.
 *  - Jede Einkommensklasse wird durch einen Wert vertreten (`netto`); die Werte geben die von
 *    Destatis veröffentlichten Durchschnitte wieder. Die oberste Klasse ist bei 2.770 €
 *    abgeschnitten; wie viel darüber verdient wird, ist unbekannt (`OBERSTE_KLASSE`).
 *  - Mütter ohne Partner in den Plus-Klassen (13 und mehr Kalendermonate) beziehen 11 bis 12
 *    Basis-Monate (`PLUS_MONATE`), in "10–12" 12, in "3–9" 6, in "bis 2" 2.
 *  - Alleinerziehende: Ihr Anteil ist nicht veröffentlicht; 9,7 % aller Mütter mit Elterngeld
 *    leben nicht mit dem anderen Elternteil zusammen (Tab. 22922-05, Obergrenze). Angesetzt als
 *    Anteil aller Mütter (FAMILIEN): 0 / 5 / 9,7 % (`ALLEINERZIEHEND`). Sie werden aus den Müttern
 *    ohne beziehenden Partner mit 10 und mehr Monaten genommen, anteilig je Dauerklasse und
 *    unabhängig vom Einkommen.
 *  - Mütter mit Erwerbseinkommen haben 2 Monate Mutterschaftsgeld, Mütter ohne keins; die
 *    Monate der Mutter in Tabelle 4 enthalten sie.
 *  - Ohne Geschwisterbonus, Mehrlingszuschlag, Teilzeit, Partnerschaftsbonus, Sonderzahlungen.
 * Frühere Fassung (bis 16.11.2026) mischte die Bezugsdauern von Müttern und Vätern unabhängig;
 * dabei hatten rund 12 % der Familien mehr als 14 Monate.
 */
import { berechne } from './szenario.js';
import { ALT, NEU } from './regeln.js';

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

/** Basis-Monate für Mütter ohne Partner in den ElterngeldPlus-Klassen (13 und mehr Bezugsmonate). */
const PLUS_MONATE = { niedrig: 11, mittel: 11, hoch: 12 };
/** Anteil alleinerziehender Mütter an allen Müttern mit Elterngeld (FAMILIEN). */
const ALLEINERZIEHEND = { niedrig: 0, mittel: 0.05, hoch: 0.097 };

// Bezugsdauer (Tab. 22922-01); `plus`: Klasse entsteht bei Müttern durch ElterngeldPlus.
// `basisMonate`: Vertreterwert für Mütter ohne beziehenden Partner (bei `plus` gilt PLUS_MONATE);
// die Väter rechnen mit Tabelle 4, ihre Zahlen hier dienen der Grundlage und dem Abgleich.
export const DAUER = [
  { klasse: 'bis 2 Monate', basisMonate: 2, muetter: 4867, vaeter: 219273 },
  { klasse: '3–9 Monate', basisMonate: 6, muetter: 32172, vaeter: 61978 },
  { klasse: '10–12 Monate', basisMonate: 12, muetter: 387617, vaeter: 14901 },
  { klasse: '13–14 Monate', plus: true, muetter: 39183, vaeter: 1777 },
  { klasse: '15–23 Monate', plus: true, muetter: 157366, vaeter: 3056 },
  { klasse: '24 und mehr', plus: true, muetter: 21760, vaeter: 1150 },
];

/**
 * WISTA 1/2022, Tabelle 4: Anteil der Paare (beide beziehen, Geburtsjahrgang 2018) in % nach
 * Monaten der Mutter (Schlüssel) und des Vaters (Index 0 = 2 Monate, 1 = 3 Monate, …).
 * Nur Kombinationen mit zusammen höchstens 14 Monaten sind belegt.
 */
export const AUFTEILUNG_2018 = {
  2: [0.03, 0, 0.01, 0.01, 0.02, 0.01, 0.01, 0.03, 0.09, 0.09, 1.14],
  3: [0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.04, 0.05, 0.34],
  4: [0.02, 0.01, 0.02, 0.01, 0.02, 0.02, 0.06, 0.05, 0.35],
  5: [0.04, 0.02, 0.01, 0.03, 0.04, 0.07, 0.05, 0.3],
  6: [0.08, 0.03, 0.03, 0.04, 0.24, 0.1, 0.52],
  7: [0.09, 0.04, 0.05, 0.12, 0.19, 1.06],
  8: [0.16, 0.07, 0.16, 0.17, 1.29],
  9: [0.28, 0.21, 0.24, 1.16],
  10: [1.56, 0.34, 2.29],
  11: [1.48, 3.77],
  12: [81.17],
};

/** Paare als Liste {mutter, vater, anteil}, Anteile auf 1 normiert. */
export const PAARE = (() => {
  const liste = Object.entries(AUFTEILUNG_2018).flatMap(([m, zeile]) =>
    zeile.map((p, i) => ({ mutter: Number(m), vater: i + 2, anteil: p })).filter((z) => z.anteil > 0),
  );
  const gesamt = liste.reduce((s, z) => s + z.anteil, 0);
  return liste.map((z) => ({ ...z, anteil: z.anteil / gesamt }));
})();

const KLASSEN = [OHNE_EINKOMMEN, ...EINKOMMEN];
const anzahl = (wer) => KLASSEN.reduce((s, k) => s + k[wer], 0);
export const FAMILIEN = anzahl('muetter');
export const PARTNER_MIT_BEZUG = anzahl('vaeter');

/**
 * Anteil der Mütter ohne eigenes Einkommen in Paaren, in denen beide beziehen: knapp 12 %
 * (WISTA 1/2022, Abschnitt 4.2, Jahrgang 2018). Unter allen Müttern 2023 sind es 25 %.
 */
export const ANTEIL_OHNE_EINKOMMEN_IM_PAAR = 0.12;

/**
 * Mütter je Einkommensklasse (Index wie KLASSEN) im Paar und ohne beziehenden Partner (Anzahlen).
 * Im Paar: 12 % ohne Einkommen, die übrigen im Verhältnis aller Mütter mit Einkommen auf die
 * Klassen; ohne Partner: alle Mütter minus Paar-Mütter, der Gesamtrand der Mütter bleibt exakt.
 */
export function muetterNachEinkommen() {
  const alle = KLASSEN.map((k) => k.muetter);
  const mitEinkommen = alle.slice(1).reduce((s, x) => s + x, 0);
  const imPaar = alle.map((m, i) =>
    i === 0
      ? ANTEIL_OHNE_EINKOMMEN_IM_PAAR * PARTNER_MIT_BEZUG
      : ((1 - ANTEIL_OHNE_EINKOMMEN_IM_PAAR) * PARTNER_MIT_BEZUG * m) / mitEinkommen,
  );
  return { imPaar, ohnePartner: alle.map((m, i) => m - imPaar[i]) };
}

/** Gruppen der Mütter-Bezugsdauer in gewichteten Monaten: Klassen aus DAUER, Monate im Paar. */
const DAUERGRUPPEN = [
  { klassen: [0], imPaar: (m) => m <= 2 },
  { klassen: [1], imPaar: (m) => m >= 3 && m <= 9 },
  { klassen: [2, 3, 4, 5], imPaar: (m) => m >= 10 },
];

/**
 * Mütter ohne beziehenden Partner je Dauerklasse: alle Mütter der Gruppe abzüglich der Mütter
 * im Paar (Tabelle 4 × PARTNER_MIT_BEZUG), in den langen Klassen anteilig verteilt.
 * @returns {number[]} Anzahl je Eintrag von DAUER
 */
export function dauerOhnePartner() {
  const ergebnis = DAUER.map(() => 0);
  for (const g of DAUERGRUPPEN) {
    const alle = g.klassen.reduce((s, i) => s + DAUER[i].muetter, 0);
    const imPaar = PARTNER_MIT_BEZUG * PAARE.filter((p) => g.imPaar(p.mutter)).reduce((s, p) => s + p.anteil, 0);
    for (const i of g.klassen) ergebnis[i] = (DAUER[i].muetter / alle) * (alle - imPaar);
  }
  return ergebnis;
}

/** Bezugsdauer des Partners, zusammengefasst für die Auswertung nach Aufteilung. */
const PARTNERDAUER = [
  { klasse: 'Partner:in bis 2 Mon.', passt: (v) => v <= 2 },
  { klasse: 'Partner:in 3–9 Mon.', passt: (v) => v >= 3 && v <= 9 },
  { klasse: 'Partner:in ab 10 Mon.', passt: (v) => v >= 10 },
];

/**
 * Aufteilung eines Paares nach dem Entwurf, wenn es umplant: Monate der Mutter über 10 wandern zum
 * Partner, solange er damit höchstens 10 hat; die Gesamtzahl bleibt (12 + 2 → 10 + 4).
 */
export function angepasstePaarmonate(mutter, vater) {
  const max = NEU.maxMonateElternteil;
  const zuViel = Math.max(0, mutter - max);
  if (zuViel === 0 || vater + zuViel > max) return { mutter, vater };
  return { mutter: mutter - zuViel, vater: vater + zuViel };
}

// Ergebnisse wiederverwenden; die Spanne rechnet dieselben Fälle mehrfach.
const gerechnet = new Map();
/** ALT mit dem beobachteten Plan `e`, NEU mit `e` und den Monaten aus `neuMonate` (falls angegeben). */
function familie(e, neuMonate = {}) {
  const schluessel = JSON.stringify([e, neuMonate]);
  if (!gerechnet.has(schluessel)) {
    const alt = berechne(e, ALT).summe;
    const neu = berechne({ ...e, ...neuMonate }, NEU).summe;
    gerechnet.set(schluessel, { alt, neu, differenz: Math.round((neu - alt) * 100) / 100 });
  }
  return gerechnet.get(schluessel);
}

/**
 * Alle Familientypen mit `anteil` = Anteil an FAMILIEN. `einkommen` = Klasse der Mutter,
 * `vater` = Monate des Partners (0 ohne beziehenden Partner), `zusatzmonate` = Monate, die der
 * Partner nach dem Entwurf zusätzlich nimmt, wenn das Paar umplant, `lohn` = Lohnausfall der Familie
 * in diesen Monaten (Netto Partner − Netto Mutter, negativ = mehr Lohn), `differenz` = Elterngeld NEU − ALT, `strich` = differenz − lohn (unterm Strich).
 */
function familien(o) {
  const netto = (k) => k.netto ?? o.obersteKlasse;
  const liste = [];
  const ohne = dauerOhnePartner();
  const muetter = muetterNachEinkommen();
  // Alleinerziehende: Anteil an allen Müttern, genommen aus den Müttern ohne Partner mit 10+ Monaten
  const lang = DAUERGRUPPEN[2].klassen;
  const allein = (o.anteilAlleinerziehend * FAMILIEN) / lang.reduce((s, i) => s + ohne[i], 0);
  KLASSEN.forEach((km, einkommen) => {
    const nettoA = netto(km);
    const mutterschutzMonate = nettoA > 0 ? 2 : 0;
    const basis = { mutterschutzMonate, mutterschutzVerbraucht80: o.mutterschutzVerbraucht80 };
    // Mütter ohne beziehenden Partner
    DAUER.forEach((d, i) => {
      const monateA = d.plus ? o.plusMonate : d.basisMonate;
      const a = lang.includes(i) ? allein : 0;
      for (const [alleinerziehend, gewicht] of [[false, 1 - a], [true, a]]) {
        if (gewicht === 0) continue;
        const r = familie({ ...basis, nettoA, nettoB: 0, monateA, monateB: 0, alleinerziehend });
        liste.push({ einkommen, nettoA, nettoB: 0, monateA, monateB: 0, planA: monateA, planB: 0, vater: 0, alleinerziehend, zusatzmonate: 0, lohn: 0, anteil: (muetter.ohnePartner[einkommen] / FAMILIEN) * (ohne[i] / (FAMILIEN - PARTNER_MIT_BEZUG)) * gewicht, ...r, strich: r.differenz });
      }
    });
    // Paare, in denen beide beziehen
    KLASSEN.forEach((kv) => {
      const pv = kv.vaeter / PARTNER_MIT_BEZUG;
      for (const p of PAARE) {
        const nettoB = netto(kv);
        const e = { ...basis, nettoA, nettoB, monateA: p.mutter, monateB: p.vater, alleinerziehend: false };
        const anteil = (muetter.imPaar[einkommen] / PARTNER_MIT_BEZUG) * pv * p.anteil * (PARTNER_MIT_BEZUG / FAMILIEN);
        const bleiben = { zusatzmonate: 0, lohn: 0, ...familie(e) };
        let wahl = bleiben;
        let plan = { mutter: p.mutter, vater: p.vater };
        const neu = angepasstePaarmonate(p.mutter, p.vater);
        if (o.anpassung !== 'keine' && neu.vater > p.vater) {
          const zusatzmonate = neu.vater - p.vater;
          // Mutter arbeitet in den abgegebenen Monaten wieder, der Partner fehlt bei der Arbeit
          const umplanen = { zusatzmonate, lohn: zusatzmonate * (nettoB - nettoA), ...familie(e, { monateA: neu.mutter, monateB: neu.vater }) };
          // 'beste': nur umplanen, wenn unterm Strich mehr bleibt
          if (o.anpassung === 'fest' || umplanen.differenz - umplanen.lohn > bleiben.differenz) {
            wahl = umplanen;
            plan = neu;
          }
        }
        liste.push({ einkommen, kvater: kv.klasse, nettoA, nettoB, monateA: p.mutter, monateB: p.vater, planA: plan.mutter, planB: plan.vater, vater: p.vater, alleinerziehend: false, anteil, ...wahl, strich: wahl.differenz - wahl.lohn });
      }
    });
  });
  return liste;
}

const summe = (gruppe, f) => gruppe.reduce((s, z) => s + z.anteil * f(z), 0);
/** Größe einer Gruppe und Durchschnitte je Familie: `differenz` unterm Strich, `elterngeld`, `lohnausfall`. */
const gruppe = (klasse, liste) => {
  const anteil = summe(liste, () => 1);
  const je = (f) => (anteil > 0 ? summe(liste, f) / anteil : 0);
  return { klasse, familien: FAMILIEN * anteil, differenz: je((z) => z.strich), elterngeld: je((z) => z.differenz), lohnausfall: je((z) => z.lohn) };
};

/**
 * @param {{obersteKlasse?: number, plusMonate?: number, anteilAlleinerziehend?: number, mutterschutzVerbraucht80?: boolean, anpassung?: 'beste' | 'fest' | 'keine'}} [o]
 *   anpassung: ob Paare im Entwurf Monate der Mutter über 10 zum Partner verschieben (siehe Kopf)
 * @returns Felder:
 *   - Elterngeld (Jahrgang, € bzw. %): `alt`, `neu`, `differenz`, `differenzProzent`; vergleichbar
 *     mit der Entlastung, die der Entwurf nennt. Kein Lohn darin.
 *   - unterm Strich (Elterngeld − zusätzlicher Lohnausfall): `untermStrich` (Jahrgang, €),
 *     `jeFamilie`, `anteilVerlierer`, `anteilGewinner`, und `differenz` in `nachAufteilung`,
 *     `nachEinkommen`, `angepasst`.
 *   - Elterngeld je Familie: `elterngeldJeFamilie`, in den Gruppen `elterngeld`;
 *     Lohnausfall (negativ = mehr Lohn): `lohnausfall` (Jahrgang) und in den Gruppen `lohnausfall`.
 *   Bei `anpassung: 'keine'` sind unterm Strich und Elterngeld gleich.
 *   `angepasst`: die Paare, die umplanen.
 */
export function ueberschlag({
  obersteKlasse = OBERSTE_KLASSE.mittel,
  plusMonate = PLUS_MONATE.mittel,
  anteilAlleinerziehend = ALLEINERZIEHEND.mittel,
  mutterschutzVerbraucht80 = true,
  anpassung = 'beste',
} = {}) {
  if (!['beste', 'fest', 'keine'].includes(anpassung)) throw new Error(`anpassung: ${anpassung}`);
  const F = familien({ obersteKlasse, plusMonate, anteilAlleinerziehend, mutterschutzVerbraucht80, anpassung });
  const umplaner = F.filter((z) => z.zusatzmonate > 0);
  const alt = FAMILIEN * summe(F, (z) => z.alt);
  const neu = FAMILIEN * summe(F, (z) => z.neu);
  const lohnausfall = FAMILIEN * summe(F, (z) => z.lohn);
  return {
    familien: FAMILIEN,
    alt,
    neu,
    differenz: neu - alt,
    differenzProzent: ((neu - alt) / alt) * 100,
    lohnausfall,
    untermStrich: neu - alt - lohnausfall,
    jeFamilie: (neu - alt - lohnausfall) / FAMILIEN,
    elterngeldJeFamilie: (neu - alt) / FAMILIEN,
    anteilVerlierer: summe(F, (z) => Number(z.strich < 0)),
    anteilGewinner: summe(F, (z) => Number(z.strich > 0)),
    nachAufteilung: [
      gruppe('nur ein Elternteil', F.filter((z) => z.vater === 0)),
      ...PARTNERDAUER.map(({ klasse, passt }) => gruppe(klasse, F.filter((z) => z.vater > 0 && passt(z.vater)))),
    ],
    nachEinkommen: KLASSEN.map((k, i) => gruppe(k.klasse, F.filter((z) => z.einkommen === i))),
    angepasst: gruppe('Paare, die umplanen', umplaner),
  };
}

/**
 * Einzelzellen des Modells, eine je Familientyp (Einkommensklassen, Monate, Alleinerziehend), mit
 * denselben Annahmen und Rechenwegen wie ueberschlag(); die Reihenfolge ist für jede `anpassung`
 * gleich. Gewicht: `familien` (Anzahl, Summe = FAMILIEN). Je Zelle, alles je Familie:
 * `typ` ('paar' | 'ein-elternteil' | 'alleinerziehend'), `klasseMutter`, `klassePartner`
 * (null ohne beziehenden Partner), `nettoA`/`nettoB` (Vertreterwerte), `monateA`/`monateB` heute,
 * `planA`/`planB` im Plan nach dem Entwurf, `alt`/`neu` (Elterngeld), `lohn` (Lohnausfall),
 * `strich` (neu − alt − lohn), `umplanen`. Für die CSV (scripts/bevoelkerung-csv.mjs).
 */
export function zellen({
  obersteKlasse = OBERSTE_KLASSE.mittel,
  plusMonate = PLUS_MONATE.mittel,
  anteilAlleinerziehend = ALLEINERZIEHEND.mittel,
  mutterschutzVerbraucht80 = true,
  anpassung = 'beste',
} = {}) {
  if (!['beste', 'fest', 'keine'].includes(anpassung)) throw new Error(`anpassung: ${anpassung}`);
  return familien({ obersteKlasse, plusMonate, anteilAlleinerziehend, mutterschutzVerbraucht80, anpassung }).map((z) => ({
    typ: z.vater > 0 ? 'paar' : z.alleinerziehend ? 'alleinerziehend' : 'ein-elternteil',
    klasseMutter: KLASSEN[z.einkommen].klasse,
    klassePartner: z.vater > 0 ? z.kvater : null,
    nettoA: z.nettoA,
    nettoB: z.vater > 0 ? z.nettoB : null,
    monateA: z.monateA,
    monateB: z.monateB,
    planA: z.planA,
    planB: z.planB,
    familien: FAMILIEN * z.anteil,
    alt: z.alt,
    neu: z.neu,
    lohn: z.lohn,
    strich: z.strich,
    umplanen: z.zusatzmonate > 0,
  }));
}

/**
 * Spanne über alle Kombinationen der unsicheren Annahmen (oberste Einkommensklasse,
 * Plus-Monate, Anteil Alleinerziehender) für eine Auslegung der Mutterschutz-Frage, mit oder
 * `anpassung` wie bei ueberschlag().
 * @returns {{mitte: object, alle: object[], von: (f: Function) => number, bis: (f: Function) => number}}
 */
export function spanne(mutterschutzVerbraucht80 = true, anpassung = 'beste') {
  const alle = [];
  for (const obersteKlasse of Object.values(OBERSTE_KLASSE))
    for (const plusMonate of new Set(Object.values(PLUS_MONATE)))
      for (const anteilAlleinerziehend of Object.values(ALLEINERZIEHEND))
        alle.push(ueberschlag({ obersteKlasse, plusMonate, anteilAlleinerziehend, mutterschutzVerbraucht80, anpassung }));
  return {
    mitte: ueberschlag({ mutterschutzVerbraucht80, anpassung }),
    alle,
    von: (f) => Math.min(...alle.map(f)),
    bis: (f) => Math.max(...alle.map(f)),
  };
}
// Plausibilität des Überschlags: Summe nach geltendem Recht muss in der Größenordnung der
// tatsächlichen Bundesausgaben für Elterngeld liegen (Ist 2023: 7,44 Mrd. €, 2024: 7,17 Mrd. €).
