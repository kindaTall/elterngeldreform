/**
 * Ergebnis teilen: Bild (Canvas → PNG, 1080×1350), Web Share API, Links zu Netzwerken.
 * Das Bild enthält nur Rechenwerte. Netzwerk-Links öffnen die Seite des Netzwerks erst nach Klick;
 * vorher wird nichts an Dritte übertragen.
 */
import { euro, euroDiff } from './diagramme.js';

const FARBEN = { grund: '#ffffff', tinte: '#101216', grau: '#525964', linie: '#e1e4e9', verlust: '#d0321d', gewinn: '#12805a' };

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
  const wer = eingabe.alleinerziehend ? 'Für mich als alleinerziehenden Elternteil' : 'Für unsere Familie';
  const b = bedingung(aktuell);
  return `Elterngeldreform 2027: ${wer} hieße das ${euroDiff(v.differenz)} Elterngeld (${euro(v.neu.summe)} statt ${euro(v.alt.summe)})${b ? `, ${b}` : ''}. Was wäre es bei dir? ${url} #Elterngeld #Elterngeldreform`;
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

export async function zeichne(canvas, aktuell) {
  const { eingabe, gezeigt: v, seite } = aktuell;
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

  eng(0, 0);
  c.font = schrift(30, 600);
  c.fillStyle = FARBEN.grau;
  c.fillText('Elterngeldreform · Entwurf vom 12.11.2026', R, 118);

  c.font = schrift(60, 700);
  eng(-0.025, 60);
  c.fillStyle = FARBEN.tinte;
  c.fillText(allein ? 'Für mich hieße das:' : 'Für unsere Familie hieße das:', R, 226);

  const gross = Math.abs(v.differenz) >= 10000 ? 200 : 232;
  c.font = schrift(gross, 800);
  eng(-0.02, gross);
  c.fillStyle = v.differenz < 0 ? FARBEN.verlust : v.differenz > 0 ? FARBEN.gewinn : FARBEN.tinte;
  c.fillText(euroDiff(v.differenz), R - 10, 500);

  eng(0, 0);
  c.font = schrift(38);
  c.fillStyle = FARBEN.grau;
  c.fillText('Elterngeld über die gesamte Bezugszeit', R, 576);

  c.strokeStyle = FARBEN.linie;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(R, 652);
  c.lineTo(W - R, 652);
  c.stroke();

  c.font = schrift(36);
  const zeilen = [
    allein ? `Netto vor der Geburt: ${euro(eingabe.nettoA)}, alleinerziehend` : `Netto vor der Geburt: ${euro(eingabe.nettoA)} und ${euro(eingabe.nettoB)}`,
    `Heute ${plan(v.alt)}: ${euro(v.alt.summe)}`,
    `Entwurf ${plan(v.neu)}: ${euro(v.neu.summe)}`,
    allein ? 'Entwurf: 8 Monate mit 80 %, danach 50 % statt 65 %' : bedingung(aktuell).replace(/^./, (z) => z.toUpperCase()),
    'Modellrechnung zum Gesetzentwurf, ohne Gewähr',
  ];
  zeilen.forEach((z, i) => c.fillText(z, R, 728 + i * 60));

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
