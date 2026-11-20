import { ZodError } from 'zod';
import { TonoInvalido } from '../domain/tono';
import { asAIRequestError } from '../services/ai-completion';
import { registrar, type CategoriaLog, type ContextoLog, type NivelLog } from './logger';

export interface ErrorDescrito {
  categoria: CategoriaLog;
  codigo: string;
  mensaje: string;
  nivel: NivelLog;
  detalle?: string;
  stack?: string;
}

const codigoTecnico = (error: object): string => {
  const candidato = error as { code?: unknown; name?: string };
  const codigo = candidato.code ?? candidato.name ?? 'DESCONOCIDO';
  return String(codigo).slice(0, 80);
};

const esErrorMongo = (error: object): boolean => {
  const nombre = String((error as { name?: string }).name || '');
  return nombre.startsWith('Mongo') || nombre === 'MongooseError' || nombre === 'CastError' || (nombre === 'ValidationError' && 'errors' in error);
};

const esErrorDeDisco = (error: object): boolean => {
  const sistema = error as NodeJS.ErrnoException;
  return typeof sistema.code === 'string' && typeof sistema.syscall === 'string';
};

const mensajeDePersistencia = (codigo: string) => `No se pudo leer o guardar los datos. (${codigo})`;

/** Traduce un fallo al registro. No elige el status HTTP. */
export const describirError = (error: unknown, categoria: CategoriaLog): ErrorDescrito => {
  const ia = asAIRequestError(error);
  if (ia) {
    return {
      categoria: 'ia',
      codigo: ia.code,
      mensaje: ia.message,
      nivel: ia.status >= 500 ? 'error' : 'warn',
      detalle: ia.diagnostic,
      stack: ia.stack,
    };
  }
  if (error instanceof TonoInvalido || (error instanceof Error && error.name === 'TonoInvalido')) {
    return { categoria: 'ia', codigo: 'TONO_INVALIDO', mensaje: error.message, nivel: 'warn', stack: error.stack };
  }
  if (error instanceof ZodError) {
    const rutas = error.issues.map((issue) => issue.path.join('.') || '(raiz)').slice(0, 12);
    return {
      categoria: 'validacion',
      codigo: 'ENTRADA_INVALIDA',
      mensaje: 'La entrada no cumple el formato esperado.',
      nivel: 'warn',
      detalle: rutas.length ? rutas.join(', ') : undefined,
    };
  }
  if (error && typeof error === 'object' && (esErrorMongo(error) || esErrorDeDisco(error))) {
    const codigo = codigoTecnico(error);
    return {
      categoria: 'persistencia',
      codigo,
      mensaje: mensajeDePersistencia(codigo),
      nivel: 'error',
      detalle: error instanceof Error ? error.message.slice(0, 200) : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
  if (error instanceof Error && error.message.trim()) {
    const nivel: NivelLog = categoria === 'sistema' || categoria === 'persistencia' ? 'error' : 'warn';
    return { categoria, codigo: 'DOMINIO', mensaje: error.message, nivel, stack: error.stack };
  }
  return {
    categoria: 'sistema',
    codigo: 'NO_CLASIFICADO',
    mensaje: 'Ocurrió un error no clasificado.',
    nivel: 'error',
    detalle: typeof error === 'string' ? error.slice(0, 200) : undefined,
  };
};

export const registrarError = (categoria: CategoriaLog, error: unknown, contexto?: ContextoLog) => {
  const descrito = describirError(error, categoria);
  registrar(descrito.nivel, descrito.categoria, descrito.mensaje, {
    codigo: descrito.codigo,
    contexto,
    detalle: descrito.detalle,
    stack: descrito.stack,
  });
};
