import type { Seccion, TipoEvaluacionInfo } from '@termometro/shared';
import api from './api';

export type { Indicador, Seccion } from '@termometro/shared';
export type TipoEvaluacion = TipoEvaluacionInfo;

export interface Evaluacion {
  _id: string;
  titulo: string;
  descripcion?: string;
  activo?: boolean;
  tipo?: string;
  secciones: Seccion[];
  createdAt?: string;
}

export const crearEvaluacion = async (payload: {
  titulo: string;
  descripcion?: string;
  tipo?: string;
  secciones: Seccion[];
}): Promise<Evaluacion> => {
  const response = await api.post('/evaluaciones', payload);
  return response.data;
};

export const getEvaluaciones = async (): Promise<Evaluacion[]> => {
  const response = await api.get('/evaluaciones');
  return response.data;
};

export const getEvaluacionById = async (id: string): Promise<Evaluacion> => {
  const response = await api.get(`/evaluaciones/${id}`);
  return response.data;
};

export const getTiposEvaluacion = async (): Promise<TipoEvaluacionInfo[]> => {
  const response = await api.get('/tipos-evaluacion');
  return response.data;
};
