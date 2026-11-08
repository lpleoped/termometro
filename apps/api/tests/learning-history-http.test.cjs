// Real HTTP + Mongo; a unique disposable database, no production collections or paid AI calls.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
process.env.JWT_SECRET = 'learning-history-test-only-secret-32-chars';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Equipo } = require('../dist/models/Equipo');
const { Evaluacion } = require('../dist/models/Evaluacion');
const { InstanciaEvaluacion } = require('../dist/models/InstanciaEvaluacion');
const { Respuesta } = require('../dist/models/Respuesta');
const { AIAnalysis } = require('../dist/models/AIAnalysis');
const { AccionPlan } = require('../dist/models/AccionPlan');
const completion = require('../dist/services/ai-completion');
const settings = require('../dist/services/ai-settings.service');
const providerService = require('../dist/services/ai-provider.service');

test('HTTP: guardar → aplicar → seguir → contrastar y ajustar con IA e histórico', { timeout: process.env.LEARNING_BROWSER_CHECK ? 900000 : 60000 }, async () => {
  const dbName = `termometro_learning_test_${crypto.randomBytes(8).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 8000 });
  const owner = new mongoose.Types.ObjectId().toString();
  const stranger = new mongoose.Types.ObjectId().toString();
  const app = express(); app.use(require('cors')()); app.use(express.json());
  if (process.env.LEARNING_BROWSER_CHECK) app.use('/api', require('../dist/routes/auth.routes').default);
  for (const name of ['acciones', 'historico', 'ai']) app.use('/api', require(`../dist/routes/${name}.routes`).default);
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  const call = async (method, path, body, user = owner) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  };
  const originals = [settings.resolveAIProvider, providerService.getProviderCredentials, completion.requestCompletion];
  let sentContext;
  let invalidEvidence = false;
  settings.resolveAIProvider = async () => ({ _id: 'fixture-provider', kind: 'openai-compatible', modelName: 'fixture-model', endpoint: 'http://unused.invalid', save: async () => {} });
  providerService.getProviderCredentials = () => '';
  providerService.saveProvider = async (provider) => provider;
  completion.requestCompletion = async (_endpoint, _model, _credentials, messages) => {
    sentContext = JSON.parse(messages.at(-1).content);
    const applied = sentContext.historicalMemory.items.find(item => item.type === 'action' && item.state === 'verificada');
    const evidence = invalidEvidence ? 'inventada' : applied?.id || 'p';
    return { resumen: applied ? 'Ajustar lo aplicado según el seguimiento.' : 'Primera lectura de coordinación.', fortalezas: [], alertas: ['Persisten bloqueos'], recomendaciones: ['Ajustar el seguimiento'], fuentes: [evidence], nivelConfianza: 0.5, limitations: ['No prueba causalidad'], hallazgos: [{ titulo: 'Coordinación', tipo: 'oportunidad', severidad: 'media', confianza: 0.5, evidenciaIds: [evidence] }], senalesEmocionales: [], temasRecurrentes: [], accionesContextuales: [{ titulo: 'Revisar coordinación', descripcion: applied ? 'Ajustar la coordinación aplicada: revisar bloqueos pendientes.' : 'Coordinar tareas.', prioridad: 'media', alcance: 'equipo', ownerRole: 'Facilitación', horizon: '7d', successMetric: 'Menos bloqueos', checkInQuestion: '¿Qué cambió?', requiereValidacion: true, evidenceIds: [evidence] }] };
  };
  try {
    const team = await Equipo.create({ nombre: 'Equipo de prueba', creadoPor: owner });
    const evaluation = await Evaluacion.create({ titulo: 'Coordinación', version: '1', creadoPor: owner, tipo: 'CUSTOM', secciones: [{ titulo: 'Trabajo', ponderacion: 100, indicadores: [{ id: 'p', texto: 'Coordinación', tipo: 'cuantitativo' }, { id: 'q', texto: 'Comentarios', tipo: 'cualitativo' }] }] });
    const round = await InstanciaEvaluacion.create({ equipo: team._id, evaluacion: evaluation._id, activadoEn: new Date('2026-01-01'), cantidadEsperada: 3, modoRespuesta: 'identificada' });
    await Respuesta.insertMany([1, 2, 3].map(() => ({ instanciaEvaluacion: round._id, respuestas: [{ indicadorId: 'p', valor: 3 }, { indicadorId: 'q', texto: 'Necesitamos coordinar tareas.' }] })));
    const historicalPath = `/dashboard/historico/${team.id}/${evaluation.id}`;
    assert.equal((await call('GET', historicalPath, undefined, stranger)).status, 400);
    assert.equal((await call('POST', '/acciones', { instanciaId: round.id, descripcion: 'Solo descripción' })).status, 400);
    const first = await call('POST', '/ai/analyses', { instanciaId: round.id });
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.snapshot.indiceGlobal, 60);
    const actionInput = { instanciaId: round.id, descripcion: 'Coordinar tareas adaptadas por el equipo.', ownerRole: 'Facilitación', horizon: '7d', successMetric: 'Menos bloqueos', checkInQuestion: '¿Qué cambió?', analisisId: first.data.id, propuestaIndice: 0 };
    const created = await call('POST', '/acciones', actionInput);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.equal(created.data.propuestaOriginal, 'Coordinar tareas.');
    assert.equal(created.data.checkIns.length, 0);
    const actionId = created.data._id;
    assert.equal((await call('PATCH', `/acciones/${actionId}/estado`, { estado: 'aprobada' })).status, 400);
    assert.equal((await call('PATCH', `/acciones/${actionId}/estado`, { estado: 'en_revision' }, stranger)).status, 400);
    for (const estado of ['en_revision', 'aprobada', 'ejecutada']) assert.equal((await call('PATCH', `/acciones/${actionId}/estado`, { estado })).status, 200);
    assert.equal((await call('PATCH', `/acciones/${actionId}/estado`, { estado: 'verificada' })).status, 400);
    const check = await call('PATCH', `/acciones/${actionId}/checkins`, { horizonte: '7d', nota: 'Se aplicó; persisten bloqueos en entregas.', resultado: { indiceAnterior: 40, indicePosterior: 60 } });
    assert.equal(check.status, 200, JSON.stringify(check.data));
    assert.equal(check.data.checkIns[0].resultado.delta, 20);
    assert.ok(new Date(check.data.checkIns[0].venceEn) > new Date(check.data.ejecutadaEn));
    assert.equal((await call('PATCH', `/acciones/${actionId}/checkins`, { horizonte: '7d', nota: 'Sobrescribir' })).status, 400);
    assert.equal((await call('PATCH', `/acciones/${actionId}/estado`, { estado: 'verificada' })).status, 200);
    const second = await call('POST', '/ai/analyses', { instanciaId: round.id });
    assert.equal(second.status, 200, JSON.stringify(second.data));
    assert.ok(sentContext.historicalMemory.items.some(item => item.id === `analysis:${first.data.id}`));
    assert.equal(sentContext.historicalMemory.items.find(item => item.id === `action:${actionId}`).checkIns[0].note, 'Se aplicó; persisten bloqueos en entregas.');
    assert.match(second.data.accionesContextuales[0].descripcion, /Ajustar la coordinación aplicada/);
    assert.notEqual(first.data.metadata.datasetHash, second.data.metadata.datasetHash);
    const persisted = await AIAnalysis.findById(second.data.id).lean();
    assert.ok(persisted.historicalMemory.items.some(item => item.id === `action:${actionId}`));
    const adapted = await call('POST', '/acciones', { ...actionInput, analisisId: undefined, propuestaIndice: undefined, adaptadaDe: actionId, descripcion: 'Ajustar coordinación con foco en entregas.' });
    assert.equal(adapted.status, 201);
    assert.equal(adapted.data.adaptadaDe, actionId);
    const history = await call('GET', historicalPath);
    assert.equal(history.data.seguimiento[0].analisis.length, 2);
    assert.equal(history.data.seguimiento[0].acciones.length, 2);
    assert.equal(history.data.seguimiento[0].acciones[0].estado, 'verificada');
    assert.equal((await call('GET', `/ai/analyses?instanciaId=${round.id}`, undefined, stranger)).status, 404);
    invalidEvidence = true;
    assert.equal((await call('POST', '/ai/analyses', { instanciaId: round.id })).status, 422);
    assert.equal(await AIAnalysis.countDocuments(), 2);
    invalidEvidence = false;
    const withoutHistory = await call('POST', '/ai/analyses', { instanciaId: round.id, includeHistorico: false });
    assert.equal(withoutHistory.status, 200);
    assert.equal(sentContext.historicalMemory.items.length, 0);
    await InstanciaEvaluacion.updateOne({ _id: round._id }, { modoRespuesta: 'anonima', minimoAnonimato: 4 });
    const hidden = await call('GET', historicalPath);
    assert.deepEqual(hidden.data.seguimiento, []);
    assert.deepEqual(hidden.data.historico, []);
    // Purely qualitative rounds retain their learning history without a false zero on the graph.
    await InstanciaEvaluacion.updateOne({ _id: round._id }, { modoRespuesta: 'identificada' });
    await Respuesta.updateMany({ instanciaEvaluacion: round._id }, { $set: { respuestas: [{ indicadorId: 'q', texto: 'Solo cualitativa' }] } });
    const qualitativeOnly = await call('GET', historicalPath);
    assert.equal(qualitativeOnly.data.historico.length, 0);
    assert.equal(qualitativeOnly.data.seguimiento[0].indiceGlobal, null);
    assert.equal(qualitativeOnly.data.seguimiento[0].analisis.length, 3);
    assert.equal((await AccionPlan.findById(actionId)).descripcion, actionInput.descripcion);
    if (process.env.LEARNING_BROWSER_CHECK) {
      const { Usuario } = require('../dist/models/Usuario');
      const password = crypto.randomBytes(12).toString('hex');
      await Usuario.create({ _id: owner, nombre: 'Verificación local', email: 'learning-test@example.test', password: await require('bcryptjs').hash(password, 10) });
      await Respuesta.updateMany({ instanciaEvaluacion: round._id }, { $set: { respuestas: [{ indicadorId: 'p', valor: 3 }, { indicadorId: 'q', texto: 'Necesitamos coordinar tareas.' }] } });
      for (const name of ['equipo', 'evaluacion', 'instancia', 'dashboard']) app.use('/api', require(`../dist/routes/${name}.routes`).default);
      console.log('BROWSER_FIXTURE ' + JSON.stringify({ port: server.address().port, instanciaId: round.id, email: 'learning-test@example.test', password }));
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 840000);
        app.post('/__finish', (_req, res) => { res.json({ ok: true }); clearTimeout(timer); resolve(); });
      });
    }
  } finally {
    [settings.resolveAIProvider, providerService.getProviderCredentials, completion.requestCompletion] = originals;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.match(dbName, /^termometro_learning_test_[a-f0-9]{16}$/);
    assert.equal(mongoose.connection.name, dbName);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  }
});
