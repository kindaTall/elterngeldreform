// Die veröffentlichte CSV muss zum Modell passen und sich daraus nachzählen lassen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { erzeugeCsv, CSV_PFAD } from '../scripts/bevoelkerung-csv.mjs';
import { ueberschlag } from '../site/js/calc/bevoelkerung.js';

test('site/daten/bevoelkerung.csv ist aktuell', () => {
  const eingecheckt = readFileSync(CSV_PFAD, 'utf8');
  assert.ok(eingecheckt === erzeugeCsv(), 'bevoelkerung.csv ist veraltet: bitte `npm run csv` ausführen und die Datei einchecken');
});

test('aus der CSV nachgezählt: Anteil „unterm Strich weniger“ und Ø je Familie wie im Modell', () => {
  const [kopf, ...zeilen] = readFileSync(CSV_PFAD, 'utf8').replace(/^﻿/, '').trim().split('\n').map((z) => z.split(';'));
  const zahl = (s) => Number(s.replace(',', '.'));
  const anzahl = kopf.indexOf('Anzahl Familien');
  const strich = kopf.indexOf('beste Wahl: unterm Strich je Familie (€)');
  assert.ok(anzahl >= 0 && strich >= 0);
  const alle = zeilen.reduce((s, z) => s + zahl(z[anzahl]), 0);
  const weniger = zeilen.filter((z) => zahl(z[strich]) < 0).reduce((s, z) => s + zahl(z[anzahl]), 0);
  const summe = zeilen.reduce((s, z) => s + zahl(z[anzahl]) * zahl(z[strich]), 0);
  const r = ueberschlag();
  assert.ok(Math.abs(weniger / alle - r.anteilVerlierer) < 0.001, `${weniger / alle} gegen ${r.anteilVerlierer}`);
  assert.ok(Math.abs(summe / alle - r.jeFamilie) < 0.5, `${summe / alle} gegen ${r.jeFamilie}`);
});
