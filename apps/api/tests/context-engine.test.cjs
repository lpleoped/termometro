require('ts-node/register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectContextCandidates } = require('../src/services/context-engine.service');
const { toSafeTeamContext } = require('../src/services/privacy-transformer.service');

const item = (overrides = {}) => ({ _id: overrides.id || Math.random().toString(16).slice(2), type: 'stable_fact', title: 'Dato', content: 'Contenido', status: 'active', confidence: 1, version: 1, updatedAt: '2026-11-01T00:00:00.000Z', ...overrides });

test('context engine excludes obsolete and out-of-date items', () => {
  const result = selectContextCandidates([
    item({ id: 'ok' }), item({ id: 'old', validUntil: '2026-10-31T23:59:59.000Z' }), item({ id: 'future', validFrom: '2026-11-03T00:00:00.000Z' }), item({ id: 'obsolete', status: 'obsolete' }),
  ], new Date('2026-11-02T12:00:00.000Z'));
  assert.deepEqual(result.itemIds, ['ok']);
});

test('context engine prioritizes constraints over stable facts', () => {
  const result = selectContextCandidates([item({ id: 'fact', importance: 'informative', influence: 'interpretation' }), item({ id: 'constraint', type: 'constraint', importance: 'critical', influence: 'precondition' })]);
  assert.equal(result.itemIds[0], 'constraint');
});

test('context engine applies the item budget and reports omissions', () => {
  const result = selectContextCandidates(Array.from({ length: 25 }, (_, index) => item({ id: String(index), title: `Dato ${index}`, updatedAt: `2026-11-${String(25 - index).padStart(2, '0')}T00:00:00.000Z` })));
  assert.equal(result.items.length, 20);
  assert.equal(result.omittedCount, 5);
});

test('context engine applies the character budget', () => {
  const result = selectContextCandidates([item({ id: 'large', content: 'x'.repeat(16000) }), item({ id: 'second' })]);
  assert.deepEqual(result.itemIds, ['second']);
  assert.equal(result.omittedCount, 1);
});

test('privacy transformer abstracts highly sensitive context instead of forwarding personal details', () => {
  const safe = toSafeTeamContext({ id: 'sensitive', type: 'learning', title: 'Una persona no binaria', content: 'Detalle personal identificable', source: 'feedback privado', status: 'active', confidence: 1, version: 1, importance: 'critical', sensitivity: 'highly_sensitive', influence: 'group_action' });
  assert.equal(safe.title, 'Necesidad sensible del equipo');
  assert.ok(!safe.content.includes('no binaria'));
  assert.equal(safe.source, undefined);
});

test('privacy transformer redacts common identifiers for sensitive context', () => {
  const safe = toSafeTeamContext({ id: 'sensitive', type: 'learning', title: 'Contacto', content: 'Escribir a persona@example.com o llamar al +598 99 123 456', source: 'https://example.com', status: 'active', confidence: 1, version: 1, importance: 'relevant', sensitivity: 'sensitive', influence: 'interpretation' });
  assert.ok(!safe.content.includes('persona@example.com'));
  assert.ok(!safe.content.includes('+598'));
  assert.equal(safe.source, '[enlace]');
});
