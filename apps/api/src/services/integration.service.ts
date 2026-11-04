import crypto from 'node:crypto';
import axios from 'axios';
import { IntegrationConnection, IntegrationProvider } from '../models/IntegrationConnection';
import { AccionPlan } from '../models/AccionPlan';
import { TeamIntegrationSettings } from '../models/TeamIntegrationSettings';
import { Equipo } from '../models/Equipo';

const key = () => process.env.INTEGRATION_ENCRYPTION_KEY || '';
const protect = (value: string) => {
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

export const listConnections = async (userId: string) => (await IntegrationConnection.find({ userId }).sort({ provider: 1, createdAt: 1 })).map(c => ({ id: c.id, provider: c.provider, name: c.name, status: c.status, metadata: c.metadata, createdAt: c.createdAt }));

export const createConnection = async (userId: string, input: { provider: IntegrationProvider; name: string; secret: string; metadata?: Record<string, unknown> }) => {
  if (!['slack', 'monday'].includes(input.provider) || !input.name?.trim() || !input.secret?.trim()) throw new Error('Proveedor, nombre y credencial son obligatorios.');
  const row = await new IntegrationConnection({ userId, provider: input.provider, name: input.name.trim(), secret: protect(input.secret.trim()), metadata: input.metadata || {} }).save();
  return { id: row.id, provider: row.provider, name: row.name, status: row.status, metadata: row.metadata, createdAt: row.createdAt };
};

export const deleteConnection = async (userId: string, id: string) => { const result = await IntegrationConnection.deleteOne({ _id: id, userId }); if (!result.deletedCount) throw new Error('Conexión no encontrada.'); };

export const testConnection = async (userId: string, id: string) => {
  const row = await IntegrationConnection.findOne({ _id: id, userId }); if (!row) throw new Error('Conexión no encontrada.');
  const secret = reveal(row.secret);
  if (row.provider === 'slack') { await axios.post(secret, { text: 'Conexión verificada desde Termómetro de Equipo.' }); }
  else { await axios.post('https://api.monday.com/v2', { query: 'query { me { id name } }' }, { headers: { Authorization: secret, 'Content-Type': 'application/json' } }); }
  row.status = 'active'; await row.save(); return { ok: true };
};

export const getTeamIntegrationSettings = async (userId: string, equipoId: string) => {
  if (!await Equipo.exists({ _id: equipoId, creadoPor: userId, activo: { $ne: false } })) throw new Error('Equipo no encontrado.');
  return TeamIntegrationSettings.findOne({ userId, equipoId }).lean() || { equipoId };
};

export const saveTeamIntegrationSettings = async (userId: string, equipoId: string, input: { slackConnectionId?: string; mondayConnectionId?: string; mondayBoardId?: string }) => {
  if (!await Equipo.exists({ _id: equipoId, creadoPor: userId, activo: { $ne: false } })) throw new Error('Equipo no encontrado.');
  for (const id of [input.slackConnectionId, input.mondayConnectionId]) if (id && !await IntegrationConnection.exists({ _id: id, userId })) throw new Error('La conexión seleccionada no pertenece a tu cuenta.');
  return TeamIntegrationSettings.findOneAndUpdate({ userId, equipoId }, { ...input, userId, equipoId }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

export const publishAction = async (userId: string, actionId: string, connectionId: string) => {
  const [action, connection] = await Promise.all([AccionPlan.findById(actionId), IntegrationConnection.findOne({ _id: connectionId, userId })]);
  if (!action || !connection) throw new Error('Acción o conexión no encontrada.');
  const previous = action.integraciones?.find(i => i.provider === connection.provider && i.status === 'published');
  if (previous) return previous;
  const secret = reveal(connection.secret);
  let externalId = ''; let url = '';
  if (connection.provider === 'slack') {
    const response = await axios.post(secret, { text: `*Acción del Termómetro de Equipo*\n${action.descripcion}` });
    externalId = response.data?.ts || 'webhook';
  } else {
    const boardId = connection.metadata?.boardId;
    if (!boardId) throw new Error('Configurá el boardId de monday para esta conexión.');
    const query = 'mutation ($board: ID!, $name: String!) { create_item(board_id: $board, item_name: $name) { id url } }';
    const response = await axios.post('https://api.monday.com/v2', { query, variables: { board: String(boardId), name: action.descripcion.slice(0, 255) } }, { headers: { Authorization: secret, 'Content-Type': 'application/json' } });
    const item = response.data?.data?.create_item; if (!item) throw new Error('monday no devolvió el item creado.');
    externalId = item.id; url = item.url || '';
  }
  const publication = { provider: connection.provider, externalId, url, status: 'published' as const, publishedAt: new Date() };
  action.integraciones = [...(action.integraciones || []), publication]; await action.save(); return publication;
};
