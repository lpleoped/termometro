const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('HTTP local-first: registro → equipo → evaluación → ronda → respuesta → resultados', async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-local-http-'));
  const port = 32000 + (process.pid % 1000);
  const base = `http://127.0.0.1:${port}/api`;
  let output = '';
  const server = spawn(process.env.TERMOMETRO_TEST_EXECUTABLE || process.execPath, ['dist/app.js'], {
    cwd: process.env.TERMOMETRO_TEST_API_ROOT || path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      ...(process.env.TERMOMETRO_TEST_EXECUTABLE ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      NODE_ENV: 'test',
      PORT: String(port),
      STORAGE_DRIVER: 'json',
      TERMOMETRO_DATA_DIR: dataDirectory,
      JWT_SECRET: 'local-http-jwt-secret-with-at-least-32-characters',
      AI_CREDENTIAL_SECRET: 'local-http-ai-secret-with-at-least-32-characters',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { output += chunk.toString(); });
  server.stderr.on('data', chunk => { output += chunk.toString(); });

  const request = async (url, options = {}) => {
    const response = await fetch(`${base}${url}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    });
    const body = response.status === 204 ? null : await response.json();
    return { status: response.status, body };
  };

  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try { ready = (await fetch(`${base}/health`)).ok; if (ready) break; } catch {}
      await wait(100);
    }
    assert.equal(ready, true, `La API local no inició:\n${output}`);

    const installation = await request('/installation');
    // Regresión del instalador: una API sana no garantiza una interfaz usable.
    const origin = `http://127.0.0.1:${port}`;
    for (const route of ['/', '/registro', '/backoffice/home']) {
      const page = await fetch(`${origin}${route}`);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /<div id="root"><\/div>/);
      assert.match(html, /termometro-runtime\.js/);
      assert.doesNotMatch(html, /API de Termómetro funcionando/);
      const script = html.match(/src="(\/assets\/[^\"]+\.js)"/);
      assert.ok(script, 'Debe servirse la interfaz compilada');
      assert.equal((await fetch(`${origin}${script[1]}`)).status, 200);
    }
    assert.match(await (await fetch(`${origin}/termometro-runtime.js`)).text(), /__TERMOMETRO_API_URL__ = "\/api"/);
    assert.equal(installation.status, 200, JSON.stringify(installation.body));
    assert.deepEqual(installation.body, { firstRun: true, storage: 'json' });

    const registration = await request('/auth/register', { method: 'POST', body: JSON.stringify({ nombre: 'Facilitadora', email: 'facilitadora@example.com', password: 'clave-segura' }) });
    assert.equal(registration.status, 201, JSON.stringify(registration.body));
    const auth = { authorization: `Bearer ${registration.body.token}` };
    const installationAfterRegistration = await request('/installation');
    assert.deepEqual(installationAfterRegistration.body, { firstRun: false, storage: 'json' });

    const team = await request('/equipos', { method: 'POST', headers: auth, body: JSON.stringify({ nombre: 'Equipo HTTP' }) });
    assert.equal(team.status, 201, JSON.stringify(team.body));

    const evaluation = await request('/evaluaciones', { method: 'POST', headers: auth, body: JSON.stringify({
      titulo: 'Pulso HTTP',
      secciones: [{ titulo: 'Trabajo', ponderacion: 100, indicadores: [
        { id: 'claridad', texto: 'Tenemos claridad', tipo: 'cuantitativo', direccion: 'positiva' },
        { id: 'mejora', texto: '¿Qué mejorarías?', tipo: 'cualitativo' },
      ] }],
    }) });
    assert.equal(evaluation.status, 201, JSON.stringify(evaluation.body));

    const round = await request('/instancias', { method: 'POST', headers: auth, body: JSON.stringify({
      equipoId: team.body._id,
      evaluacionId: evaluation.body._id,
      activadoEn: '2026-11-05T12:00:00.000Z',
      cantidadEsperada: 1,
      modoRespuesta: 'anonima',
      minimoAnonimato: 1,
    }) });
    assert.equal(round.status, 201, JSON.stringify(round.body));

    const answer = await request('/respuestas', { method: 'POST', body: JSON.stringify({
      instanciaEvaluacionId: round.body._id,
      respuestas: [{ indicadorId: 'claridad', valor: 5 }, { indicadorId: 'mejora', texto: 'Documentar acuerdos' }],
    }) });
    assert.equal(answer.status, 201, JSON.stringify(answer.body));

    const dashboard = await request(`/dashboard/estado-actual/${round.body._id}`, { headers: auth });
    assert.equal(dashboard.status, 200, JSON.stringify(dashboard.body));
    assert.equal(dashboard.body.indiceGlobal, 100);
    assert.deepEqual(dashboard.body.participacion, { esperada: 1, recibida: 1, porcentaje: 100 });

    const history = await request(`/dashboard/historico/${team.body._id}/${evaluation.body._id}`, { headers: auth });
    assert.equal(history.status, 200, JSON.stringify(history.body));
    assert.equal(history.body.historico.length, 1);
    assert.equal(history.body.historico[0].indiceGlobal, 100);

    const backup = await request('/backup', { headers: auth });
    assert.equal(backup.status, 200, JSON.stringify(backup.body));
    assert.equal(backup.body.format, 'termometro-de-equipo-export');
    assert.equal(backup.body.collections.usuarios.records.length, 1);
    const invalidRestore = await request('/backup/restore', { method: 'POST', headers: auth, body: JSON.stringify({ format: 'incompatible' }) });
    assert.equal(invalidRestore.status, 400);

    const unavailableAI = await request('/ai/settings', { headers: auth });
    assert.equal(unavailableAI.status, 200);
    assert.deepEqual(unavailableAI.body, { enabled: false, defaultProviderId: null });

    const files = [
      'manifest.json', 'usuarios.json', 'equipos.json', 'evaluaciones.json', 'instancias.json', 'respuestas.json',
      'aiProviders.json', 'aiSettings.json', 'aiAnalyses.json', 'accionesPlan.json',
      'teamContextItems.json', 'integrationConnections.json', 'teamIntegrationSettings.json',
    ];
    for (const file of files) assert.equal(fs.existsSync(path.join(dataDirectory, file)), true, `Falta ${file}`);
    const manifest = JSON.parse(fs.readFileSync(path.join(dataDirectory, 'manifest.json'), 'utf8'));
    assert.equal(manifest.formatVersion, 2);
  } finally {
    server.kill();
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), wait(2000)]);
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});
