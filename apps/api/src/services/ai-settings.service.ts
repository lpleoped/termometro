import type { AISettings } from '@termometro/shared';
import { featureRepository } from '../repositories/feature.repository';
import { newFeature } from '../domain/feature-validation';

import { AIRequestError } from './ai-completion';
import { validRecordId } from '../domain/feature-records';

export async function getAISettings(userId: string): Promise<AISettings> {
  const row = await featureRepository('aiSettings').find({ userId });
  return {
    enabled: row?.enabled ?? false,
    defaultProviderId: row?.defaultProviderId ?? null,
    limits: row?.limits ?? {},
  };
}

export async function saveAISettings(userId: string, input: unknown): Promise<AISettings> {
  const value = input as AISettings | null;
  if (!value || typeof value.enabled !== 'boolean' ||
      !(value.defaultProviderId === null || typeof value.defaultProviderId === 'string' && validRecordId(value.defaultProviderId))) {
    throw new AIRequestError('AI_SETTINGS_INVALID', 'Elegí una conexión y un estado válido para la IA.', 400);
  }
  if (value.defaultProviderId && !await featureRepository('aiProviders').find({ _id: value.defaultProviderId, userId })) {
    throw new AIRequestError('AI_PROVIDER_MISSING', 'La conexión elegida ya no está disponible.', 404);
  }
  if (value.enabled && !value.defaultProviderId) throw new AIRequestError('AI_PROVIDER_REQUIRED', 'Elegí una conexión predeterminada antes de activar la IA.', 400);
  
  // Validate limits if provided
  const limits = value.limits ?? {};
  if (limits.maxQuestionnaireInput !== undefined && (!Number.isInteger(limits.maxQuestionnaireInput) || limits.maxQuestionnaireInput < 1000)) {
    throw new AIRequestError('AI_SETTINGS_INVALID', 'El límite de entrada de cuestionario debe ser al menos 1000 caracteres.', 400);
  }
  if (limits.maxQualitativeText !== undefined && (!Number.isInteger(limits.maxQualitativeText) || limits.maxQualitativeText < 500)) {
    throw new AIRequestError('AI_SETTINGS_INVALID', 'El límite de texto cualitativo debe ser al menos 500 caracteres.', 400);
  }
  if (limits.maxContextChars !== undefined && (!Number.isInteger(limits.maxContextChars) || limits.maxContextChars < 5000)) {
    throw new AIRequestError('AI_SETTINGS_INVALID', 'El límite de contexto debe ser al menos 5000 caracteres.', 400);
  }
  if (limits.maxAnalysesPerHour !== undefined && (!Number.isInteger(limits.maxAnalysesPerHour) || limits.maxAnalysesPerHour < 1)) {
    throw new AIRequestError('AI_SETTINGS_INVALID', 'El límite de análisis por hora debe ser al menos 1.', 400);
  }
  
  const repository = featureRepository('aiSettings');
  const existing = await repository.find({ userId });
  const fields = { userId, enabled: value.enabled, defaultProviderId: value.defaultProviderId, limits };
  const row = existing ? await repository.save({ ...existing, ...fields }) : await repository.insert(newFeature('aiSettings', fields));
  return { enabled: row!.enabled, defaultProviderId: row!.defaultProviderId ?? null, limits: row!.limits ?? {} };
}

/** Gate for every outbound AI operation, including explicit connection tests. */
export async function requireAIEnabled(userId: string) {
  const settings = await getAISettings(userId);
  if (!settings.enabled) throw new AIRequestError('AI_DISABLED', 'La IA está apagada. Podés activarla desde Configuración → Inteligencia artificial.', 409);
  return settings;
}

export async function resolveAIProvider(userId: string) {
  const settings = await requireAIEnabled(userId);
  const provider = settings.defaultProviderId && await featureRepository('aiProviders').find({ _id: settings.defaultProviderId, userId });
  if (!provider) throw new AIRequestError('AI_PROVIDER_MISSING', 'Elegí una conexión predeterminada en Configuración de IA.', 409);
  return provider;
}
