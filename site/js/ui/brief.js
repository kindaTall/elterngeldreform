/**
 * Briefvorlage mit dem persönlichen Rechenergebnis: kurz, eine Rechnung, eine Bitte.
 * Aufbau: Absender, Anschrift, Ort/Datum, Betreff, Anrede, Einstieg (ein Satz), Rechnung
 * (Einkommen, geplante Monate, Elterngeld nach geltendem Recht und nach dem Entwurf für dieselbe
 * Aufteilung, entfallende Monate), Einordnung (Haushaltsentlastung), Bitte mit Forderungen, Schluss.
 * Beträge stehen immer je Familie, nie getrennt nach Mutter und Partner.
 * Situation `solidarisch` (nicht selbst betroffen): die Rechnung steht als Beispiel in der dritten Person.
 * Die Seite versendet nichts: Der Text wird kopiert, gedruckt/als PDF gespeichert, als Datei
 * geladen oder per mailto: an das eigene E-Mail-Programm übergeben.
 */
import { euro, ganzeDifferenz } from './diagramme.js';

/** Adressaten. E-Mail nur, wo die Adresse öffentlich und funktionsbezogen ist. */
export const ADRESSATEN = [
  {
    id: 'mdb',
    label: 'Meine/n Bundestagsabgeordnete/n',
    anschrift: (name) => `${name || 'Mitglied des Deutschen Bundestages'}\nDeutscher Bundestag\nPlatz der Republik 1\n11011 Berlin`,
    anrede: (name) => (name ? `Guten Tag ${name},` : 'Sehr geehrte Damen und Herren,'),
  },
  {
    id: 'ausschuss',
    label: 'Familienausschuss des Bundestags',
    anschrift: () => 'Deutscher Bundestag\nAusschuss für Bildung, Familie, Senioren, Frauen und Jugend\nPlatz der Republik 1\n11011 Berlin',
    anrede: () => 'Sehr geehrte Frau Vorsitzende, sehr geehrte Mitglieder des Ausschusses,',
    email: 'bildungundfamilie@bundestag.de',
  },
  {
    id: 'ministerin',
    label: 'Bundesfamilienministerin Karin Prien',
    anschrift: () => 'Frau Bundesministerin Karin Prien\nBundesministerium für Bildung, Familie, Senioren, Frauen und Jugend\n11018 Berlin',
    anrede: () => 'Sehr geehrte Frau Ministerin Prien,',
  },
];

const FORDERUNGEN = {
  rate: 'die Ersatzrate nach dem vierten Bezugsmonat nicht auf 50 Prozent abzusenken,',
  monate: 'es dabei zu belassen, dass ein Elternteil bis zu zwölf Monate Elterngeld beziehen kann,',
  mutterschutz: 'klarzustellen, dass Monate mit Mutterschaftsgeld nicht auf die vier Monate mit 80 Prozent angerechnet werden,',
  inflation: 'Mindest- und Höchstbetrag regelmäßig an die Inflation anzupassen,',
};

const monate = (n) => (n === 1 ? '1 Monat' : `${n} Monate`);
const prozent = (x) => `${String(Math.abs(x)).replace('.', ',')} Prozent`;
const ZAHLWORT = ['Null', 'Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf'];
const GRUND_50 = 'Ich schreibe Ihnen trotzdem: Die meisten Familien bekämen weniger, weil das Elterngeld ab dem fünften Monat von 65 auf 50 Prozent des Nettoeinkommens sinkt.';
const GRUND_MONATE = 'ganz weg, weil ein Elternteil nur noch zehn Monate bekommt und es 14 Monate nur gibt, wenn beide mindestens vier nehmen.';

/** Einstieg bis einschließlich "nachgerechnet"; der Satz endet in brief() mit dem Gesetzentwurf. */
function lage(l, allein) {
  if (l === 'erwartet') return allein ? 'ich erwarte ein Kind beziehungsweise plane eines und habe deshalb nachgerechnet' : 'wir erwarten ein Kind beziehungsweise planen eines und haben deshalb nachgerechnet';
  if (l === 'eltern') return allein ? 'ich bin Mutter beziehungsweise Vater und habe nachgerechnet' : 'wir sind Eltern und haben nachgerechnet';
  return 'ich bin nicht selbst betroffen, habe aber nachgerechnet';
}

/** Geplante Monate eines Paares in einem Satz. */
function aufteilung(a, b) {
  if (a > 0 && b > 0) return `Geplant sind ${monate(a)} Elterngeld für die Mutter und ${monate(b)} für den Partner.`;
  if (a > 0) return `Geplant ${a === 1 ? 'ist' : 'sind'} ${monate(a)} Elterngeld für die Mutter; der Partner nimmt keine.`;
  if (b > 0) return `Geplant ${b === 1 ? 'ist' : 'sind'} ${monate(b)} Elterngeld für den Partner; die Mutter nimmt keine.`;
  return 'Elterngeld ist nicht geplant.';
}

/**
 * @param {object} p
 * @param {object} p.eingabe   Eingabe des Rechners (nettoA, nettoB, alleinerziehend)
 * @param {object} p.vergleich Ergebnis von vergleiche(): dieselbe Aufteilung nach geltendem Recht und
 *                             nach dem Entwurf ({ alt, neu, entfalleneMonate }); Differenz und Prozent
 *                             bildet der Brief aus den gerundeten Summen (ganzeDifferenz)
 * @param {string} p.an        id aus ADRESSATEN
 * @param {string} [p.mdbName] Name der/des Abgeordneten für Anschrift und Anrede
 * @param {string} [p.name]    Absender
 * @param {string} [p.ort]     Wohnort des Absenders
 * @param {string} [p.situation] 'erwartet' | 'eltern' | 'solidarisch'
 * @param {string[]} [p.forderungen] Schlüssel aus FORDERUNGEN
 * @param {Date} [p.datum]
 * @returns {{betreff: string, text: string, email?: string}}
 */
export function brief({ eingabe, vergleich, an, mdbName = '', name = '', ort = '', situation = 'erwartet', forderungen = [], datum = new Date() }) {
  const adressat = ADRESSATEN.find((a) => a.id === an) || ADRESSATEN[0];
  const { alt, neu, entfalleneMonate } = vergleich;
  const allein = !!eingabe.alleinerziehend;
  const fremd = situation === 'solidarisch';
  const tag = datum.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const fuerWen = fremd ? 'eine typische Familie' : allein ? 'mich' : 'uns';
  const betreff = `Elterngeldreform: Was der Entwurf für ${fremd ? 'Familien' : allein ? 'mich' : 'unsere Familie'} bedeutet`;
  const einstieg = `${lage(situation, allein)}, was der Gesetzentwurf der Bundesregierung vom 12. November 2026 zum Elterngeld für ${fuerWen} bedeutet.`;

  let plan;
  if (allein) {
    plan = fremd
      ? `Das Nettoeinkommen vor der Geburt beträgt in meinem Beispiel ${euro(eingabe.nettoA)} im Monat. Die Mutter ist alleinerziehend und plant ${monate(alt.plan.monateA)} Elterngeld.`
      : `Mein Nettoeinkommen vor der Geburt beträgt ${euro(eingabe.nettoA)} im Monat. Ich bin alleinerziehend und plane ${monate(alt.plan.monateA)} Elterngeld.`;
  } else {
    plan = `${fremd ? 'Die Nettoeinkommen vor der Geburt betragen in meinem Beispiel' : 'Unsere Nettoeinkommen vor der Geburt betragen'} ${euro(eingabe.nettoA)} und ${euro(eingabe.nettoB)} im Monat. ${aufteilung(alt.plan.monateA, alt.plan.monateB)}`;
  }

  // Differenz aus den gerundeten Summen: passt zu den beiden Beträgen im Satz, und es steht nie "0 € weniger" im Brief
  const { differenz: d, prozent: differenzProzent } = ganzeDifferenz(vergleich);
  const bekaeme = fremd ? 'bekäme die Familie' : allein ? 'bekäme ich' : 'bekämen wir';
  let ergebnis;
  if (d < 0) {
    ergebnis = `Nach geltendem Recht ${bekaeme} dafür ${euro(alt.summe)}, nach dem Entwurf ${euro(neu.summe)}. Das sind ${euro(-d)}${differenzProzent ? ` oder ${prozent(differenzProzent)}` : ''} weniger.`;
  } else if (d > 0) {
    ergebnis = `Nach geltendem Recht ${bekaeme} dafür ${euro(alt.summe)}, nach dem Entwurf ${euro(neu.summe)}, also ${euro(d)} mehr. ${GRUND_50}`;
  } else {
    ergebnis = `Nach geltendem Recht und nach dem Entwurf ${bekaeme} dafür ${euro(alt.summe)}. ${GRUND_50}`;
  }
  if (entfalleneMonate > 0) {
    const n = entfalleneMonate;
    const wort = ZAHLWORT[n] || String(n);
    ergebnis +=
      d < 0
        ? ` ${wort} ${n === 1 ? 'Monat fällt' : 'Monate fallen'} ${GRUND_MONATE}`
        : ` Außerdem ${n === 1 ? 'fällt ein Monat' : `fallen ${wort.toLowerCase()} Monate`} ${GRUND_MONATE}`;
  }

  const liste = forderungen.filter((f) => FORDERUNGEN[f]).map((f) => `– ${FORDERUNGEN[f]}`);
  if (liste.length) liste[liste.length - 1] = liste[liste.length - 1].replace(/,$/, '.');
  const bitte = liste.length ? `Ich bitte Sie deshalb, sich im Gesetzgebungsverfahren dafür einzusetzen,\n${liste.join('\n')}` : 'Ich bitte Sie, den Entwurf im Gesetzgebungsverfahren in diesen Punkten zu ändern.';

  const text = [
    [name, ort].filter(Boolean).join('\n'),
    adressat.anschrift(mdbName.trim()),
    [ort, tag].filter(Boolean).join(', '),
    betreff,
    adressat.anrede(mdbName.trim()),
    einstieg,
    `${plan} ${ergebnis}`,
    'Der Entwurf soll den Bundeshaushalt im Jahr 2030 um 1,36 Milliarden Euro entlasten. Dieses Geld fehlt Familien im ersten Lebensjahr ihres Kindes.',
    bitte,
    'Wie stehen Sie dazu? Über eine kurze Antwort würde ich mich freuen.',
    `Mit freundlichen Grüßen\n${name}`.trim(),
  ]
    .filter(Boolean)
    .join('\n\n');

  return { betreff, text, email: adressat.email };
}

/** mailto:-Adresse; der Text kommt nur in den Link, wenn er kurz genug für alle Mailprogramme ist. */
export function mailto({ betreff, text, email = '' }) {
  const kopf = `mailto:${email}?subject=${encodeURIComponent(betreff)}`;
  const voll = `${kopf}&body=${encodeURIComponent(text)}`;
  return voll.length <= 1900 ? { href: voll, mitText: true } : { href: kopf, mitText: false };
}
