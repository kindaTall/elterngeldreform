/**
 * Ergebnis teilen: Bild (Canvas → PNG, 1080×1350), Web Share API, Links zu Netzwerken.
 * Das Bild enthält nur Rechenwerte und die Aussage des Ministeriums (MINISTERIUM_ZITAT). Netzwerk-Links öffnen die Seite des Netzwerks erst nach Klick;
 * vorher wird nichts an Dritte übertragen. Summen und Differenz stehen in ganzen Euro, die Differenz
 * aus den gerundeten Summen (ganzeDifferenz). Tests: test/teilen.test.js
 */
import { euro, euroDiff, ganzeDifferenz } from './diagramme.js';

const FARBEN = { grund: '#ffffff', tinte: '#101216', grau: '#525964', linie: '#e1e4e9', verlust: '#d0321d', gewinn: '#12805a' };

/**
 * Aussage des Ministeriums, mit der das Bild und der Teilen-Text beginnen (wörtlich).
 * Quelle: Seite des BMBFSFJ zum Gesetzgebungsvorhaben, Stand 12.11.2026:
 * https://www.bmbfsfj.bund.de/bmbfsfj/ministerium/gesetze/entwurf-eines-gesetzes-zur-aenderung-des-bundeselterngeld-und-elternzeitgesetzes-zur-weiterentwicklung-und-vereinfachung-des-elterngeldes-sowie-des-mutterschutzgesetzes-298792
 * Urheber ist das Ministerium (nicht „die Bundesregierung").
 */
export const MINISTERIUM_ZITAT = 'Das Elterngeld soll mit der Reform partnerschaftlicher, finanziell attraktiver und einfacher werden.';
/** Der Teil des Zitats, den der Teilen-Text wörtlich übernimmt. */
const MINISTERIUM_KURZ = 'partnerschaftlicher, finanziell attraktiver und einfacher';

/** Halbsatz zur Bedingung, unter der die gezeigte Zahl gilt: die Partnermonate im Entwurf. */
function bedingung({ eingabe, gezeigt }) {
  if (eingabe.alleinerziehend) return '';
  const p = gezeigt.neu.plan.monateB;
  const n = gezeigt.entfalleneMonate;
  const partner = p === 0 ? 'wenn der Partner kein Elterngeld nimmt' : `wenn der Partner ${p} Monate nimmt`;
  return n > 0 ? `${partner}, ${n === 1 ? '1 Monat verfällt' : `${n} Monate verfallen`}` : partner;
}

/**
 * Eine Zahl je Familie: das in Schritt 2 gezeigte Ergebnis samt seiner Bedingung.
 * @param {{eingabe: object, gezeigt: object}} aktuell siehe main.js
 */
export function teiltext(aktuell, url) {
  const { eingabe, gezeigt: v } = aktuell;
  const wer = eingabe.alleinerziehend ? 'Für mich' : 'Für unsere Familie';
  const b = bedingung(aktuell);
  const g = ganzeDifferenz(v);
  return `Das Familienministerium sagt, das Elterngeld solle \u201E${MINISTERIUM_KURZ}\u201C werden. ${wer} hieße das ${euroDiff(g.differenz)} (${euro(g.neu)} statt ${euro(g.alt)})${b ? `, ${b}` : ''}. Was wäre es bei dir? ${url} #Elterngeld #Elterngeldreform`;
}

export function netzwerke(text, url) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return [
    { name: 'WhatsApp', href: `https://wa.me/?text=${t}` },
    { name: 'Bluesky', href: `https://bsky.app/intent/compose?text=${t}` },
    { name: 'Threads', href: `https://www.threads.net/intent/post?text=${t}` },
    { name: 'X', href: `https://x.com/intent/post?text=${t}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: 'E-Mail', href: `mailto:?subject=${encodeURIComponent('Elterngeldreform 2027: Rechner')}&body=${t}` },
  ];
}

/**
 * Zeile für das Bild Alleinerziehender: Monatsbetrag ab dem 9. Bezugsmonat (im Entwurf nach den
 * acht 80-%-Monaten) gegen heute. Nur wenn er dann wirklich niedriger ist, sonst ''.
 */
export function spaeterWeniger(v) {
  const ab = 9;
  const heute = v.alt.monate.A[ab - 1], dann = v.neu.monate.A[ab - 1];
  if (!heute || !dann || Math.round(dann.betrag) >= Math.round(heute.betrag)) return '';
  return `Ab dem ${ab}. Bezugsmonat ${euro(dann.betrag)} statt ${euro(heute.betrag)} im Monat`;
}

/**
 * Text auf Zeilen verteilen, die höchstens `breite` messen; ein einzelnes zu langes Wort bleibt ganz.
 * @param {(t: string) => number} messe Breite eines Textes, z. B. (t) => c.measureText(t).width
 */
export function umbrechen(text, breite, messe) {
  const zeilen = [];
  let zeile = '';
  for (const wort of text.split(' ')) {
    const laenger = zeile ? `${zeile} ${wort}` : wort;
    if (zeile && messe(laenger) > breite) {
      zeilen.push(zeile);
      zeile = wort;
    } else zeile = laenger;
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

export async function zeichne(canvas, aktuell) {
  const { eingabe, gezeigt: v, seite } = aktuell;
  const g = ganzeDifferenz(v);
  await document.fonts.ready;
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, R = 80;
  const allein = !!eingabe.alleinerziehend;
  const schrift = (px, stil = 500) => `${stil} ${px}px "Schibsted Grotesk", system-ui, sans-serif`;
  const eng = (em, px) => { if ('letterSpacing' in c) c.letterSpacing = `${(em * px).toFixed(1)}px`; };
  const plan = (r) => (allein ? `${r.plan.monateA} Monate` : `Mutter ${r.plan.monateA}, Partner ${r.plan.monateB} Monate`);

  c.fillStyle = FARBEN.grund;
  c.fillRect(0, 0, W, H);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';

  const breit = W - 2 * R;
  const messe = (t) => c.measureText(t).width;
  const zeile = (text, px, stil, farbe, y, hoehe) => {
    c.font = schrift(px, stil);
    c.fillStyle = farbe;
    for (const teil of umbrechen(text, breit, messe)) {
      c.fillText(teil, R, y);
      y += hoehe;
    }
    return y;
  };

  eng(0, 0);
  zeile('Elterngeldreform · Entwurf vom 12.11.2026', 30, 600, FARBEN.grau, 118, 0);
  zeile('Das Familienministerium sagt:', 30, 500, FARBEN.grau, 184, 0);
  // Zitat, umbrochen; y ist danach die Grundlinie unter der letzten Zeile
  let y = zeile(`\u201E${MINISTERIUM_ZITAT}\u201C`, 40, 600, FARBEN.tinte, 244, 54);

  y += 40;
  c.font = schrift(60, 700);
  eng(-0.025, 60);
  c.fillStyle = FARBEN.tinte;
  c.fillText(allein ? 'Für mich hieße das:' : 'Für unsere Familie hieße das:', R, y + 48);
  y += 48;

  // große Zahl: etwas kleiner bei fünfstelligen Beträgen, nie breiter als der Platz zwischen den Rändern
  const zahl = euroDiff(g.differenz);
  let gross = Math.abs(g.differenz) >= 10000 ? 176 : 200;
  const setzeGross = () => { c.font = schrift(gross, 800); eng(-0.02, gross); };
  setzeGross();
  while (messe(zahl) > breit && gross > 80) { gross -= 4; setzeGross(); }
  c.fillStyle = g.differenz < 0 ? FARBEN.verlust : g.differenz > 0 ? FARBEN.gewinn : FARBEN.tinte;
  y += 36 + Math.round(gross * 0.72);
  c.fillText(zahl, R - 10, y);

  eng(0, 0);
  y = zeile('Elterngeld über die gesamte Bezugszeit', 38, 500, FARBEN.grau, y + 64, 0);
  const bed = allein ? spaeterWeniger(v) : bedingung(aktuell).replace(/^./, (z) => z.toUpperCase());
  if (bed) zeile(bed, 32, 500, FARBEN.grau, y + 54, 44);

  // unten, direkt über dem Fußstreifen: Netto, Heute/Entwurf, Quelle des Zitats
  const unten = [
    [allein ? `Netto vor der Geburt: ${euro(eingabe.nettoA)}, alleinerziehend` : `Netto vor der Geburt: ${euro(eingabe.nettoA)} und ${euro(eingabe.nettoB)}`, 28],
    [`Heute ${plan(v.alt)}: ${euro(g.alt)}`, 28],
    [`Entwurf ${plan(v.neu)}: ${euro(g.neu)}`, 28],
    ['Zitat: bmbfsfj.bund.de, 12.11.2026 · Modellrechnung, ohne Gewähr', 24],
  ];
  const teile = [];
  for (const [t, px] of unten) {
    c.font = schrift(px, 500);
    for (const teil of umbrechen(t, breit, messe)) teile.push([teil, px]);
  }
  const start = H - 120 - 40 - (teile.length - 1) * 38;
  let yu = start;
  for (const [t, px] of teile) {
    c.font = schrift(px, 500);
    c.fillStyle = FARBEN.grau;
    c.fillText(t, R, yu);
    yu += 38;
  }
  c.strokeStyle = FARBEN.linie;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(R, start - 52);
  c.lineTo(W - R, start - 52);
  c.stroke();

  c.fillStyle = FARBEN.tinte;
  c.fillRect(0, H - 120, W, 120);
  c.fillStyle = '#fff';
  c.font = schrift(32, 500);
  c.fillText('Selbst nachrechnen:', R, H - 48);
  c.font = schrift(40, 700);
  c.textAlign = 'right';
  c.fillText(seite, W - R, H - 46);
  c.textAlign = 'left';
}

export function alsBlob(canvas) {
  return new Promise((ok) => canvas.toBlob(ok, 'image/png'));
}
