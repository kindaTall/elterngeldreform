import test from 'node:test';
import assert from 'node:assert/strict';
import { versandweg, meldungstext } from '../site/js/ui/rueckmeldung.js';

test('Versandweg: Endpunkt, sonst E-Mail (auch ohne eingetragene Adresse)', () => {
  assert.equal(versandweg({ email: 'a@example.org', endpunkt: '/api/meldung' }), 'endpunkt');
  assert.equal(versandweg({ email: 'a@example.org', endpunkt: '' }), 'email');
  assert.equal(versandweg({ email: '', endpunkt: '' }), 'email');
  assert.equal(versandweg(), 'email');
});

test('Meldungstext enthält Art und Nachricht, freiwillige Teile nur wenn angegeben', () => {
  const nur = meldungstext({ art: 'Rechenfehler', nachricht: '  Betrag in Monat 5 stimmt nicht.  ' });
  assert.equal(nur, 'Art: Rechenfehler\n\nBetrag in Monat 5 stimmt nicht.');
  const voll = meldungstext({ art: 'Sonstiges', nachricht: 'x', kontakt: ' b@example.org ', url: 'https://example.org/#monB=4' });
  assert.equal(voll, 'Art: Sonstiges\n\nx\n\nRückfragen an: b@example.org\n\nRechner-Eingaben: https://example.org/#monB=4');
});
