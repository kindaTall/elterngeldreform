// Zitate: Form und Mengen (der Wortlaut wurde von Hand an den Originalquellen geprüft).
import test from 'node:test';
import assert from 'node:assert/strict';
import { STIMMEN } from '../site/js/ui/stimmen.js';

test('jedes Zitat: nicht leer, höchstens 14 Wörter', () => {
  for (const s of STIMMEN) {
    assert.ok(s.text.trim().length > 0);
    assert.ok(s.text.trim().split(/\s+/).length <= 14, s.text);
    assert.ok(s.wer && s.bezug, s.text);
  }
});

test('jede Quelle: https-Adresse und gültiges ISO-Datum', () => {
  for (const s of STIMMEN) {
    assert.match(s.url, /^https:\/\//);
    assert.match(s.datum, /^\d{4}-\d{2}-\d{2}$/);
    const d = new Date(`${s.datum}T00:00:00Z`);
    assert.ok(!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s.datum, s.datum);
  }
});

test('genau sieben Zitate laufen in der Leiste, jedes mit Kurznamen', () => {
  const leiste = STIMMEN.filter((s) => s.leiste);
  assert.equal(leiste.length, 7);
  for (const s of leiste) assert.ok(s.kurz && s.kurz.trim());
});

test('keine doppelten Zitate', () => {
  assert.equal(new Set(STIMMEN.map((s) => s.text)).size, STIMMEN.length);
});
