import crypto from 'crypto';
import { AI_CHECK_VERSION, requestCompletion, validateProbeAnalysis } from './ai-completion';
import type { AIProviderKind, IAIProvider } from '../domain/feature-records';
import { featureRepository } from '../repositories/feature.repository';
import { newFeature, validateFeature } from '../domain/feature-validation';

import { requireAIEnabled } from './ai-settings.service';

const credentialKey = () => {
  const secret = process.env.AI_CREDENTIAL_SECRET;
  if (!secret || secret.length < 32) throw new Error('AI_CREDENTIAL_SECRET no está configurado de forma segura');
  return crypto.createHash('sha256').update(secret).digest();
};

const encrypt = (value: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', credentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
};

const decrypt = (value?: string) => {
  if (!value) return undefined;
  const [ivValue, tagValue, dataValue] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', credentialKey(), Buffer.from(ivValue, 'base64'));
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
  id: provider._id,
  name: provider.name,
  kind: provider.kind,
  endpoint: provider.endpoint,
  model: provider.modelName,
  status: provider.status === 'active' && provider.checkVersion !== AI_CHECK_VERSION ? 'unverified' : provider.status,
});

export const listProviders = async (userId: string) =>
  (await featureRepository('aiProviders').list({ userId }, { actualizadoEn: -1 })).map(publicProvider);

export const createProvider = async (userId: string, input: {
  name: string; kind: AIProviderKind; endpoint: string; model: string; apiKey?: string;
}) => {
  const endpoint = normalizeEndpoint(input.endpoint);
  const provider = await featureRepository('aiProviders').insert(newFeature('aiProviders', {
    userId, name: input.name.trim(), kind: input.kind, endpoint,
    modelName: input.model.trim(),
    encryptedApiKey: input.apiKey ? encrypt(input.apiKey) : undefined,
  }));
  return publicProvider(provider);
};

export const getProviderForUser = async (userId: string, providerId: string) => {
  const provider = await featureRepository('aiProviders').find({ _id: providerId, userId });
  if (!provider) throw new Error('Proveedor de IA no encontrado');
  return provider;
};

export const testProvider = async (userId: string, providerId: string) => {
  await requireAIEnabled(userId);
  const provider = await getProviderForUser(userId, providerId);
  try {
    validateProbeAnalysis(await requestCompletion(provider.endpoint, provider.modelName, decrypt(provider.encryptedApiKey), [
      { role: 'system', content: 'Return only valid JSON with these keys: resumen (string), fortalezas (array), alertas (array), recomendaciones (array), fuentes (array). Keep every value brief and do not add explanations.' },
      { role: 'user', content: 'Prueba con datos ficticios: índice 70/100, participación 80%, indicador colaboración 70/100. Generá un análisis de una frase, arrays breves.' },
    ], true));
    provider.status = 'active';
    provider.checkVersion = AI_CHECK_VERSION;
  } catch (error) {
    provider.status = 'invalid';
    provider.checkVersion = AI_CHECK_VERSION;
    await saveProvider(provider);
    throw error;
  }
  await saveProvider(provider);
  return publicProvider(provider);
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
  // An empty edit field means keep the stored credential.
  if (input.apiKey?.trim()) provider.encryptedApiKey = encrypt(input.apiKey.trim());
  provider.status = 'unverified';
  provider.checkVersion = undefined;
  await saveProvider(provider);
  return publicProvider(provider);
};

export const deleteProvider = async (userId: string, providerId: string) => {
  const removed = await featureRepository('aiProviders').remove({ _id: providerId, userId });
  if (!removed) throw new Error('Proveedor de IA no encontrado');
  const settings = await featureRepository('aiSettings').find({ userId, defaultProviderId: providerId });
  if (settings) await featureRepository('aiSettings').save({ ...settings, enabled: false, defaultProviderId: null });
};

export const getProviderCredentials = (provider: IAIProvider) => decrypt(provider.encryptedApiKey);

export async function saveProvider(provider: IAIProvider) {
  provider.actualizadoEn = new Date();
  validateFeature('aiProviders', provider);
  const saved = await featureRepository('aiProviders').save(provider);
  Object.assign(provider, saved);
  return saved;
}

