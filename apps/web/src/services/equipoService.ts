// src/services/equipoService.ts
import api from './api';

export const getEquipos = async () => {
  const response = await api.get('/equipos');
  return response.data;
};

export const getEquipoById = async (equipoId: string) => {
  const response = await api.get(`/equipos/${equipoId}`);
  return response.data;
};

export const crearEquipo = async (nombre: string) => {
  const response = await api.post('/equipos', { nombre });
  return response.data;
};