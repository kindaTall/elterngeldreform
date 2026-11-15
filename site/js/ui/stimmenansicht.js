/**
 * Zitate aus stimmen.js anzeigen: die stehende Reihe auf der Startseite (je Zitat ein Block mit Absender-Link;
 * Darstellung und Scrollen im CSS) und die vollständige Liste im Hintergrund.
 * Nur createElement/textContent (Content-Security-Policy, kein innerHTML).
 */
import { STIMMEN, REFERENT } from './stimmen.js';

const zitat = (text) => `„${text}“`;
const tag = (name, klasse, text) => {
  const el = document.createElement(name);
  if (klasse) el.className = klasse;
  if (text !== undefined) el.textContent = text;
  return el;
};
function link(text, url) {
  const a = tag('a', '', text);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}
/** ISO-Datum (JJJJ-MM-TT) als TT.MM.JJJJ */
export const datumDeutsch = (iso) => iso.split('-').reverse().join('.');

function gruppe() {
  const ul = tag('ul', 'stimmen-gruppe');
  for (const s of STIMMEN.filter((x) => x.leiste)) {
    const li = tag('li');
    li.append(tag('span', 'stimmen-text', zitat(s.text)), link(s.kurz, s.url));
    ul.append(li);
  }
  return ul;
}

/** Füllt die Spur der Zitatleiste (Element mit der Klasse stimmen-spur). */
export function leisteBauen(spur) {
  spur.replaceChildren(gruppe());
}

/** Füllt die Liste im Hintergrund (ul#stimmenliste). */
export function listeBauen(ul) {
  ul.replaceChildren(
    ...STIMMEN.map((s) => {
      const li = tag('li');
      const wer = tag('p', 'stimmen-wer');
      wer.append(link(s.wer, s.url), `, ${datumDeutsch(s.datum)}`);
      li.append(tag('p', 'stimmen-zitat', zitat(s.text)), wer);
      // Der Bezug auf den Referentenentwurf steht einmal über der Liste; hier nur abweichende
      if (s.bezug !== REFERENT) li.append(tag('p', 'stimmen-bezug', `Bezug: ${s.bezug}`));
      return li;
    }),
  );
}
