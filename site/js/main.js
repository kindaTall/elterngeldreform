/**
 * Verdrahtung der Seite: Zustand ↔ Formulare ↔ URL-Fragment ↔ Ausgaben, dazu die Führung in
 * drei Schritten (Kopfleiste, Sprungziele), Reiter, aufklappbare Abschnitte und Einblendungen.
 *
 * Schritt 2 zeigt zwei Balken „Heute" und „Geplant": dieselbe Aufteilung nach geltendem Recht und
 * nach dem Entwurf (vergleiche() in calc/szenario.js; was der Entwurf nicht zulässt, entfällt),
 * Geometrie aus balkenmodell() in ui/balken.js. Die Aufteilung ergibt sich aus den Partnermonaten
 * `monB` (0 oder 2 bis 12; Standard 2, wie bei den meisten Familien) und den Monaten der Mutter
 * `monA` (0 = so viele wie möglich; unter „Genauer rechnen"). Unter den Eingaben steht eine Zeile
 * zur Einordnung der Partnermonate (einordnung()).
 * Beträge erscheinen nur je Familie, nie getrennt nach Mutter und Vater; Summen und Differenz
 * stehen in ganzen Euro, die Differenz aus den gerundeten Summen (ganzeDifferenz in ui/diagramme.js).
 * Der Zustand selbst (Standardwerte, URL-Fragment, Eingabe für den Rechenkern, Aufteilung der
 * Monate) liegt ohne DOM in ui/zustand.js.
 * Die Adresszeile trägt keine Eingaben: Ein eingehendes Fragment mit Zustand (älterer geteilter Link,
 * #monB=12) wird gelesen und danach aus der Adresszeile entfernt; geteilt wird immer die schlichte
 * Adresse (TEILADRESSE in ui/teilen.js). Nur die Fehlermeldung hängt auf Wunsch einen Link mit den
 * Eingaben an (eingabenUrl()).
 */
import { NEU } from './calc/regeln.js';
import { spanne, FAMILIEN, PARTNER_MIT_BEZUG, KINDER_MIT_ELTERNGELD, GEBURTEN, JAHRGANG, DAUER } from './calc/bevoelkerung.js';
import { STANDARD, PARTNERMONATE, ausHash, alsHash, nettoVon, grundlage, fuerPartnermonate as planVergleich, planhinweis } from './ui/zustand.js';
import { monatsdiagramm, heatmap, heatmapLegende, differenzbalken, euro, euroDiff } from './ui/diagramme.js';
import { balkenmodell } from './ui/balken.js';
import { RASTER } from './ui/diagramme.js';
import { eigenesFeld, feldText, naechstesFeld, ergebnisKarte, planZeile } from './ui/karte.js';
import { ADRESSATEN, brief, mailto } from './ui/brief.js';
import { TEILADRESSE, teiltext, kurztext, netzwerke, zeichne, alsBlob } from './ui/teilen.js';
import { symbol, symboleEinsetzen } from './ui/symbole.js';
import { BETREFF, versandweg, meldungstext, sende } from './ui/rueckmeldung.js';
import { RUECKMELDUNG } from './config.js';
import { leisteBauen, listeBauen } from './ui/stimmenansicht.js';

const $ = (id) => document.getElementById(id);
const SEITE = location.origin + location.pathname;
const RUHIG = matchMedia('(prefers-reduced-motion: reduce)').matches;

let andereOffen = false;
const zustand = { ...STANDARD };
let kartenplan = '12-2';
/**
 * Eigene Zahlen: true nach der ersten Eingabe oder wenn der Zustand aus der Adresse kam. Bis dahin
 * zeigt Schritt 2 die Vorgabewerte und sagt das in der Überschrift („Beispiel: …").
 */
let eigeneZahlen = false;
function titelSetzen() {
  $('titel-beispiel').textContent = `Beispiel: ${euro(STANDARD.einkA)} und ${euro(STANDARD.einkB)} ${STANDARD.modus}`;
  $('titel-euch').classList.toggle('unsichtbar', !eigeneZahlen);
  $('titel-beispiel').classList.toggle('unsichtbar', eigeneZahlen);
}

// ---------- Zustand aus der URL (Regeln in ui/zustand.js) ----------
function ausUrl() {
  Object.assign(zustand, ausHash(location.hash));
}
/** Raute mit Eingaben aus der Adresszeile nehmen, damit sie nicht versehentlich weitergegeben wird. */
function adresseLeeren() {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    // die Adresse bleibt stehen, gerechnet wird trotzdem
  }
}
/** Adresse mit den Eingaben, nur für die Fehlermeldung („Meine Rechner-Eingaben mitschicken"). */
function eingabenUrl() {
  const s = alsHash(zustand);
  return s ? `${SEITE}#${s}` : SEITE;
}
/** Dieselbe Aufteilung nach beiden Regelwerken mit p Partnermonaten, siehe fuerPartnermonate() in ui/zustand.js. */
const fuerPartnermonate = (e, p) => planVergleich(zustand, e, p);

// ---------- Formulare ----------
function formularFuellen() {
  const z = zustand;
  const setze = (id, wert) => {
    const feld = $(id);
    if (document.activeElement !== feld) feld.value = wert; // nicht in ein Feld schreiben, in dem gerade getippt wird
  };
  for (const w of ['A', 'B']) {
    setze(`s-eink${w}`, z[`eink${w}`]);
    setze(`eink${w}-zahl`, z[`eink${w}`]);
    $(`eink${w}`).max = z.modus === 'brutto' ? 9000 : 6000;
    $(`eink${w}`).value = z[`eink${w}`];
    $(`stkl${w}`).value = z[`stkl${w}`];
  }
  const andere = andereOffen || ![0, 2, 4].includes(z.monB);
  document.querySelectorAll('[data-monb]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.monb === 'andere' ? andere : !andere && Number(b.dataset.monb) === z.monB)));
  $('monB-regler').classList.toggle('unsichtbar', !andere); // bleibt im Layout, damit nichts springt
  $('monB').value = PARTNERMONATE.indexOf(z.monB);
  $('monB-out').textContent = z.monB === 0 ? 'keine' : `${z.monB} Monate`;
  $('lesart').checked = !!z.lesart;
  $('d-monA').value = z.monA;
  $('feld-monA').hidden = !!z.allein;
  $('mutterschutz').checked = !!z.ms;
  $('mutterschutz').disabled = !(nettoVon(z, 'A') > 0); // ohne Einkommen kein Mutterschaftsgeld; der Haken bleibt im Zustand
  $('allein').checked = $('s-allein').checked = !!z.allein;
  $('geschwister').checked = !!z.geschw;
  $('mehrlinge').value = z.mehr;
  $('kirche').value = z.kirche;
  // Alleinerziehend: kein Netto und keine Monate für Partner:in
  $('gruppeB').hidden = $('s-partner').hidden = $('feld-einkB').hidden = $('partnerwahl').hidden = !!z.allein;
  $('schnell').classList.toggle('allein', !!z.allein);
  document.querySelectorAll('[data-modus]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modus === z.modus)));
  document.querySelectorAll('[data-nur="brutto"]').forEach((e) => (e.hidden = z.modus !== 'brutto'));
  document.querySelectorAll('[data-einkwort]').forEach((e) => (e.textContent = z.modus));
}

function formularVerdrahten() {
  const setze = (k, v) => {
    zustand[k] = v;
    if (!eigeneZahlen) {
      eigeneZahlen = true;
      titelSetzen();
    }
    formularFuellen();
    rechne();
  };
  const betrag = (e) => Math.max(0, Math.min(20000, Number(e.target.value) || 0));
  for (const w of ['A', 'B']) {
    $(`s-eink${w}`).addEventListener('input', (e) => setze(`eink${w}`, betrag(e)));
    $(`eink${w}-zahl`).addEventListener('input', (e) => setze(`eink${w}`, betrag(e)));
    $(`eink${w}`).addEventListener('input', (e) => setze(`eink${w}`, Number(e.target.value)));
    $(`stkl${w}`).addEventListener('change', (e) => setze(`stkl${w}`, Number(e.target.value)));
  }
  // Bedingungen in Schritt 2
  const partner = (p, offen = false) => {
    andereOffen = offen;
    setze('monB', p);
  };
  document.querySelectorAll('[data-monb]').forEach((b) => b.addEventListener('click', () => (b.dataset.monb === 'andere' ? partner(zustand.monB, true) : partner(Number(b.dataset.monb)))));
  $('monB').addEventListener('input', (e) => partner(PARTNERMONATE[Number(e.target.value)], true));
  $('d-monA').addEventListener('change', (e) => setze('monA', Number(e.target.value)));
  for (const [id, k] of [['mutterschutz', 'ms'], ['allein', 'allein'], ['s-allein', 'allein'], ['geschwister', 'geschw'], ['lesart', 'lesart']]) {
    $(id).addEventListener('change', (e) => setze(k, e.target.checked ? 1 : 0));
  }
  $('mehrlinge').addEventListener('change', (e) => setze('mehr', Number(e.target.value)));
  $('kirche').addEventListener('change', (e) => setze('kirche', Number(e.target.value)));
  document.querySelectorAll('[data-modus]').forEach((b) =>
    b.addEventListener('click', () => {
      if (zustand.modus === b.dataset.modus) return;
      // sinnvolle Startwerte beim Wechsel
      zustand.einkA = b.dataset.modus === 'brutto' ? 2800 : 1800;
      zustand.einkB = b.dataset.modus === 'brutto' ? 4500 : 2800;
      setze('modus', b.dataset.modus);
    }),
  );
  document.querySelectorAll('[data-plan]').forEach((b) =>
    b.addEventListener('click', () => {
      kartenplan = b.dataset.plan;
      document.querySelectorAll('[data-plan]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      karte();
    }),
  );
  $('schnell').addEventListener('submit', (e) => {
    e.preventDefault();
    geheZu('ergebnis');
  });
}

// ---------- Ausgaben ----------
let aktuell;

/**
 * Zahl von ihrem bisherigen Wert zum neuen laufen lassen. `format` macht aus der Zahl den Text
 * (Standard: mit Vorzeichen) und wird am Element gemerkt, damit das Einblenden ihn wiederverwendet.
 */
function zaehle(el, ziel, format = el._format ?? euroDiff, von = el._wert ?? 0) {
  cancelAnimationFrame(el._lauf);
  clearTimeout(el._sicher);
  el._wert = ziel;
  el._format = format;
  // In einem verdeckten Fenster laufen keine Bilder: dann sofort den Endwert zeigen
  if (RUHIG || von === ziel || document.hidden) {
    el.textContent = format(ziel);
    return;
  }
  const start = performance.now();
  const dauer = 550;
  // Sicherung, falls die Animation gedrosselt wird: nie auf einem Zwischenwert stehen bleiben
  el._sicher = setTimeout(() => {
    cancelAnimationFrame(el._lauf);
    el.textContent = format(ziel);
  }, dauer + 250);
  const schritt = (jetzt) => {
    const t = Math.max(0, Math.min(1, (jetzt - start) / dauer)); // Bildzeit kann vor dem Start liegen
    const k = 1 - Math.pow(1 - t, 3);
    el.textContent = format(t < 1 ? Math.round((von + (ziel - von) * k) / 10) * 10 : ziel);
    if (t < 1) el._lauf = requestAnimationFrame(schritt);
  };
  el._lauf = requestAnimationFrame(schritt);
}

const kurz = (r, allein) => (allein ? `${r.plan.monateA} Monate` : `Mutter ${r.plan.monateA}, Partner:in ${r.plan.monateB} Monate`);

/**
 * Väter nach Bezugsdauer, Geburtsjahrgang 2023: Statistisches Bundesamt, Statistischer Bericht
 * „Elterngeld – Beendete Leistungsbezüge für im Jahr 2023 geborene Kinder", Tab. 22922-01
 * (Daten in DAUER, calc/bevoelkerung.js): von 302.135 Vätern mit Elterngeld bezogen 219.273 bis
 * 2 Monate, 82.862 mehr als 2 Monate, das sind 27,4 %. Kein Elterngeld: bei 53,6 % der 2023
 * geborenen Kinder bezog der Vater keins (Destatis, Väterbeteiligung; dieselbe Zahl in Schritt 1).
 */
const VAETER_UEBER_2 = 1 - DAUER[0].vaeter / DAUER.reduce((s, d) => s + d.vaeter, 0);

/** Eine Zeile zur Einordnung unter den Eingaben: [Satz, Quellenhinweis] oder null. */
function einordnung(v, allein) {
  if (allein) return [`Alleinerziehend: ${v.neu.plan.monateA} Monate, im Entwurf davon ${NEU.achtzigMonateAlleinerziehend} mit 80 %.`, 'laut Begründung des Entwurfs'];
  const p = v.alt.plan.monateB;
  if (p > 2) return [`Mehr als 2 Monate nehmen heute nur ${Math.round(VAETER_UEBER_2 * 100)} % der Väter mit Elterngeld.`, 'Destatis, Jahrgang 2023'];
  if (p > 0) return ['Heute nimmt nur knapp die Hälfte der Väter überhaupt Elterngeld.', 'Destatis, Jahrgang 2023'];
  return null;
}

const anteil = (x) => `${(x * 100).toFixed(2)}%`;
const deltaFormat = (x) => (Math.round(x) === 0 ? '±0 €' : euroDiff(x));

/**
 * Zwei Balken aus balkenmodell() (ui/balken.js) auf die Seite bringen. Gesetzt werden nur Anteile als
 * CSS-Variablen (--l Länge des Balkens bzw. des Stücks, --von Beginn des Stücks, --anteil Partner-Teil,
 * --min Mindestlänge des Mutter-Teils in px, --schub für die Beschriftung unter queren Balken); das
 * CSS liest sie am Desktop als Höhen (senkrechte Balken) und am Handy als Breiten (quere Balken),
 * das Gleiten kommt ebenfalls von dort. Welche Ausrichtung gilt, sagt das CSS selbst (flex-direction
 * von .teile), damit Skript und Stil nicht auseinanderlaufen.
 */
function zeigeBalken(m) {
  const balken = (id, b) => {
    const saeule = $(id);
    const teile = saeule.querySelector('.teile');
    const quer = getComputedStyle(teile).flexDirection.startsWith('row');
    const [mu, pa] = b.segmente;
    const [partnerTeil, mutterTeil] = saeule.querySelectorAll('.teil');
    teile.style.setProperty('--l', anteil(b.hoehe));
    partnerTeil.style.setProperty('--anteil', anteil(pa ? pa.anteil : 0));
    // Reine Mutterschutz-Monate (Mutterschaftsgeld statt Elterngeld) sind schraffiert.
    mutterTeil.classList.toggle('schutz', !!mu.nurMutterschutz);
    mutterTeil.firstChild.textContent = mu.text;
    if (quer) {
      // Quer: Beschriftungen stehen im Balken, wenn beide hineinpassen, sonst in der Zeile darunter
      // (Mutter links, Partner:in rechtsbündig am Balkenende, notfalls nach rechts geschoben)
      // reine Mutterschutz-Monate kürzer benannt, damit beide Beschriftungen in eine Zeile passen
      if (mu.nurMutterschutz) mutterTeil.firstChild.textContent = `Mutterschutz · ${mu.monate === 1 ? '1 Monat' : `${mu.monate} Monate`}`;
      partnerTeil.firstChild.textContent = pa ? pa.text : '';
      const lang = saeule.clientWidth * b.hoehe;
      const wMu = mutterTeil.firstChild.offsetWidth, wPa = pa ? partnerTeil.firstChild.offsetWidth : 0;
      const passt = lang * (1 - (pa ? pa.anteil : 0)) >= wMu + 20 && (!pa || lang * pa.anteil >= wPa + 20);
      saeule.classList.toggle('eng', !passt);
      saeule.style.setProperty('--schub', `${Math.max(0, Math.min(wMu + 14 + wPa - lang, saeule.clientWidth - lang))}px`); // nie über den Rand
      // ein Mutter-Teil mit Monaten bleibt als schmaler Abschnitt erkennbar
      mutterTeil.style.setProperty('--min', pa && mu.monate > 0 ? '12px' : '0px');
      return;
    }
    // Senkrecht: zu niedriges Partner-Stück, seine Beschriftung steht direkt darunter, mit Pfeil nach oben
    const eng = !!pa && saeule.clientHeight * b.hoehe * pa.anteil < 34;
    saeule.classList.toggle('eng', eng);
    partnerTeil.firstChild.textContent = pa ? `${eng ? '↑ ' : ''}${pa.text}` : '';
    // Monate der Mutter bleiben sichtbar, auch bei 0 € oder wenig Geld: ihr Teil ist mindestens so hoch
    // wie seine Beschriftung und staucht dafür den Partner-Teil (die Balkenhöhe bleibt an der Summe).
    mutterTeil.style.setProperty('--min', pa && mu.monate > 0 ? `${mutterTeil.firstChild.offsetHeight + 12}px` : '0px');
  };
  balken('saeule-heute', m.heute);
  balken('saeule-geplant', m.geplant);
  const stueck = $('stueck');
  stueck.className = `stueck ${m.stueck.art ?? 'keins'}`;
  stueck.style.setProperty('--von', anteil(m.stueck.von));
  stueck.style.setProperty('--l', anteil(m.stueck.bis - m.stueck.von));
  $('saeulen').dataset.vorzeichen = m.vorzeichen;
  zaehle($('delta-zahl'), m.delta, deltaFormat);
  $('delta-prozent').textContent = m.prozentText;
  zaehle($('summe-heute'), m.heute.summe, euro);
  zaehle($('summe-geplant'), m.geplant.summe, euro);
  $('verfallen').textContent = m.verfallenText;
  $('saeulen-text').textContent = m.beschreibung;
}

function rechne() {
  const e = grundlage(zustand);
  const allein = e.alleinerziehend;
  const gezeigt = fuerPartnermonate(e, zustand.monB);
  aktuell = { eingabe: { ...e, ...gezeigt.alt.plan }, gezeigt };

  // Hinweis unter „Genauer rechnen", wenn nach geltendem Recht anders aufgeteilt wird als gewählt
  const hinweis = planhinweis(zustand, e, gezeigt.alt.plan);
  $('planhinweis').textContent = hinweis;
  $('planhinweis').hidden = !hinweis;

  zeigeBalken(balkenmodell(gezeigt, { alleinerziehend: allein }));
  const zeile = einordnung(gezeigt, allein);
  if (zeile) {
    const quelle = document.createElement('a');
    quelle.href = '#methodik';
    quelle.textContent = zeile[1];
    $('einordnung').replaceChildren(`${zeile[0]} `, quelle);
  } else {
    $('einordnung').replaceChildren();
  }

  verlauf(false);
  karte();
  briefAktualisieren();
  teilenAktualisieren();
}

function verlauf(bewegt) {
  const v = aktuell.gezeigt;
  $('diagramm-unter').textContent = `Auszahlung an die Familie in Euro. Heute ${kurz(v.alt, zustand.allein)}; im Entwurf ${kurz(v.neu, zustand.allein)}.`;
  monatsdiagramm($('monatsdiagramm'), v);
  if (bewegt) wachsen($('monatsdiagramm'));
}

/** Balken einmal von unten wachsen lassen. */
function wachsen(el) {
  el.classList.remove('wachsen');
  void el.offsetWidth;
  el.classList.add('wachsen');
  setTimeout(() => el.classList.remove('wachsen'), 1100);
}

/** Karte: Raster aus heatmap(), Auswahl `gewaehlt` (fest) und `schwebt` (Maus darüber), Regeln in ui/karte.js. */
let kartenraster;
let eigen = null;
let gewaehlt = null;
let schwebt = null;
const gleichesFeld = (a, b) => !!a && !!b && a.i === b.i && a.j === b.j;

function feldZeigen() {
  const f = schwebt ?? gewaehlt;
  kartenraster?.markiere(f);
  $('feld-text').textContent = f && kartenraster ? `Gewähltes Feld: ${feldText(kartenraster.felder[f.i][f.j])}` : 'Gewähltes Feld: Feld überfahren, antippen oder mit den Pfeiltasten wählen.';
  $('feld-weg').classList.toggle('unsichtbar', !gewaehlt);
}

function karteVerdrahten() {
  const ziel = $('heatmap');
  const bei = (e) => kartenraster?.feldBei(e.clientX, e.clientY) ?? null;
  ziel.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const f = bei(e);
    if (gleichesFeld(f, schwebt) || (!f && !schwebt)) return;
    schwebt = f;
    feldZeigen();
  });
  ziel.addEventListener('pointerleave', () => {
    if (!schwebt) return;
    schwebt = null;
    feldZeigen();
  });
  ziel.addEventListener('click', (e) => {
    const f = bei(e);
    if (!f) return;
    gewaehlt = gleichesFeld(f, gewaehlt) ? null : f;
    feldZeigen();
  });
  ziel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      gewaehlt = null;
    } else if (naechstesFeld({ i: 0, j: 0 }, e.key)) {
      // erster Tastendruck wählt den Startpunkt (eigenes Feld oder Mitte), danach wandert die Auswahl
      const mitte = Math.floor(RASTER.n / 2);
      gewaehlt = gewaehlt ? naechstesFeld(gewaehlt, e.key) : eigen ?? { i: mitte, j: mitte };
      schwebt = null;
    } else {
      return;
    }
    e.preventDefault();
    feldZeigen();
  });
  $('feld-weg').addEventListener('click', () => {
    gewaehlt = null;
    schwebt = null;
    feldZeigen();
    ziel.focus({ preventScroll: true });
  });
}

function karte() {
  const [a, b] = kartenplan.split('-').map(Number);
  const e = aktuell ? grundlage(zustand) : null;
  const paar = !!aktuell && !aktuell.eingabe.alleinerziehend;
  eigen = paar ? eigenesFeld(aktuell.eingabe.nettoA, aktuell.eingabe.nettoB) : null;
  // Dieselben Optionen wie der Rechner, damit Feld, Kreis und „Euer Ergebnis" zusammenpassen
  const optionen = { mutterschutzVerbraucht80: !!zustand.lesart, geschwisterbonus: !!zustand.geschw, mehrlinge: zustand.mehr, mutterschutz: zustand.ms ? (zustand.mehr > 0 ? 3 : 2) : 0 };
  const bereich = heatmap($('heatmap'), {
    monateA: a,
    monateB: b,
    markierung: paar ? { nettoA: aktuell.eingabe.nettoA, nettoB: aktuell.eingabe.nettoB } : undefined,
    wahl: schwebt ?? gewaehlt,
    optionen,
  });
  kartenraster = bereich;
  heatmapLegende($('heatmap-legende'), bereich);
  $('karte-unter').textContent = `Mutter ${a} Monate${optionen.mutterschutz ? `, davon ${optionen.mutterschutz} Mutterschutz, wenn sie Einkommen hat` : ''}; Partner:in ${b} Monate. Summe über die ganze Bezugszeit.`;

  // Euer Ergebnis (Beispiel, solange nur die Vorgabewerte stehen): genaue Zahlen des Rechners
  $('euer-titel').textContent = eigeneZahlen ? 'Euer Ergebnis' : 'Beispiel';
  $('euer-paar').hidden = !paar;
  $('euer-allein').hidden = paar || !aktuell;
  if (paar) {
    const r = ergebnisKarte(e, aktuell.gezeigt, a, b);
    $('euer-eingabe').textContent = `Mutter ${euro(e.nettoA)} netto · Partner:in ${euro(e.nettoB)} netto`;
    const z = $('euer-zahl');
    z.textContent = deltaFormat(r.differenz);
    z.className = `euer-zahl ${r.differenz < 0 ? 'minus' : r.differenz > 0 ? 'plus' : ''}`;
    $('euer-statt').textContent = `${euro(r.neu)} statt ${euro(r.alt)}`;
    const rand = Math.max(e.nettoA, e.nettoB) > RASTER.max ? ` Die Karte endet bei ${euro(RASTER.max)}, der Kreis sitzt am Rand.` : '';
    $('euer-plan').textContent = planZeile(a, b, aktuell.gezeigt) + rand;
  }
  feldZeigen();
}

function statistik() {
  const s = spanne(true);
  const andere = spanne(false);
  const m = s.mitte;
  const n = new Intl.NumberFormat('de-DE');
  const mrd = (x) => (Math.abs(x) / 1e9).toFixed(1).replace('.', ',');
  const hundert = (x) => n.format(Math.round(Math.abs(x) / 100) * 100);
  const diff = (r) => r.differenz;
  const proz = (r) => -r.differenzProzent;
  const jeFamilie = (r) => -r.jeFamilie;
  const verl = (r) => r.anteilVerlierer;
  const gew = (r) => r.anteilGewinner;
  const pz = (x) => Math.round(x * 100);
  const anteil = Math.round(m.anteilVerlierer * 10) * 10;
  const schnitt = `${hundert(jeFamilie(m))} €`;
  // Kennzahlen: je Fläche eine Zahl und ein kurzer Satz; die Spanne steht in Klammern
  const kz = [
    [`rund ${anteil} %`, 'minus', `der Familien bekämen weniger (je nach Annahme ${pz(s.von(verl))} bis ${pz(s.bis(verl))} %)`],
    [`−${schnitt}`, 'minus', `je Familie im Schnitt, über die ganze Bezugszeit (${hundert(s.von(jeFamilie))} bis ${hundert(s.bis(jeFamilie))} €)`],
    [`rund ${Math.round(m.anteilGewinner * 10) * 10} %`, '', `bekämen mehr (${pz(s.von(gew))} bis ${pz(s.bis(gew))} %), vor allem wenn die Mutter vorher wenig oder nichts verdiente`],
    [`−${mrd(s.bis(diff))} bis −${mrd(s.von(diff))}`, 'minus', `Mrd. € weniger für einen Geburtsjahrgang, ${Math.round(s.von(proz))} bis ${Math.round(s.bis(proz))} % der heutigen Summe`],
  ];
  $('stat-kennzahlen').replaceChildren(
    ...kz.map(([zahl, klasse, text]) => {
      const d = document.createElement('div');
      d.className = 'kennzahl';
      const z = document.createElement('div');
      z.className = `zahl ${klasse}`;
      z.textContent = zahl;
      const p = document.createElement('p');
      p.textContent = text;
      d.append(z, p);
      return d;
    }),
  );
  // Schritt 1 und die Zeile im zugeklappten Hintergrund nennen dieselben Zahlen wie der Überschlag,
  // als eigene Schätzung mit Spanne gekennzeichnet.
  // Die Werte im HTML sind der Stand ohne Skript; test/bevoelkerung.test.js hält sie am Modell.
  $('plakat-schnitt').textContent = `−${schnitt}`;
  $('kern-betrag').textContent = schnitt;
  $('quellen-spanne-betrag').textContent = `${hundert(s.von(jeFamilie))} bis ${hundert(s.bis(jeFamilie))} €`;
  $('vorspann-anteil').textContent = anteil;
  $('kern-anteil').textContent = anteil;
  $('quellen-spanne-anteil').textContent = `${pz(s.von(verl))} bis ${pz(s.bis(verl))}`;
  const zeilen = (gruppen) => gruppen.map((g) => ({ label: g.klasse, wert: g.differenz }));
  differenzbalken($('stat-aufteilung'), zeilen(m.nachAufteilung), 'Änderung je Familie nach Monaten des Partners');
  differenzbalken($('stat-einkommen'), zeilen(m.nachEinkommen), 'Änderung je Familie nach Netto der Mutter');
  // Annahmen des Überschlags als kurze Liste: fettes Stichwort, dann ein bis zwei Sätze
  const anmerkungen = [
    ['Grundlage', `${n.format(FAMILIEN)} Familien, in denen die Mutter Elterngeld bezogen hat, und ${n.format(PARTNER_MIT_BEZUG)} Väter mit Elterngeld, für ${n.format(KINDER_MIT_ELTERNGELD)} der ${n.format(GEBURTEN)} im Jahr ${JAHRGANG} geborenen Kinder (Statistisches Bundesamt).`],
    ['Paare', 'Die Statistik zählt Mütter und Väter getrennt. Angenommen ist, dass jeder dieser Väter zu einer dieser Familien gehört und Einkommen und Bezugsdauer beider Eltern nicht zusammenhängen. „Nur ein Elternteil“ umfasst Alleinerziehende und Paare, in denen der Partner kein Elterngeld bezieht.'],
    ['Spanne', 'Einkommen und Bezugsdauer nennt die Statistik nur in Klassen. Die Spanne ergibt sich daraus, wie man die höchsten Einkommen (über 2.770 € netto), ElterngeldPlus und den Anteil der Alleinerziehenden ansetzt; Balken und Mittelwerte zeigen eine mittlere Variante.'],
    ['Auslegung', `Die Mutterschutzmonate verbrauchen zwei der vier 80-%-Monate. Nach der anderen Auslegung wären es etwa ${mrd(andere.bis(diff))} bis ${mrd(andere.von(diff))} Mrd. € weniger.`],
    ['Abgleich', `Nach heutigem Recht ergibt der Überschlag ${mrd(m.alt)} Mrd. € für den Jahrgang; der Bund hat 2024 tatsächlich 7,2 Mrd. € für Elterngeld ausgegeben. Der Entwurf nennt für 2030 eine Entlastung von 1,36 Mrd. €; darin sind 140 Mio. € Mehrausgaben für die neue Einkommensermittlung und 25 Mio. € Einsparung beim Partnerschaftsbonus verrechnet, auf die hier gerechneten Regeln entfallen also rund 1,5 Mrd. €. Welche Geburtenzahl und welches Verhalten die Regierung unterstellt, sagt der Entwurf nicht.`],
    ['Verhalten', 'Nähme der Partner wegen der Reform mehr Monate, fiele das Minus beim Elterngeld kleiner aus; dafür fehlte in diesen Monaten das meist höhere Gehalt.'],
    ['Nicht enthalten', 'Geschwisterbonus, Mehrlinge, Teilzeit im Bezug, Partnerschaftsbonus, Sonderzahlungen.'],
  ];
  $('stat-text').replaceChildren(
    ...anmerkungen.map(([stichwort, text]) => {
      const li = document.createElement('li');
      const b = document.createElement('strong');
      b.textContent = `${stichwort}:`;
      li.append(b, ` ${text}`);
      return li;
    }),
  );
}

// ---------- Brief ----------
function briefDaten() {
  return brief({
    eingabe: aktuell.eingabe,
    vergleich: aktuell.gezeigt,
    an: $('b-an').value,
    mdbName: $('b-mdb').value,
    name: $('b-name').value,
    ort: $('b-ort').value,
    situation: $('b-lage').value,
    forderungen: [...document.querySelectorAll('[data-forderung]:checked')].map((c) => c.dataset.forderung),
  });
}
// Ein von Hand geänderter Brief wird nicht mehr überschrieben; der Hinweis unter dem Blatt sagt das
// und bietet an, die Vorlage mit den aktuellen Angaben neu zu erzeugen.
let briefBearbeitet = false;
function briefGeaendert(ja) {
  briefBearbeitet = ja;
  $('b-geaendert').classList.toggle('unsichtbar', !ja);
}
function briefAktualisieren() {
  if (!aktuell || briefBearbeitet) return;
  $('brieftext').textContent = briefDaten().text;
}
function briefVerdrahten() {
  $('b-an').replaceChildren(...ADRESSATEN.map((a) => new Option(a.label, a.id)));
  const neu = () => {
    $('b-mdb-feld').hidden = $('b-an').value !== 'mdb';
    briefAktualisieren();
  };
  $('briefformular').addEventListener('input', neu);
  // Ältere Firefox-Versionen kennen contenteditable="plaintext-only" nicht und lassen das Feld dann
  // gesperrt: dort normal editierbar machen, der Einfügen-Handler unten hält den Text trotzdem rein
  if (!$('brieftext').isContentEditable) $('brieftext').setAttribute('contenteditable', 'true');
  $('brieftext').addEventListener('input', () => briefGeaendert(true));
  $('b-neu').addEventListener('click', () => {
    briefGeaendert(false);
    briefAktualisieren();
  });
  // Einfügen nur als reiner Text: Formatierung und Markup aus der Zwischenablage bleiben draußen
  $('brieftext').addEventListener('paste', (e) => {
    e.preventDefault();
    const t = e.clipboardData?.getData('text/plain') ?? '';
    if (!t) return;
    // insertText behält Rückgängig und löst 'input' aus; sonst von Hand an der Cursor-Position einsetzen
    if (document.execCommand('insertText', false, t)) return;
    const auswahl = getSelection();
    if (!auswahl.rangeCount) return;
    const bereich = auswahl.getRangeAt(0);
    bereich.deleteContents();
    bereich.insertNode(document.createTextNode(t));
    bereich.collapse(false);
    e.currentTarget.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
  });
  let statusWarten;
  const status = (t, dauer = 6000) => {
    $('b-status').textContent = t;
    clearTimeout(statusWarten);
    statusWarten = setTimeout(() => ($('b-status').textContent = ''), dauer);
  };
  const text = () => $('brieftext').innerText.trim();
  $('b-kopieren').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text());
      status('Brieftext kopiert.');
    } catch {
      status('Kopieren nicht möglich. Bitte den Text von Hand markieren und kopieren.');
    }
  });
  // Der Brief kommt in den Link, wenn er nicht zu lang ist, und immer auch in die Zwischenablage.
  // Die Meldung bleibt eine Minute stehen: sie muss auch nach der Rückkehr aus der Mail-App noch stimmen.
  $('b-mail').addEventListener('click', async () => {
    const d = briefDaten();
    const m = mailto({ ...d, text: text() });
    let kopiert = true;
    try {
      await navigator.clipboard.writeText(text());
    } catch {
      kopiert = false;
    }
    if (m.mitText) status(kopiert ? 'Der Brief steht in der E-Mail und in der Zwischenablage.' : 'Der Brief steht in der E-Mail.', 60000);
    else status(kopiert ? 'Der Brief ist zu lang für einen E-Mail-Link und liegt in der Zwischenablage: in die E-Mail einfügen.' : 'Bitte den Brieftext mit „Text kopieren“ kopieren und in die E-Mail einfügen.', 60000);
    location.href = m.href;
  });
  $('b-pdf').addEventListener('click', () => {
    $('brief-druck').textContent = text();
    document.body.classList.add('druck-brief');
    window.print();
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('druck-brief'));
  $('b-txt').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text()], { type: 'text/plain;charset=utf-8' }));
    a.download = 'brief-elterngeldreform.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  neu();
}

// ---------- Teilen ----------
function teilenAktualisieren() {
  if (!aktuell) return;
  const text = teiltext(aktuell);
  $('t-text').textContent = text;
  $('t-netzwerke').replaceChildren(
    ...netzwerke(text, kurztext(aktuell)).map((n) => {
      const a = document.createElement('a');
      a.className = 'kachel';
      a.href = n.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      // am Handy nur das Symbol: der Name steht dann in aria-label und title
      a.title = n.name;
      a.setAttribute('aria-label', n.name);
      const name = document.createElement('span');
      name.className = 'kachel-name';
      name.textContent = n.name;
      const sym = document.createElement('span');
      sym.className = 'sym';
      sym.append(symbol(n.symbol));
      a.append(sym, name);
      return a;
    }),
  );
  zeichne($('teilbild'), aktuell);
}
function teilenVerdrahten() {
  // Rückmeldungen stehen in der Zeile unter dem Raster (feste Höhe, siehe style.css) …
  let statusWarten;
  const status = (t) => {
    $('t-status').textContent = t;
    clearTimeout(statusWarten);
    statusWarten = setTimeout(() => ($('t-status').textContent = ''), 5000);
  };
  // … und für „Text kopieren“ (am Handy weit weg vom Raster) zusätzlich auf dem Knopf selbst; seine Breite bleibt fest
  const amKnopf = (knopf, t) => {
    const beschriftung = [...knopf.childNodes].find((k) => k.nodeType === Node.TEXT_NODE && k.textContent.trim());
    knopf._text ??= beschriftung.textContent;
    knopf.style.minWidth = `${knopf.offsetWidth}px`;
    beschriftung.textContent = t;
    clearTimeout(knopf._warten);
    knopf._warten = setTimeout(() => {
      beschriftung.textContent = knopf._text;
      knopf.style.minWidth = '';
    }, 2500);
  };
  const datei = async () => new File([await alsBlob($('teilbild'))], 'elterngeldreform-ergebnis.png', { type: 'image/png' });
  $('t-bild').addEventListener('click', async () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await datei());
    a.download = 'elterngeldreform-ergebnis.png';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('t-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(TEILADRESSE);
      status('Link kopiert.');
    } catch {
      status('Kopieren nicht möglich. Der Link steht im Zitattext.');
    }
  });
  $('t-kopieren').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('t-text').textContent);
      amKnopf($('t-kopieren'), 'Kopiert');
    } catch {
      amKnopf($('t-kopieren'), 'Nicht möglich');
      status('Kopieren nicht möglich. Markiere den Text und kopiere ihn von Hand.');
    }
  });
  // Das Teilen-Menü des Geräts gibt es nicht überall; ohne es bleibt der Knopf weg (Text und Link kopiert „Text kopieren“)
  $('t-teilen').hidden = !navigator.share;
  $('t-teilen').addEventListener('click', async () => {
    const text = teiltext(aktuell);
    try {
      const f = await datei();
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], text });
      else if (navigator.share) await navigator.share({ text, url: TEILADRESSE });
      else {
        await navigator.clipboard.writeText(text);
        status('Text und Link kopiert. Das Bild kannst du über „Bild speichern“ laden.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') status('Teilen nicht möglich. Nutze „Bild speichern“ und „Link kopieren“.');
    }
  });
}

// ---------- Rückmeldung ----------
function rueckmeldungVerdrahten() {
  const weg = versandweg(RUECKMELDUNG);
  const formular = $('rueckmeldeformular');
  const status = (t) => {
    $('r-status').textContent = t;
    setTimeout(() => ($('r-status').textContent = ''), 8000);
  };
  const meldung = () => ({
    art: $('r-art').value,
    nachricht: $('r-text').value,
    kontakt: $('r-kontakt').value,
    url: $('r-eingaben').checked ? eingabenUrl() : '',
  });
  const kopiere = async (danach) => {
    try {
      await navigator.clipboard.writeText(meldungstext(meldung()));
      status(danach);
    } catch {
      status('Kopieren nicht möglich. Bitte den Text von Hand markieren und kopieren.');
    }
  };
  const perMail = async () => {
    const m = mailto({ betreff: BETREFF, text: meldungstext(meldung()), email: RUECKMELDUNG.email });
    if (m.mitText) status(RUECKMELDUNG.email ? 'Dein E-Mail-Programm öffnet sich mit der fertigen Meldung. Abgeschickt wird sie erst von dir.' : 'Dein E-Mail-Programm öffnet sich mit der fertigen Meldung. Bitte noch die Adresse aus dem Impressum als Empfänger eintragen.');
    else await kopiere('Die Meldung ist zu lang für einen E-Mail-Link. Sie liegt in der Zwischenablage: im E-Mail-Programm einfügen.');
    location.href = m.href;
  };

  if (weg === 'endpunkt') {
    $('r-weg').textContent = 'Die Meldung wird an den Betreiber dieser Seite übertragen und nur verwendet, um den Fehler zu prüfen und zu beheben.';
  } else if (RUECKMELDUNG.email) {
    $('r-weg').textContent = 'Es öffnet sich dein E-Mail-Programm mit der fertigen Meldung. Abgeschickt wird sie erst von dir.';
  } else {
    const impressum = document.createElement('a');
    impressum.href = 'impressum.html';
    impressum.textContent = 'Impressum';
    $('r-weg').replaceChildren('Es öffnet sich dein E-Mail-Programm mit der fertigen Meldung. Als Empfänger trägst du die Adresse aus dem ', impressum, ' ein; abgeschickt wird sie erst von dir.');
  }

  formular.addEventListener('submit', async (e) => {
    e.preventDefault();
    if ($('r-website').value) return; // Feld, das nur Bots ausfüllen
    if (weg === 'email') return perMail();
    try {
      $('r-senden').disabled = true;
      await sende(RUECKMELDUNG.endpunkt, meldung());
      formular.reset();
      status('Danke. Die Meldung ist angekommen.');
    } catch {
      await perMail();
    } finally {
      $('r-senden').disabled = false;
    }
  });
  $('r-kopieren').addEventListener('click', () => {
    if (formular.reportValidity()) kopiere('Meldung kopiert.');
  });
}

// ---------- Stimmen: Zitatleiste (Schritt 1) und Liste im Hintergrund ----------
function stimmenBauen() {
  leisteBauen($('stimmen-spur'));
  listeBauen($('stimmenliste'));
}

// ---------- Führung: Schritte, Sprungziele, Reiter, Einblendungen ----------
/**
 * Zu einem Abschnitt gleiten, ohne das URL-Fragment zu ändern (dort stehen die Eingaben); ein
 * zugeklappter Abschnitt im Hintergrund klappt dabei auf. `sofort`: springen statt gleiten.
 */
function geheZu(id, sofort = false) {
  const ziel = id ? $(id) : document.body;
  if (!ziel) return;
  const zu = ziel.closest('details');
  if (zu && !zu.open) zu.open = true;
  ziel.scrollIntoView({ behavior: sofort ? 'instant' : RUHIG ? 'auto' : 'smooth', block: 'start' });
}

function fuehrungVerdrahten() {
  // Links nach außen immer im neuen Tab, damit die eigene Seite offen bleibt
  document.querySelectorAll('a[href^="http"]').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    geheZu(a.getAttribute('href').slice(1));
  });

  // Kopfleiste: aktiver Schritt und Läufer darunter
  const links = [...document.querySelectorAll('.schritte a')];
  const laeufer = document.querySelector('.laeufer');
  const markiere = () => {
    let aktiv = links[0];
    for (const l of links) if ($(l.dataset.schritt).getBoundingClientRect().top <= innerHeight * 0.45) aktiv = l;
    links.forEach((l) => l.classList.toggle('aktiv', l === aktiv));
    laeufer.style.width = `${aktiv.offsetWidth}px`;
    laeufer.style.transform = `translateX(${aktiv.offsetLeft}px)`;
    // Rechner-Knopf einblenden, wenn weder der Einschub noch Schritt 2/3 zu sehen sind
    const e = $('start').getBoundingClientRect();
    const einschubImBild = e.bottom > 70 && e.top < innerHeight;
    const imRechner = $('ergebnis').getBoundingClientRect().top < innerHeight * 0.7 && $('handeln').getBoundingClientRect().bottom > innerHeight * 0.3;
    $('schweber').classList.toggle('sichtbar', !einschubImBild && !imRechner);
  };
  window.addEventListener('scroll', markiere, { passive: true });
  window.addEventListener('resize', markiere);
  document.fonts.ready.then(markiere);
  markiere();

  // Reiter in Schritt 3 (Reihenfolge: Petition, Teilen, Brief; Petition ist beim Laden gewählt).
  // Pfeiltasten, Pos1 und Ende wechseln wie bei Reitern üblich; nur der gewählte Reiter ist per Tab erreichbar.
  const reiter = [...document.querySelectorAll('[data-reiter]')];
  const waehle = (b, fokus = false) => {
    reiter.forEach((x) => {
      x.setAttribute('aria-selected', String(x === b));
      x.tabIndex = x === b ? 0 : -1;
      $(`feld-${x.dataset.reiter}`).hidden = x !== b;
    });
    if (fokus) b.focus();
  };
  reiter.forEach((b, i) => {
    b.addEventListener('click', () => waehle(b));
    b.addEventListener('keydown', (e) => {
      const ziel = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: reiter.length - 1 }[e.key];
      if (ziel === undefined) return;
      e.preventDefault();
      waehle(reiter[(ziel + reiter.length) % reiter.length], true);
    });
  });
  waehle(reiter[0]);
  // Zeile „Danach:" unter jedem Feld: anderen Reiter wählen und zum Anfang von Schritt 3
  document.querySelectorAll('[data-danach]').forEach((b) =>
    b.addEventListener('click', () => {
      waehle(reiter.find((x) => x.dataset.reiter === b.dataset.danach));
      geheZu('handeln');
    }),
  );

  // Diagramme in aufgeklappten Abschnitten in der richtigen Breite zeichnen
  document.querySelectorAll('.akkordeon details').forEach((d) =>
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      karte();
      statistik();
    }),
  );
  // Klappe unter dem Ergebnis: genauere Eingaben samt Monatsverlauf
  document.querySelectorAll('[data-klappe]').forEach((b) =>
    b.addEventListener('click', () => {
      const feld = $(b.dataset.klappe);
      feld.hidden = !feld.hidden;
      b.setAttribute('aria-expanded', String(!feld.hidden));
      if (feld.hidden) return;
      if (b.dataset.klappe === 'genauer') verlauf(true); // erst jetzt hat das Diagramm seine Breite
      // nur scrollen, wenn die Klappe sonst unter dem Fensterrand läge
      if (feld.getBoundingClientRect().top > innerHeight - 60) feld.scrollIntoView({ behavior: RUHIG ? 'auto' : 'smooth', block: 'nearest' });
    }),
  );

  // Handy-Klappen (Kopiertext beim Teilen, „Anpassen" im Brief): am Desktop immer offen, die Zeile
  // zum Aufklappen ist dort ausgeblendet; am Handy zugeklappt
  const desktop = matchMedia('(min-width: 900px)');
  const klappen = () => document.querySelectorAll('details.handyklappe').forEach((d) => (d.open = desktop.matches));
  desktop.addEventListener('change', klappen);
  klappen();
  // Brief am Handy: zuerst einige Zeilen, ganz und bearbeitbar nach „Brief ansehen und bearbeiten"
  const blattAuf = (auf) => {
    $('brieftext').classList.toggle('offen', auf);
    $('b-ganz').setAttribute('aria-expanded', String(auf));
    $('b-ganz').textContent = auf ? 'Brief einklappen' : 'Brief ansehen und bearbeiten';
  };
  $('b-ganz').addEventListener('click', () => blattAuf(!$('brieftext').classList.contains('offen')));
  $('brieftext').addEventListener('focus', () => blattAuf(true));

  // Einblenden beim Scrollen. Geprüft wird bei jedem Scrollen und zusätzlich im Takt, damit auch
  // in einem verdeckten oder gedrosselten Fenster nichts unsichtbar bleibt.
  let offen = [...document.querySelectorAll('[data-zeig]')];
  if (RUHIG) {
    offen.forEach((el) => el.classList.add('da'));
    return;
  }
  const zeige = () => {
    offen = offen.filter((el) => {
      const r = el.getBoundingClientRect();
      // display: contents (Rechner-Spalte am Handy) hat keinen eigenen Kasten: gilt als sichtbar
      if (r.top > innerHeight * 0.94 || (r.width === 0 && getComputedStyle(el).display !== 'contents')) return true;
      el.classList.add('da');
      // Balken in Schritt 2: Zahlen laufen beim ersten Einblenden von 0 hoch (die Höhen wachsen per CSS)
      if (el.id === 'saeulen') el.querySelectorAll('#delta-zahl, #summe-heute, #summe-geplant').forEach((z) => zaehle(z, z._wert ?? 0, undefined, 0));
      return false;
    });
    if (offen.length === 0) {
      clearInterval(takt);
      window.removeEventListener('scroll', zeige);
    }
  };
  const takt = setInterval(zeige, 400);
  window.addEventListener('scroll', zeige, { passive: true });
  window.addEventListener('resize', zeige);
  zeige();
}

// ---------- Start ----------
// Das Fragment trägt entweder die Eingaben (#einkA=…, älterer geteilter Link) oder ein Sprungziel
// (#methodik, etwa aus dem Impressum). Eingaben werden übernommen und danach aus der Adresse entfernt.
const sprungziel = (hash) => (hash.includes('=') ? '' : hash.slice(1));
const startziel = sprungziel(location.hash);
// Geteilter Link: Zustand in der Adresse, also eigene Zahlen; die Seite springt gleich zum Ergebnis
const geteilt = location.hash.includes('=');
if (geteilt) history.scrollRestoration = 'manual'; // sonst setzt der Browser beim Neuladen die alte Position darüber
eigeneZahlen = geteilt;
titelSetzen();
ausUrl();
if (geteilt) adresseLeeren();
formularFuellen();
formularVerdrahten();
karteVerdrahten();
briefVerdrahten();
teilenVerdrahten();
rueckmeldungVerdrahten();
symboleEinsetzen();
stimmenBauen();
statistik();
rechne();
fuehrungVerdrahten();
if (startziel) geheZu(startziel, true);
else if (geteilt) geheZu('ergebnis', true);
// Meldung an js/vorab.js: Start gelungen, die Einblendungen laufen (sonst nimmt vorab.js sie zurück)
document.documentElement.dataset.bereit = '1';

window.addEventListener('hashchange', () => {
  if (!location.hash.includes('=')) return geheZu(sprungziel(location.hash));
  eigeneZahlen = true;
  titelSetzen();
  ausUrl();
  adresseLeeren();
  formularFuellen();
  rechne();
  geheZu('ergebnis');
});

// Diagramme werden in der Breite ihres Behälters gezeichnet: bei neuer Fensterbreite neu zeichnen
let fensterbreite = innerWidth;
let warten;
window.addEventListener('resize', () => {
  if (innerWidth === fensterbreite) return;
  fensterbreite = innerWidth;
  clearTimeout(warten);
  warten = setTimeout(() => {
    statistik();
    rechne();
  }, 150);
});
