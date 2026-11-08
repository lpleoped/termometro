const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildHistoricalMemory, assertGroundedEvidence } = require('../dist/services/historical-context');
const { validarAccionInput } = require('../dist/services/acciones.service');

test('el contrato rechaza el payload incompleto que enviaba el formulario', () => {
  const input = { instanciaId: 'a'.repeat(24), descripcion: 'Coordinar tareas', ownerRole: 'Facilitación', horizon: '7d', successMetric: 'Revisar bloqueos', checkInQuestion: '¿Qué cambió?' };
  assert.doesNotThrow(() => validarAccionInput(input));
  assert.throws(() => validarAccionInput({ instanciaId: input.instanciaId, descripcion: input.descripcion }), /Completá/);
  assert.throws(() => validarAccionInput({ ...input, horizon: '1d' }), /plazo/);
  assert.throws(() => validarAccionInput({ ...input, ownerRole: {} }), /Completá/);
});

test('memoria conserva acciones aplicadas, resultados y análisis; limita tamaño y excluye rondas futuras', () => {
  const rounds = [{ instanciaId: 'r1', activadoEn: '2026-01-01T00:00:00.000Z', indiceGlobal: 50, participacion: { recibida: 4, esperada: 4, porcentaje: 100 },
    analisis: [{ id: 'ia1', creadoEn: '2026-01-02T00:00:00.000Z', resumen: 'Escribir a prueba@example.com', hallazgos: [], recomendaciones: ['Coordinar'], limitations: [] }],
    acciones: [{ _id: 'a1', creadaEn: '2026-01-02T00:00:00.000Z', descripcion: 'Coordinar', estado: 'ejecutada', ownerRole: 'Equipo', successMetric: 'Menos bloqueos', checkInQuestion: '¿Cambió?', checkIns: [{ horizonte: '7d', estado: 'completado', nota: 'Persisten bloqueos', resultado: { indiceAnterior: 40, indicePosterior: 50, delta: 10 } }] }] },
    { instanciaId: 'future', activadoEn: '2027-01-01T00:00:00.000Z', analisis: [], acciones: [] }];
  const memory = buildHistoricalMemory(rounds, new Date('2026-02-01'));
  assert.equal(memory.items.length, 3);
  assert.equal(memory.items[0].state, 'ejecutada');
  assert.equal(memory.items[0].checkIns[0].result.delta, 10);
  assert.ok(!JSON.stringify(memory).includes('prueba@example.com'));
  assert.ok(!JSON.stringify(memory).includes('future'));
  assert.deepEqual(buildHistoricalMemory(rounds, new Date('2026-02-01'), 1), { items: [], omittedCount: 3 });
  assert.deepEqual(memory, buildHistoricalMemory(rounds, new Date('2026-02-01')));
});

test('se verifican evidenciaIds en castellano y evidenceIds de las acciones', () => {
  const allowed = new Set(['action:a1', 'q1']);
  assert.equal(assertGroundedEvidence({ hallazgos: [{ evidenciaIds: ['inventada'] }] }, allowed), false);
  assert.equal(assertGroundedEvidence({ senalesEmocionales: [{ evidenciaIds: ['inventada'] }] }, allowed), false);
  assert.equal(assertGroundedEvidence({ accionesContextuales: [{ evidenceIds: ['action:a1'] }], hallazgos: [{ evidenciaIds: ['q1'] }] }, allowed), true);
});
