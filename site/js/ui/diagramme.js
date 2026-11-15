/**
 * SVG-Diagramme ohne Bibliothek: Monatsverlauf, Einkommenskarte (Heatmap), Differenzbalken.
 * Jedes Diagramm wird in der Breite seines Behälters gezeichnet (höchstens 560), damit die
 * Schrift auch auf schmalen Bildschirmen lesbar bleibt; main.js zeichnet bei Größenänderung neu.
 */
import { vergleiche } from '../calc/szenario.js';

const NS = 'http://www.w3.org/2000/svg';
const zahl = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const TINTE = '#101216';

// Erst runden, dann das Vorzeichen bestimmen: −0,3 wird „0 €", nicht „−0 €"
const ganz = (x) => Math.round(x) || 0;
export const euro = (x) => `${zahl.format(ganz(x))} €`.replace('-', '−');
export const euroDiff = (x) => (ganz(x) > 0 ? '+' : '') + euro(x);

/**
 * Summen und Differenz eines Vergleichs in ganzen Euro, die Differenz aus den gerundeten Summen:
 * so passen „12.333 € statt 15.658 €" und die Differenz daneben immer zusammen. Überall benutzen,
 * wo beide Summen und die Differenz stehen (Schritt 2, Brief, Teilen-Text, Teilen-Bild).
 * @param {{alt: {summe: number}, neu: {summe: number}}} v Ergebnis von vergleiche()
 * @returns {{alt: number, neu: number, differenz: number, prozent: number}} prozent mit einer Nachkommastelle
 */
export function ganzeDifferenz(v) {
  const alt = ganz(v.alt.summe), neu = ganz(v.neu.summe);
  const differenz = neu - alt;
  return { alt, neu, differenz, prozent: alt > 0 ? Math.round((differenz / alt) * 1000) / 10 || 0 : 0 };
}

function el(name, attrs = {}, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

const breite = (ziel, max = 560) => Math.round(Math.max(280, Math.min(max, ziel.clientWidth || max)));

function svg(w, h, label) {
  const s = el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label });
  const defs = el('defs');
  const p = el('pattern', { id: 'schraffur', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  p.append(el('rect', { width: 5, height: 5, fill: '#fff' }), el('rect', { width: 1.2, height: 5, fill: '#9aa2ad' }));
  defs.append(p);
  s.append(defs);
  return s;
}

/** Auszahlung je Lebensmonat: erst A, anschließend B. */
function zeitreihe(ergebnis) {
  const monate = [...ergebnis.monate.A.map((m) => ({ ...m, wer: 'A' })), ...ergebnis.monate.B.map((m) => ({ ...m, wer: 'B' }))];
  return Array.from({ length: 14 }, (_, i) => monate[i] || null);
}

/**
 * Je Lebensmonat ein breiter grauer Balken (heute) und darin ein schmaler schwarzer (Entwurf).
 * Gezeigt wird die Auszahlung an die Familie, nicht wer sie bezieht.
 */
export function monatsdiagramm(ziel, vergleich) {
  const W = breite(ziel, 760), H = W < 420 ? 220 : W < 620 ? 256 : 300, L = 40, R = 2, T = 14, B = 40;
  const alt = zeitreihe(vergleich.alt);
  const neu = zeitreihe(vergleich.neu);
  const max = Math.max(1900, ...alt.map((m) => m?.betrag || 0), ...neu.map((m) => m?.betrag || 0));
  const oben = Math.ceil(max / 500) * 500;
  const y = (v) => T + (H - T - B) * (1 - v / oben);
  const bw = (W - L - R) / 14;
  const breit = bw - Math.max(3, bw * 0.16);
  const schmal = Math.max(4, breit * 0.4);
  const s = svg(W, H, 'Elterngeld pro Lebensmonat nach geltendem Recht und nach dem Entwurf');
  for (let v = 0; v <= oben; v += 500) {
    if (v > 0) s.append(el('line', { class: 'gitter', x1: L, x2: W - R, y1: y(v), y2: y(v) }));
    s.append(el('text', { x: L - 7, y: y(v) + 4, 'text-anchor': 'end' }, zahl.format(v)));
  }
  for (let i = 0; i < 14; i++) {
    const mitte = L + i * bw + bw / 2;
    const a = alt[i], n = neu[i];
    if (a?.mutterschutz || n?.mutterschutz) {
      const h = Math.min(oben, Math.max(...alt.filter((m) => m && !m.mutterschutz && m.wer === 'A').map((m) => m.betrag), 300));
      const r = el('rect', { class: 'schutz', x: mitte - breit / 2, y: y(h), width: breit, height: y(0) - y(h) });
      r.append(el('title', {}, `Lebensmonat ${i + 1}: Mutterschaftsgeld und Arbeitgeberzuschuss, kein Elterngeld`));
      s.append(r);
    } else {
      if (a) {
        const r = el('rect', { class: 'balken-alt', x: mitte - breit / 2, y: y(a.betrag), width: breit, height: y(0) - y(a.betrag) });
        r.append(el('title', {}, `Lebensmonat ${i + 1}, geltendes Recht: ${euro(a.betrag)}`));
        s.append(r);
      }
      if (n) {
        const r = el('rect', { class: 'balken-neu', x: mitte - schmal / 2, y: y(n.betrag), width: schmal, height: y(0) - y(n.betrag) });
        r.append(el('title', {}, `Lebensmonat ${i + 1}, Entwurf: ${euro(n.betrag)} (${String(n.rate).replace('.', ',')} %)`));
        s.append(r);
      } else if (a) {
        s.append(el('text', { class: 'null', x: mitte, y: y(a.betrag) - 5, 'text-anchor': 'middle' }, '0'));
      }
    }
    s.append(el('text', { x: mitte, y: H - B + 16, 'text-anchor': 'middle' }, String(i + 1)));
  }
  s.append(el('line', { class: 'achse', x1: L, x2: W - R, y1: y(0), y2: y(0) }));
  s.append(el('text', { x: L, y: H - 4 }, 'Lebensmonat des Kindes'));
  ziel.replaceChildren(s);
}

/** Farbe für eine Differenz: Verlust rot, Gewinn grün, 0 = hellgrau. */
function differenzFarbe(d, skala = 5000) {
  const t = Math.max(-1, Math.min(1, d / skala));
  const von = [236, 238, 241];
  const nach = t < 0 ? [200, 44, 26] : [16, 122, 86];
  const k = Math.pow(Math.abs(t), 0.7);
  return `rgb(${von.map((v, i) => Math.round(v + (nach[i] - v) * k)).join(',')})`;
}

/** Raster der Karte: Felder im Abstand von `schritt` € Netto von 0 bis `max`, je Achse `n` Felder. */
export const RASTER = Object.freeze({ schritt: 250, max: 5000, n: 5000 / 250 + 1 });

/**
 * Karte der Differenz über Netto A (x) und Netto B (y) für einen festen Plan. Je Feld gerechnet an
 * genau seinem Punkt (Netto i·250 / j·250). optionen.mutterschutz: Monate Mutterschutz der Mutter
 * mit Einkommen (Standard 2), der Rest geht an vergleiche().
 * Rückgabe: Spanne der Differenzen für die Legende, `felder[i][j]` ({nettoA, nettoB, differenz}, die
 * Differenz in ganzen Euro wie im Rechner), `feldBei(x, y)` (Bildschirmpunkt → {i, j} oder null) und
 * `markiere(feld | null)` für den Rahmen des gewählten Felds.
 * @param {{monateA:number, monateB:number, markierung?:{nettoA:number,nettoB:number}, wahl?:{i:number,j:number}, optionen?:object}} p
 */
export function heatmap(ziel, { monateA, monateB, markierung, wahl, optionen = {} }) {
  const { schritt, max, n } = RASTER;
  const W = breite(ziel), L = 64, R = 2, T = 4, B = 46;
  const H = Math.round(W - L - R) + T + B;
  const zw = (W - L - R) / n, zh = (H - T - B) / n;
  const s = svg(W, H, `Änderung der Elterngeld-Summe nach Netto beider Eltern bei ${monateA} + ${monateB} Monaten`);
  let minD = 0, maxD = 0;
  const felder = [];
  for (let i = 0; i < n; i++) {
    felder.push([]);
    for (let j = 0; j < n; j++) {
      const nettoA = i * schritt, nettoB = j * schritt;
      const v = vergleiche({ ...optionen, nettoA, nettoB, monateA, monateB, mutterschutzMonate: nettoA > 0 ? (optionen.mutterschutz ?? 2) : 0 });
      minD = Math.min(minD, v.differenz);
      maxD = Math.max(maxD, v.differenz);
      felder[i].push({ nettoA, nettoB, differenz: ganzeDifferenz(v).differenz });
      s.append(el('rect', { x: L + i * zw, y: T + (n - 1 - j) * zh, width: zw - 1, height: zh - 1, fill: differenzFarbe(v.differenz) }));
    }
  }
  // Rahmen des gewählten Felds (eckig, dünn; der Kreis der eigenen Lage bleibt rund)
  const rahmen = el('rect', { class: 'wahl', fill: 'none', stroke: TINTE, 'stroke-width': 1.5, 'pointer-events': 'none', visibility: 'hidden' });
  const markiere = (f) => {
    rahmen.setAttribute('visibility', f ? 'visible' : 'hidden');
    if (!f) return;
    rahmen.setAttribute('x', L + f.i * zw + 0.75);
    rahmen.setAttribute('y', T + (n - 1 - f.j) * zh + 0.75);
    rahmen.setAttribute('width', zw - 2.5);
    rahmen.setAttribute('height', zh - 2.5);
  };
  markiere(wahl);
  s.append(rahmen);
  const feldBei = (clientX, clientY) => {
    const b = s.getBoundingClientRect();
    if (!b.width) return null;
    const i = Math.floor(((clientX - b.left) * (W / b.width) - L) / zw);
    const j = n - 1 - Math.floor(((clientY - b.top) * (H / b.height) - T) / zh);
    return i >= 0 && i < n && j >= 0 && j < n ? { i, j } : null;
  };
  for (let k = 0; k <= max; k += 1000) {
    const i = k / schritt;
    s.append(el('text', { x: L + i * zw + zw / 2, y: H - B + 16, 'text-anchor': 'middle' }, zahl.format(k)));
    s.append(el('text', { x: L - 7, y: T + (n - 1 - i) * zh + zh / 2 + 4, 'text-anchor': 'end' }, zahl.format(k)));
  }
  s.append(el('text', { x: L + (W - L - R) / 2, y: H - 6, 'text-anchor': 'middle' }, 'Netto der Mutter vor der Geburt, € pro Monat'));
  s.append(el('text', { x: 10, y: T + (H - T - B) / 2, 'text-anchor': 'middle', transform: `rotate(-90 10 ${T + (H - T - B) / 2})` }, 'Netto Partner:in, € pro Monat'));
  if (markierung) {
    const cx = L + (Math.min(max, markierung.nettoA) / schritt) * zw + zw / 2;
    const cy = T + (n - 1 - Math.min(max, markierung.nettoB) / schritt) * zh + zh / 2;
    s.append(el('circle', { cx, cy, r: 8, fill: 'none', stroke: '#fff', 'stroke-width': 5 }));
    s.append(el('circle', { cx, cy, r: 8, fill: 'none', stroke: TINTE, 'stroke-width': 2 }));
    const links = cx > W - 40;
    s.append(el('text', { x: links ? cx - 13 : cx + 13, y: cy + 4, 'text-anchor': links ? 'end' : 'start', style: `fill:${TINTE};font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:3px` }, 'ihr'));
  }
  ziel.replaceChildren(s);
  return { min: minD, max: maxD, felder, feldBei, markiere };
}

export function heatmapLegende(ziel, { min, max }) {
  const W = breite(ziel), H = 40, L = 64, R = 2;
  const s = svg(W, H, 'Farbskala');
  const stufen = 40;
  const von = Math.min(min, -1), bis = Math.max(max, 1);
  for (let i = 0; i < stufen; i++) {
    const d = von + ((bis - von) * (i + 0.5)) / stufen;
    s.append(el('rect', { x: L + (i * (W - L - R)) / stufen, y: 6, width: (W - L - R) / stufen + 0.5, height: 10, fill: differenzFarbe(d) }));
  }
  const x0 = L + ((0 - von) / (bis - von)) * (W - L - R);
  s.append(el('line', { class: 'achse', x1: x0, x2: x0, y1: 3, y2: 19 }));
  s.append(el('text', { x: L, y: 33 }, `${euroDiff(von)} (weniger)`));
  s.append(el('text', { x: W - R, y: 33, 'text-anchor': 'end' }, `${euroDiff(bis)} (mehr)`));
  ziel.replaceChildren(s);
}

/** Waagerechte Balken um die Nulllinie. @param {{label:string, wert:number}[]} zeilen */
export function differenzbalken(ziel, zeilen, label) {
  const W = breite(ziel), zeile = 30, R = 64, T = 4;
  const L = Math.max(...zeilen.map((z) => z.label.length)) * 6.1 + 12; // Platz für die längste Beschriftung
  const H = T + zeilen.length * zeile + 6;
  const min = Math.min(0, ...zeilen.map((z) => z.wert)), max = Math.max(0, ...zeilen.map((z) => z.wert));
  const spanne = max - min || 1;
  const x = (v) => L + ((v - min) / spanne) * (W - L - R);
  const s = svg(W, H, label);
  zeilen.forEach((z, i) => {
    const yy = T + i * zeile;
    s.append(el('text', { x: 0, y: yy + 19 }, z.label));
    const x1 = Math.min(x(0), x(z.wert)), w = Math.max(1, Math.abs(x(z.wert) - x(0)));
    s.append(el('rect', { x: x1, y: yy + 8, width: w, height: zeile - 16, fill: z.wert < 0 ? 'var(--verlust)' : 'var(--gewinn)' }));
    s.append(el('text', { class: 'fett', x: Math.max(x(0), x(z.wert)) + 7, y: yy + 19 }, euroDiff(z.wert)));
  });
  s.append(el('line', { class: 'achse', x1: x(0), x2: x(0), y1: T, y2: H - 6 }));
  ziel.replaceChildren(s);
}
