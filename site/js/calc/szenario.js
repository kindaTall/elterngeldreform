/**
 * Vergleich eines Bezugsplans unter ALT und NEU (siehe regeln.js).
 *
 * Drei Vergleiche:
 *  - vergleiche(): Eingabe ist der Plan, den die Familie nach geltendem Recht hätte
 *    ("Wunschplan"). Für NEU wird derselbe Plan so weit übernommen, wie der Entwurf ihn zulässt;
 *    Monate, die nicht mehr zulässig sind, entfallen ersatzlos (so auch § 4 Abs. 3–4 BEEG-E).
 *  - vergleicheVoll(): Die Familie schöpft unter beiden Regelwerken alle Monate aus und plant
 *    dafür um (ALT 12 + 2, NEU 10 + 4).
 *  - vergleicheBeste(): Jedes Regelwerk mit der Aufteilung von 14 Monaten, die der Familie am
 *    wenigsten Einkommen kostet (Elterngeld und Lohn); Annahmen dort.
 *
 * Elternteil A = Mutter/gebärender Elternteil, B = Partner:in.
 * Bonus (bonusA/bonusB, € netto im Jahr, Weihnachtsgeld u. ä.): zählt nur im Entwurf, als Zwölftel
 * zum Monatsnetto (Bemessungsnetto = Netto + Bonus/12); heute bleibt er außen vor. Höchst- und
 * Mindestbetrag und Ersatzrate wirken auf das erhöhte Netto. Vereinfacht: das Elterngeld rechnet mit
 * pauschalen Abzügen vom Brutto, künftig zählt das Kalenderjahr vor der Geburt. Der Verdienstausfall
 * (besterPlan) rechnet mit dem Monatsnetto OHNE Bonus: Annahme, der Bonus wird unabhängig von der
 * Elternzeit gezahlt und fällt in den Monaten zu Hause nicht aus. Deshalb kann der Bonus die
 * günstigste Aufteilung im Entwurf verschieben.
 * Mutterschutz: Monate mit Mutterschaftsleistungen gelten als Basiselterngeld-Monate von A
 * (§ 4 Abs. 4 S. 3 BEEG, unverändert im Entwurf); das Elterngeld wird in ihnen vollständig
 * angerechnet (§ 3 Abs. 1), Auszahlung also 0 €. Vereinfachung: volle Lebensmonate.
 * Tatsächlich endet die Schutzfrist nach 8 Wochen wenige Tage vor Ende des 2. Lebensmonats
 * (bei 2.000 € netto fehlen dadurch auf beiden Seiten rund 140–310 €, die Differenz ändert sich
 * um etwa 50 €); bei Mehrlingen dauert sie 12 Wochen (§ 3 Abs. 2 MuSchG), die Oberfläche setzt
 * dann 3 Monate an. Bei sehr niedrigem Einkommen mit Zuschlägen kann das Elterngeld die
 * Mutterschaftsleistungen übersteigen; das bleibt unberücksichtigt.
 *
 * Tests: test/szenario.test.js
 */
import { ALT, NEU } from './regeln.js';
import { monatsbetrag, ersatzrate, stufeFuerBezugsmonat } from './elterngeld.js';

/**
 * @typedef {object} Eingabe
 * @property {number} nettoA  Elterngeld-Netto von A vor der Geburt, €/Monat
 * @property {number} nettoB  Elterngeld-Netto von B, €/Monat (bei alleinerziehend ignoriert)
 * @property {number} [bonusA=0] Bonus/Weihnachtsgeld netto von A, €/Jahr (zählt nur im Entwurf, siehe oben)
 * @property {number} [bonusB=0] dasselbe für B (bei alleinerziehend ignoriert)
 * @property {number} monateA gewünschte Basis-Monate von A inkl. Mutterschutzmonate
 * @property {number} monateB gewünschte Basis-Monate von B
 * @property {number} [mutterschutzMonate=0] Monate von A mit Mutterschaftsleistungen (Angestellte: 2)
 * @property {boolean} [alleinerziehend=false]
 * @property {boolean} [geschwisterbonus=false]
 * @property {number} [mehrlinge=0] Zahl der weiteren Kinder bei Mehrlingsgeburt
 * @property {boolean} [mutterschutzVerbraucht80=true] Lesart: Mutterschutzmonate zählen zu den
 *           "ersten vier Monaten der Inanspruchnahme" (im Entwurf nicht ausdrücklich geregelt)
 */

/**
 * Kürzt einen Wunschplan auf das, was das Regelwerk zulässt.
 * nettoA/nettoB werden nur für die Partnermonate nach geltendem Recht gebraucht (ohne Angabe
 * gilt die Einkommensminderung als gegeben).
 */
export function zulaessigerPlan({ monateA, monateB, alleinerziehend = false, nettoA = 1, nettoB = 1 }, regeln) {
  const min = regeln.minMonateElternteil;
  let a = Math.max(0, Math.floor(monateA));
  let b = alleinerziehend ? 0 : Math.max(0, Math.floor(monateB));
  if (a < min) a = 0;
  if (b < min) b = 0;
  const gemindert = !regeln.zusatzmonateNurBeiEinkommen || (nettoA > 0 && a >= 2) || (nettoB > 0 && b >= 2);
  const deckel = (max) => (gemindert ? max : Math.min(max, regeln.maxMonateOhneEinkommensminderung));
  if (alleinerziehend) return { monateA: Math.min(a, deckel(regeln.maxMonateAlleinerziehend)), monateB: 0 };
  a = Math.min(a, regeln.maxMonateElternteil);
  b = Math.min(b, regeln.maxMonateElternteil);
  const zuViel = () =>
    regeln.flexibleMonate !== undefined
      ? Math.max(0, a - regeln.reservierteMonate) + Math.max(0, b - regeln.reservierteMonate) > regeln.flexibleMonate
      : a + b > (a > 0 && b > 0 ? deckel(regeln.maxMonatePaar) : regeln.maxMonateOhnePartner);
  while (zuViel()) {
    if (a >= b) a--;
    else b--;
  }
  return { monateA: a, monateB: b };
}

/** Bonus der Familie (€ netto im Jahr), der im Entwurf tatsächlich mitzählt: nur neben einem Monatsnetto, bei Alleinerziehenden nur der von A. */
export function bonusGesamt({ nettoA = 0, nettoB = 0, bonusA = 0, bonusB = 0, alleinerziehend = false }) {
  return (nettoA > 0 ? Math.max(0, bonusA) : 0) + (!alleinerziehend && nettoB > 0 ? Math.max(0, bonusB) : 0);
}

function bezugVon(netto, monate, regeln, { mutterschutz = 0, ersteStufeMonate, verbraucht = true, zuschlaege }) {
  const liste = [];
  for (let n = 1; n <= monate; n++) {
    const imMutterschutz = n <= mutterschutz;
    // Zähler für die erste Stufe: mit oder ohne Mutterschutzmonate
    const zaehler = verbraucht ? n : Math.max(1, n - mutterschutz);
    const stufe = stufeFuerBezugsmonat(zaehler, regeln, ersteStufeMonate);
    liste.push({
      bezugsmonat: n,
      mutterschutz: imMutterschutz,
      basis: stufe.basis, // 67 (ALT) bzw. 80 / 50 (NEU)
      rate: ersatzrate(Math.max(0, netto), stufe, regeln),
      betrag: imMutterschutz ? 0 : monatsbetrag(netto, stufe, regeln, zuschlaege),
    });
  }
  return liste;
}

const summe = (liste) => Math.round(liste.reduce((s, m) => s + m.betrag, 0) * 100) / 100;

/** Elterngeld nach einem Regelwerk für eine Eingabe. */
export function berechne(eingabe, regeln) {
  const {
    nettoA,
    nettoB = 0,
    bonusA = 0,
    bonusB = 0,
    mutterschutzMonate = 0,
    alleinerziehend = false,
    geschwisterbonus = false,
    mehrlinge = 0,
    mutterschutzVerbraucht80 = true,
  } = eingabe;
  const plan = zulaessigerPlan(eingabe, regeln);
  const zuschlaege = { geschwisterbonus, mehrlinge };
  const ersteStufeMonate =
    alleinerziehend && regeln.achtzigMonateAlleinerziehend ? regeln.achtzigMonateAlleinerziehend : undefined;
  // Bemessungsnetto: im Entwurf mit einem Zwölftel des Bonus (vereinfacht)
  const bemessung = (netto, bonus) => (regeln.sonderzahlungen && netto > 0 ? netto + Math.max(0, bonus) / 12 : netto); // ohne Monatsnetto kein Bonus
  const A = bezugVon(bemessung(nettoA, bonusA), plan.monateA, regeln, {
    mutterschutz: Math.min(mutterschutzMonate, plan.monateA),
    ersteStufeMonate,
    verbraucht: mutterschutzVerbraucht80,
    zuschlaege,
  });
  const B = bezugVon(bemessung(nettoB, alleinerziehend ? 0 : bonusB), plan.monateB, regeln, { zuschlaege });
  const summeA = summe(A);
  const summeB = summe(B);
  return {
    regeln: regeln.id,
    plan,
    monate: { A, B },
    summeA,
    summeB,
    summe: Math.round((summeA + summeB) * 100) / 100,
    bezugsmonate: plan.monateA + plan.monateB,
  };
}

function gegenueber(alt, neu) {
  const differenz = Math.round((neu.summe - alt.summe) * 100) / 100;
  return {
    alt,
    neu,
    differenz,
    differenzProzent: alt.summe > 0 ? Math.round((differenz / alt.summe) * 1000) / 10 : 0,
    entfalleneMonate: alt.bezugsmonate - neu.bezugsmonate,
  };
}

/**
 * ALT gegen NEU für denselben Wunschplan. differenz < 0 = Verlust durch die Reform.
 * @param {Eingabe} eingabe
 */
export function vergleiche(eingabe) {
  return gegenueber(berechne(eingabe, ALT), berechne(eingabe, NEU));
}

/**
 * Plan, der alle Monate ausschöpft: A nimmt so viele wie ein Elternteil darf, B den Rest
 * (ALT 12 + 2, NEU 10 + 4; alleinerziehend 14).
 */
export function vollerPlan(regeln, alleinerziehend = false) {
  if (alleinerziehend) return { monateA: regeln.maxMonateAlleinerziehend, monateB: 0 };
  return { monateA: regeln.maxMonateElternteil, monateB: regeln.maxMonatePaar - regeln.maxMonateElternteil };
}

/**
 * ALT gegen NEU, wenn die Familie unter jedem Regelwerk den vollen Plan wählt, also für den
 * Entwurf umplant. monateA/monateB der Eingabe werden ignoriert.
 */
export function vergleicheVoll(eingabe) {
  const mit = (regeln) => berechne({ ...eingabe, ...vollerPlan(regeln, eingabe.alleinerziehend) }, regeln);
  return gegenueber(mit(ALT), mit(NEU));
}

const cent = (x) => Math.round(x * 100) / 100;

/**
 * Lohn, der der Familie in den Bezugsmonaten fehlt (lohnausfall: Netto des Elternteils zu Hause),
 * und Verdienstausfall (ausfall: dasselbe abzüglich Elterngeld), beide für ein Ergebnis von berechne().
 * Mutterschutzmonate zählen 0: Mutterschaftsgeld und Arbeitgeberzuschuss ersetzen dort das Netto.
 */
export function verdienstausfall(ergebnis, { nettoA, nettoB = 0 }) {
  const a = ergebnis.monate.A.filter((m) => !m.mutterschutz).length;
  const lohnausfall = cent(a * nettoA + ergebnis.monate.B.length * nettoB);
  return { lohnausfall, ausfall: cent(lohnausfall - ergebnis.summe) };
}

/**
 * Beste Aufteilung eines Paares unter einem Regelwerk: die zulässige Aufteilung von zusammen 14
 * Monaten mit dem kleinsten Verdienstausfall der Familie (siehe vergleicheBeste()).
 * monateA/monateB der Eingabe werden ignoriert. Rückgabe: Ergebnis von berechne() samt ausfall
 * und lohnausfall.
 */
export function besterPlan(eingabe, regeln) {
  const ms = eingabe.mutterschutzMonate ?? 0;
  const gesamt = regeln.maxMonatePaar;
  for (let T = gesamt; T > 0; T--) {
    let best = null;
    for (let b = 0; b <= T; b++) {
      const a = T - b;
      if (ms > 0 && a < ms) continue; // die Mutterschutzmonate sind immer Monate der Mutter
      const plan = { ...eingabe, alleinerziehend: false, monateA: a, monateB: b };
      const z = zulaessigerPlan(plan, regeln);
      if (z.monateA !== a || z.monateB !== b) continue;
      const r = berechne(plan, regeln);
      const k = { ...r, ...verdienstausfall(r, eingabe) };
      // Gleichstand (auf den Cent): der Plan mit weniger Partnermonaten, also der zuerst gefundene
      if (!best || k.ausfall < best.ausfall - 0.005) best = k;
    }
    if (best) return best;
  }
  throw new Error('kein zulässiger Plan');
}

/**
 * Beste Aufteilung heute gegen beste Aufteilung geplant: Jedes Regelwerk mit seiner Aufteilung von
 * zusammen 14 Monaten (nacheinander, kein gleichzeitiger Bezug), bei der der Familie am wenigsten
 * Einkommen fehlt.
 *
 * Annahmen:
 *  - Verdienstausfall = Summe über die Bezugsmonate von (Netto des Elternteils zu Hause −
 *    Elterngeld dieses Monats). Die Mutterschutzmonate einer erwerbstätigen Mutter kosten 0 und
 *    bringen 0 € Elterngeld; sie zählen als Monate der Mutter (wie berechne()).
 *  - Das Kind wird 14 Monate zu Hause betreut, jeder Monat von genau einem Elternteil mit Elterngeld.
 *    Nur wenn nach geltendem Recht keine 14 Monate zulässig sind (beide ohne Einkommen: 12), gilt
 *    die längste zulässige Dauer; die fehlenden Monate kosten dann nichts, weil kein Netto ausfällt.
 *  - Gleichstand: der Plan mit weniger Partnermonaten.
 *  - Gerechnet wird nur mit Geld. Stillen, Wünsche des Arbeitgebers, Teilzeit, Karrierefolgen,
 *    Steuern auf das Elterngeld (Progressionsvorbehalt) und Sozialbeiträge bleiben außen vor.
 *  - Alleinerziehende können nicht aufteilen: dann wie vergleicheVoll() (beste: false).
 *
 * Rückgabe wie vergleiche() (alt, neu, differenz = Elterngeld, entfalleneMonate), dazu je
 * Regelwerk ausfall und lohnausfall in alt/neu, differenzLohn (Lohn geplant − heute, negativ =
 * weniger Lohn) und untermStrich (= −Differenz Verdienstausfall = differenz + differenzLohn).
 * Bei gleicher Aufteilung in beiden Regelwerken ist untermStrich gleich der Elterngelddifferenz.
 * @param {Eingabe} eingabe
 */
export function vergleicheBeste(eingabe) {
  if (eingabe.alleinerziehend) return { ...vergleicheVoll(eingabe), beste: false };
  const alt = besterPlan(eingabe, ALT);
  const neu = besterPlan(eingabe, NEU);
  return {
    ...gegenueber(alt, neu),
    entfalleneMonate: Math.max(0, alt.bezugsmonate - neu.bezugsmonate),
    differenzLohn: cent(alt.lohnausfall - neu.lohnausfall),
    untermStrich: cent(alt.ausfall - neu.ausfall),
    beste: true,
  };
}
