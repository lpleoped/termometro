import { InstanciaEvaluacion, IInstanciaEvaluacion } from '../models/InstanciaEvaluacion';

interface CrearInstanciaInput {
  equipoId: string;
  evaluacionId: string;
  activadoEn: Date;
  cantidadEsperada: number;
  descripcionLider?: string;
  modoRespuesta?: 'anonima' | 'identificada';
  minimoAnonimato?: number;
}

export const crearInstanciaEvaluacionService = async (
  data: CrearInstanciaInput,
): Promise<IInstanciaEvaluacion> => {
  const { equipoId, evaluacionId, activadoEn, cantidadEsperada, descripcionLider, modoRespuesta = 'anonima', minimoAnonimato = 3 } = data;

  const nuevaInstancia = new InstanciaEvaluacion({
    equipo: equipoId,
    evaluacion: evaluacionId,
    activadoEn,
    cantidadEsperada,
    descripcionLider,
    estado: 'activa',
    modoRespuesta,
    minimoAnonimato,
  });

  return nuevaInstancia.save();
};

export const obtenerInstanciaPorIdService = async (id: string) => {
  const instancia = await InstanciaEvaluacion.findById(id).select(
    'evaluacion equipo activadoEn descripcionLider cantidadEsperada modoRespuesta minimoAnonimato',
  );

  if (!instancia) {
    throw new Error('Instancia no encontrada');
  }

  return {
    _id: instancia._id,
    evaluacionId: instancia.evaluacion,
    equipoId: instancia.equipo,
    activadoEn: instancia.activadoEn,
    descripcionLider: instancia.descripcionLider || '',
    cantidadEsperada: instancia.cantidadEsperada ?? 0,
    modoRespuesta: instancia.modoRespuesta,
    minimoAnonimato: instancia.minimoAnonimato ?? 3,
  };
};

export const listarInstanciasPorEquipoService = async (equipoId: string) => {
  const instancias = await InstanciaEvaluacion.find({ equipo: equipoId })
    .populate('evaluacion')
    .sort({ activadoEn: -1 });

  const instanciasMap = new Map();

  for (const instancia of instancias) {
    if (!instancia.evaluacion) {
      console.warn(`Instancia ${instancia._id} ignorada: evaluación nula o eliminada.`);
      continue;
    }
    const evalId = instancia.evaluacion.toString();
    if (!instanciasMap.has(evalId)) {
      instanciasMap.set(evalId, instancia);
    }
  }

  const resultado = Array.from(instanciasMap.values());
  if (resultado.length === 0) {
    throw new Error('No se encontraron instancias válidas para el equipo solicitado.');
  }
  return resultado;
};
