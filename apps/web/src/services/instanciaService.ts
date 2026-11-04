// src/services/instanciaService.ts
import api from './api';

export const crearInstancia = async (payload: {
  equipoId: string;
  evaluacionId: string;
  activadoEn: string;
  cantidadEsperada: number;
  descripcionLider: string;
}) => {
  const res = await api.post('/instancias', payload);
  return res.data;
};

export const getInstanciaById = async (instanciaId: string) => {
  try {
    console.log(`🔄 Obteniendo instancia ${instanciaId}...`);
    const res = await api.get(`/instancias/${instanciaId}`);
    console.log(`✅ Instancia obtenida:`, res.data);
    return res.data; // contiene equipoId y evaluacionId según la documentación
  } catch (error) {
    console.error(`❌ Error al obtener instancia ${instanciaId}:`, error);
    throw error;
  }
};