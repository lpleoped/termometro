// Optional integration against a disposable database. Run with MONGO_URI.
process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-chars';
process.env.AI_CREDENTIAL_SECRET = 'test-only-ai-credential-secret-32chars';
require('ts-node/register');
require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const contextRoutes = require('../src/routes/team-context.routes').default;
const { Equipo } = require('../src/models/Equipo');
const { TeamContextItem } = require('../src/models/TeamContextItem');

test('HTTP + Mongo: team context is isolated by owner and validates inputs', { timeout: 30000, skip: !process.env.MONGO_URI }, async () => {
  const dbName = 'termometro_context_test_' + crypto.randomBytes(8).toString('hex');
  await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 10000 });
  const owner = new mongoose.Types.ObjectId().toString();
  const stranger = new mongoose.Types.ObjectId().toString();
  const team = await Equipo.create({ nombre: 'Context fixture', creadoPor: owner });
  const app = express(); app.use(express.json()); app.use('/api', contextRoutes);
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const call = async (method, path, body, user = owner) => {
    const headers = { 'Content-Type': 'application/json' };
    if (user) headers.Authorization = 'Bearer ' + jwt.sign({ id: user }, process.env.JWT_SECRET);
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  };
  const base = `/equipos/${team.id}/contexto`;
  try {
    assert.equal((await call('GET', base, undefined, null)).status, 401);
    assert.equal((await call('POST', base, { type: 'stable_fact', title: 'Cliente', content: 'Trabajamos con un cliente exigente.' })).status, 201);
    const created = await call('POST', base, { type: 'constraint', title: 'Competencia', content: 'Compartimos competencia con otro proveedor.', source: 'Reunión inicial' });
    assert.equal(created.status, 201);
    assert.equal((await call('GET', base)).data.length, 2);
    assert.equal((await call('GET', base, undefined, stranger)).status, 404);
    assert.equal((await call('POST', base, { type: 'stable_fact', title: 'No', content: 'No' }, stranger)).status, 404);
    assert.equal((await call('PATCH', `${base}/bad-id`, { title: 'No' })).status, 400);
    assert.equal((await call('POST', base, { type: 'stable_fact', title: 'Fecha', content: 'Dato', validFrom: 'not-a-date' })).status, 400);
    assert.equal((await call('POST', base, { type: 'stable_fact', title: 'Rango', content: 'Dato', validFrom: '2026-12-01', validUntil: '2026-11-01' })).status, 400);
    const archived = await call('DELETE', `${base}/${created.data.id}`);
    assert.equal(archived.status, 200); assert.equal(archived.data.status, 'obsolete');
    assert.equal((await TeamContextItem.countDocuments({ teamId: team.id, status: 'obsolete' })), 1);
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await TeamContextItem.deleteMany({ teamId: team.id }); await Equipo.deleteOne({ _id: team.id });
    assert.match(dbName, /^termometro_context_test_[a-f0-9]{16}$/);
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  }
});
