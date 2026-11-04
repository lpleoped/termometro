require('ts-node/register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const axios = require('axios');
const { completionBody, parseCompletion, validateAnalysis, requestCompletion, assertSafeEndpoint, aiError, AI_TIMEOUT_MS } = require('../src/services/ai-completion');
const { AIProvider } = require('../src/models/AIProvider');
const { AISettingsModel } = require('../src/models/AISettings');
const { testProvider, updateProvider } = require('../src/services/ai-provider.service');

const valid = { resumen: 'Resultado de prueba', fortalezas: ['Colaboración'], alertas: [], recomendaciones: ['Revisar la carga'], nivelConfianza: 0.7, fuentes: ['colaboración'], accionesContextuales: [] };
const reply = (value = valid) => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });

test('GPT-5 has bounded output and low reasoning; compatible endpoints do not inherit OpenAI parameters', () => {
  const body = completionBody('https://api.openai.com/v1', 'gpt-5', []);
  assert.equal(body.reasoning_effort, 'low');
  assert.equal(body.max_completion_tokens, 4096);
  assert.equal(body.temperature, undefined);
  const other = completionBody('https://example.com/v1', 'gpt-5', []);
  assert.equal(other.reasoning_effort, undefined);
  assert.equal(other.max_tokens, 4096);
});

test('rejects HTTP 200 with exhausted reasoning budget, no text, refusal or invalid JSON', () => {
  for (const response of [
    { choices: [{ finish_reason: 'length', message: { content: '' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '' } }] },
    { choices: [{ finish_reason: 'stop', message: { refusal: 'refused' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'not JSON' } }] },
  ]) assert.throws(() => parseCompletion(response));
  assert.deepEqual(validateAnalysis(parseCompletion(reply())), valid);
  assert.throws(() => validateAnalysis({ ...valid, nivelConfianza: 80 }));
  assert.throws(() => validateAnalysis({ ...valid, recomendaciones: [{}] }));
});

test('timeouts and credentials errors have safe actionable messages', () => {
  const timeout = aiError(new axios.AxiosError('secret detail', 'ECONNABORTED'));
  assert.equal(timeout.status, 504);
  assert.equal(timeout.code, 'AI_TIMEOUT');
  assert.match(timeout.diagnostic, /120 segundos/);
  assert.ok(!timeout.message.includes('secret detail'));
});

test('provider diagnostics are exposed safely without credentials', () => {
  const issue = aiError({ isAxiosError: true, response: { status: 400, data: { error: { message: 'model=bad; api_key=super-secret' } } } });
  assert.equal(issue.code, 'AI_CONFIGURATION');
  assert.match(issue.diagnostic, /model=bad/);
  assert.ok(!issue.diagnostic.includes('super-secret'));
});

test('blocks local and private provider endpoints by default', async () => {
  const previous = process.env.AI_ALLOW_PRIVATE_ENDPOINTS;
  delete process.env.AI_ALLOW_PRIVATE_ENDPOINTS;
  await assert.rejects(() => assertSafeEndpoint('http://127.0.0.1:3000/v1'), error => error.code === 'AI_ENDPOINT_BLOCKED');
  await assert.rejects(() => assertSafeEndpoint('http://localhost:3000/v1'), error => error.code === 'AI_ENDPOINT_BLOCKED');
  if (previous === undefined) delete process.env.AI_ALLOW_PRIVATE_ENDPOINTS; else process.env.AI_ALLOW_PRIVATE_ENDPOINTS = previous;
});

test('failed test clears previous active status and a blank edit preserves the key', async () => {
  const originalFind = AIProvider.findOne;
  const originalAdapter = axios.defaults.adapter;
  const originalSettingsFind = AISettingsModel.findOne;
  const provider = { endpoint: 'https://api.openai.com/v1', modelName: 'gpt-5', status: 'active', save: async () => {}, id: 'fixture' };
  try {
    AIProvider.findOne = async () => provider;
    AISettingsModel.findOne = async () => ({ enabled: true, defaultProviderId: 'fixture' });
    axios.defaults.adapter = async config => {
      assert.equal(config.timeout, AI_TIMEOUT_MS);
      return { status: 200, data: { choices: [{ finish_reason: 'length', message: { content: '' } }] }, config, headers: {}, statusText: 'OK' };
    };
    await assert.rejects(testProvider('owner', 'fixture'));
    assert.equal(provider.status, 'invalid');
    axios.defaults.adapter = async config => ({ status: 200, data: reply(), config, headers: {}, statusText: 'OK' });
    assert.equal((await testProvider('owner', 'fixture')).status, 'active');
    provider.encryptedApiKey = 'existing-ciphertext';
    await updateProvider('owner', 'fixture', { name: 'Renamed', apiKey: '' });
    assert.equal(provider.encryptedApiKey, 'existing-ciphertext');
    assert.equal(provider.status, 'unverified');
  } finally { AIProvider.findOne = originalFind; AISettingsModel.findOne = originalSettingsFind; axios.defaults.adapter = originalAdapter; }
});

test('generation accepts a response arriving beyond the former 30 second timeout', { timeout: 45000 }, async () => {
  const previous = process.env.AI_ALLOW_PRIVATE_ENDPOINTS;
  process.env.AI_ALLOW_PRIVATE_ENDPOINTS = 'true';
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      assert.equal(JSON.parse(body).response_format.type, 'json_object');
      setTimeout(() => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(reply())); }, 31000);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await requestCompletion(`http://127.0.0.1:${server.address().port}/v1`, 'fake-model', undefined, [{ role: 'user', content: 'JSON' }]);
    assert.deepEqual(validateAnalysis(result), valid);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); if (previous === undefined) delete process.env.AI_ALLOW_PRIVATE_ENDPOINTS; else process.env.AI_ALLOW_PRIVATE_ENDPOINTS = previous; }
});
