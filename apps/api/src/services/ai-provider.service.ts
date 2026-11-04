import crypto from 'crypto';
import axios from 'axios';
import { AIProvider, AIProviderKind, IAIProvider } from '../models/AIProvider';

const secret = process.env.AI_CREDENTIAL_SECRET || process.env.JWT_SECRET || 'cambia-este-secreto-en-local';
const key = crypto.createHash('sha256').update(secret).digest();

const encrypt = (value: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
};

const decrypt = (value?: string) => {
  if (!value) return undefined;
  const [ivValue, tagValue, dataValue] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataValue, 'base64')), decipher.final()]).toString('utf8');
};

const normalizeEndpoint = (endpoint: string) => {
  const normalized = endpoint.replace(/\/+$/, '');
  const parsed = new URL(normalized);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('El endpoint debe usar HTTP o HTTPS');
  return normalized;
};

const publicProvider = (provider: IAIProvider) => ({
  id: provider.id,
  name: provider.name,
  kind: provider.kind,
  endpoint: provider.endpoint,
  model: provider.modelName,
  status: provider.status,
});

export const listProviders = async (userId: string) =>
  (await AIProvider.find({ userId }).sort({ actualizadoEn: -1 })).map(publicProvider);

export const createProvider = async (userId: string, input: {
  name: string; kind: AIProviderKind; endpoint: string; model: string; apiKey?: string;
}) => {
  const endpoint = normalizeEndpoint(input.endpoint);
  const provider = await AIProvider.create({
    userId, name: input.name.trim(), kind: input.kind, endpoint,
    modelName: input.model.trim(),
    encryptedApiKey: input.apiKey ? encrypt(input.apiKey) : undefined,
  });
  return publicProvider(provider);
};

export const getProviderForUser = async (userId: string, providerId: string) => {
  const provider = await AIProvider.findOne({ _id: providerId, userId });
  if (!provider) throw new Error('Proveedor de IA no encontrado');
  return provider;
};

export const testProvider = async (userId: string, providerId: string) => {
  const provider = await getProviderForUser(userId, providerId);
  const token = decrypt(provider.encryptedApiKey);
  try {
    const response = await axios.get(`${provider.endpoint}/models`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      timeout: 10000,
      validateStatus: () => true,
    });
    if (response.status < 200 || response.status >= 300) {
      provider.status = 'invalid';
      await provider.save();
      const detail = response.status === 401 || response.status === 403
        ? 'La API key fue rechazada. Verificá que esté activa y corresponda a este proveedor.'
        : response.status === 404
          ? 'No encontramos /models. Usá la URL base del proveedor, por ejemplo https://api.openai.com/v1, sin agregar /chat/completions.'
          : `El proveedor respondió HTTP ${response.status}. Revisá la URL base y la disponibilidad del servicio.`;
      throw new Error(detail);
    }
    provider.status = 'active';
    await provider.save();
    return publicProvider(provider);
  } catch (error) {
    if (error instanceof Error && error.message !== 'Network Error') throw error;
    provider.status = 'invalid';
    await provider.save();
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') throw new Error('El proveedor tardó demasiado en responder. Revisá la URL o intentá nuevamente.');
      if (!error.response) throw new Error('No pudimos llegar al proveedor. Revisá la URL, tu conexión o si el servicio está disponible.');
    }
    throw new Error('No pudimos verificar el proveedor. Revisá la URL base y la API key.');
  }
};

export const updateProvider = async (userId: string, providerId: string, input: {
  name?: string; kind?: AIProviderKind; endpoint?: string; model?: string; apiKey?: string;
}) => {
  const provider = await getProviderForUser(userId, providerId);
  if (input.name) provider.name = input.name.trim();
  if (input.kind) provider.kind = input.kind;
  if (input.endpoint) {
    const endpoint = normalizeEndpoint(input.endpoint);
    provider.endpoint = endpoint;
  }
  if (input.model) provider.modelName = input.model.trim();
  if (input.apiKey !== undefined) provider.encryptedApiKey = input.apiKey ? encrypt(input.apiKey) : undefined;
  provider.status = 'unverified';
  await provider.save();
  return publicProvider(provider);
};

export const deleteProvider = async (userId: string, providerId: string) => {
  const result = await AIProvider.deleteOne({ _id: providerId, userId });
  if (!result.deletedCount) throw new Error('Proveedor de IA no encontrado');
};

export const getProviderCredentials = (provider: IAIProvider) => decrypt(provider.encryptedApiKey);
