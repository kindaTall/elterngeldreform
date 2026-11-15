/**
 * Ergebnis teilen: Bild (Canvas → PNG, 1080×1350, 4:5), Web Share API, Links zu Netzwerken.
 * Aufbau des Bildes „Versprechen gegen Ergebnis": oben weiß der wörtliche Satz des Ministeriums
 * (MINISTERIUM_ZITAT, „finanziell attraktiver" rot unterstrichen, nur bei weniger Geld), darunter die
 * Quelle; unten ein Farbblock (rot bei weniger, grün bei mehr, dunkel bei gleich) mit der Differenz je
 * Familie, den beiden Summen und der Bedingung. Die Texte stehen als reine Funktion in bildTexte(),
 * gezeichnet wird in zeichne(). Auf dem Bild steht immer die feste Adresse ADRESSE.
 * Geteilt wird immer die schlichte Adresse TEILADRESSE, nie der Zustand des Rechners: Text und Bild
 * nennen das Ergebnis der Familie (Differenz, Summen, Bedingung), aber kein Einkommen; wer den Link
 * öffnet, sieht den Rechner mit den Vorgabewerten.
 * Es enthält nur Rechenwerte und das Zitat; Netzwerk-Links öffnen die Seite des Netzwerks erst nach Klick,
 * vorher wird nichts an Dritte übertragen. Summen und Differenz in ganzen Euro, die Differenz aus den
 * gerundeten Summen (ganzeDifferenz). Tests: test/teilen.test.js
 */
import { euro, euroDiff, ganzeDifferenz } from './diagramme.js';

const FARBEN = { grund: '#ffffff', tinte: '#101216', grau: '#525964', grau2: '#6b7380', verlust: '#d0321d', gewinn: '#12805a' };
const ADRESSE = 'elterngeld2027.de';
/** Adresse in Teilen-Text, Netzwerk-Links, „Link kopieren" und Teilen-Menü: ohne Eingaben. */
export const TEILADRESSE = 'https://elterngeld2027.de/';

/**
 * Aussage des Ministeriums, mit der das Bild und der Teilen-Text beginnen (wörtlich).
 * Quelle: Seite des BMBFSFJ zum Gesetzgebungsvorhaben, Stand 12.11.2026:
 * https://www.bmbfsfj.bund.de/bmbfsfj/ministerium/gesetze/entwurf-eines-gesetzes-zur-aenderung-des-bundeselterngeld-und-elternzeitgesetzes-zur-weiterentwicklung-und-vereinfachung-des-elterngeldes-sowie-des-mutterschutzgesetzes-298792
 * Urheber ist das Ministerium (nicht „die Bundesregierung").
 */
export const MINISTERIUM_ZITAT = 'Das Elterngeld soll mit der Reform partnerschaftlicher, finanziell attraktiver und einfacher werden.';
/** Der Teil des Zitats, den der Teilen-Text wörtlich übernimmt. */
const MINISTERIUM_KURZ = 'partnerschaftlicher, finanziell attraktiver und einfacher';

/**
 * Halbsatz zur Bedingung, unter der die gezeigte Zahl gilt: die Partnermonate im Entwurf.
 * Teilen-Text: „wenn der Partner 2 Monate nimmt, 2 Monate verfallen"; Bild (bild=true): großgeschrieben, mit Doppelpunkt.
 */
function bedingung({ eingabe, gezeigt }, bild = false) {
  if (eingabe.alleinerziehend) return '';
  const p = gezeigt.neu.plan.monateB;
  const n = gezeigt.entfalleneMonate;
  const partner = p === 0 ? 'wenn der Partner kein Elterngeld nimmt' : `wenn der Partner ${p} Monate nimmt`;
  const satz = n > 0 ? `${partner}${bild ? ':' : ','} ${n === 1 ? '1 Monat verfällt' : `${n} Monate verfallen`}` : partner;
  return bild ? satz.replace(/^./, (z) => z.toUpperCase()) : satz;
}

/**
 * Eine Zahl je Familie: das in Schritt 2 gezeigte Ergebnis samt seiner Bedingung.
 * @param {{eingabe: object, gezeigt: object}} aktuell siehe main.js
 */
export function teiltext(aktuell) {
  const { eingabe, gezeigt: v } = aktuell;
  const wer = eingabe.alleinerziehend ? 'Für mich' : 'Für unsere Familie';
  const b = bedingung(aktuell);
  const g = ganzeDifferenz(v);
  return `Das Familienministerium sagt, das Elterngeld solle \u201E${MINISTERIUM_KURZ}\u201C werden. ${wer} hieße das ${euroDiff(g.differenz)} (${euro(g.neu)} statt ${euro(g.alt)})${b ? `, ${b}` : ''}. Was wäre es bei dir? ${TEILADRESSE} #Elterngeld #Elterngeldreform`;
}

/**
 * Zeichenzahl, wie X sie zählt (twitter-text, Version 3): jede Adresse 23 Zeichen; Zeichen aus
 * Latein, Interpunktion und Anführungszeichen einfach, alle übrigen doppelt (auch „€" und „−").
 */
export function laengeX(text) {
  const einfach = (c) => c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247);
  let n = 0;
  for (const teil of String(text).split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(teil)) n += 23;
    else for (const z of teil) n += einfach(z.codePointAt(0)) ? 1 : 2;
  }
  return n;
}
/** Zeichenzahl, wie Bluesky sie zählt: Grapheme, die Adresse ausgeschrieben. */
export function laengeBluesky(text) {
  return typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(text)].length : [...text].length;
}
/** Höchstlängen für X (280) und Bluesky (300), mit 10 Zeichen Abstand. */
export const KURZ_GRENZE = Object.freeze({ x: 270, bluesky: 290 });

/**
 * Kurzfassung des Teilen-Texts für X und Bluesky: Zitat-Kurzform des Ministeriums, die Zahl der
 * Familie, Adresse, ein Hashtag. Passt sie nicht unter KURZ_GRENZE (fünfstellige Beträge, lange
 * Bedingung), fallen der Reihe nach weg: die beiden Summen, die Bedingung.
 */
export function kurztext(aktuell) {
  const { eingabe, gezeigt: v } = aktuell;
  const wer = eingabe.alleinerziehend ? 'Für mich' : 'Für unsere Familie';
  const b = bedingung(aktuell);
  const g = ganzeDifferenz(v);
  const summen = ` (${euro(g.neu)} statt ${euro(g.alt)})`;
  const satz = (mitSummen, mitBedingung) =>
    `Das Familienministerium sagt, das Elterngeld solle „${MINISTERIUM_KURZ}“ werden. ${wer} hieße das ${euroDiff(g.differenz)}${mitSummen ? summen : ''}${mitBedingung && b ? `, ${b}` : ''}. ${TEILADRESSE} #Elterngeld`;
  const passt = (t) => laengeX(t) <= KURZ_GRENZE.x && laengeBluesky(t) <= KURZ_GRENZE.bluesky;
  const fassungen = [satz(true, true), satz(false, true), satz(false, false)];
  return fassungen.find(passt) ?? fassungen[fassungen.length - 1];
}

/**
 * Netzwerke mit Link und Symbolname (Symbole: symbole.js). X und Bluesky bekommen `kurz`
 * (kurztext(), wegen ihrer Längengrenze), alle anderen den vollen Text.
 */
export function netzwerke(text, kurz = text) {
  const t = encodeURIComponent(text);
  const k = encodeURIComponent(kurz);
  const u = encodeURIComponent(TEILADRESSE);
  return [
    { name: 'WhatsApp', symbol: 'whatsapp', href: `https://wa.me/?text=${t}` },
    { name: 'Bluesky', symbol: 'bluesky', href: `https://bsky.app/intent/compose?text=${k}` },
    { name: 'Threads', symbol: 'threads', href: `https://www.threads.net/intent/post?text=${t}` },
    { name: 'X', symbol: 'x', href: `https://x.com/intent/post?text=${k}` },
    { name: 'LinkedIn', symbol: 'linkedin', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: 'Facebook', symbol: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'Telegram', symbol: 'telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: 'E-Mail', symbol: 'email', href: `mailto:?subject=${encodeURIComponent('Elterngeldreform 2027: Rechner')}&body=${t}` },
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

/**
 * Alle Texte des Bildes, ohne Canvas. richtung: 'weniger' | 'mehr' | 'gleich' (aus der ganzen Differenz).
 * Bei Gleichstand „±0 €" und „wie heute"; bei Alleinerziehenden statt der Partnerzeile spaeterWeniger() oder nichts.
 * @param {{eingabe: object, gezeigt: object}} aktuell siehe main.js
 */
export function bildTexte(aktuell) {
  const { eingabe, gezeigt: v } = aktuell;
  const g = ganzeDifferenz(v);
  const allein = !!eingabe.alleinerziehend;
  const richtung = g.differenz < 0 ? 'weniger' : g.differenz > 0 ? 'mehr' : 'gleich';
  return {
    richtung,
    kopf: 'Das Familienministerium sagt:',
    zitat: `\u201E${MINISTERIUM_ZITAT}\u201C`,
    quelle: 'bmbfsfj.bund.de, 12.11.2026',
    wer: allein ? 'Für mich hieße das:' : 'Für unsere Familie hieße das:',
    differenz: richtung === 'gleich' ? '±0 €' : euroDiff(g.differenz),
    vergleich: richtung === 'gleich' ? `${euro(g.neu)} wie heute` : `${euro(g.neu)} statt ${euro(g.alt)}`,
    bedingung: allein ? spaeterWeniger(v) : bedingung(aktuell, true),
    frage: allein ? 'Was wäre es bei dir?' : 'Was wäre es bei euch?',
    adresse: ADRESSE,
    hinweis: 'Modellrechnung zum Gesetzentwurf vom 12.11.2026, ohne Gewähr',
  };
}

const schrift = (px, stil = 500) => `${stil} ${px}px "Schibsted Grotesk", system-ui, sans-serif`;
const GEWICHTE = [500, 600, 700, 750, 800];

/**
 * Betrag mit abgesetztem Vorzeichen: Vorzeichen, Ziffern und € einzeln gesetzt, damit das Minus nicht
 * an der Ziffer klebt (Lücke 0,05 em) und die Ziffern eng laufen. Gibt die Breite zurück; zeichnen=false misst nur.
 */
function betrag(c, text, x, y, px, farbe, zeichnen = true) {
  const setze = (p, sperrung) => {
    c.font = schrift(p, 800);
    c.fillStyle = farbe;
    if ('letterSpacing' in c) c.letterSpacing = `${(sperrung * p).toFixed(1)}px`;
  };
  const m = /^([−+±]?)(.*?) €$/.exec(text);
  const vz = m ? m[1] : '', ziffern = m ? m[2] : text;
  const sperr = -0.03;
  setze(px, 0);
  const wVz = vz ? c.measureText(vz).width : 0;
  setze(px, sperr);
  const wZ = c.measureText(ziffern).width - sperr * px; // letzte Sperrung nicht mitzählen
  setze(px, 0);
  const wE = c.measureText('€').width;
  const lueckeVz = vz ? 0.05 * px : 0, lueckeE = 0.2 * px;
  const breite = wVz + lueckeVz + wZ + lueckeE + wE;
  if (zeichnen) {
    c.textAlign = 'left';
    if (vz) { setze(px, 0); c.fillText(vz, x, y); }
    x += wVz + lueckeVz;
    setze(px, sperr); c.fillText(ziffern, x, y); x += wZ + lueckeE;
    setze(px, 0); c.fillText('€', x, y);
  }
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  return breite;
}

export async function zeichne(canvas, aktuell) {
  const t = bildTexte(aktuell);
  // Schrift erst laden, dann zeichnen: ein Canvas löst das Laden nicht von selbst aus
  await Promise.all(GEWICHTE.map((w) => document.fonts.load(`${w} 40px "Schibsted Grotesk"`)));
  await document.fonts.ready;
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, R = 80, B = W - 2 * R;
  const setze = (px, stil, farbe, sperrung = 0) => {
    c.font = schrift(px, stil);
    c.fillStyle = farbe;
    if ('letterSpacing' in c) c.letterSpacing = `${(sperrung * px).toFixed(1)}px`;
  };
  const messe = (s) => c.measureText(s).width;
  const block = t.richtung === 'weniger' ? FARBEN.verlust : t.richtung === 'mehr' ? FARBEN.gewinn : FARBEN.tinte;

  c.reset?.();
  c.fillStyle = FARBEN.grund;
  c.fillRect(0, 0, W, H);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';

  // obere Hälfte: das Zitat, groß, mit hängendem „
  setze(30, 600, FARBEN.grau);
  c.fillText(t.kopf, R, 126);
  setze(62, 700, FARBEN.tinte, -0.015);
  const markiert = new Set(['finanziell', 'attraktiver']);
  let y = 214;
  for (const zeile of umbrechen(t.zitat, B, messe)) {
    let x = R;
    zeile.split(' ').forEach((w, i) => {
      if (i === 0 && w.startsWith('\u201E')) x -= messe('\u201E');
      const nackt = w.replace(/[\u201E\u201C,.]/g, '');
      if (t.richtung === 'weniger' && markiert.has(nackt)) {
        c.fillStyle = FARBEN.verlust;
        c.fillRect(x, y + 10, messe(w.replace(/[,.\u201C]+$/, '')), 9);
        c.fillStyle = FARBEN.tinte;
      }
      c.fillText(w, x, y);
      x += messe(w) + messe(' ');
    });
    y += 74;
  }
  setze(24, 500, FARBEN.grau2);
  c.fillText(t.quelle, R, y - 14);

  // untere Hälfte: farbiger Block mit dem Ergebnis
  const top = Math.max(y + 34, 640);
  c.fillStyle = block;
  c.fillRect(0, top, W, H - top);
  setze(50, 700, '#fff', -0.01);
  c.fillText(t.wer, R, top + 104);
  let px = 250; // größte Größe, bei der die Differenz zwischen die Ränder passt
  while (px > 30 && betrag(c, t.differenz, 0, 0, px, '#fff', false) > B) px -= 2;
  const yz = top + 104 + 34 + px * 0.74;
  betrag(c, t.differenz, R - px * 0.035, yz, px, '#fff');
  setze(42, 600, '#fff');
  c.fillText(t.vergleich, R, yz + 76);
  if (t.bedingung) {
    setze(32, 500, 'rgba(255,255,255,0.85)');
    let yb = yz + 128;
    for (const zeile of umbrechen(t.bedingung, B, messe)) { c.fillText(zeile, R, yb); yb += 42; }
  }
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(R, H - 194, B, 2);
  // Fuß: Aufforderung, Adresse rechtsbündig, darunter der Hinweis
  const yf = H - 120;
  setze(34, 500, '#fff');
  c.fillText(t.frage, R, yf);
  const wF = messe(t.frage);
  let pa = 44;
  for (; pa > 20; pa -= 2) { setze(pa, 750, '#fff'); if (messe(t.adresse) <= B - wF - 30) break; }
  setze(pa, 750, '#fff');
  c.textAlign = 'right';
  c.fillText(t.adresse, R + B, yf);
  c.textAlign = 'left';
  setze(24, 500, 'rgba(255,255,255,0.72)');
  c.fillText(t.hinweis, R, yf + 48);
}

export function alsBlob(canvas) {
  return new Promise((ok) => canvas.toBlob(ok, 'image/png'));
}
