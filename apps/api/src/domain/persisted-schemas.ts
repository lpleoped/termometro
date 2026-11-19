import { z } from 'zod';
import type { LocalCollection } from '../storage/storage';

/**
 * Forma persistida de cada colección. JSON y Mongo la comprueban con
 * guardPersisted. Si el registro es válido se devuelve el mismo valor: no se
 * reescriben campos, fechas ni claves viejas.
 *
 * Un campo nuevo entra primero acá. Mongoose conserva índices y unicidad, y
 * test:schemas exige que sus paths existan en este archivo.
 */

const optStr = z.string().nullish();
const optNum = z.number().nullish();
const optBool = z.boolean().nullish();
const optDate = z.union([z.string(), z.date()]).nullish();
const optId = z.string().nullish();
const looseArray = z.array(z.unknown()).nullish();
const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();

const indicador = obj({
  id: optStr,
  texto: optStr,
  descripcion: optStr,
  tipo: z.enum(['cuantitativo', 'cualitativo']).nullish(),
  direccion: z.enum(['positiva', 'negativa']).nullish(),
  obligatorio: optBool,
});
const seccion = obj({
  titulo: optStr,
  ponderacion: optNum,
  indicadores: z.array(indicador).nullish(),
});
const reglasAlertas = obj({
  umbralAtencion: optNum,
  umbralCritico: optNum,
  variacionMinima: optNum,
});
const configuracion = obj({
  maxIndicadores: optNum,
  minIndicadores: optNum,
  seccionesFijas: optBool,
  ponderacionAutomatica: optBool,
  reglasAlertas: reglasAlertas.nullish(),
});
const revisionHumana = obj({
  estado: z.enum(['pendiente', 'aprobada']).nullish(),
  revisadoPor: optStr,
  revisadoEn: optDate,
});
const respuestaIndicador = obj({
  indicadorId: optStr,
  valor: optNum,
  texto: optStr,
});
const comentariosAbiertos = obj({ mejora: optStr, satisfaccion: optStr });
const identidad = obj({ nombre: optStr, email: optStr });
const checkInResultado = obj({ indiceAnterior: optNum, indicePosterior: optNum, delta: optNum });
const checkIn = obj({
  horizonte: z.enum(['7d', '30d', '90d']).nullish(),
  venceEn: optDate,
  estado: z.enum(['pendiente', 'completado']).nullish(),
  nota: optStr,
  completadoEn: optDate,
  resultado: checkInResultado.nullish(),
});
const resultadoAccion = obj({
  indiceAnterior: optNum,
  indicePosterior: optNum,
  delta: optNum,
  medidoEn: optDate,
  interpretacion: optStr,
});
const veredictoIndicador = obj({
  indicadorId: optStr,
  texto: optStr,
  valorAdopcion: optNum,
  valorPosterior: optNum,
  delta: optNum,
  veredicto: z.enum(['sin_medicion_posterior', 'todavia_es_pronto', 'hay_una_senal', 'no_se_movio', 'se_movio_en_contra']).nullish(),
});
const integracion = obj({
  provider: z.enum(['slack', 'monday']).nullish(),
  externalId: optStr,
  url: optStr,
  status: z.enum(['published', 'error']).nullish(),
  error: optStr,
  publishedAt: optDate,
});
const analysisParameters = obj({
  includeHistorico: optBool,
  contextSchemaVersion: optStr,
});
const analysisMetadata = obj({
  schemaVersion: optStr,
  promptVersion: optStr,
  providerKind: optStr,
  modelName: optStr,
  datasetHash: optStr,
  parameters: analysisParameters.nullish(),
});
const hallazgo = obj({
  titulo: optStr,
  tipo: optStr,
  severidad: optStr,
  evidenciaIds: looseArray,
  confianza: optNum,
});
const senalEmocional = obj({
  etiqueta: optStr,
  direccion: optStr,
  intensidad: optNum,
  confianza: optNum,
  interpretacion: optStr,
  evidenciaIds: looseArray,
});
const temaRecurrente = obj({
  tema: optStr,
  frecuencia: optNum,
  interpretacion: optStr,
  evidenciaIds: looseArray,
});
const temaTono = obj({
  tema: optStr,
  interpretacion: optStr,
  evidenciaIds: looseArray,
});
const tonoAgregado = obj({
  promptVersion: optStr,
  oracion: optStr,
  proporcion: obj({ alivio: optNum, mezcla: optNum, tension: optNum }).nullish(),
  marcas: z.array(obj({
    etiqueta: z.enum(['confianza', 'pertenencia', 'energia', 'seguridad', 'frustracion', 'reconocimiento', 'incertidumbre', 'tension']).nullish(),
    intensidad: optNum,
    direccion: z.enum(['positiva', 'negativa', 'mixta']).nullish(),
  })).nullish(),
  frases: z.array(obj({
    evidenciaId: optStr,
    direccion: z.enum(['alivio', 'mezcla', 'tension']).nullish(),
  })).nullish(),
  temas: z.array(temaTono).nullish(),
});
const accionContextual = obj({
  titulo: optStr,
  descripcion: optStr,
  prioridad: optStr,
  alcance: optStr,
  hallazgo: optStr,
  contextoAplicado: looseArray,
  esCondicionPrevia: optBool,
  requiereValidacion: optBool,
  ownerRole: optStr,
  horizon: optStr,
  successMetric: optStr,
  checkInQuestion: optStr,
  evidenceIds: looseArray,
});
const analysisResult = obj({
  resumen: optStr,
  fortalezas: looseArray,
  alertas: looseArray,
  recomendaciones: looseArray,
  nivelConfianza: optNum,
  fuentes: looseArray,
  limitations: looseArray,
  metadata: analysisMetadata.nullish(),
  fuentesTecnicas: looseArray,
  hallazgos: z.array(hallazgo).nullish(),
  senalesEmocionales: z.array(senalEmocional).nullish(),
  temasRecurrentes: z.array(temaRecurrente).nullish(),
  accionesContextuales: z.array(accionContextual).nullish(),
  tono: tonoAgregado.nullish(),
});
const participacion = obj({ esperada: optNum, recibida: optNum, porcentaje: optNum });
const snapshot = obj({ indiceGlobal: optNum, participacion: participacion.nullish() });
const historicalMemory = obj({ items: looseArray, omittedCount: optNum });

export const persistedSchemas = {
  usuarios: obj({
    _id: optId,
    nombre: optStr,
    email: optStr,
    password: optStr,
    rol: z.enum(['lider']).nullish(),
    creadoEn: optDate,
  }),
  equipos: obj({
    _id: optId,
    nombre: optStr,
    descripcion: optStr,
    creadoPor: optId,
    miembros: looseArray,
    activo: optBool,
    creadoEn: optDate,
  }),
  evaluaciones: obj({
    _id: optId,
    titulo: optStr,
    descripcion: optStr,
    version: optStr,
    tipo: z.enum(['CUSTOM']).nullish(),
    configuracion: configuracion.nullish(),
    secciones: z.array(seccion).nullish(),
    creadoPor: optId,
    equipoId: optId,
    origenCuestionario: z.enum(['manual', 'ia']).nullish(),
    revisionHumana: revisionHumana.nullish(),
    createdAt: optDate,
    updatedAt: optDate,
  }),
  instancias: obj({
    _id: optId,
    equipo: optId,
    alcance: z.enum(['equipo', 'persona', 'individual']).nullish(),
    evaluadoNombre: optStr,
    evaluacion: optId,
    activadoEn: optDate,
    estado: z.enum(['activa', 'cerrada', 'archivada']).nullish(),
    cantidadEsperada: z.union([z.number(), z.string()]).nullish(),
    descripcionLider: optStr,
    modoRespuesta: z.enum(['anonima', 'identificada']).nullish(),
    minimoAnonimato: z.union([z.number(), z.string()]).nullish(),
    tokenPublico: optStr,
    createdAt: optDate,
    updatedAt: optDate,
  }),
  respuestas: obj({
    _id: optId,
    instanciaEvaluacion: optId,
    respuestas: z.array(respuestaIndicador).nullish(),
    comentariosAbiertos: comentariosAbiertos.nullish(),
    respondidoEn: optDate,
    identidad: identidad.nullish(),
    consentimientoIdentificado: optBool,
    idempotencyKey: optStr,
  }),
  aiProviders: obj({
    _id: optId,
    userId: optId,
    name: optStr,
    kind: z.enum(['openai-compatible', 'azure-openai', 'ollama']).nullish(),
    endpoint: optStr,
    modelName: optStr,
    encryptedApiKey: optStr,
    status: z.enum(['active', 'invalid', 'unverified']).nullish(),
    checkVersion: optNum,
    creadoEn: optDate,
    actualizadoEn: optDate,
  }),
  aiSettings: obj({
    _id: optId,
    userId: optId,
    enabled: optBool,
    defaultProviderId: z.union([z.string(), z.null()]).optional(),
    budgetPreset: z.enum(['pequeño', 'estándar', 'grande', 'muy-grande', 'sin-límite']).optional().default('estándar'),
    createdAt: optDate,
    updatedAt: optDate,
  }),
  aiUsages: obj({
    _id: optId,
    userId: optId,
    schemaVersion: optNum,
    motivo: z.enum(['prueba', 'cuestionario', 'lectura', 'tono']).nullish(),
    modelo: optStr,
    tokensEntrada: optNum,
    tokensSalida: optNum,
    costoEstimado: optNum,
    fecha: optDate,
  }),
  aiAnalyses: obj({
    _id: optId,
    userId: optId,
    providerId: optId,
    instanciaId: optId,
    equipoId: optId,
    evaluacionId: optId,
    providerKind: optStr,
    modelName: optStr,
    promptVersion: optStr,
    schemaVersion: optStr,
    datasetHash: optStr,
    parameters: analysisParameters.nullish(),
    contextItemIds: looseArray,
    historicalMemory: historicalMemory.nullish(),
    snapshot: snapshot.nullish(),
    result: analysisResult.nullish(),
    propuestasOmitidas: z.array(z.number()).nullish(),
    creadoEn: optDate,
  }),
  accionesPlan: obj({
    _id: optId,
    instanciaEvaluacion: optId,
    descripcion: optStr,
    autor: optStr,
    creadaEn: optDate,
    estado: z.enum(['generada', 'en_revision', 'aprobada', 'rechazada', 'ejecutada', 'verificada']).nullish(),
    hallazgoId: optStr,
    analisisId: optStr,
    propuestaIndice: optNum,
    propuestaOriginal: optStr,
    adaptadaDe: optStr,
    evidenciaIds: looseArray,
    ownerRole: optStr,
    horizon: z.enum(['7d', '30d', '90d']).nullish(),
    successMetric: optStr,
    checkInQuestion: optStr,
    aprobadaPor: optStr,
    aprobadaEn: optDate,
    ejecutadaEn: optDate,
    verificadaEn: optDate,
    checkIns: z.array(checkIn).nullish(),
    resultado: resultadoAccion.nullish(),
    veredictos: z.array(veredictoIndicador).nullish(),
    integraciones: z.array(integracion).nullish(),
  }),
  teamContextItems: obj({
    _id: optId,
    teamId: optId,
    type: z.enum(['stable_fact', 'team_role', 'client_context', 'priority', 'constraint', 'external_actor', 'decision', 'hypothesis', 'learning']).nullish(),
    title: optStr,
    content: optStr,
    source: optStr,
    scope: z.enum(['team', 'project', 'analysis']).nullish(),
    status: z.enum(['active', 'review', 'obsolete']).nullish(),
    confidence: optNum,
    importance: z.enum(['informative', 'relevant', 'critical']).nullish(),
    sensitivity: z.enum(['normal', 'sensitive', 'highly_sensitive']).nullish(),
    influence: z.enum(['interpretation', 'risk', 'action', 'precondition', 'group_action', 'do_not_act_directly', 'interpretation_and_action']).nullish(),
    learningKey: optStr,
    validFrom: optDate,
    validUntil: optDate,
    createdBy: optId,
    updatedBy: optId,
    version: optNum,
    createdAt: optDate,
    updatedAt: optDate,
  }),
  integrationConnections: obj({
    _id: optId,
    userId: optId,
    provider: z.enum(['slack', 'monday']).nullish(),
    name: optStr,
    status: z.enum(['active', 'invalid']).nullish(),
    secret: optStr,
    metadata: obj({}).nullish(),
    createdAt: optDate,
    updatedAt: optDate,
  }),
  teamIntegrationSettings: obj({
    _id: optId,
    userId: optId,
    equipoId: optId,
    slackConnectionId: optStr,
    mondayConnectionId: optStr,
    mondayBoardId: optStr,
    createdAt: optDate,
    updatedAt: optDate,
  }),
} satisfies Record<LocalCollection, z.ZodTypeAny>;

export function guardPersisted<T>(collection: LocalCollection, value: T): T {
  const parsed = persistedSchemas[collection].safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || 'raíz';
    throw new Error(`Registro de ${collection} inválido en ${path}.`);
  }
  return value;
}

export function guardValue<T>(collection: LocalCollection, value: T): T {
  if (value == null) return value;
  if (Array.isArray(value)) {
    for (const item of value) guardPersisted(collection, item);
    return value;
  }
  return guardPersisted(collection, value);
}
