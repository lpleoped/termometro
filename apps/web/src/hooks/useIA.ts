import { useCallback, useRef, useState } from 'react';
import api from '../services/api';
import axios from 'axios';
import type { AIAnalysisRequest, AIAnalysisResponse } from '@termometro/shared';

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

export type AIAnalysis = AIAnalysisResponse;

interface UseIAState {
  loading: boolean;
  error: string | null;
  analysis: AIAnalysis | null;
}

/** Encapsula configuración y generación de análisis IA multi-proveedor. */
const useIA = () => {
  const [state, setState] = useState<UseIAState>({ loading: false, error: null, analysis: null });
  const inFlight = useRef(false);

  const generateAnalysis = useCallback(async (input: AIAnalysisRequest) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.post<AIAnalysis>('/ai/analyses', input);
      setState({ loading: false, error: null, analysis: response.data });
      return response.data;
    } catch (cause) {
      const message = axios.isAxiosError(cause)
        ? [cause.response?.data?.error, cause.response?.data?.diagnostic ? `Detalle: ${cause.response.data.diagnostic}` : undefined, cause.response?.data?.code ? `Código: ${cause.response.data.code}` : undefined].filter(Boolean).join(' · ') || 'No se pudo generar el análisis. Revisá proveedor y modelo.'
        : cause instanceof Error ? cause.message : 'No se pudo generar el análisis';
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw cause;
    } finally { inFlight.current = false; }
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
    } catch (error) {
      throw new Error(axios.isAxiosError(error) ? error.response?.data?.error || 'No se pudo conectar con el proveedor.' : 'No se pudo probar el proveedor.');
    }
  }, []);

  const listAnalyses = useCallback(async (instanciaId?: string) => {
    const response = await api.get<AIAnalysis[]>('/ai/analyses', { params: { instanciaId } });
    return response.data;
  }, []);

  const loadLatestAnalysis = useCallback(async (instanciaId: string) => {
    const response = await api.get<AIAnalysis[]>('/ai/analyses', { params: { instanciaId } });
    if (!inFlight.current) setState(prev => prev.analysis ? prev : { ...prev, analysis: response.data[0] ?? null });
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, analysis: null });
  }, []);

  return { ...state, generateAnalysis, listProviders, saveProvider, testProvider, listAnalyses, loadLatestAnalysis, reset };
};

export default useIA;
