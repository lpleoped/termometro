import { useCallback, useState } from 'react';
import api from '../services/api';

export type AIProviderKind = 'openai-compatible' | 'azure-openai' | 'ollama';

export interface AIProviderInput {
  name: string;
  kind: AIProviderKind;
  endpoint: string;
  model: string;
  apiKey?: string;
}

export interface AIProvider extends Omit<AIProviderInput, 'apiKey'> {
  id: string;
  status: 'active' | 'invalid' | 'unverified';
}

export interface AIAnalysis {
  id: string;
  resumen: string;
  fortalezas: string[];
  alertas: string[];
  recomendaciones: string[];
  nivelConfianza: number;
  fuentes: string[];
  emotionalSignals?: Array<{ label: string; direction: string; intensity: number; confidence: number; interpretation: string }>;
  findings?: Array<{ title: string; type: string; severity: string; confidence: number }>;
  actionPlan?: Array<{ priority: number; objective: string; actions: string[]; ownerRole: string; horizon: string; successMetrics: string[]; checkInQuestion: string }>;
  limitations?: string[];
  needsHumanReview?: boolean;
  promptVersion?: string;
  datasetHash?: string;
}

interface UseIAState {
  loading: boolean;
  error: string | null;
  analysis: AIAnalysis | null;
}

/** Encapsula configuración y generación de análisis IA multi-proveedor. */
const useIA = () => {
  const [state, setState] = useState<UseIAState>({ loading: false, error: null, analysis: null });

  const generateAnalysis = useCallback(async (input: {
    providerId: string;
    instanciaId: string;
    equipoId: string;
    evaluacionId: string;
    includeHistorico?: boolean;
  }) => {
    setState({ loading: true, error: null, analysis: null });
    try {
      const response = await api.post<AIAnalysis>('/ai/analyses', input);
      setState({ loading: false, error: null, analysis: response.data });
      return response.data;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo generar el análisis';
      setState({ loading: false, error: message, analysis: null });
      throw cause;
    }
  }, []);

  const listProviders = useCallback(async () => {
    const response = await api.get<AIProvider[]>('/ai/providers');
    return response.data;
  }, []);

  const saveProvider = useCallback(async (input: AIProviderInput, id?: string) => {
    const response = id
      ? await api.put<AIProvider>(`/ai/providers/${id}`, input)
      : await api.post<AIProvider>('/ai/providers', input);
    return response.data;
  }, []);

  const testProvider = useCallback(async (id: string) => {
    try {
      const response = await api.post<AIProvider>(`/ai/providers/${id}/test`);
      return response.data;
    } catch (cause: any) {
      const message = cause?.response?.data?.error || 'No se pudo verificar la conexión con el proveedor';
      throw new Error(message);
    }
  }, []);

  const listAnalyses = useCallback(async (instanciaId?: string) => {
    const response = await api.get<AIAnalysis[]>('/ai/analyses', { params: { instanciaId } });
    return response.data;
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, analysis: null });
  }, []);

  return { ...state, generateAnalysis, listProviders, saveProvider, testProvider, listAnalyses, reset };
};

export default useIA;
