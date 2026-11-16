// Schreibt site/daten/bevoelkerung.csv: die Einzelzellen des Bevölkerungsmodells
// (site/js/calc/bevoelkerung.js, zellen()) zum Nachrechnen. Mittlere Annahmen, Standardauslegung
// (Mutterschutz verbraucht 80-%-Monate). Aufruf: npm run csv (nach jeder Modelländerung).
// Format: Semikolon, Dezimalkomma, UTF-8 mit BOM (Excel DE öffnet es direkt). Erläuterung für
// Leser: site/daten/bevoelkerung-lies-mich.txt. Geld nur je Familie, nie je Elternteil.
import { writeFileSync } from 'node:fs';
import { zellen } from '../site/js/calc/bevoelkerung.js';

export const CSV_PFAD = new URL('../site/daten/bevoelkerung.csv', import.meta.url);

const MODELLE = [
  ['keine Anpassung', 'keine'],
  ['feste Anpassung', 'fest'],
  ['beste Wahl', 'beste'],
];
const TYPEN = { paar: 'Paar, beide beziehen', 'ein-elternteil': 'nur ein Elternteil', alleinerziehend: 'alleinerziehend' };

const zahl = (x, stellen) => x.toFixed(stellen).replace('.', ',');
const euro = (x) => zahl(x, 2);

/** Gesamter Dateiinhalt (mit BOM, Zeilenende \n). */
export function erzeugeCsv() {
  const je = MODELLE.map(([, anpassung]) => zellen({ anpassung }));
  const kopf = [
    'Familientyp', 'Einkommensklasse Mutter', 'Netto Mutter (Vertreterwert, €)', 'Einkommensklasse Partner:in',
    'Netto Partner:in (Vertreterwert, €)', 'Monate Mutter heute', 'Monate Partner:in heute', 'Anzahl Familien',
    ...MODELLE.flatMap(([name]) => [
      `${name}: Monate Mutter geplant`, `${name}: Monate Partner:in geplant`, `${name}: Elterngeld heute je Familie (€)`,
      `${name}: Elterngeld geplant je Familie (€)`, `${name}: Lohnausfall je Familie (€)`,
      `${name}: unterm Strich je Familie (€)`, `${name}: plant um`,
    ]),
  ];
  const zeilen = je[0].map((z, i) => [
    TYPEN[z.typ], z.klasseMutter, euro(z.nettoA), z.klassePartner ?? 'kein beziehender Partner',
    z.nettoB === null ? '' : euro(z.nettoB), z.monateA, z.monateB, zahl(z.familien, 3),
    ...je.flatMap((liste) => {
      const m = liste[i];
      return [m.planA, m.planB, euro(m.alt), euro(m.neu), euro(m.lohn), euro(m.strich), m.umplanen ? 'ja' : 'nein'];
    }),
  ]);
  return '﻿' + [kopf, ...zeilen].map((r) => r.join(';')).join('\n') + '\n';
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const csv = erzeugeCsv();
  writeFileSync(CSV_PFAD, csv);
  console.log(`${CSV_PFAD.pathname}: ${csv.split('\n').length - 2} Zeilen`);
}
