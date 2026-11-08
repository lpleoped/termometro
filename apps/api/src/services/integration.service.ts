import crypto from 'node:crypto';
import axios from 'axios';
import type { IntegrationProvider } from '../domain/feature-records';
import { featureRepository } from '../repositories/feature.repository';
import { newFeature } from '../domain/feature-validation';
import { teamRepository } from '../repositories/team.repository';



import { assertInstanceOwner } from './authorization.service';

const key = () => process.env.INTEGRATION_ENCRYPTION_KEY || '';
const assertEncryptionConfigured = () => {
  if (process.env.NODE_ENV === 'production' && key().length < 32) throw new Error('INTEGRATION_ENCRYPTION_KEY debe estar configurada en despliegues de producción.');
};
const protect = (value: string) => {
  assertEncryptionConfigured();
  const secret = key();
  if (!secret) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(secret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `enc:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
};
const reveal = (value: string) => {
  if (!value.startsWith('enc:')) return value;
  const [, ivHex, tagHex, encryptedHex] = value.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(key()).digest(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
};
const assertStoredSecretIsProtected = (value: string) => {
  if (process.env.NODE_ENV === 'production' && !value.startsWith('enc:')) throw new Error('La credencial de integración no está cifrada; volvé a guardarla antes de usarla.');
};

export const listConnections = async (userId: string) => (await featureRepository('integrationConnections').list({ userId }, { provider: 1, createdAt: 1 })).map(c => ({ id: c._id, provider: c.provider, name: c.name, status: c.status, metadata: c.metadata, createdAt: c.createdAt }));

export const createConnection = async (userId: string, input: { provider: IntegrationProvider; name: string; secret: string; metadata?: Record<string, unknown> }) => {
  if (!['slack', 'monday'].includes(input.provider) || !input.name?.trim() || !input.secret?.trim()) throw new Error('Proveedor, nombre y credencial son obligatorios.');
  const row = await featureRepository('integrationConnections').insert(newFeature('integrationConnections', { userId, provider: input.provider, name: input.name.trim(), secret: protect(input.secret.trim()), metadata: input.metadata || {} }));
  return { id: row._id, provider: row.provider, name: row.name, status: row.status, metadata: row.metadata, createdAt: row.createdAt };
};

export const deleteConnection = async (userId: string, id: string) => {
  const result = await featureRepository('integrationConnections').remove({ _id: id, userId });
  if (!result) throw new Error('Conexión no encontrada.');
  for (const settings of await featureRepository('teamIntegrationSettings').list({ userId })) {
    if (settings.slackConnectionId === id || settings.mondayConnectionId === id) {
      await featureRepository('teamIntegrationSettings').save({ ...settings, slackConnectionId: settings.slackConnectionId === id ? '' : settings.slackConnectionId, mondayConnectionId: settings.mondayConnectionId === id ? '' : settings.mondayConnectionId });
    }
  }
};

export const updateConnection = async (userId: string, id: string, input: { name?: string; secret?: string; metadata?: Record<string, unknown> }) => {
  const repository = featureRepository('integrationConnections');
  const row = await repository.find({ _id: id, userId });
  if (!row) throw new Error('Conexión no encontrada.');
  if (input.name !== undefined) { if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100) throw new Error('Nombre inválido.'); row.name = input.name.trim(); }
  if (input.secret?.trim()) row.secret = protect(input.secret.trim());
  if (input.metadata) row.metadata = input.metadata;
  row.status = 'invalid'; row.updatedAt = new Date();
  const saved = await repository.save(row);
  return { id: saved._id, provider: saved.provider, name: saved.name, status: saved.status, metadata: saved.metadata, createdAt: saved.createdAt };
};

export const testConnection = async (userId: string, id: string) => {
  const row = await featureRepository('integrationConnections').find({ _id: id, userId }); if (!row) throw new Error('Conexión no encontrada.');
  const secret = reveal(row.secret);
  assertStoredSecretIsProtected(row.secret);
    if (row.provider === 'slack') { await axios.post(secret, { text: 'Conexión verificada desde Termómetro.' }); }
  else { await axios.post('https://api.monday.com/v2', { query: 'query { me { id name } }' }, { headers: { Authorization: secret, 'Content-Type': 'application/json' } }); }
  row.status = 'active'; await featureRepository('integrationConnections').save(row); return { ok: true };
};

export const getTeamIntegrationSettings = async (userId: string, equipoId: string) => {
  if (!await teamRepository().findOwnedActive(equipoId, userId)) throw new Error('Equipo no encontrado.');
  return await featureRepository('teamIntegrationSettings').find({ userId, equipoId }) || { equipoId };
};

export const saveTeamIntegrationSettings = async (userId: string, equipoId: string, input: { slackConnectionId?: string; mondayConnectionId?: string; mondayBoardId?: string }) => {
  if (!await teamRepository().findOwnedActive(equipoId, userId)) throw new Error('Equipo no encontrado.');
  for (const [id, provider] of [[input.slackConnectionId, 'slack'], [input.mondayConnectionId, 'monday']] as const) if (id && !await featureRepository('integrationConnections').find({ _id: id, userId, provider })) throw new Error('La conexión seleccionada no pertenece a tu cuenta o al proveedor indicado.');
  const repository = featureRepository('teamIntegrationSettings');
  const existing = await repository.find({ userId, equipoId });
  const fields = { slackConnectionId: input.slackConnectionId, mondayConnectionId: input.mondayConnectionId, mondayBoardId: input.mondayBoardId, userId, equipoId };
  return existing ? repository.save({ ...existing, ...fields }) : repository.insert(newFeature('teamIntegrationSettings', fields));
};

export const publishAction = async (userId: string, actionId: string, connectionId: string) => {
  const [action, connection] = await Promise.all([featureRepository('accionesPlan').find({ _id: actionId }), featureRepository('integrationConnections').find({ _id: connectionId, userId })]);
  if (!action || !connection) throw new Error('Acción o conexión no encontrada.');
  await assertInstanceOwner(userId, String(action.instanciaEvaluacion));
  if (!['aprobada', 'ejecutada', 'verificada'].includes(action.estado)) throw new Error('La acción debe estar aprobada antes de publicarse externamente.');
  const previous = action.integraciones?.find(i => i.provider === connection.provider && i.status === 'published');
  if (previous) return previous;
  const secret = reveal(connection.secret);
  assertStoredSecretIsProtected(connection.secret);
  let externalId = ''; let url = '';
  if (connection.provider === 'slack') {
    const response = await axios.post(secret, { text: `*Acción de Termómetro*\n${action.descripcion}` });
    externalId = response.data?.ts || 'webhook';
  } else {
    const round = await assertInstanceOwner(userId, String(action.instanciaEvaluacion));
    const teamSettings = round.equipo ? await featureRepository('teamIntegrationSettings').find({ userId, equipoId: String(round.equipo) }) : null;
    const boardId = teamSettings?.mondayConnectionId === connectionId && teamSettings.mondayBoardId ? teamSettings.mondayBoardId : connection.metadata?.boardId;
    if (!boardId) throw new Error('Configurá el boardId de monday para esta conexión.');
    const query = 'mutation ($board: ID!, $name: String!) { create_item(board_id: $board, item_name: $name) { id url } }';
    const response = await axios.post('https://api.monday.com/v2', { query, variables: { board: String(boardId), name: action.descripcion.slice(0, 255) } }, { headers: { Authorization: secret, 'Content-Type': 'application/json' } });
    const item = response.data?.data?.create_item; if (!item) throw new Error('monday no devolvió el item creado.');
    externalId = item.id; url = item.url || '';
  }
  const publication = { provider: connection.provider, externalId, url, status: 'published' as const, publishedAt: new Date() };
  action.integraciones = [...(action.integraciones || []), publication]; await featureRepository('accionesPlan').save(action); return publication;
};
