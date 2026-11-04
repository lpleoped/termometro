import type {
  DashboardEstadoActual,
  HistoricoResponse,
  SeccionResultado,
} from '@termometro/shared';
import api from './api';

/** Alias de compatibilidad con imports existentes. */
export type DashboardData = DashboardEstadoActual;
export type Seccion = SeccionResultado;

export const getInstanciaActivaPorEquipo = async (equipoId: string) => {
  const response = await api.get(`/instancias?equipoId=${equipoId}&estado=activa`);
  if (!response.data || response.data.length === 0) {
    throw new Error('No hay instancias activas para este equipo');
  }
  return response.data[0];
};

export const getDashboardPorInstanciaId = async (
  instanciaId: string,
): Promise<DashboardData> => {
  const response = await api.get(`/dashboard/estado-actual/${instanciaId}`);
  return response.data;
};

export const getDashboardHistorico = async (
  equipoId: string,
  evaluacionId: string,
): Promise<HistoricoResponse> => {
  const res = await api.get(`/dashboard/historico/${equipoId}/${evaluacionId}`);
  return res.data;
};
