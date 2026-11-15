/**
 * Stimmen zum Entwurf: wörtliche Kurzzitate, am Original geprüft am 15.11.2026.
 * Die Stellungnahmen von Ende Oktober und Anfang November beziehen sich auf den Referentenentwurf
 * vom 27.10.2026; die kritisierten Punkte stehen im Kabinettsentwurf vom 12.11.2026 unverändert.
 * Die Zitate werden nicht umformuliert; die typografischen Anführungszeichen setzt die Seite.
 * `leiste`: läuft in der Zitatleiste auf der Startseite mit (sonst nur in der Liste im Hintergrund).
 * `kurz`: Kurzname für die Leiste. Darstellung: stimmenansicht.js. Tests: test/stimmen.test.js
 */
const REFERENT = 'zum Referentenentwurf vom 27.10.2026; im Kabinettsentwurf unverändert';
const DJB = 'https://www.djb.de/presse/stellungnahmen/detail/st26-37';
const FAMILIENBUND = 'https://familienbund.org/artikel/eintrag-29261';
const ZUKUNFTSFORUM = 'https://www.zukunftsforum-familie.de/zff-statement-licht-und-schatten-bei-der-elterngeldreform-gleichstellung-darf-kein-sparprogramm-sein/';

export const STIMMEN = [
  { text: 'Eine solche Absenkung ist sozial- und gleichstellungspolitisch weder hinreichend begründet noch akzeptabel.', wer: 'Deutscher Juristinnenbund, Stellungnahme 26-37', kurz: 'Deutscher Juristinnenbund', datum: '2026-11-02', url: DJB, bezug: REFERENT, leiste: true },
  { text: 'Gleichstellungspolitik darf niemals als Vorwand für reale Leistungskürzungen dienen.', wer: 'Deutscher Familienverband, Stellungnahme', kurz: 'Deutscher Familienverband', datum: '2026-10-30', url: 'https://www.deutscher-familienverband.de/wp-content/uploads/2026/10/261030_Stellungnahme_Elterngeld_pdf.pdf', bezug: REFERENT, leiste: true },
  { text: 'Die Umwandlung von frei verteilbaren Monaten in Vätermonate ist außerdem eine Kürzung.', wer: 'Familienbund der Katholiken, Stellungnahme', kurz: 'Familienbund der Katholiken', datum: '2026-11-03', url: FAMILIENBUND, bezug: REFERENT, leiste: true },
  { text: 'Die Kürzungsagenda wird so wieder auf dem Rücken von Frauen ausgetragen.', wer: 'Zukunftsforum Familie, Sophie Schwab, Geschäftsführerin', kurz: 'Zukunftsforum Familie', datum: '2026-10-30', url: ZUKUNFTSFORUM, bezug: REFERENT, leiste: true },
  { text: 'Die geplante Abschaffung des Partnerschaftsbonus lehnt der SoVD ab.', wer: 'Sozialverband Deutschland (SoVD), Stellungnahme', kurz: 'SoVD', datum: '2026-10-30', url: 'https://www.sovd.de/fileadmin/bundesverband/pdf/stellungnahmen/Sozialstaat/sovd_stellungnahme_referentenentwurf_elterngeldreform.pdf', bezug: REFERENT, leiste: true },
  { text: 'Vermeintliche Gleichstellung bleibt so ein Feigenblatt für Kürzungen.', wer: 'Petition „Keine Kürzungen beim Elterngeld!“ (WeAct/Campact), Update', kurz: 'WeAct-Petition', datum: '2026-11-05', url: 'https://weact.campact.de/petitions/keine-kurzungen-beim-elterngeld', bezug: REFERENT, leiste: true },
  { text: 'Was nach einer großzügigen Anhebung klingt, ist kaum mehr als ein Trostpflaster.', wer: 'Institut der deutschen Wirtschaft (IW Köln), Wido Geis-Thöne', kurz: 'IW Köln', datum: '2026-07-08', url: 'https://www.iwkoeln.de/presse/iw-nachrichten/wido-geis-thoene-elterngeld-hat-seit-einfuehrung-fast-ein-drittel-seines-werts-verloren.html', bezug: 'zu den Beträgen 330 € und 1.900 €, die im Kabinettsentwurf unverändert sind (Text vom Sommer 2026)', leiste: true },
  { text: 'Die Anpassung bleibt aber weit hinter einem Inflationsausgleich zurück.', wer: 'Familienbund der Katholiken, Stellungnahme', kurz: 'Familienbund der Katholiken', datum: '2026-11-03', url: FAMILIENBUND, bezug: REFERENT, leiste: false },
  { text: 'Aber Partnerschaftlichkeit darf keine Frage des Geldbeutels sein!', wer: 'Zukunftsforum Familie, Sophie Schwab', kurz: 'Zukunftsforum Familie', datum: '2026-10-30', url: ZUKUNFTSFORUM, bezug: REFERENT, leiste: false },
  { text: 'Nach der regulären achtwöchigen Schutzfrist verbleiben typischerweise nur rund zwei dieser Monate.', wer: 'Deutscher Juristinnenbund, Stellungnahme 26-37', kurz: 'Deutscher Juristinnenbund', datum: '2026-11-02', url: DJB, bezug: 'gemeint sind die vier Monate mit 80 Prozent', leiste: false },
];
