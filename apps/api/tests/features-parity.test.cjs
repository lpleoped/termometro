const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { featureRepository } = require('../dist/repositories/feature.repository');
const { newFeature } = require('../dist/domain/feature-validation');
const { JsonStorage, checksum } = require('../dist/storage/json-storage');
const { FEATURE_COLLECTIONS } = require('../dist/storage/storage');
const { userRepository } = require('../dist/repositories/user.repository');
const { teamRepository } = require('../dist/repositories/team.repository');
const { evaluationRepository } = require('../dist/repositories/evaluation.repository');
const { roundRepository } = require('../dist/repositories/round.repository');
const { responseRepository } = require('../dist/repositories/response.repository');
const { assertRepositoryConformance } = require('../dist/repositories/repository-conformance');
const axios = require('axios').default;
const jwt = require('jsonwebtoken');

for (const driver of ['json', 'mongo']) test('Paridad completa: ' + driver, { timeout: 60000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-parity-'));
  const dbName = 'termometro_parity_test_' + crypto.randomBytes(8).toString('hex');
  process.env.STORAGE_DRIVER = driver;
  process.env.TERMOMETRO_DATA_DIR = path.join(root, 'data');
  process.env.JWT_SECRET = 'parity-test-jwt-secret-at-least-32-characters';
  process.env.AI_CREDENTIAL_SECRET = 'parity-test-ai-secret-at-least-32-characters';
  process.env.INTEGRATION_ENCRYPTION_KEY = 'parity-test-integration-key-at-least-32';
  process.env.AI_ALLOW_PRIVATE_ENDPOINTS = 'true';
  process.env.NODE_ENV = 'test';
  const originalPost = axios.post;
  let appServer, providerServer;
  try {
    if (driver === 'mongo') {
      try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 8000 });
      } catch (error) {
        fs.rmSync(root, { recursive: true, force: true });
        t.skip('Mongo no disponible para paridad: ' + (error instanceof Error ? error.message : error));
        return;
      }
    } else new JsonStorage(process.env.TERMOMETRO_DATA_DIR).initialize();
    await assertRepositoryConformance({ users: userRepository(), teams: teamRepository(), evaluations: evaluationRepository(), rounds: roundRepository(), responses: responseRepository() });
    const app = express(); app.use(express.json({ limit: '25mb' }));
    for (const route of ['installation','auth','equipo','evaluacion','instancia','respuesta','dashboard','historico','acciones','ai','integration','team-context']) app.use('/api', require('../dist/routes/' + route + '.routes').default);
    appServer = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    let token;
    const request = async (method, route, body, auth = token) => {
      const response = await fetch('http://127.0.0.1:' + appServer.address().port + '/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: response.status === 204 ? null : await response.json() };
    };
    const ok = async (method, route, body, expected = 200, auth = token) => { const result = await request(method, route, body, auth); assert.equal(result.status, expected, JSON.stringify(result.body)); return result.body; };
    const registration = await ok('POST','/auth/register',{ nombre:'Prueba',email:'parity@example.test',password:'test-only-password' },201);
    token = registration.token;
    const owner = registration.usuario.id;
    const stranger = (await ok('POST','/auth/register',{ nombre:'Otra cuenta',email:'other@example.test',password:'test-only-password' },201)).token;
    const team = await ok('POST','/equipos',{ nombre:'Equipo paridad' },201);
    const evaluation = await ok('POST','/evaluaciones',{ titulo:'Pulso', secciones:[{ titulo:'Trabajo',ponderacion:100,indicadores:[{ id:'p',texto:'Claridad',tipo:'cuantitativo',direccion:'positiva' }] }] },201);
    const round = await ok('POST','/instancias',{ equipoId:team._id,evaluacionId:evaluation._id,activadoEn:'2026-01-01',cantidadEsperada:3,modoRespuesta:'anonima',minimoAnonimato:3 },201);
    for (let i = 0; i < 3; i++) await ok('POST','/respuestas',{ instanciaEvaluacionId:round._id,respuestas:[{indicadorId:'p',valor:4}] },201);
    const context = await ok('POST','/equipos/' + team._id + '/contexto',{ type:'priority',title:'Prioridad',content:'Mejorar acuerdos',teamId:'injected',createdBy:'injected' },201);
    assert.equal(context.teamId, team._id); assert.equal(context.createdBy, owner);
    assert.equal((await request('GET','/equipos/' + team._id + '/contexto',undefined,stranger)).status,404);
    await ok('PATCH','/equipos/' + team._id + '/contexto/' + context.id,{importance:'critical'});
    assert.equal((await ok('GET','/equipos/' + team._id + '/contexto'))[0].version,2);
    const modelApp = express(); modelApp.use(express.json());
    let sentContext, failProvider = false;
    modelApp.post('/v1/chat/completions',(req,res) => {
      if (failProvider) return res.status(503).json({ error:'offline fixture' });
      const prompt = req.body.messages[0].content;
      let result;
      if (prompt.includes('ingeniero de medición')) result = { prompt:'Instrumento de claridad' };
      else if (prompt.includes('especialista senior')) result = { titulo:'Generado',secciones:[{titulo:'Trabajo',ponderacion:100,indicadores:[{id:'p',texto:'Claridad',tipo:'cuantitativo',direccion:'positiva'}]}] };
      else if (prompt.startsWith('Return only')) result = { resumen:'Conexión correcta',fortalezas:[],alertas:[],recomendaciones:[],fuentes:[] };
      else {
        sentContext = JSON.parse(req.body.messages.at(-1).content);
        result = { resumen:'Lectura de claridad',fortalezas:[],alertas:[],recomendaciones:['Revisar acuerdos'],fuentes:['p'],nivelConfianza:0.5,limitations:[],hallazgos:[{titulo:'Claridad',tipo:'oportunidad',severidad:'media',confianza:0.5,evidenciaIds:['p']}],senalesEmocionales:[],temasRecurrentes:[],accionesContextuales:[{titulo:'Acuerdos',descripcion:'Revisar acuerdos',prioridad:'media',alcance:'equipo',ownerRole:'Facilitador',horizon:'7d',successMetric:'Más claridad',checkInQuestion:'¿Mejoró?',requiereValidacion:true,evidenceIds:['p']}] };
      }
      res.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]});
    });
    providerServer = await new Promise(resolve => { const server = modelApp.listen(0,'127.0.0.1',()=>resolve(server)); });
    const provider = await ok('POST','/ai/providers',{name:'Modelo de prueba',kind:'openai-compatible',endpoint:'http://127.0.0.1:' + providerServer.address().port + '/v1',model:'fixture',apiKey:'not-a-real-api-key'},201);
    assert.equal(provider.encryptedApiKey,undefined);
    await ok('PUT','/ai/settings',{enabled:true,defaultProviderId:provider.id});
    await ok('POST','/ai/providers/' + provider.id + '/test');
    assert.equal((await request('PUT','/ai/settings',{enabled:true,defaultProviderId:provider.id},stranger)).status,404);
    const questionnaire = await ok('POST','/ai/questionnaires/generate',{role:'Facilitador',request:'Evaluar claridad'});
    assert.equal(questionnaire.cuestionario.titulo,'Generado');
    const analysis = await ok('POST','/ai/analyses',{instanciaId:round._id});
    assert.equal(sentContext.teamContext.items.length,1);
    assert.equal(analysis.snapshot.indiceGlobal,80);
    const action = await ok('POST','/acciones',{instanciaId:round._id,descripcion:'Revisar acuerdos',ownerRole:'Facilitador',horizon:'7d',successMetric:'Más claridad',checkInQuestion:'¿Mejoró?',analisisId:analysis.id,propuestaIndice:0},201);
    assert.equal((await request('PATCH','/acciones/' + action._id + '/estado',{estado:'en_revision'},stranger)).status,400);
    for (const estado of ['en_revision','aprobada','ejecutada']) await ok('PATCH','/acciones/' + action._id + '/estado',{estado});
    await ok('PATCH','/acciones/' + action._id + '/checkins',{horizonte:'7d',nota:'Mejoró la claridad',resultado:{indiceAnterior:60,indicePosterior:80}});
    await ok('PATCH','/acciones/' + action._id + '/estado',{estado:'verificada'});
    const secondAnalysis = await ok('POST','/ai/analyses',{instanciaId:round._id});
    assert.ok(sentContext.historicalMemory.items.some(item=>item.id === 'action:' + action._id));
    const history = await ok('GET','/dashboard/historico/' + team._id + '/' + evaluation._id);
    assert.equal(history.seguimiento[0].analisis.length,2);
    assert.equal(history.seguimiento[0].acciones[0].checkIns[0].resultado.delta,20);
    let publications = 0;
    // Never send test messages or credentials to actual third-party services.
    axios.post = async (url,...args) => {
      if (url === 'https://hooks.slack.com/services/fixture') { publications++; return {data:'ok'}; }
      if (url === 'https://api.monday.com/v2') { publications++; return {data:{data:{create_item:{id:'fixture-item',url:'https://example.test/item'}}}}; }
      return originalPost(url,...args);
    };
    for (const integration of ['slack','monday']) {
      const connection = await ok('POST','/integrations',{provider:integration,name:integration,secret:integration === 'slack' ? 'https://hooks.slack.com/services/fixture' : 'fixture-token',metadata:{boardId:'123'}},201);
      assert.equal(connection.secret,undefined);
      await ok('POST','/integrations/' + connection.id + '/test');
      await ok('PUT','/equipos/' + team._id + '/integraciones',{[integration + 'ConnectionId']:connection.id});
      const before = publications;
      await ok('POST','/acciones/' + action._id + '/publicar',{connectionId:connection.id});
      await ok('POST','/acciones/' + action._id + '/publicar',{connectionId:connection.id});
      assert.equal(publications,before + 1);
    }
    const repo = featureRepository('accionesPlan');
    const stale = await repo.find({_id:action._id});
    await repo.save({...stale,descripcion:'Cambio válido'});
    await assert.rejects(()=>repo.save({...stale,descripcion:'Cambio perdido'}),/registro cambió/);
    const backup = await ok('GET','/backup');
    assert.equal(backup.formatVersion,2);
    assert.equal(backup.collections.usuarios.records.length,1);
    assert.equal(backup.collections.aiProviders.records[0].encryptedApiKey,undefined);
    assert.equal(backup.collections.integrationConnections.records[0].secret,'');
    const targetPath = path.join(root,'restored');
    const target = new JsonStorage(targetPath); target.importSnapshot(backup);
    process.env.STORAGE_DRIVER = 'json'; process.env.TERMOMETRO_DATA_DIR = targetPath;
    assert.equal((await featureRepository('aiAnalyses').list()).length,2);
    assert.equal((await featureRepository('accionesPlan').find({_id:action._id})).checkIns[0].resultado.delta,20);
    assert.equal((await featureRepository('aiSettings').find({userId:owner})).enabled,false);
    assert.equal((await ok('GET','/dashboard/historico/' + team._id + '/' + evaluation._id)).seguimiento[0].analisis.length,2);
    const corrupted = structuredClone(backup); corrupted.checksums.aiAnalyses = 'broken';
    assert.throws(()=>target.importSnapshot(corrupted),/Checksum/);
    assert.equal(target.list('aiAnalyses').length,2);
    const legacy = structuredClone(backup); legacy.formatVersion = 1;
    for (const name of FEATURE_COLLECTIONS) { delete legacy.collections[name]; delete legacy.checksums[name]; }
    new JsonStorage(path.join(root,'legacy')).importSnapshot(legacy);
    assert.equal(new JsonStorage(path.join(root,'legacy')).list('aiAnalyses').length,0);
    process.env.STORAGE_DRIVER = driver; process.env.TERMOMETRO_DATA_DIR = path.join(root,'data');
    failProvider = true;
    assert.equal((await request('POST','/ai/providers/' + provider.id + '/test')).status,502);
    await ok('PUT','/ai/settings',{enabled:false,defaultProviderId:provider.id});
    assert.equal((await request('POST','/ai/analyses',{instanciaId:round._id})).status,409);
  } finally {
    axios.post = originalPost;
    for (const server of [appServer,providerServer]) if (server) { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
    if (driver === 'mongo') {
      assert.equal(mongoose.connection.name,dbName); assert.match(dbName,/^termometro_parity_test_[a-f0-9]{16}$/);
      await mongoose.connection.dropDatabase(); await mongoose.disconnect();
    }
    fs.rmSync(root,{recursive:true,force:true});
  }
});
