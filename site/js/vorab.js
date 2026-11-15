/**
 * Läuft als klassisches Skript im <head>, vor dem Stylesheet: markiert, dass Skripte laufen.
 * Nur mit der Klasse 'js' greift das Einblenden ([data-zeig]); ohne Skripte bleibt alles sichtbar.
 * Eigene Datei statt Inline-Skript, damit die Content-Security-Policy ohne 'unsafe-inline' auskommt.
 *
 * Startet js/main.js nicht (Ladefehler, alter Browser ohne Module, Fehler beim Start), bliebe die
 * Seite mit der Klasse unsichtbar. main.js meldet sich deshalb am Ende seines Starts mit
 * data-bereit am <html>; fehlt die Meldung nach vier Sekunden, wird die Klasse wieder entfernt.
 */
document.documentElement.classList.add('js');
setTimeout(function () {
  if (!document.documentElement.dataset.bereit) document.documentElement.classList.remove('js');
}, 4000);
