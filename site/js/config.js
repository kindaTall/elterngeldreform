/**
 * Einstellungen des Betreibers. Vor der Veröffentlichung ausfüllen.
 *
 * RUECKMELDUNG: wohin Fehlermeldungen aus dem Formular „Fehler gefunden?“ gehen.
 *  - email:    Empfängeradresse. Das Formular öffnet das E-Mail-Programm der meldenden Person
 *              mit vorausgefülltem Text (kein Server nötig). Bleibt sie leer, ist das
 *              Empfängerfeld der E-Mail leer und das Formular verweist auf das Impressum.
 *  - endpunkt: optional, hat Vorrang vor email. URL, die ein POST mit JSON
 *              {art, nachricht, kontakt, url} annimmt und mit 2xx antwortet. Schlägt der Aufruf
 *              fehl, fällt das Formular auf email zurück. Bei Nutzung den Abschnitt
 *              „Fehler melden“ in datenschutz.html anpassen (dort ist der E-Mail-Weg beschrieben)
 *              und `connect-src` in der Content-Security-Policy um den Host des Endpunkts
 *              erweitern (Meta-Tag in index.html und Header in .htaccess, sonst blockt der Browser).
 */
export const RUECKMELDUNG = { email: 'info@elterngeld2027.de', endpunkt: '' };
