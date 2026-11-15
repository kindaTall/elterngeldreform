/**
 * Elterngeld-Netto aus dem monatlichen Bruttolohn (§§ 2c, 2e, 2f BEEG), pauschales Verfahren:
 *   Netto = Brutto − 1/12 Arbeitnehmer-Pauschbetrag (102,50 €) − Steuern (§ 2e) − Sozialabgaben (§ 2f)
 * § 2e: Lohnsteuer, Solidaritätszuschlag nach dem Programmablaufplan (PAP) des Jahres VOR der
 *       Geburt, Kirchensteuer pauschal 8 %; Pflegeversicherung ohne Kinderlosenzuschlag.
 * § 2f: pauschal 9 % Kranken-/Pflege-, 10 % Renten-, 2 % Arbeitslosenversicherung, ohne
 *       Beitragsbemessungsgrenze; Minijob ohne Abzüge, Übergangsbereich bis 2.000 € mit Formel.
 * Der Entwurf lässt §§ 2e, 2f unverändert (Gesetzentwurf S. 8, 43–44); die Umrechnung gilt
 * deshalb für geltendes Recht und Entwurf gleich. Sonderzahlungen (sonstige Bezüge) bleiben hier
 * außen vor; der Entwurf würde sie künftig mitzählen.
 *
 * Lohnsteuer: eigene Umsetzung der BMF-Programmablaufpläne 2025 (geänderte Fassung vom 22.01.2025)
 * und 2026 für laufenden Arbeitslohn ohne Freibeträge und Versorgungsbezüge. Geprüft gegen die
 * BMF-Prüftabellen und gegen Ausgaben des amtlichen Elterngeldrechners (familienportal.de,
 * abgerufen 15.11.2026): test/netto.test.js
 * Zusatzbeitrag Krankenversicherung: Durchschnittssatz des Jahres (wie im amtlichen Rechner).
 */
const PAP = {
  2026: { GFB:12348, Z1:17799, Z2:69878, Z3:277825, a:914.51, b:173.10, c:1034.87, d:11135.63, e:19470.38,
          W1:14071, W2:34939, W3:222260, SOLZFREI:20350, KFB:9756, EFA:4260, ANP:1230, SAP:36,
          BBGRV:101400, BBGKV:69750, RV:0.093, AV:0.013, PV:0.018, KVZ_AVG:2.9, MINDEST_VSP:false },
  2025: { GFB:12096, Z1:17443, Z2:68480, Z3:277825, a:932.30, b:176.64, c:1015.13, d:10911.92, e:19246.67,
          W1:13785, W2:34240, W3:222260, SOLZFREI:19950, KFB:9600, EFA:4260, ANP:1230, SAP:36,
          BBGRV:96600, BBGKV:66150, RV:0.093, AV:0, PV:0.018, KVZ_AVG:2.5, MINDEST_VSP:true },
};
const EPS = 1e-9;
const fl = x => Math.floor(x + EPS), ce = x => Math.ceil(x - EPS);
const fl2 = x => Math.floor(x * 100 + 1e-6) / 100;
const r2 = x => Math.round(x * 100 + 1e-7) / 100;

function tarif(x, p) {               // § 32a Abs. 1 EStG, x = zvE (ganze Euro)
  x = fl(x);
  if (x <= p.GFB) return 0;
  if (x <= p.Z1) { const y = (x - p.GFB) / 1e4; return fl((p.a * y + 1400) * y); }
  if (x <= p.Z2) { const z = (x - p.Z1) / 1e4; return fl((p.b * z + 2397) * z + p.c); }
  if (x <= p.Z3) return fl(0.42 * x - p.d);
  return fl(0.45 * x - p.e);
}
function up56(zx, p) {               // § 39b Abs. 2 Satz 7 EStG
  const st1 = tarif(fl(zx * 1.25), p), st2 = tarif(fl(zx * 0.75), p);
  return Math.max(fl(zx * 0.14), (st1 - st2) * 2);
}
function mst56(x, p) {
  if (x > p.W2) {
    let st = up56(p.W2, p);
    if (x > p.W3) { st = fl(st + (p.W3 - p.W2) * 0.42); st = fl(st + (x - p.W3) * 0.45); }
    else st = fl(st + (x - p.W2) * 0.42);
    return st;
  }
  let st = up56(x, p);
  if (x > p.W1) st = Math.min(st, fl(up56(p.W1, p) + (x - p.W1) * 0.42));
  return st;
}
function vorsorgepauschale(zre4vp, stkl, p, o) {
  const kv = o.kvz / 2 / 100 + 0.07, pv = p.PV + (o.pvz ? 0.006 : 0);
  if (!p.MINDEST_VSP) {              // PAP 2026: UPEVP / MVSPKVPV / MVSPHB
    const vspr = o.rv ? Math.min(zre4vp, p.BBGRV) * p.RV : 0;
    const vkvpv = fl2(Math.min(zre4vp, p.BBGKV) * (kv + pv));
    let vsp = ce(vkvpv + vspr);
    if (o.av && stkl !== 6) {
      const valv = fl2(p.AV * Math.min(zre4vp, p.BBGRV));
      const vhb = Math.min(fl2(valv + vkvpv), 1900);
      vsp = Math.max(vsp, ce(vspr + vhb));
    }
    return vsp;
  }                                  // PAP 2025: UPEVP / MVSP mit Mindestvorsorgepauschale
  const zr = o.rv ? Math.min(zre4vp, p.BBGRV) : zre4vp;
  const vsp1 = o.rv ? zr * p.RV : 0;
  const vsp2 = Math.min(0.12 * zr, stkl === 3 ? 3000 : 1900);
  const vsp3 = Math.min(zr, p.BBGKV) * (kv + pv);
  return Math.max(ce(vsp3 + vsp1), ce(vsp1 + vsp2));
}
// Jahresrechnung; o = {year, kvz, zkf, rv, av, pvz, faktor}
export function lohnsteuerJahr(jahresbrutto, stkl, o) {
  const p = PAP[o.year], zre4 = jahresbrutto, f = o.faktor || 1;
  const anp = stkl < 6 ? (zre4 < p.ANP ? ce(zre4) : p.ANP) : 0;
  const ztabfb = (stkl === 2 ? p.EFA : 0) + anp + (stkl < 6 ? p.SAP : 0);
  const kztab = stkl === 3 ? 2 : 1;
  const vsp = vorsorgepauschale(zre4, stkl, p, o);
  const st = zve => { const x = zve < 1 ? 0 : fl(zve / kztab); return stkl < 5 ? tarif(x, p) * kztab : mst56(x, p); };
  const lstj = fl(st(zre4 - ztabfb - vsp) * f);
  let jbmg = lstj;
  if (o.zkf > 0 && stkl <= 4) jbmg = fl(st(zre4 - ztabfb - vsp - o.zkf * (stkl === 4 ? p.KFB / 2 : p.KFB)) * f);
  const frei = p.SOLZFREI * kztab;
  const solzj = jbmg > frei ? Math.min(fl2(jbmg * 5.5 / 100), (jbmg - frei) * 11.9 / 100) : 0;
  return { lstj, jbmg, solzj };
}
function lohnsteuerMonat(brutto, stkl, o) {
  const j = lohnsteuerJahr(Math.round(brutto * 100) * 12 / 100, stkl, o);
  const anteil = jw => Math.floor(jw * 100 / 12 + 1e-6) / 100;
  return { lst: anteil(j.lstj), soli: anteil(j.solzj), bk: anteil(j.jbmg) };
}

/**
 * @param {number} brutto durchschnittlicher laufender Monatsbruttolohn, €
 * @param {object} [o]
 * @param {number} [o.steuerklasse=4] 1–5 (6 wird wie 4 behandelt, § 2e Abs. 3 BEEG)
 * @param {boolean} [o.kirchensteuer=false]
 * @param {number} [o.geburtsjahr=2027] bestimmt den PAP (Jahr vor der Geburt)
 * @param {number} [o.geringfuegigkeitsgrenze] Standard: 556 € (2025) bzw. 603 € (2026)
 * @returns {number} Elterngeld-Netto €/Monat
 */
export function elterngeldNetto(brutto, { steuerklasse = 4, kirchensteuer = false, geburtsjahr = 2027, geringfuegigkeitsgrenze } = {}) {
  if (!(brutto > 0)) return 0;
  const year = Math.min(Math.max(geburtsjahr - 1, 2025), 2026), p = PAP[year];
  const anp12 = r2(p.ANP / 12), G = geringfuegigkeitsgrenze ?? (year === 2025 ? 556 : 603), OG = 2000, F = 0.6667;
  if (brutto <= G) return r2(Math.max(brutto - anp12, 0)); // Minijob: keine Abzüge
  const stkl = steuerklasse === 6 ? 4 : steuerklasse;
  const t = lohnsteuerMonat(brutto, stkl, { year, kvz: p.KVZ_AVG, zkf: 0, rv: true, av: true, pvz: false });
  const kist = kirchensteuer ? r2(t.bk * 0.08) : 0;
  const bsv = brutto <= OG ? r2(F * G + (OG / (OG - G) - (G / (OG - G)) * F) * (brutto - G)) : brutto;
  const sv = r2(bsv * (0.09 + 0.1 + 0.02));
  return Math.max(0, r2(brutto - anp12 - t.lst - t.soli - kist - sv));
}
