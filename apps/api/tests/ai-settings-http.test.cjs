// Optional integration against a dedicated disposable database, never the application's data.
// Run with: node --test tests/ai-settings-http.test.cjs (uses MONGO_URI from apps/api/.env).
process.env.JWT_SECRET = 'test-only-ai-settings-secret-32-characters';
process.env.AI_CREDENTIAL_SECRET = 'test-only-ai-credentials-secret-32';
require('ts-node/register');
require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const aiRoutes = require('../src/routes/ai.routes').default;
const actionRoutes = require('../src/routes/acciones.routes').default;
const { AISettingsModel } = require('../src/models/AISettings');
const { AIProvider } = require('../src/models/AIProvider');

test('HTTP + Mongo: central switch, selection, deletion and ownership', { timeout: 30000, skip: !process.env.MONGO_URI }, async t => {
  const dbName = 'termometro_ai_test_' + crypto.randomBytes(8).toString('hex');
  await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 10000 });
  const owner = new mongoose.Types.ObjectId().toString();
  const stranger = new mongoose.Types.ObjectId().toString();
  const app = express(); app.use(express.json()); app.use('/api', aiRoutes); app.use('/api', actionRoutes);
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const adapter = axios.defaults.adapter;
  let externalCalls = 0;
  axios.defaults.adapter = async config => {
    externalCalls++;
    return { status: 200, headers: {}, statusText: 'OK', config, data: { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ resumen: 'Fixture', fortalezas: [], alertas: [], recomendaciones: [], nivelConfianza: 0.5, fuentes: [] }) } }] } };
  };
  const call = async (method, path, body, user = owner) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: user }, process.env.JWT_SECRET) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  };
  try {
    await t.test('new account starts off and cannot enable without a connection', async () => {
      assert.deepEqual((await call('GET', '/ai/settings')).data, { enabled: false, defaultProviderId: null });
      assert.equal((await call('PUT', '/ai/settings', { enabled: true, defaultProviderId: null })).status, 400);
    });
    const connection = (await call('POST', '/ai/providers', { name: 'Disposable fixture', kind: 'openai-compatible', endpoint: 'https://example.com/v1', model: 'fixture', apiKey: 'fixture-key-never-sent' })).data;
    assert.ok(connection.id);
    await t.test('all outbound entry points are blocked while off, including provider override', async () => {
      for (const path of ['/ai/analyses', '/acciones/sugerencias', `/ai/providers/${connection.id}/test`]) {
        const result = await call('POST', path, { instanciaId: new mongoose.Types.ObjectId().toString(), providerId: connection.id });
        assert.equal(result.status, 409, path);
        assert.equal(result.data.code, 'AI_DISABLED', path);
      }
      assert.equal(externalCalls, 0);
    });
    await t.test('select, enable, verify, disable and re-enable without losing credentials', async () => {
      assert.equal((await call('PUT', '/ai/settings', { enabled: true, defaultProviderId: connection.id })).status, 200);
      assert.equal((await call('POST', `/ai/providers/${connection.id}/test`, {})).data.status, 'active');
      assert.equal(externalCalls, 1);
      const ciphertext = (await AIProvider.findById(connection.id)).encryptedApiKey;
      await call('PUT', '/ai/settings', { enabled: false, defaultProviderId: connection.id });
      await call('PUT', `/ai/providers/${connection.id}`, { name: 'Updated fixture', apiKey: '' });
      assert.equal((await AIProvider.findById(connection.id)).encryptedApiKey, ciphertext);
      assert.equal((await call('PUT', '/ai/settings', { enabled: true, defaultProviderId: connection.id })).status, 200);
    });
    await t.test('other accounts cannot select, edit or delete this connection', async () => {
      assert.equal((await call('PUT', '/ai/settings', { enabled: true, defaultProviderId: connection.id }, stranger)).status, 404);
      assert.equal((await call('DELETE', `/ai/providers/${connection.id}`, undefined, stranger)).status, 404);
      assert.ok(await AIProvider.findById(connection.id));
    });
    await t.test('delete a non-default connection keeps AI enabled; delete default turns it off', async () => {
      const other = (await call('POST', '/ai/providers', { name: 'Other fixture', kind: 'openai-compatible', endpoint: 'https://example.com/v1', model: 'fixture' })).data;
      assert.equal((await call('DELETE', `/ai/providers/${other.id}`)).status, 204);
      assert.equal((await call('GET', '/ai/settings')).data.enabled, true);
      assert.equal((await call('DELETE', `/ai/providers/${connection.id}`)).status, 204);
      assert.deepEqual((await call('GET', '/ai/providers')).data, []);
      assert.deepEqual((await call('GET', '/ai/settings')).data, { enabled: false, defaultProviderId: null });
      assert.equal((await call('POST', '/acciones/sugerencias', { instanciaId: new mongoose.Types.ObjectId().toString() })).data.code, 'AI_DISABLED');
      assert.equal(externalCalls, 1);
    });
    await t.test('invalid inputs and missing authentication are rejected', async () => {
      assert.equal((await call('PUT', '/ai/settings', { enabled: 'false', defaultProviderId: null })).status, 400);
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/ai/settings`);
      assert.equal(response.status, 401);
    });
  } finally {
    axios.defaults.adapter = adapter;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    // Only the randomly named database created by this test can be removed.
    assert.match(dbName, /^termometro_ai_test_[a-f0-9]{16}$/);
    assert.equal(mongoose.connection.name, dbName);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
