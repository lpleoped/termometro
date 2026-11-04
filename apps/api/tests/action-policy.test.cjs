require('ts-node/register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateContextualActions, ActionPolicyError } = require('../src/services/action-policy.service');

const context = (overrides = {}) => ({ id: 'ctx-policy', title: 'Política de IA', importance: 'critical', influence: 'precondition', sensitivity: 'normal', ...overrides });
const action = (overrides = {}) => ({ titulo: 'Definir política', descripcion: 'Acordar reglas de uso.', prioridad: 'alta', alcance: 'equipo', requiereValidacion: true, contextoAplicado: ['ctx-policy'], ...overrides });

test('action policy accepts a traced precondition', () => {
  assert.equal(validateContextualActions([action({ esCondicionPrevia: true })], [context()]).length, 1);
});

test('action policy rejects a critical context without a traced action', () => {
  assert.throws(() => validateContextualActions([], [context()]), error => error instanceof ActionPolicyError && error.code === 'AI_CONTEXT_IGNORED');
});

test('action policy rejects a precondition represented as an ordinary action', () => {
  assert.throws(() => validateContextualActions([action()], [context()]), error => error instanceof ActionPolicyError && error.code === 'AI_PRECONDITION_IGNORED');
});

test('sensitive group context accepts group scopes but rejects person scope', () => {
  const sensitive = context({ id: 'ctx-sensitive', influence: 'group_action', sensitivity: 'highly_sensitive' });
  assert.doesNotThrow(() => validateContextualActions([action({ alcance: 'liderazgo', contextoAplicado: ['ctx-sensitive'] })], [sensitive]));
  assert.doesNotThrow(() => validateContextualActions([action({ alcance: 'proyecto', contextoAplicado: ['ctx-sensitive'] })], [sensitive]));
  assert.throws(() => validateContextualActions([action({ alcance: 'persona', contextoAplicado: ['ctx-sensitive'] })], [sensitive]), error => error instanceof ActionPolicyError && error.code === 'AI_SENSITIVE_SCOPE');
});
