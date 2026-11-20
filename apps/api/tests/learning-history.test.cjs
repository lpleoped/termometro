const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildHistoricalMemory, assertGroundedEvidence, HISTORICAL_ANALYSIS_INSTRUCTIONS } = require('../dist/services/historical-context');
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

test('la lectura siguiente recibe lo que se sigue y lo dejado pasar', () => {
  const rounds = [{
    instanciaId: 'r1', activadoEn: '2026-01-01T00:00:00.000Z', indiceGlobal: 40,
    participacion: { recibida: 3, esperada: 4, porcentaje: 75 },
    analisis: [{
      id: 'ia1', creadoEn: '2026-01-02T00:00:00.000Z', resumen: 'Lectura',
      hallazgos: [], recomendaciones: [], limitations: [],
      propuestasOmitidas: [1],
      accionesContextuales: [{ titulo: 'Seguir hablando' }, { titulo: 'Dejar el ritual' }],
    }],
    acciones: [
      { _id: 'abierta', creadaEn: '2026-01-03T00:00:00.000Z', descripcion: 'Seguir', estado: 'ejecutada', ownerRole: 'Equipo', successMetric: 'M', checkInQuestion: 'Q', evidenciaIds: ['carga'], veredictos: [{ indicadorId: 'carga', veredicto: 'no_se_movio', valorAdopcion: 60, valorPosterior: 60, delta: 0 }], checkIns: [{ horizonte: '30d', estado: 'completado', nota: 'La nota sigue' }] },
      { _id: 'cerrada', creadaEn: '2026-01-03T00:00:00.000Z', descripcion: 'Cerrada', estado: 'rechazada', ownerRole: 'Equipo', successMetric: 'M', checkInQuestion: 'Q', checkIns: [] },
    ],
  }];
  const memory = buildHistoricalMemory(rounds, new Date('2026-02-01'));
  const analysis = memory.items.find((item) => item.type === 'ai_interpretation');
  const abierta = memory.items.find((item) => item.id === 'action:abierta');
  const cerrada = memory.items.find((item) => item.id === 'action:cerrada');
  assert.deepEqual(analysis.skipped, [{ index: 1, title: 'Dejar el ritual' }]);
  assert.equal(abierta.followed, true);
  assert.equal(abierta.roundId, 'r1');
  assert.equal(cerrada.followed, false);
  assert.deepEqual(abierta.targetIndicators, ['carga']);
  assert.equal(abierta.verdicts[0].verdict, 'no_se_movio');
  assert.equal(abierta.checkIns[0].note, 'La nota sigue');
});

test('se verifican evidenciaIds en castellano y evidenceIds de las acciones', () => {
  const allowed = new Set(['action:a1', 'q1']);
  assert.equal(assertGroundedEvidence({ hallazgos: [{ evidenciaIds: ['inventada'] }] }, allowed), false);
  assert.equal(assertGroundedEvidence({ senalesEmocionales: [{ evidenciaIds: ['inventada'] }] }, allowed), false);
  assert.equal(assertGroundedEvidence({ accionesContextuales: [{ evidenceIds: ['action:a1'] }], hallazgos: [{ evidenciaIds: ['q1'] }] }, allowed), true);
});

test('el prompt trata veredicto, notas y aprendizajes como indicios', () => {
  assert.match(HISTORICAL_ANALYSIS_INSTRUCTIONS, /indicios/);
  assert.match(HISTORICAL_ANALYSIS_INSTRUCTIONS, /todavía es pronto/);
  assert.match(HISTORICAL_ANALYSIS_INSTRUCTIONS, /no se movió/);
  assert.match(HISTORICAL_ANALYSIS_INSTRUCTIONS, /menos de 3 puntos/);
});
