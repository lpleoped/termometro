import type { IEvaluacion } from '../models/Evaluacion';
import type { TipoEvaluacion, TipoEvaluacionInfo } from '@termometro/shared';
import { evaluationRepository } from '../repositories/evaluation.repository';

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
  origenCuestionario?: 'manual' | 'ia';
  revisionHumanaAprobada?: boolean;
  secciones: Array<{
    titulo: string;
    ponderacion: number;
    indicadores: Array<{ id: string; texto: string; descripcion?: string; tipo?: 'cuantitativo' | 'cualitativo'; direccion?: 'positiva' | 'negativa'; obligatorio?: boolean }>;
  }>;
}

const normalizarSecciones = (secciones: CrearEvaluacionInput['secciones']): CrearEvaluacionInput['secciones'] => secciones.map(seccion => ({
  ...seccion,
  indicadores: seccion.indicadores.map(indicador => ({
    ...indicador,
    tipo: indicador.tipo === 'cualitativo' ? 'cualitativo' : 'cuantitativo',
    direccion: indicador.direccion === 'negativa' ? 'negativa' : 'positiva',
    obligatorio: indicador.obligatorio !== false,
  })),
}));

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
  const { titulo, descripcion, creadoPor, version, configuracion, origenCuestionario = 'manual', revisionHumanaAprobada = false } = data;
  const secciones = normalizarSecciones(data.secciones);
  if (origenCuestionario === 'ia' && revisionHumanaAprobada !== true) throw new Error('Un cuestionario generado con IA debe ser revisado y aprobado por una persona antes de publicarse');

  let versionFinal = version;
  const repository = evaluationRepository();
  if (!versionFinal) {
    const anteriores = await repository.listVersions(titulo, creadoPor);
    versionFinal = `${anteriores.length + 1}.0`;
  }

  validarEvaluacionClima(secciones);

  return repository.insert({
    titulo,
    descripcion,
    version: versionFinal!,
    tipo: 'CUSTOM',
    configuracion: configuracion || CONFIG_CLIMA,
    secciones,
    creadoPor,
    origenCuestionario,
    revisionHumana: { estado: 'aprobada', revisadoPor: creadoPor, revisadoEn: new Date().toISOString() },
  }) as unknown as Promise<IEvaluacion>;
};

export const listarEvaluacionesService = async (usuarioId: string): Promise<IEvaluacion[]> => {
  return evaluationRepository().listByOwner(usuarioId) as unknown as Promise<IEvaluacion[]>;
};

export const obtenerEvaluacionPorIdService = async (id: string): Promise<IEvaluacion | null> => {
  return evaluationRepository().findById(id) as unknown as Promise<IEvaluacion | null>;
};

export const editarEvaluacionService = async (
  idOriginal: string,
  data: Partial<IEvaluacion>,
  usuarioId: string,
): Promise<IEvaluacion> => {
  const repository = evaluationRepository();
  const original = await repository.findById(idOriginal);

  if (!original || String(original.creadoPor) !== usuarioId) {
    throw new Error('No tienes permiso para editar esta evaluación');
  }

  if (data.secciones) {
    validarEvaluacionClima(data.secciones as CrearEvaluacionInput['secciones']);
  }

  const anteriores = await repository.listVersions(original.titulo, usuarioId);
  const nuevaVersion = `${anteriores.length + 1}.0`;
  const { _id: _ignoredId, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, ...base } = original;
  return repository.insert({
    ...base,
    ...data,
    tipo: 'CUSTOM',
    version: nuevaVersion,
    secciones: data.secciones ? normalizarSecciones(data.secciones as CrearEvaluacionInput['secciones']) : original.secciones,
    creadoPor: usuarioId,
  } as any) as unknown as Promise<IEvaluacion>;
};

export const eliminarEvaluacionPorIdService = async (
  id: string,
  usuarioId: string,
): Promise<void> => {
  const repository = evaluationRepository();
  const evaluacion = await repository.findById(id);
  if (!evaluacion || String(evaluacion.creadoPor) !== usuarioId) {
    throw new Error('No tienes permiso para eliminar esta evaluación');
  }
  await repository.deleteWithRounds(id);
};

export const obtenerTiposEvaluacionService = (): TipoEvaluacionInfo[] => [
  {
    tipo: 'CUSTOM',
    nombre: 'CUSTOM',
    descripcion: 'Evaluación de clima con secciones y ponderaciones (suma 100%)',
    configuracion: CONFIG_CLIMA,
  },
];
