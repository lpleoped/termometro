import { Evaluacion, IEvaluacion } from '../models/Evaluacion';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Respuesta } from '../models/Respuesta';
import type { TipoEvaluacion, TipoEvaluacionInfo } from '@termometro/shared';

const CONFIG_CLIMA = {
  maxIndicadores: 50,
  minIndicadores: 1,
  seccionesFijas: false,
  ponderacionAutomatica: false,
};

interface CrearEvaluacionInput {
  titulo: string;
  descripcion?: string;
  version?: string;
  tipo?: TipoEvaluacion;
  configuracion?: typeof CONFIG_CLIMA;
  creadoPor: string;
  secciones: Array<{
    titulo: string;
    ponderacion: number;
    indicadores: Array<{ id: string; texto: string; descripcion?: string }>;
  }>;
}

const validarEvaluacionClima = (secciones: CrearEvaluacionInput['secciones']) => {
  if (!secciones?.length) {
    throw new Error('La evaluación debe tener al menos una sección');
  }

  const totalIndicadores = secciones.reduce((acc, s) => acc + s.indicadores.length, 0);

  if (totalIndicadores > CONFIG_CLIMA.maxIndicadores) {
    throw new Error(`Máximo ${CONFIG_CLIMA.maxIndicadores} indicadores`);
  }
  if (totalIndicadores < CONFIG_CLIMA.minIndicadores) {
    throw new Error(`Mínimo ${CONFIG_CLIMA.minIndicadores} indicador`);
  }

  const suma = secciones.reduce((acc, s) => acc + s.ponderacion, 0);
  if (suma !== 100) {
    throw new Error('La suma de las ponderaciones debe ser 100%');
  }
};

export const crearEvaluacionService = async (
  data: CrearEvaluacionInput,
): Promise<IEvaluacion> => {
  const { titulo, descripcion, secciones, creadoPor, version, configuracion } = data;

  let versionFinal = version;
  if (!versionFinal) {
    const anteriores = await Evaluacion.find({ titulo, creadoPor });
    versionFinal = `${anteriores.length + 1}.0`;
  }

  validarEvaluacionClima(secciones);

  const nueva = new Evaluacion({
    titulo,
    descripcion,
    version: versionFinal,
    tipo: 'CUSTOM',
    configuracion: configuracion || CONFIG_CLIMA,
    secciones,
    creadoPor,
  });

  return nueva.save();
};

export const listarEvaluacionesService = async (usuarioId: string): Promise<IEvaluacion[]> => {
  return Evaluacion.find({ creadoPor: usuarioId });
};

export const obtenerEvaluacionPorIdService = async (id: string): Promise<IEvaluacion | null> => {
  return Evaluacion.findById(id);
};

export const editarEvaluacionService = async (
  idOriginal: string,
  data: Partial<IEvaluacion>,
  usuarioId: string,
): Promise<IEvaluacion> => {
  const original = await Evaluacion.findById(idOriginal);

  if (!original || original.creadoPor.toString() !== usuarioId) {
    throw new Error('No tienes permiso para editar esta evaluación');
  }

  if (data.secciones) {
    validarEvaluacionClima(data.secciones as CrearEvaluacionInput['secciones']);
  }

  const anteriores = await Evaluacion.find({ titulo: original.titulo, creadoPor: usuarioId });
  const nuevaVersion = `v${anteriores.length + 1}.0`;

  const nueva = new Evaluacion({
    ...original.toObject(),
    ...data,
    tipo: 'CUSTOM',
    _id: undefined,
    version: nuevaVersion,
    creadoPor: usuarioId,
    createdAt: undefined,
    updatedAt: undefined,
  });

  return nueva.save();
};

export const eliminarEvaluacionPorIdService = async (
  id: string,
  usuarioId: string,
): Promise<void> => {
  const evaluacion = await Evaluacion.findById(id);
  if (!evaluacion || evaluacion.creadoPor.toString() !== usuarioId) {
    throw new Error('No tienes permiso para eliminar esta evaluación');
  }

  const instancias = await InstanciaEvaluacion.find({ evaluacion: id });
  const instanciaIds = instancias.map((inst) => inst._id);
  await Respuesta.deleteMany({ instanciaEvaluacion: { $in: instanciaIds } });
  await InstanciaEvaluacion.deleteMany({ evaluacion: id });
  await evaluacion.deleteOne();
};

export const obtenerTiposEvaluacionService = (): TipoEvaluacionInfo[] => [
  {
    tipo: 'CUSTOM',
    nombre: 'CUSTOM',
    descripcion: 'Evaluación de clima con secciones y ponderaciones (suma 100%)',
    configuracion: CONFIG_CLIMA,
  },
];
