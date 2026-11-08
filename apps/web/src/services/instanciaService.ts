// src/services/instanciaService.ts
import api from './api';

export const crearInstancia = async (payload: {
  equipoId?: string;
  alcance?: 'equipo' | 'persona' | 'individual';
  evaluadoNombre?: string;
  evaluacionId: string;
  activadoEn: string;
  cantidadEsperada: number;
  descripcionLider: string;
  modoRespuesta: 'anonima' | 'identificada';
  minimoAnonimato: number;
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

export const getEnlacesPublicos = async (instanciaId: string) => (await api.get(`/instancias/${instanciaId}/enlaces-publicos`)).data;
