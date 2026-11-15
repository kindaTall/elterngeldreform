/**
 * Fehlermeldung aus dem Formular „Fehler gefunden?“: Text zusammenbauen und Versandweg wählen.
 * Wege (siehe ../config.js): 'endpunkt' (POST an eigenen Server), sonst 'email' (mailto: im eigenen
 * E-Mail-Programm; ohne eingetragene Adresse bleibt das Empfängerfeld leer und die meldende Person
 * trägt die Adresse aus dem Impressum ein). Tests: test/rueckmeldung.test.js
 */
export const BETREFF = 'Fehlermeldung Elterngeld-Rechner';

/** @param {{endpunkt?: string}} einstellung */
export function versandweg({ endpunkt = '' } = {}) {
  return endpunkt ? 'endpunkt' : 'email';
}

/**
 * @param {{art: string, nachricht: string, kontakt?: string, url?: string}} m
 * @returns {string} Klartext der Meldung
 */
export function meldungstext({ art, nachricht, kontakt = '', url = '' }) {
  return [
    `Art: ${art}`,
    nachricht.trim(),
    kontakt.trim() && `Rückfragen an: ${kontakt.trim()}`,
    url && `Rechner-Eingaben: ${url}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** POST an den Endpunkt; wirft bei Netzfehler oder Antwort außerhalb 2xx. */
export async function sende(endpunkt, meldung) {
  const antwort = await fetch(endpunkt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meldung),
  });
  if (!antwort.ok) throw new Error(`Antwort ${antwort.status}`);
}
