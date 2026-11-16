// Plausibilität des Überschlags: Summe nach geltendem Recht muss in der Größenordnung der
// tatsächlichen Bundesausgaben für Elterngeld liegen (Ist 2023: 7,44 Mrd. €, 2024: 7,17 Mrd. €).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ueberschlag,
  spanne,
  dauerOhnePartner,
  FAMILIEN,
  PARTNER_MIT_BEZUG,
  EINKOMMEN,
  OHNE_EINKOMMEN,
  DAUER,
  OBERSTE_KLASSE,
  AUFTEILUNG_2018,
  PAARE,
  angepasstePaarmonate,
  muetterNachEinkommen,
  ANTEIL_OHNE_EINKOMMEN_IM_PAAR,
} from '../site/js/calc/bevoelkerung.js';

test('Personenzahlen stimmen mit den Destatis-Summen überein', () => {
  for (const [wer, gesamt] of [['muetter', 642965], ['vaeter', 302135]]) {
    assert.equal(EINKOMMEN.reduce((s, k) => s + k[wer], 0) + OHNE_EINKOMMEN[wer], gesamt);
    assert.equal(DAUER.reduce((s, k) => s + k[wer], 0), gesamt);
  }
});

test('Tabelle 4 (WISTA 1/2022) ist vollständig und richtig abgeschrieben', () => {
  // nur Kombinationen mit zusammen höchstens 14 Monaten, jede davon belegt
  for (const [m, zeile] of Object.entries(AUFTEILUNG_2018)) assert.equal(zeile.length, 13 - Number(m));
  const zelle = (m, v) => AUFTEILUNG_2018[m][v - 2];
  assert.deepEqual([zelle(12, 2), zelle(11, 3), zelle(10, 4), zelle(10, 2), zelle(2, 12)], [81.17, 3.77, 2.29, 1.56, 1.14]);
  const roh = Object.values(AUFTEILUNG_2018).flat().reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(roh - 100.02) < 0.005, `Summe ${roh}`);
  // Abschnitt 3.2 / Grafik 2: durchschnittlicher Bezugsanteil der Mütter 2018 (gewichtet) 81,5 %
  const anteilMutter = PAARE.reduce((s, p) => s + p.anteil * (p.mutter / (p.mutter + p.vater)), 0);
  assert.equal(Math.round(anteilMutter * 1000) / 10, 81.5);
});

test('Paare haben zusammen höchstens 14 Monate, Anteile summieren auf 1', () => {
  assert.ok(Math.abs(PAARE.reduce((s, p) => s + p.anteil, 0) - 1) < 1e-12);
  for (const p of PAARE) assert.ok(p.mutter + p.vater <= 14 && p.mutter >= 2 && p.vater >= 2);
});

test('Mütter ohne beziehenden Partner: niemand doppelt, niemand negativ', () => {
  const ohne = dauerOhnePartner();
  for (const n of ohne) assert.ok(n >= 0);
  assert.ok(Math.abs(ohne.reduce((s, n) => s + n, 0) - (FAMILIEN - PARTNER_MIT_BEZUG)) < 1e-6);
  // auch die höchste Annahme für Alleinerziehende (9,7 % der Mütter ab 10 Monaten) passt hinein
  const lang = [2, 3, 4, 5];
  assert.ok(0.097 * lang.reduce((s, i) => s + DAUER[i].muetter, 0) < lang.reduce((s, i) => s + ohne[i], 0));
  // Familien mit beziehendem Partner = Väter mit Elterngeld
  const r = ueberschlag();
  const paare = r.nachAufteilung.slice(1).reduce((s, g) => s + g.familien, 0);
  assert.ok(Math.abs(paare - PARTNER_MIT_BEZUG) < 1e-6);
});

test('Vorgabe: 12 % der Mütter im Paar ohne Einkommen, Gesamtrand der Mütter bleibt', () => {
  assert.equal(ANTEIL_OHNE_EINKOMMEN_IM_PAAR, 0.12);
  const { imPaar, ohnePartner } = muetterNachEinkommen();
  const summe = (a) => a.reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(imPaar[0] / PARTNER_MIT_BEZUG - 0.12) < 1e-12);
  assert.ok(Math.abs(summe(imPaar) - PARTNER_MIT_BEZUG) < 1e-6);
  assert.ok(Math.abs(summe(ohnePartner) - (FAMILIEN - PARTNER_MIT_BEZUG)) < 1e-6);
  [OHNE_EINKOMMEN, ...EINKOMMEN].forEach((k, i) => {
    assert.ok(ohnePartner[i] >= 0);
    assert.ok(Math.abs(imPaar[i] + ohnePartner[i] - k.muetter) < 1e-6); // Gesamtrand exakt
  });
  // übrige Paar-Mütter im Verhältnis aller Mütter mit Einkommen
  const quote = (i) => imPaar[i] / EINKOMMEN[i - 1].muetter;
  for (let i = 2; i <= EINKOMMEN.length; i++) assert.ok(Math.abs(quote(i) - quote(1)) < 1e-12);
  // dadurch rund 37 % der Mütter ohne beziehenden Partner ohne Einkommen (alle: 25 %)
  const ohneAnteil = ohnePartner[0] / (FAMILIEN - PARTNER_MIT_BEZUG);
  assert.ok(ohneAnteil > 0.36 && ohneAnteil < 0.38, `${ohneAnteil}`);
  // im Modell: Familien mit Paar und Mutter ohne Einkommen
  const r = ueberschlag();
  const ohne = r.nachEinkommen[0].familien;
  assert.ok(Math.abs(ohne - OHNE_EINKOMMEN.muetter) < 1e-6);
});

test('Hauptzahlen: rund 81 % weniger, im Schnitt rund 1.850 € (mit Spanne)', () => {
  const s = spanne(true);
  const m = s.mitte;
  assert.equal(Math.round(m.anteilVerlierer * 100), 81);
  assert.equal(Math.round(-m.jeFamilie / 50) * 50, 1850);
  assert.deepEqual([s.von((r) => r.anteilVerlierer), s.bis((r) => r.anteilVerlierer)].map((x) => Math.round(x * 100)), [76, 93]);
  assert.ok(m.alt > 6.9e9 && m.alt < 7.1e9);
});

test('Summe nach geltendem Recht liegt nahe an den Bundesausgaben', () => {
  const r = ueberschlag();
  assert.ok(r.alt > 6.8e9 && r.alt < 8.0e9, `alt = ${r.alt}`);
});

test('Entwurf ergibt weniger als geltendes Recht', () => {
  for (const obersteKlasse of Object.values(OBERSTE_KLASSE)) {
    for (const mutterschutzVerbraucht80 of [true, false]) {
      for (const anpassung of ['beste', 'fest', 'keine']) {
        const r = ueberschlag({ obersteKlasse, mutterschutzVerbraucht80, anpassung });
        // unterm Strich in jeder Variante
        assert.ok(r.jeFamilie < 0);
        assert.ok(r.anteilVerlierer > 0.5 && r.anteilVerlierer + r.anteilGewinner <= 1 + 1e-9);
        // Elterngeld: bei fester Anpassung nach der zweiten Auslegung nicht mehr sicher negativ
        if (anpassung !== 'fest' || mutterschutzVerbraucht80) assert.ok(r.differenz < 0);
      }
    }
  }
});

test('Auswertungen je Familie ergeben zusammen die Gesamtsumme', () => {
  for (const anpassung of ['beste', 'fest', 'keine']) {
    const r = ueberschlag({ anpassung });
    for (const gruppen of [r.nachAufteilung, r.nachEinkommen]) {
      const gesamt = (f) => gruppen.reduce((s, g) => s + g.familien * f(g), 0);
      assert.ok(Math.abs(gesamt((g) => g.differenz) - r.untermStrich) < 1);
      assert.ok(Math.abs(gesamt((g) => g.elterngeld) - r.differenz) < 1);
      assert.ok(Math.abs(gesamt((g) => g.lohnausfall) - r.lohnausfall) < 1);
      assert.ok(Math.abs(gruppen.reduce((s, g) => s + g.familien, 0) - FAMILIEN) < 1e-6);
    }
    assert.ok(Math.abs(r.untermStrich - (r.differenz - r.lohnausfall)) < 1e-3);
    assert.ok(Math.abs(r.jeFamilie * FAMILIEN - r.untermStrich) < 1);
    assert.ok(Math.abs(r.elterngeldJeFamilie * FAMILIEN - r.differenz) < 1);
  }
});

test('Anpassung: Monate der Mutter über 10 wandern zum Partner, Gesamtzahl bleibt', () => {
  assert.deepEqual(angepasstePaarmonate(12, 2), { mutter: 10, vater: 4 });
  assert.deepEqual(angepasstePaarmonate(11, 3), { mutter: 10, vater: 4 });
  assert.deepEqual(angepasstePaarmonate(11, 2), { mutter: 10, vater: 3 });
  assert.deepEqual(angepasstePaarmonate(10, 4), { mutter: 10, vater: 4 });
  assert.deepEqual(angepasstePaarmonate(2, 12), { mutter: 2, vater: 12 }); // Mutter hat nichts abzugeben
  // in Tabelle 4 passt jede Anpassung: Partner danach höchstens 10 Monate
  for (const p of PAARE.filter((p) => p.mutter > 10)) assert.ok(angepasstePaarmonate(p.mutter, p.vater).mutter === 10);
});

test('Umplanen betrifft nur Paare; beste Wahl ist unterm Strich nie schlechter', () => {
  const beste = ueberschlag();
  const fest = ueberschlag({ anpassung: 'fest' });
  const keine = ueberschlag({ anpassung: 'keine' });
  assert.throws(() => ueberschlag({ anpassung: true }));
  for (const r of [beste, fest]) {
    assert.equal(r.alt, keine.alt);
    assert.equal(r.nachAufteilung[0].differenz, keine.nachAufteilung[0].differenz);
    assert.equal(r.nachAufteilung[0].lohnausfall, 0);
    assert.ok(Math.abs(r.angepasst.familien * r.angepasst.lohnausfall - r.lohnausfall) < 1);
  }
  // keine: kein Lohn, unterm Strich = Elterngeld
  assert.equal(keine.angepasst.familien, 0);
  assert.equal(keine.lohnausfall, 0);
  assert.equal(keine.jeFamilie, keine.elterngeldJeFamilie);
  // fest: alle Paare mit Mutter über 10 Monaten planen um
  const betroffen = PARTNER_MIT_BEZUG * PAARE.filter((p) => p.mutter > 10).reduce((s, p) => s + p.anteil, 0);
  assert.ok(Math.abs(fest.angepasst.familien - betroffen) < 1e-6);
  assert.ok(fest.differenz > keine.differenz && fest.jeFamilie < keine.jeFamilie);
  // beste: eine Teilmenge plant um, unterm Strich mindestens so gut wie beide anderen
  assert.ok(beste.angepasst.familien > 0 && beste.angepasst.familien < betroffen);
  assert.ok(beste.jeFamilie >= keine.jeFamilie && beste.jeFamilie >= fest.jeFamilie);
  // Standard ist die beste Wahl, auch in spanne()
  assert.equal(spanne(true).mitte.jeFamilie, beste.jeFamilie);
  assert.equal(spanne(true, 'keine').mitte.jeFamilie, keine.jeFamilie);
});

test('Schritt 1 nennt als Stand ohne Skript dieselben Schätzwerte wie das Modell', () => {
  // main.js (statistik()) setzt die Werte aus dem Modell; im HTML stehen sie für den Fall ohne Skript
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const steht = (id) => html.match(new RegExp(`id="${id}">([^<]*)<`))[1].replace(/\u00a0/g, ' ');
  const s = spanne(true);
  const prozent = (x) => Math.round(x * 100);
  const hundert = (x) => new Intl.NumberFormat('de-DE').format(Math.round(Math.abs(x) / 100) * 100);
  const verlierer = (r) => r.anteilVerlierer;
  const jeFamilie = (r) => -r.jeFamilie;
  assert.equal(steht('vorspann-anteil'), String(Math.round(s.mitte.anteilVerlierer * 10) * 10));
  assert.equal(steht('quellen-spanne-anteil'), `${prozent(s.von(verlierer))} bis ${prozent(s.bis(verlierer))}`);
  assert.equal(steht('plakat-schnitt'), `−${hundert(s.mitte.jeFamilie)} €`);
  assert.equal(steht('quellen-spanne-betrag'), `${hundert(s.von(jeFamilie))} bis ${hundert(s.bis(jeFamilie))} €`);
  // Zeile „Wie viele Familien bekommen weniger?“ in der zugeklappten Liste im Hintergrund
  assert.equal(steht('kern-anteil'), String(Math.round(s.mitte.anteilVerlierer * 10) * 10));
  assert.equal(steht('kern-betrag'), `${hundert(s.mitte.jeFamilie)} €`);
});
