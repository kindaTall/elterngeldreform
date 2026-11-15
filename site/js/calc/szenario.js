/**
 * Vergleich eines Bezugsplans unter ALT und NEU (siehe regeln.js).
 *
 * Zwei Vergleiche:
 *  - vergleiche(): Eingabe ist der Plan, den die Familie nach geltendem Recht hätte
 *    ("Wunschplan"). Für NEU wird derselbe Plan so weit übernommen, wie der Entwurf ihn zulässt;
 *    Monate, die nicht mehr zulässig sind, entfallen ersatzlos (so auch § 4 Abs. 3–4 BEEG-E).
 *  - vergleicheVoll(): Die Familie schöpft unter beiden Regelwerken alle Monate aus und plant
 *    dafür um (ALT 12 + 2, NEU 10 + 4).
 * Beide nehmen wahlweise eine andere Vergleichsbasis als ALT (`{ alt }`), etwa das geltende
 * Recht in Kaufkraft von 2007; die Monatsregeln bleiben dabei die von ALT.
 *
 * Elternteil A = Mutter/gebärender Elternteil, B = Partner:in.
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
  const A = bezugVon(nettoA, plan.monateA, regeln, {
    mutterschutz: Math.min(mutterschutzMonate, plan.monateA),
    ersteStufeMonate,
    verbraucht: mutterschutzVerbraucht80,
    zuschlaege,
  });
  const B = bezugVon(nettoB, plan.monateB, regeln, { zuschlaege });
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
 * @param {{alt?: object}} [o] andere Vergleichsbasis als ALT, z. B. ALT_KAUFKRAFT_2007 (regeln.js)
 */
export function vergleiche(eingabe, { alt = ALT } = {}) {
  return gegenueber(berechne(eingabe, alt), berechne(eingabe, NEU));
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
export function vergleicheVoll(eingabe, { alt = ALT } = {}) {
  const mit = (regeln) => berechne({ ...eingabe, ...vollerPlan(regeln, eingabe.alleinerziehend) }, regeln);
  return gegenueber(mit(alt), mit(NEU));
}
