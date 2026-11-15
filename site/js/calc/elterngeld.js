/**
 * Monatsbetrag Basiselterngeld aus dem Elterngeld-Netto vor der Geburt (§ 2 BEEG / § 2 BEEG-E).
 * Reine Funktionen, keine DOM-Abhängigkeit; Tests: test/elterngeld.test.js
 */


/**
 * Ersatzrate in Prozent für ein Netto und eine Stufe des Regelwerks.
 * Unter der Geringverdienergrenze steigt die Rate um 0,1 Pp. je volle 2 € Abstand (max. 100 %).
 * Nur ALT: über `abschmelzAb` sinkt sie um 0,1 Pp. je volle 2 € bis `abschmelzBis`.
 */
export function ersatzrate(netto, stufe, regeln) {
  let rate = stufe.basis;
  if (netto < regeln.geringverdienerGrenze) {
    rate += 0.1 * Math.floor((regeln.geringverdienerGrenze - netto) / 2);
  } else if (stufe.abschmelzAb !== undefined && netto > stufe.abschmelzAb) {
    rate -= 0.1 * Math.floor((netto - stufe.abschmelzAb) / 2);
    rate = Math.max(rate, stufe.abschmelzBis);
  }
  return Math.min(100, Math.round(rate * 10) / 10);
}

/**
 * Stufe, die im n-ten Bezugsmonat (1-basiert) eines Elternteils gilt.
 * @param {number} [ersteStufeMonate] abweichende Länge der ersten Stufe (Alleinerziehende im Entwurf: 8)
 */
export function stufeFuerBezugsmonat(n, regeln, ersteStufeMonate = regeln.stufen[0].monate) {
  if (regeln.stufen.length === 1 || n <= ersteStufeMonate) return regeln.stufen[0];
  return regeln.stufen[regeln.stufen.length - 1];
}

/**
 * Basiselterngeld für einen Monat ohne Erwerbseinkommen.
 * @param {number} netto  Elterngeld-Netto vor der Geburt, €/Monat
 * @param {object} stufe  aus regeln.stufen
 * @param {object} regeln ALT oder NEU
 * @param {{geschwisterbonus?: boolean, mehrlinge?: number}} [zuschlaege] mehrlinge = Zahl der weiteren Kinder
 */
export function monatsbetrag(netto, stufe, regeln, zuschlaege = {}) {
  // Rechnung in ganzen Cent und Zehntelprozent, damit halbe Cent exakt kaufmännisch runden
  const n = Math.max(0, netto);
  const nettoCent = Math.round(n * 100);
  const rateZehntel = Math.round(ersatzrate(n, stufe, regeln) * 10);
  let cent = Math.round((nettoCent * rateZehntel) / 1000);
  cent = Math.min(regeln.hoechstbetrag * 100, Math.max(regeln.mindestbetrag * 100, cent));
  if (zuschlaege.geschwisterbonus) {
    const g = regeln.geschwisterbonus;
    cent += Math.max(g.mindestens * 100, Math.round((cent * g.prozent) / 100));
  }
  cent += (zuschlaege.mehrlinge || 0) * regeln.mehrlingszuschlag * 100;
  return cent / 100;
}
