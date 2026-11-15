/**
 * Verdrahtung der Seite: Zustand ↔ Formulare ↔ URL-Fragment ↔ Ausgaben, dazu die Führung in
 * drei Schritten (Kopfleiste, Sprungziele), Reiter, aufklappbare Abschnitte und Einblendungen.
 *
 * Schritt 2 zeigt eine Zahl: dieselbe Aufteilung nach geltendem Recht und nach dem Entwurf
 * (vergleiche() in calc/szenario.js; was der Entwurf nicht zulässt, entfällt). Die Aufteilung
 * ergibt sich aus den Partnermonaten `monB` (0 oder 2 bis 12; Standard 2, wie bei den meisten
 * Familien) und den Monaten der Mutter `monA` (0 = so viele wie möglich; unter „Genauer rechnen").
 * Die Liste „Aber nur, wenn:" zeigt das Ergebnis mit 4 bzw. 2 Partnermonaten zum Vergleich.
 * Beträge erscheinen nur je Familie, nie getrennt nach Mutter und Vater; Summen und Differenz
 * stehen in ganzen Euro, die Differenz aus den gerundeten Summen (ganzeDifferenz in ui/diagramme.js).
 * Der Zustand selbst (Standardwerte, URL-Fragment, Eingabe für den Rechenkern, Aufteilung der
 * Monate) liegt ohne DOM in ui/zustand.js.
 */
import { NEU } from './calc/regeln.js';
import { spanne, FAMILIEN, PARTNER_MIT_BEZUG, KINDER_MIT_ELTERNGELD, GEBURTEN, JAHRGANG } from './calc/bevoelkerung.js';
import { STANDARD, PARTNERMONATE, ausHash, alsHash, nettoVon, grundlage, vergleichsmonate, fuerPartnermonate as planVergleich, planhinweis } from './ui/zustand.js';
import { monatsdiagramm, heatmap, heatmapLegende, differenzbalken, euro, euroDiff, ganzeDifferenz } from './ui/diagramme.js';
import { ADRESSATEN, brief, mailto } from './ui/brief.js';
import { teiltext, netzwerke, zeichne, alsBlob } from './ui/teilen.js';
import { BETREFF, versandweg, meldungstext, sende } from './ui/rueckmeldung.js';
import { RUECKMELDUNG } from './config.js';
import { leisteBauen, listeBauen } from './ui/stimmenansicht.js';

const $ = (id) => document.getElementById(id);
const SEITE = location.origin + location.pathname;
const RUHIG = matchMedia('(prefers-reduced-motion: reduce)').matches;

let andereOffen = false;
const zustand = { ...STANDARD };
let kartenplan = '12-2';

// ---------- Zustand ↔ URL (Regeln in ui/zustand.js) ----------
function ausUrl() {
  Object.assign(zustand, ausHash(location.hash));
}
/** Adresse mit den Eingaben: für die Adresszeile und für alles, was weitergegeben wird. */
function teilUrl() {
  const s = alsHash(zustand);
  return s ? `${SEITE}#${s}` : SEITE;
}
let urlWarten;
/**
 * Adresszeile nachführen, 250 ms nach der letzten Eingabe: Safari lehnt replaceState nach 100
 * Aufrufen in kurzer Zeit mit einem SecurityError ab (Regler ziehen, Zahl tippen).
 */
function urlNachfuehren() {
  clearTimeout(urlWarten);
  urlWarten = setTimeout(() => {
    try {
      history.replaceState(null, '', teilUrl().replace(SEITE, '') || location.pathname);
    } catch {
      // die Adresse bleibt stehen, gerechnet wird trotzdem
    }
  }, 250);
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
  $('um').checked = vergleichsmonate(z.monB).angehakt;
  $('nur-wenn').classList.toggle('aus', !!z.allein); // Alleinerziehende: keine Bedingungen, der ganze Block samt Überschrift verschwindet
  const andere = andereOffen || ![0, 2, 4].includes(z.monB);
  document.querySelectorAll('[data-monb]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.monb === 'andere' ? andere : !andere && Number(b.dataset.monb) === z.monB)));
  $('monB-regler').classList.toggle('unsichtbar', !andere); // bleibt im Layout, damit nichts springt
  $('monB').value = PARTNERMONATE.indexOf(z.monB);
  $('monB-out').textContent = z.monB === 0 ? 'keine' : `${z.monB} Monate`;
  $('lesart').checked = !!z.lesart;
  $('d-monA').value = z.monA;
  $('d-monB').value = z.monB;
  $('feld-monA').hidden = !!z.allein;
  $('mutterschutz').checked = !!z.ms;
  $('mutterschutz').disabled = !(nettoVon(z, 'A') > 0); // ohne Einkommen kein Mutterschaftsgeld; der Haken bleibt im Zustand
  $('allein').checked = $('s-allein').checked = !!z.allein;
  $('geschwister').checked = !!z.geschw;
  $('mehrlinge').value = z.mehr;
  $('kirche').value = z.kirche;
  $('gruppeB').hidden = $('s-partner').hidden = !!z.allein;
  $('schnell').classList.toggle('allein', !!z.allein);
  document.querySelectorAll('[data-modus]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modus === z.modus)));
  document.querySelectorAll('[data-nur="brutto"]').forEach((e) => (e.hidden = z.modus !== 'brutto'));
  document.querySelectorAll('[data-einklabel]').forEach((e) => (e.textContent = z.modus === 'brutto' ? 'Brutto pro Monat vor der Geburt' : 'Netto pro Monat vor der Geburt'));
  document.querySelectorAll('[data-einkwort]').forEach((e) => (e.textContent = z.modus));
}

function formularVerdrahten() {
  const setze = (k, v) => {
    zustand[k] = v;
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
  $('um').addEventListener('change', (e) => partner(e.target.checked ? NEU.reservierteMonate : 2));
  document.querySelectorAll('[data-monb]').forEach((b) => b.addEventListener('click', () => (b.dataset.monb === 'andere' ? partner(zustand.monB, true) : partner(Number(b.dataset.monb)))));
  $('monB').addEventListener('input', (e) => partner(PARTNERMONATE[Number(e.target.value)], true));
  $('d-monB').addEventListener('change', (e) => partner(Number(e.target.value)));
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

/** Zahl von ihrem bisherigen Wert zum neuen laufen lassen. */
function zaehle(el, ziel, von = el._wert ?? 0) {
  cancelAnimationFrame(el._lauf);
  clearTimeout(el._sicher);
  el._wert = ziel;
  // In einem verdeckten Fenster laufen keine Bilder: dann sofort den Endwert zeigen
  if (RUHIG || von === ziel || document.hidden) {
    el.textContent = euroDiff(ziel);
    return;
  }
  const start = performance.now();
  const dauer = 550;
  // Sicherung, falls die Animation gedrosselt wird: nie auf einem Zwischenwert stehen bleiben
  el._sicher = setTimeout(() => {
    cancelAnimationFrame(el._lauf);
    el.textContent = euroDiff(ziel);
  }, dauer + 250);
  const schritt = (jetzt) => {
    const t = Math.max(0, Math.min(1, (jetzt - start) / dauer)); // Bildzeit kann vor dem Start liegen
    const k = 1 - Math.pow(1 - t, 3);
    el.textContent = euroDiff(t < 1 ? Math.round((von + (ziel - von) * k) / 10) * 10 : ziel);
    if (t < 1) el._lauf = requestAnimationFrame(schritt);
  };
  el._lauf = requestAnimationFrame(schritt);
}

const prozent = (x) => `${String(Math.abs(x)).replace('.', ',')} %`;
const faerbe = (el, v) => {
  el.classList.toggle('verlust', v.differenz < 0);
  el.classList.toggle('gewinn', v.differenz > 0);
};
/** Aufteilung in Worten: „Mutter 12 Monate, Partner:in 2 Monate". */
const ausgeschrieben = (r, allein) =>
  allein ? `${r.plan.monateA} Monate` : `Mutter ${r.plan.monateA} Monate, Partner:in ${r.plan.monateB === 0 ? 'kein Elterngeld' : `${r.plan.monateB} Monate`}`;
const kurz = (r, allein) => (allein ? `${r.plan.monateA} Monate` : `Mutter ${r.plan.monateA}, Partner:in ${r.plan.monateB} Monate`);

function rechne() {
  const e = grundlage(zustand);
  const allein = e.alleinerziehend;
  const p = zustand.monB;
  const gezeigt = fuerPartnermonate(e, p);
  aktuell = { eingabe: { ...e, ...gezeigt.alt.plan }, gezeigt };

  const ausBrutto = zustand.modus === 'brutto' ? ' (aus eurem Brutto so berechnet wie in den Elterngeldstellen)' : '';
  $('annahme').textContent = allein
    ? `Gerechnet für ${euro(e.nettoA)} netto im Monat${ausBrutto}, alleinerziehend.`
    : `Gerechnet für ${euro(e.nettoA)} und ${euro(e.nettoB)} netto im Monat${ausBrutto}.`;

  // Aufteilung ausgeschrieben: heute und im Entwurf, verfallende Monate in Rot
  const n = gezeigt.entfalleneMonate;
  const zeile = (begriff, text, rot) => {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = `${begriff}:`;
    li.append(b, ` ${text}`);
    if (rot) {
      const s = document.createElement('span');
      s.className = 'verfallen';
      s.textContent = rot;
      li.append(', ', s);
    }
    return li;
  };
  $('aufteilung').replaceChildren(
    zeile('Heute', ausgeschrieben(gezeigt.alt, allein)),
    zeile('Im Entwurf', ausgeschrieben(gezeigt.neu, allein) + (allein ? `, davon ${NEU.achtzigMonateAlleinerziehend} mit 80 %` : ''), n > 0 ? (n === 1 ? '1 Monat verfällt' : `${n} Monate verfallen`) : ''),
  );

  // Hinweis unter „Genauer rechnen", wenn nach geltendem Recht anders aufgeteilt wird als gewählt
  const hinweis = planhinweis(zustand, e, gezeigt.alt.plan);
  $('planhinweis').textContent = hinweis;
  $('planhinweis').hidden = !hinweis;

  // Die eine große Zahl: Differenz der gerundeten Summen, damit sie zum Satz darunter passt
  const block = $('ergebnisblock');
  const g = ganzeDifferenz(gezeigt);
  faerbe(block, g);
  block.classList.toggle('lang', Math.abs(g.differenz) >= 10000);
  zaehle($('ergebnis-zahl'), g.differenz);
  $('ergebnis-satz').textContent =
    `${euro(g.neu)} statt ${euro(g.alt)} Elterngeld über die gesamte Bezugszeit` +
    (g.differenz === 0 || g.prozent === 0 ? '.' : `, ${prozent(g.prozent)} ${g.differenz < 0 ? 'weniger' : 'mehr'}.`);

  // Zum Vergleich: das Ergebnis mit 4 Partnermonaten (ohne Haken) bzw. mit 2 (mit Haken)
  if (!allein) {
    const { angehakt, andere } = vergleichsmonate(p);
    const d = ganzeDifferenz(fuerPartnermonate(e, andere)).differenz;
    $('zeile-um').classList.toggle('weg', !angehakt);
    const betrag = document.createElement('b');
    betrag.textContent = euroDiff(d);
    betrag.className = d < 0 ? 'minus' : d > 0 ? 'plus' : '';
    $('preis-um').replaceChildren(`mit ${andere} Monaten:`, document.createElement('br'), betrag);
  }

  verlauf(false);
  karte();
  briefAktualisieren();
  teilenAktualisieren();
  urlNachfuehren();
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

function karte() {
  const [a, b] = kartenplan.split('-').map(Number);
  const bereich = heatmap($('heatmap'), {
    monateA: a,
    monateB: b,
    markierung: aktuell && !aktuell.eingabe.alleinerziehend ? { nettoA: aktuell.eingabe.nettoA, nettoB: aktuell.eingabe.nettoB } : undefined,
    optionen: { mutterschutzVerbraucht80: !!zustand.lesart },
  });
  heatmapLegende($('heatmap-legende'), bereich);
  $('karte-unter').textContent = `Heute: Mutter ${a} Monate (davon 2 im Mutterschutz, wenn sie Einkommen hat), Partner:in ${b} Monate. Euro über die gesamte Bezugszeit.`;
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
  const kz = [
    [`−${mrd(s.bis(diff))} bis −${mrd(s.von(diff))} Mrd. €`, 'minus', `weniger Elterngeld für einen Geburtsjahrgang. Das sind etwa ${Math.round(s.von(proz))} bis ${Math.round(s.bis(proz))} % der heutigen Summe.`],
    [`rund ${Math.round(m.anteilVerlierer * 10) * 10}\u00a0%`, 'minus', `der Familien bekämen weniger als heute (je nach Annahme ${pz(s.von(verl))} bis ${pz(s.bis(verl))} %). Im Durchschnitt aller Familien sind es rund ${hundert(jeFamilie(m))} € weniger über die gesamte Bezugszeit (${hundert(s.von(jeFamilie))} bis ${hundert(s.bis(jeFamilie))} €).`],
    [`rund ${Math.round(m.anteilGewinner * 10) * 10}\u00a0%`, '', `der Familien bekämen mehr als heute (${pz(s.von(gew))} bis ${pz(s.bis(gew))} %), vor allem wenn die Mutter vor der Geburt kein oder wenig Einkommen hatte.`],
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
  // Schritt 1 nennt dieselben Zahlen wie der Überschlag, als eigene Schätzung mit Spanne gekennzeichnet.
  // Die Werte im HTML sind der Stand ohne Skript; test/bevoelkerung.test.js hält sie am Modell.
  $('plakat-schnitt').textContent = `−${hundert(jeFamilie(m))}\u00a0€`;
  $('plakat-spanne').textContent = `${hundert(s.von(jeFamilie))} bis ${hundert(s.bis(jeFamilie))}\u00a0€`;
  $('vorspann-anteil').textContent = Math.round(m.anteilVerlierer * 10) * 10;
  $('vorspann-spanne').textContent = `${pz(s.von(verl))} bis ${pz(s.bis(verl))}`;
  const zeilen = (gruppen) => gruppen.map((g) => ({ label: g.klasse, wert: g.differenz }));
  differenzbalken($('stat-aufteilung'), zeilen(m.nachAufteilung), 'Änderung je Familie nach Aufteilung');
  differenzbalken($('stat-einkommen'), zeilen(m.nachEinkommen), 'Änderung je Familie nach Netto der Mutter');
  $('stat-text').textContent =
    `Grundlage: ${n.format(FAMILIEN)} Familien, in denen die Mutter Elterngeld bezogen hat, und ${n.format(PARTNER_MIT_BEZUG)} Väter mit Elterngeld, für ${n.format(KINDER_MIT_ELTERNGELD)} der ${n.format(GEBURTEN)} im Jahr ${JAHRGANG} geborenen Kinder (Statistisches Bundesamt). ` +
    `Die Statistik zählt Mütter und Väter getrennt, nicht als Paare. Für die Familienwerte ist deshalb angenommen, dass jeder dieser Väter zu einer dieser Familien gehört und dass Einkommen und Bezugsdauer beider Elternteile nicht zusammenhängen. „Nur ein Elternteil“ umfasst Alleinerziehende und Paare, in denen der Partner kein Elterngeld bezieht. ` +
    `Einkommen und Bezugsdauer nennt die Statistik nur in Klassen. Die Spanne ergibt sich daraus, wie man die höchsten Einkommen (über 2.770 € netto), ElterngeldPlus und den Anteil der Alleinerziehenden ansetzt; die Balken zeigen eine mittlere Variante. ` +
    `Gerechnet ist mit der Auslegung, dass die Mutterschutzmonate zwei der vier 80-%-Monate verbrauchen. Nach der anderen Auslegung wären es etwa ${mrd(andere.bis(diff))} bis ${mrd(andere.von(diff))} Mrd. € weniger. ` +
    `Nach heutigem Recht ergibt der Überschlag ${mrd(m.alt)} Mrd. € für den Jahrgang; der Bund hat 2024 tatsächlich 7,2 Mrd. € für Elterngeld ausgegeben. ` +
    `Der Gesetzentwurf selbst nennt für 2030 eine Entlastung von 1,36 Mrd. €. Darin sind 140 Mio. € Mehrausgaben für die neue Einkommensermittlung und 25 Mio. € Einsparung beim Partnerschaftsbonus verrechnet; auf die hier gerechneten Regeln entfallen also rund 1,5 Mrd. €. Welche Geburtenzahl und welches Verhalten die Regierung unterstellt, sagt der Entwurf nicht. ` +
    `Würden Paare wegen der Reform anders aufteilen und der Partner mehr Monate nehmen, fiele das Minus beim Elterngeld kleiner aus; dafür fehlte der Familie in diesen Monaten das meist höhere Gehalt. ` +
    `Nicht enthalten: Geschwisterbonus, Mehrlinge, Teilzeit im Bezug, Partnerschaftsbonus, Sonderzahlungen.`;
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
  const status = (t) => {
    $('b-status').textContent = t;
    setTimeout(() => ($('b-status').textContent = ''), 6000);
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
  $('b-mail').addEventListener('click', async () => {
    const d = briefDaten();
    const m = mailto({ ...d, text: text() });
    if (!m.mitText) {
      try {
        await navigator.clipboard.writeText(text());
        status('Der Brief ist zu lang für einen E-Mail-Link. Er liegt in der Zwischenablage: im E-Mail-Programm einfügen.');
      } catch {
        status('Bitte den Brieftext kopieren und im E-Mail-Programm einfügen.');
      }
    }
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
  const url = teilUrl();
  const text = teiltext(aktuell, url);
  $('t-text').textContent = text;
  $('t-netzwerke').replaceChildren(
    ...netzwerke(text, url).map((n) => {
      const a = document.createElement('a');
      a.className = 'knopf';
      a.href = n.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = n.name;
      return a;
    }),
  );
  zeichne($('teilbild'), { ...aktuell, seite: location.host || 'elterngeld-rechner' });
}
function teilenVerdrahten() {
  const status = (t) => {
    $('t-status').textContent = t;
    setTimeout(() => ($('t-status').textContent = ''), 5000);
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
      await navigator.clipboard.writeText(teilUrl());
      status('Link kopiert.');
    } catch {
      status('Kopieren nicht möglich. Der Link steht im Text unter den Knöpfen.');
    }
  });
  $('t-teilen').addEventListener('click', async () => {
    const url = teilUrl();
    const text = teiltext(aktuell, url);
    try {
      const f = await datei();
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], text });
      else if (navigator.share) await navigator.share({ text, url });
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
    url: $('r-eingaben').checked ? teilUrl() : '',
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

  // Reiter in Schritt 3
  const reiter = [...document.querySelectorAll('[data-reiter]')];
  reiter.forEach((b) =>
    b.addEventListener('click', () => {
      reiter.forEach((x) => {
        x.setAttribute('aria-selected', String(x === b));
        $(`feld-${x.dataset.reiter}`).hidden = x !== b;
      });
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
  // Klappen unter dem Ergebnis: Monatsverlauf und genauere Eingaben
  document.querySelectorAll('[data-klappe]').forEach((b) =>
    b.addEventListener('click', () => {
      const feld = $(b.dataset.klappe);
      feld.hidden = !feld.hidden;
      b.setAttribute('aria-expanded', String(!feld.hidden));
      if (feld.hidden) return;
      if (b.dataset.klappe === 'verlauf') verlauf(true);
      // nur scrollen, wenn die Klappe sonst unter dem Fensterrand läge
      if (feld.getBoundingClientRect().top > innerHeight - 60) feld.scrollIntoView({ behavior: RUHIG ? 'auto' : 'smooth', block: 'nearest' });
    }),
  );

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
      if (r.top > innerHeight * 0.94 || r.width === 0) return true;
      el.classList.add('da');
      if (el.classList.contains('fall')) {
        const zahl = el.querySelector('.differenz');
        zaehle(zahl, zahl._wert ?? 0, 0);
      }
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
// Das Fragment trägt entweder die Eingaben (#einkA=…) oder ein Sprungziel (#methodik, etwa aus dem
// Impressum). Das Sprungziel vorab merken: rechne() ersetzt das Fragment durch die Eingaben.
const sprungziel = (hash) => (hash.includes('=') ? '' : hash.slice(1));
const startziel = sprungziel(location.hash);
ausUrl();
formularFuellen();
formularVerdrahten();
briefVerdrahten();
teilenVerdrahten();
rueckmeldungVerdrahten();
stimmenBauen();
statistik();
rechne();
fuehrungVerdrahten();
if (startziel) geheZu(startziel, true);
// Meldung an js/vorab.js: Start gelungen, die Einblendungen laufen (sonst nimmt vorab.js sie zurück)
document.documentElement.dataset.bereit = '1';

window.addEventListener('hashchange', () => {
  if (!location.hash.includes('=')) return geheZu(sprungziel(location.hash));
  ausUrl();
  formularFuellen();
  rechne();
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
