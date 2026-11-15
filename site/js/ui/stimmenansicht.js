/**
 * Zitate aus stimmen.js anzeigen: die laufende Leiste auf der Startseite und die vollständige Liste
 * im Hintergrund. Nur createElement/textContent (Content-Security-Policy, kein innerHTML).
 * Die Leiste enthält die Zitate zweimal hintereinander (Duplikat aria-hidden, ohne Tab-Fokus),
 * die CSS-Animation verschiebt sie um die halbe Breite: nahtloser Umlauf.
 */
import { STIMMEN } from './stimmen.js';

const zitat = (text) => `„${text}“`;
const tag = (name, klasse, text) => {
  const el = document.createElement(name);
  if (klasse) el.className = klasse;
  if (text !== undefined) el.textContent = text;
  return el;
};
function link(text, url, versteckt = false) {
  const a = tag('a', '', text);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  if (versteckt) a.tabIndex = -1;
  return a;
}
/** ISO-Datum (JJJJ-MM-TT) als TT.MM.JJJJ */
export const datumDeutsch = (iso) => iso.split('-').reverse().join('.');

function gruppe(versteckt) {
  const ul = tag('ul', 'stimmen-gruppe');
  if (versteckt) ul.setAttribute('aria-hidden', 'true');
  for (const s of STIMMEN.filter((x) => x.leiste)) {
    const li = tag('li');
    li.append(tag('span', 'stimmen-text', zitat(s.text)), link(s.kurz, s.url, versteckt));
    ul.append(li);
  }
  return ul;
}

/** Füllt die Spur der Zitatleiste (Element mit der Klasse stimmen-spur). */
export function leisteBauen(spur) {
  spur.replaceChildren(gruppe(false), gruppe(true));
}

/** Füllt die Liste im Hintergrund (ul#stimmenliste). */
export function listeBauen(ul) {
  ul.replaceChildren(
    ...STIMMEN.map((s) => {
      const li = tag('li');
      const wer = tag('p', 'stimmen-wer');
      wer.append(link(s.wer, s.url), `, ${datumDeutsch(s.datum)}`);
      li.append(tag('p', 'stimmen-zitat', zitat(s.text)), wer, tag('p', 'stimmen-bezug', `Bezug: ${s.bezug}`));
      return li;
    }),
  );
}
