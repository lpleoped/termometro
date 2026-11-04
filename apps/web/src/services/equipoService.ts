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

export const actualizarEquipo = async (equipoId: string, nombre: string) => {
  const response = await api.patch(`/equipos/${equipoId}`, { nombre });
  return response.data;
};

export const archivarEquipo = async (equipoId: string) => {
  const response = await api.delete(`/equipos/${equipoId}`);
  return response.data;
};

export const agregarMiembro = async (equipoId: string, email: string) => {
  const response = await api.post(`/equipos/${equipoId}/miembros`, { email });
  return response.data;
};

export const quitarMiembro = async (equipoId: string, email: string) => {
  const response = await api.delete(`/equipos/${equipoId}/miembros/${encodeURIComponent(email)}`);
  return response.data;
};
