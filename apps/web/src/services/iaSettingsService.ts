import axios from 'axios';
import api from './api';
import type { AISettings, AIProviderInput, AIProviderResponse } from '@termometro/shared';

export const iaMessage = (error: unknown): string => axios.isAxiosError(error)
  ? error.response?.data?.error || 'No se pudo conectar con el servidor. Volvé a intentar.'
  : error instanceof Error ? error.message : 'No se pudo completar la operación.';

export const getIASettings = async () => (await api.get<AISettings>('/ai/settings')).data;
export const putIASettings = async (settings: AISettings) => (await api.put<AISettings>('/ai/settings', settings)).data;
export const getIAProviders = async () => (await api.get<AIProviderResponse[]>('/ai/providers')).data;
export const saveIAProvider = async (value: AIProviderInput, id?: string) =>
  (id ? await api.put<AIProviderResponse>(`/ai/providers/${id}`, value) : await api.post<AIProviderResponse>('/ai/providers', value)).data;
export const removeIAProvider = async (id: string) => { await api.delete(`/ai/providers/${id}`); };
export const checkIAProvider = async (id: string) => (await api.post<AIProviderResponse>(`/ai/providers/${id}/test`)).data;

export interface CuestionarioGenerado {
  titulo: string;
  secciones: Array<{ titulo: string; ponderacion: number; indicadores: Array<{ id: string; texto: string; tipo: 'cuantitativo' | 'cualitativo'; direccion: 'positiva' | 'negativa' }> }>;
}

export const generarCuestionarioIA = async (role: string, request: string) =>
  (await api.post<{ prompt: string; cuestionario: CuestionarioGenerado }>('/ai/questionnaires/generate', { role, request })).data;
