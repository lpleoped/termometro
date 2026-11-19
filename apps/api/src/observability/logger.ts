import fs from 'node:fs';
import path from 'node:path';

export type NivelLog = 'error' | 'warn' | 'info' | 'debug';

export type CategoriaLog =
  | 'sistema'
  | 'persistencia'
  | 'autenticacion'
  | 'autorizacion'
  | 'validacion'
  | 'ronda'
  | 'respuesta'
  | 'ia'
  | 'respaldo'
  | 'red'
  | 'auditoria';

export type ContextoLog = Record<string, unknown>;

const RANGO: Record<NivelLog, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const DIAS_CONSERVADOS = 14;
const CLAVE_SENSIBLE = /password|passwd|secret|token|authorization|api[_-]?key|credential|jwt/i;
const CLAVE_IDENTIDAD = /email|correo/i;

let ultimoDiaDepurado = '';

export const nivelActivo = (): NivelLog => {
  const pedido = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (pedido === 'debug' || pedido === 'info' || pedido === 'warn' || pedido === 'error') return pedido;
  return 'info';
};

export const directorioLogs = (): string => {
  if (process.env.LOG_DIR) return process.env.LOG_DIR;
  if (process.env.TERMOMETRO_DATA_DIR) return path.join(path.dirname(process.env.TERMOMETRO_DATA_DIR), 'logs');
  return path.join(process.cwd(), 'logs');
};

export const redactarRuta = (ruta: string): string => {
  const [camino, consulta] = ruta.split('?');
  const limpio = camino
    .replace(/\/(r|responder)\/[^/?#]+/gi, '/$1/:token')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ':email');
  if (!consulta) return limpio;
  const parametros = consulta.split('&').map((par) => {
    const [clave, valor = ''] = par.split('=');
    if (CLAVE_SENSIBLE.test(clave) || CLAVE_IDENTIDAD.test(clave)) return `${clave}=[redactado]`;
    return `${clave}=${valor}`;
  });
  return `${limpio}?${parametros.join('&')}`;
};

export const redactarTexto = (texto: string): string => redactarRuta(texto)
  .replace(/Bearer\s+\S+/gi, 'Bearer [redactado]')
  .replace(/(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*\S+/gi, '$1=[redactado]');

export const redactarValor = (clave: string, valor: unknown, profundidad = 0): unknown => {
  if (CLAVE_SENSIBLE.test(clave)) return '[redactado]';
  if (CLAVE_IDENTIDAD.test(clave)) return undefined;
  if (profundidad > 3) return '[recortado]';
  if (typeof valor === 'string') return redactarTexto(valor).slice(0, 120);
  if (typeof valor === 'number' || typeof valor === 'boolean' || valor === null) return valor;
  if (Array.isArray(valor)) return valor.slice(0, 20).map((item) => redactarValor(clave, item, profundidad + 1));
  if (valor && typeof valor === 'object') return redactarContexto(valor as Record<string, unknown>, profundidad + 1);
  return undefined;
};

export const redactarContexto = (datos: Record<string, unknown>, profundidad = 0): Record<string, unknown> => {
  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (CLAVE_IDENTIDAD.test(clave)) continue;
    const redactado = redactarValor(clave, valor, profundidad);
    if (redactado !== undefined) limpio[clave] = redactado;
  }
  return limpio;
};

const fechaDeArchivo = (fecha = new Date()) => fecha.toISOString().slice(0, 10);

const depurarAntiguos = (directorio: string) => {
  const nombres = fs.readdirSync(directorio).filter((nombre) => /^termometro-\d{4}-\d{2}-\d{2}\.log$/.test(nombre)).sort();
  for (const nombre of nombres.slice(0, -DIAS_CONSERVADOS)) {
    fs.unlinkSync(path.join(directorio, nombre));
  }
};

const escribirLinea = (linea: string) => {
  const directorio = directorioLogs();
  fs.mkdirSync(directorio, { recursive: true });
  const dia = fechaDeArchivo();
  fs.appendFileSync(path.join(directorio, `termometro-${dia}.log`), `${linea}\n`, { encoding: 'utf8' });
  if (ultimoDiaDepurado !== dia) {
    ultimoDiaDepurado = dia;
    depurarAntiguos(directorio);
  }
};

const espejarConsola = (nivel: NivelLog, categoria: CategoriaLog, mensaje: string) => {
  const frase = `[${categoria}] ${mensaje}`;
  if (nivel === 'error') console.error(frase);
  else if (nivel === 'warn') console.warn(frase);
  else if (nivel === 'info') console.info(frase);
  else console.debug(frase);
};

export const registrar = (
  nivel: NivelLog,
  categoria: CategoriaLog,
  mensaje: string,
  extra?: { codigo?: string; contexto?: ContextoLog; detalle?: string; stack?: string },
) => {
  try {
    if (RANGO[nivel] < RANGO[nivelActivo()]) return;
    const evento: Record<string, unknown> = {
      ts: new Date().toISOString(),
      nivel,
      categoria,
      mensaje: redactarTexto(mensaje).slice(0, 500),
    };
    if (extra?.codigo) evento.codigo = redactarTexto(extra.codigo).slice(0, 80);
    if (extra?.contexto) evento.contexto = redactarContexto(extra.contexto);
    if (extra?.detalle) evento.detalle = redactarTexto(extra.detalle).slice(0, 500);
    if (nivel === 'error' && extra?.stack) evento.stack = extra.stack.slice(0, 4000);
    escribirLinea(JSON.stringify(evento));
    espejarConsola(nivel, categoria, String(evento.mensaje));
  } catch {
    // Un disco lleno o un directorio bloqueado no puede cambiar la operación.
  }
};

export const log = {
  error: (categoria: CategoriaLog, mensaje: string, extra?: Parameters<typeof registrar>[3]) => registrar('error', categoria, mensaje, extra),
  warn: (categoria: CategoriaLog, mensaje: string, extra?: Parameters<typeof registrar>[3]) => registrar('warn', categoria, mensaje, extra),
  info: (categoria: CategoriaLog, mensaje: string, extra?: Parameters<typeof registrar>[3]) => registrar('info', categoria, mensaje, extra),
  debug: (categoria: CategoriaLog, mensaje: string, extra?: Parameters<typeof registrar>[3]) => registrar('debug', categoria, mensaje, extra),
};

export const registrarAcceso = (metodo: string, ruta: string, status: number, duracionMs: number) => {
  const nivel: NivelLog = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  const redactada = redactarRuta(ruta);
  registrar(nivel, 'sistema', `${metodo} ${redactada}`, {
    codigo: `HTTP_${status}`,
    contexto: { metodo, ruta: redactada, status, duracionMs },
  });
};
