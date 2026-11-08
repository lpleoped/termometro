import type { AIBudgetPreset } from '@termometro/shared';

export interface BudgetLimits {
  maxQuestionnaireInput: number;
  maxQualitativeText: number;
  maxContextChars: number;
  maxAnalysesPerHour: number;
  maxInputTokens: number;
  maxOutputTokens: number;
}

export interface BudgetPresetInfo extends BudgetLimits {
  name: string;
  description: string;
  costWarning: string;
  estimatedCostPerAnalysis?: { min: number; max: number; currency: string };
}

/**
 * AI Budget Presets - maps user-friendly size choices to concrete token/char limits
 * and provides cost guidance in Spanish.
 */
export const AI_BUDGET_PRESETS: Record<AIBudgetPreset, BudgetPresetInfo> = {
  'pequeño': {
    name: 'Pequeño',
    description: 'Para cuestionarios cortos y equipos chicos (hasta 10 personas)',
    maxQuestionnaireInput: 8000,
    maxQualitativeText: 1500,
    maxContextChars: 12000,
    maxAnalysesPerHour: 10,
    maxInputTokens: 4000,  // ~2k tokens (rough: 1 token ≈ 2-4 chars Spanish/English)
    maxOutputTokens: 2048,
    costWarning: 'Costo bajo: ~USD 0.05-0.15 por análisis (GPT-4)',
    estimatedCostPerAnalysis: { min: 0.05, max: 0.15, currency: 'USD' },
  },
  'estándar': {
    name: 'Estándar',
    description: 'Para la mayoría de los casos (equipos de 10-30 personas, contexto moderado)',
    maxQuestionnaireInput: 24000,
    maxQualitativeText: 4000,
    maxContextChars: 32000,
    maxAnalysesPerHour: 20,
    maxInputTokens: 12000,  // ~6k tokens
    maxOutputTokens: 4096,
    costWarning: 'Costo moderado: ~USD 0.15-0.40 por análisis (GPT-4)',
    estimatedCostPerAnalysis: { min: 0.15, max: 0.40, currency: 'USD' },
  },
  'grande': {
    name: 'Grande',
    description: 'Para equipos grandes con contexto extenso (30-100 personas, múltiples documentos)',
    maxQuestionnaireInput: 60000,
    maxQualitativeText: 8000,
    maxContextChars: 80000,
    maxAnalysesPerHour: 30,
    maxInputTokens: 30000,  // ~15k tokens
    maxOutputTokens: 8192,
    costWarning: 'Costo alto: ~USD 0.40-1.20 por análisis (GPT-4)',
    estimatedCostPerAnalysis: { min: 0.40, max: 1.20, currency: 'USD' },
  },
  'muy-grande': {
    name: 'Muy grande',
    description: 'Para organizaciones con contexto muy extenso (100+ personas, muchos documentos históricos)',
    maxQuestionnaireInput: 120000,
    maxQualitativeText: 16000,
    maxContextChars: 200000,
    maxAnalysesPerHour: 50,
    maxInputTokens: 60000,  // ~30k tokens
    maxOutputTokens: 16384,
    costWarning: 'Costo muy alto: ~USD 1.20-3.50 por análisis (GPT-4)',
    estimatedCostPerAnalysis: { min: 1.20, max: 3.50, currency: 'USD' },
  },
  'sin-límite': {
    name: 'Sin límite práctico',
    description: 'Casos especiales: análisis exhaustivos sin restricción de presupuesto (uso libre)',
    maxQuestionnaireInput: 500000,
    maxQualitativeText: 50000,
    maxContextChars: 1000000,
    maxAnalysesPerHour: 200,
    maxInputTokens: 250000,  // ~125k tokens
    maxOutputTokens: 32768,
    costWarning: '⚠️ ADVERTENCIA: Costo potencialmente muy elevado (USD 3.50-15.00+ por análisis con GPT-4). Solo elegí esta opción si tenés presupuesto asignado.',
    estimatedCostPerAnalysis: { min: 3.50, max: 15.00, currency: 'USD' },
  },
};

export const DEFAULT_PRESET: AIBudgetPreset = 'estándar';

/**
 * Get concrete limits for a given preset.
 * Falls back to env vars if provided, then to DEFAULT_PRESET.
 */
export function getBudgetLimits(preset?: AIBudgetPreset): BudgetLimits {
  const selectedPreset = preset || DEFAULT_PRESET;
  const presetLimits = AI_BUDGET_PRESETS[selectedPreset];
  
  // Allow env var override (mainly for testing/development)
  return {
    maxQuestionnaireInput: Number(process.env.AI_MAX_QUESTIONNAIRE_INPUT) || presetLimits.maxQuestionnaireInput,
    maxQualitativeText: Number(process.env.AI_MAX_QUALITATIVE_TEXT) || presetLimits.maxQualitativeText,
    maxContextChars: Number(process.env.AI_MAX_CONTEXT_CHARS) || presetLimits.maxContextChars,
    maxAnalysesPerHour: Number(process.env.AI_MAX_ANALYSES_PER_HOUR) || presetLimits.maxAnalysesPerHour,
    maxInputTokens: presetLimits.maxInputTokens,
    maxOutputTokens: presetLimits.maxOutputTokens,
  };
}

/**
 * Get full preset info including cost guidance
 */
export function getPresetInfo(preset: AIBudgetPreset): BudgetPresetInfo {
  return AI_BUDGET_PRESETS[preset];
}

/**
 * Validate a preset string
 */
export function isValidPreset(value: unknown): value is AIBudgetPreset {
  return typeof value === 'string' && value in AI_BUDGET_PRESETS;
}
