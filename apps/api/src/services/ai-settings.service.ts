import type { AISettings } from '@termometro/shared';
import { AISettingsModel } from '../models/AISettings';
import { AIProvider } from '../models/AIProvider';
import { AIRequestError } from './ai-completion';
import { isValidObjectId } from 'mongoose';

export async function getAISettings(userId: string): Promise<AISettings> {
  const row = await AISettingsModel.findOne({ userId });
  return { enabled: row?.enabled ?? false, defaultProviderId: row?.defaultProviderId ?? null };
}

export async function saveAISettings(userId: string, input: unknown): Promise<AISettings> {
  const value = input as AISettings | null;
  if (!value || typeof value.enabled !== 'boolean' ||
      !(value.defaultProviderId === null || typeof value.defaultProviderId === 'string' && isValidObjectId(value.defaultProviderId))) {
    throw new AIRequestError('AI_SETTINGS_INVALID', 'Elegí una conexión y un estado válido para la IA.', 400);
  }
  if (value.defaultProviderId && !await AIProvider.exists({ _id: value.defaultProviderId, userId })) {
    throw new AIRequestError('AI_PROVIDER_MISSING', 'La conexión elegida ya no está disponible.', 404);
  }
  if (value.enabled && !value.defaultProviderId) throw new AIRequestError('AI_PROVIDER_REQUIRED', 'Elegí una conexión predeterminada antes de activar la IA.', 400);
  const row = await AISettingsModel.findOneAndUpdate({ userId }, { $set: {
    enabled: value.enabled, defaultProviderId: value.defaultProviderId,
  } }, { upsert: true, new: true, runValidators: true });
  return { enabled: row!.enabled, defaultProviderId: row!.defaultProviderId ?? null };
}

/** Gate for every outbound AI operation, including explicit connection tests. */
export async function requireAIEnabled(userId: string) {
  const settings = await getAISettings(userId);
  if (!settings.enabled) throw new AIRequestError('AI_DISABLED', 'La IA está apagada. Podés activarla desde Configuración → Inteligencia artificial.', 409);
  return settings;
}

export async function resolveAIProvider(userId: string) {
  const settings = await requireAIEnabled(userId);
  const provider = settings.defaultProviderId && await AIProvider.findOne({ _id: settings.defaultProviderId, userId });
  if (!provider) throw new AIRequestError('AI_PROVIDER_MISSING', 'Elegí una conexión predeterminada en Configuración de IA.', 409);
  return provider;
}
