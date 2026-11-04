import type { AIClimateAnalysis, TeamClimateContext } from '@termometro/shared';

export const PROMPT_VERSION = 'team-climate-action.v1';

export const buildPrompt = (context: TeamClimateContext) => ({
  system: 'Actúa como especialista en clima organizacional y facilitación. Analiza señales agregadas, no diagnostiques personas. No inventes datos. Devuelve únicamente JSON válido según el contrato indicado.',
  developer: 'Valida muestra, participación y limitaciones. Contrasta cuantitativos y cualitativos. No muestres PII ni comentarios individuales. Genera como máximo tres prioridades con acciones a 7d, 30d o 90d, responsable por rol, métrica y check-in. Si la confianza es menor a 0.6 o hay muestra insuficiente, needsHumanReview debe ser true.',
  user: JSON.stringify(context),
});

const isNumber01 = (value: unknown) => typeof value === 'number' && value >= 0 && value <= 1;

export const validateAnalysis = (value: unknown): value is AIClimateAnalysis => {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<AIClimateAnalysis>;
  if (typeof result.summary !== 'string' || !Array.isArray(result.emotionalSignals) || !Array.isArray(result.findings) || !Array.isArray(result.actionPlan) || !Array.isArray(result.limitations) || typeof result.needsHumanReview !== 'boolean' || !Array.isArray(result.sources)) return false;
  if (result.actionPlan.length > 3) return false;
  return result.emotionalSignals.every((signal) => isNumber01(signal.confidence) && isNumber01(signal.intensity) && Array.isArray(signal.evidenceIds)) && result.findings.every((finding) => isNumber01(finding.confidence)) && result.actionPlan.every((action) => action.ownerRole.length > 0 && action.successMetrics.length > 0 && action.checkInQuestion.length > 0);
};
