import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { TonoInvalido } from '../domain/tono';
import { AIRequestError } from '../services/ai-completion';
import { describirError, registrarError } from './errores';
import { log, redactarContexto, redactarRuta } from './logger';

const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-logs-'));
const directorio = path.join(raiz, 'anidado', 'logs');
process.env.LOG_DIR = directorio;
process.env.LOG_LEVEL = 'info';

const contexto = redactarContexto({
  password: 'clave-visible',
  token: 'tok-visible',
  authorization: 'auth-visible',
  apiKey: 'key-visible',
  email: 'persona@ejemplo.test',
  accion: 'login',
});
assert.equal(contexto.password, '[redactado]');
assert.equal(contexto.token, '[redactado]');
assert.equal(contexto.authorization, '[redactado]');
assert.equal(contexto.apiKey, '[redactado]');
assert.equal('email' in contexto, false);
assert.equal(contexto.accion, 'login');
assert.equal(redactarRuta('/api/r/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), '/api/r/:token');
assert.equal(redactarRuta('/responder/f732e3eb-ed0f-47c2-843b-831f5c3a6c7a'), '/responder/:token');
assert.equal(redactarRuta('/api/equipos/1/miembros/persona@ejemplo.test'), '/api/equipos/1/miembros/:email');

const bloqueado = describirError(new AIRequestError('AI_ENDPOINT_BLOCKED', 'El endpoint debe usar HTTP o HTTPS', 400), 'ronda');
assert.equal(bloqueado.categoria, 'ia');
assert.equal(bloqueado.codigo, 'AI_ENDPOINT_BLOCKED');
assert.equal(bloqueado.nivel, 'warn');
assert.equal(bloqueado.mensaje, 'El endpoint debe usar HTTP o HTTPS');

const formato = describirError(new AIRequestError('AI_FORMAT', 'El proveedor devolvió una respuesta con formato inválido. Volvé a intentar.', 502), 'sistema');
assert.equal(formato.categoria, 'ia');
assert.equal(formato.nivel, 'error');

const tono = describirError(new TonoInvalido('La oración del tono tiene que ser una sola frase.'), 'ronda');
assert.equal(tono.categoria, 'ia');
assert.equal(tono.codigo, 'TONO_INVALIDO');
assert.equal(tono.nivel, 'warn');
assert.equal(tono.mensaje, 'La oración del tono tiene que ser una sola frase.');

const entrada = z.object({ clave: z.literal('esperado') }).safeParse({ clave: 'valor-secreto-zod' });
assert.equal(entrada.success, false);
if (!entrada.success) {
  const descrito = describirError(entrada.error, 'ronda');
  assert.equal(descrito.categoria, 'validacion');
  assert.equal(descrito.nivel, 'warn');
  assert.equal(descrito.mensaje, 'La entrada no cumple el formato esperado.');
  assert.equal(descrito.detalle, 'clave');
  assert.equal(JSON.stringify(descrito).includes('valor-secreto-zod'), false);
}

const disco = Object.assign(new Error('open failed'), { code: 'EACCES', syscall: 'open' });
const persistencia = describirError(disco, 'ronda');
assert.equal(persistencia.categoria, 'persistencia');
assert.equal(persistencia.codigo, 'EACCES');
assert.equal(persistencia.nivel, 'error');
assert.equal(persistencia.mensaje, 'No se pudo leer o guardar los datos. (EACCES)');

const mongo = Object.assign(new Error('connection refused'), { name: 'MongoNetworkError' });
assert.equal(describirError(mongo, 'sistema').categoria, 'persistencia');

const dominio = describirError(new Error('Credenciales inválidas.'), 'autenticacion');
assert.equal(dominio.categoria, 'autenticacion');
assert.equal(dominio.mensaje, 'Credenciales inválidas.');
assert.equal(dominio.nivel, 'warn');

const desconocido = describirError({ raro: true }, 'ronda');
assert.equal(desconocido.categoria, 'sistema');
assert.equal(desconocido.codigo, 'NO_CLASIFICADO');
assert.equal(desconocido.nivel, 'error');
assert.equal(desconocido.mensaje, 'Ocurrió un error no clasificado.');

log.debug('sistema', 'marca-debug-ausente');
assert.equal(fs.existsSync(directorio), false);

log.info('autenticacion', 'Inicio de sesión aceptado.', {
  contexto: { password: 'clave-visible', token: 'tok-visible', authorization: 'auth-visible', apiKey: 'key-visible', email: 'persona@ejemplo.test' },
});
const archivo = fs.readdirSync(directorio).find((nombre) => /^termometro-\d{4}-\d{2}-\d{2}\.log$/.test(nombre));
assert.ok(archivo, 'el directorio de log se crea al escribir');
const linea = fs.readFileSync(path.join(directorio, archivo), 'utf8');
assert.equal(linea.includes('clave-visible'), false);
assert.equal(linea.includes('tok-visible'), false);
assert.equal(linea.includes('auth-visible'), false);
assert.equal(linea.includes('key-visible'), false);
assert.equal(linea.includes('persona@ejemplo.test'), false);
assert.equal(linea.includes('marca-debug-ausente'), false);
assert.match(linea, /\[redactado\]/);

const consola: string[] = [];
const errorOriginal = console.error;
console.error = (mensaje?: unknown) => { consola.push(String(mensaje)); };
registrarError('ronda', disco);
console.error = errorOriginal;
const completo = fs.readFileSync(path.join(directorio, archivo), 'utf8');
assert.match(completo, /"stack":/);
assert.equal(consola.some((frase) => frase.includes('stack') || frase.includes('open failed')), false);
assert.match(consola.join('\n'), /No se pudo leer o guardar los datos/);

process.env.LOG_DIR = path.join(raiz, 'no-es-carpeta');
fs.writeFileSync(process.env.LOG_DIR, 'archivo');
let fallo: unknown;
try {
  log.error('sistema', 'esto no puede tumbar la operación');
  registrarError('sistema', new Error('tampoco este'));
} catch (error) {
  fallo = error;
}
assert.equal(fallo, undefined);

console.log('observability: ok');
