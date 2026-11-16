/**
 * Regelwerke "ALT" (geltendes BEEG) und "NEU" (Gesetzentwurf der Bundesregierung,
 * Kabinettsbeschluss 12.11.2026, Geburten ab 01.11.2027).
 *
 * Quellen:
 *  ALT  BEEG i.d.F. vom 22.12.2025, https://www.gesetze-im-internet.de/beeg/
 *  NEU  Gesetzentwurf (GE), 57 S.,
 *       https://www.bmbfsfj.bund.de/resource/blob/299524/0bc742ce04a856f106d7ae75365abb93/20261113-gesetzentwurf-elterngeld-data.pdf
 *       Seitenangaben unten = PDF-Seite des GE.
 *
 * Alles hier ist Basiselterngeld für Monate OHNE Erwerbseinkommen im Bezug.
 * ElterngeldPlus ohne Teilzeit ergibt in Summe dasselbe (halber Betrag, doppelte Dauer)
 * und wird deshalb nicht getrennt modelliert. Wie Plus-Monate im Entwurf auf die
 * 80-%-Monate angerechnet werden, regelt der GE nicht.
 *
 * Nicht ausdrücklich im GE geregelt, hier als wählbare Annahme (siehe szenario.js):
 *  - ob Monate mit Mutterschaftsleistungen (§ 4 Abs. 4 S. 3 BEEG-E, S. 9: gelten als
 *    Basiselterngeld-Monate der Mutter) die "ersten vier Monate der Inanspruchnahme"
 *    mit 80 % verbrauchen. Der Deutsche Juristinnenbund sagt ausdrücklich ja (st26-37 vom
 *    02.11.2026: Anrechnung auf die ersten vier Monate); Familienbund der Katholiken und
 *    Deutscher Frauenrat rechnen im Ergebnis genauso (zwei Monate zu 80 %, sechs zu 50 %).
 *    Die Stellungnahmen betreffen den Referentenentwurf vom Oktober 2026; die Regel steht im
 *    Kabinettsentwurf unverändert.
 *  - Alleinerziehende: "bis zu 8 Monate zu 80 %" steht nur in der Begründung (S. 3, 27, 45).
 */

export const ALT = Object.freeze({
  id: 'alt',
  name: 'Geltendes Recht',
  mindestbetrag: 300, // § 2 Abs. 4
  hoechstbetrag: 1800, // § 2 Abs. 1 S. 2
  // § 2 Abs. 1, 2: 67 %; unter 1.000 € +0,1 Pp. je 2 € bis 100 %; über 1.200 € −0,1 Pp. je 2 € bis 65 %
  stufen: [{ monate: Infinity, basis: 67, abschmelzAb: 1200, abschmelzBis: 65 }],
  geringverdienerGrenze: 1000,
  maxMonateElternteil: 12, // § 4 Abs. 4 S. 1
  maxMonatePaar: 14, // 12 + 2 Partnermonate, § 4 Abs. 3
  maxMonateOhnePartner: 12,
  maxMonateAlleinerziehend: 14, // § 4c
  // § 4 Abs. 3 S. 2, § 4c Abs. 1: die Monate 13 und 14 gibt es nur, wenn bei einem Elternteil
  // Erwerbseinkommen in zwei Monaten gemindert ist. Der Entwurf streicht das (GE S. 44).
  zusatzmonateNurBeiEinkommen: true,
  maxMonateOhneEinkommensminderung: 12,
  minMonateElternteil: 2, // § 4 Abs. 4 S. 2
  geschwisterbonus: { prozent: 10, mindestens: 75 }, // § 2a Abs. 1
  mehrlingszuschlag: 300, // § 2a Abs. 4
  sonderzahlungen: false, // Sonderzahlungen wie Weihnachtsgeld zählen in der Bemessung nicht mit
});

export const NEU = Object.freeze({
  id: 'neu',
  name: 'Gesetzentwurf 2026',
  mindestbetrag: 330, // § 2 Abs. 4 S. 1 BEEG-E, S. 6
  hoechstbetrag: 1900, // § 2 Abs. 1 S. 3 BEEG-E, S. 5
  // § 2 Abs. 1 BEEG-E, S. 5: 80 % "für die ersten vier Monate seiner Inanspruchnahme",
  // 50 % "für jeden weiteren Monat"; Geringverdiener-Staffel auf beide Sätze (Abs. 2, S. 5–6);
  // die Abschmelzung 67 → 65 % entfällt.
  stufen: [
    { monate: 4, basis: 80 },
    { monate: Infinity, basis: 50 },
  ],
  geringverdienerGrenze: 1000,
  reservierteMonate: 4, // § 4 Abs. 3 S. 2 BEEG-E, S. 9
  flexibleMonate: 6, // § 4 Abs. 3 S. 1 BEEG-E, S. 9
  maxMonateElternteil: 10, // § 4 Abs. 4 S. 1 BEEG-E, S. 9
  maxMonatePaar: 14,
  maxMonateOhnePartner: 10, // folgt aus Abs. 4 S. 1; dokumentiert nur, gerechnet wird über reservierte und flexible Monate
  maxMonateAlleinerziehend: 14, // § 4b BEEG-E, S. 10–11
  achtzigMonateAlleinerziehend: 8, // nur Begründung, S. 3, 27, 45
  minMonateElternteil: 2, // § 4 Abs. 4 S. 2 BEEG-E, S. 9
  geschwisterbonus: { prozent: 5, mindestens: 75 }, // § 2a Abs. 1 BEEG-E, S. 6; Begr. S. 41
  mehrlingszuschlag: 300, // § 2a Abs. 4 unverändert
  sonderzahlungen: true, // künftig zählen Sonderzahlungen in der Bemessung mit; der Rechner nimmt ein Zwölftel je Monat
  stichtag: '2027-11-01', // Art. 11, S. 22; § 27 Abs. 1c, S. 12; dokumentiert nur, der Rechner fragt kein Geburtsdatum ab
});

/**
 * Entlastung des Bundeshaushalts laut GE (Vorblatt D, S. 3–4), Mio. € pro Jahr, negativ = Einsparung.
 * Dokumentiert nur die Quelle der 1,36 Mrd. € im Seitentext; gerechnet wird damit nicht.
 */
export const HAUSHALT_LAUT_ENTWURF = Object.freeze({ 2027: -60, 2028: -535, 2029: -1330, 2030: -1360 });
