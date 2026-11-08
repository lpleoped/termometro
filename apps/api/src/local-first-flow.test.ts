import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getEstadoActualDashboard } from './services/dashboard.service';
import { getHistoricoPorEquipoYEvaluacion } from './services/historico.service';
import { editarEvaluacionService, eliminarEvaluacionPorIdService } from './services/evaluacion.service';
import { agregarMiembroService, actualizarEquipoService, archivarEquipoService, crearEquipoService, listarEquiposPorUsuarioService, quitarMiembroService } from './services/equipo.service';
import { crearInstanciaEvaluacionService, listarInstanciasPorEquipoService, obtenerInstanciaPorIdService, obtenerRondaPublicaService, cerrarInstanciaEvaluacionService } from './services/instancia.service';
import { crearRespuestaService } from './services/respuesta.service';
import { assertInstanceOwner } from './services/authorization.service';
import { loginUsuarioService, obtenerPerfilService, registrarUsuarioService } from './services/auth.service';
import { getLocal, initializeLocalStorage, listLocal, saveLocal } from './storage/local-store';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-local-flow-'));
process.env.STORAGE_DRIVER = 'json';
process.env.TERMOMETRO_DATA_DIR = directory;
process.env.JWT_SECRET = 'local-flow-jwt-secret-with-at-least-32-characters';

const evaluation = {
  _id: 'evaluacion-1', creadoPor: 'usuario-1', titulo: 'Clima', version: '1.0', tipo: 'CUSTOM',
  secciones: [{
    titulo: 'Colaboración', ponderacion: 100, indicadores: [
      { id: 'apoyo', texto: 'Recibo apoyo', tipo: 'cuantitativo', direccion: 'positiva' },
      { id: 'friccion', texto: 'Hay fricción', tipo: 'cuantitativo', direccion: 'negativa' },
      { id: 'sin-respuesta', texto: 'Pregunta opcional', tipo: 'cuantitativo', direccion: 'positiva' },
      { id: 'comentario', texto: '¿Qué mejorarías?', tipo: 'cualitativo' },
    ],
  }],
};

const response = (id: string, positive: number, negative: number, text: string) => ({
  _id: id, instanciaEvaluacion: 'ronda-1', respuestas: [
    { indicadorId: 'apoyo', valor: positive },
    { indicadorId: 'friccion', valor: negative },
    { indicadorId: 'comentario', texto: text },
  ],
});

async function run() {
  try {
    initializeLocalStorage();
    const registro = await registrarUsuarioService({ nombre: 'Facilitadora', email: 'Auth@Example.com', password: 'secreto-seguro' });
    assert.ok(registro.token);
    assert.equal(registro.usuario.email, 'auth@example.com');
    await assert.rejects(() => registrarUsuarioService({ nombre: 'Duplicada', email: 'auth@example.com', password: 'otro-secreto' }), /No se pudo completar el registro/);
    assert.ok(await loginUsuarioService({ email: 'AUTH@example.com', password: 'secreto-seguro' }));
    await assert.rejects(() => loginUsuarioService({ email: 'auth@example.com', password: 'incorrecta' }), /Credenciales inválidas/);
    const perfil: any = await obtenerPerfilService({ user: { id: String(registro.usuario.id) } } as any);
    assert.equal(perfil.email, 'auth@example.com');
    assert.equal('password' in perfil, false);
    saveLocal('usuarios', { _id: 'usuario-1', nombre: 'Usuario local', email: 'local@example.com', password: 'fixture-password' });
    saveLocal('equipos', { _id: 'equipo-1', nombre: 'Equipo local', creadoPor: 'usuario-1', miembros: [], activo: true, creadoEn: '2026-01-01T00:00:00.000Z' });
    saveLocal('evaluaciones', evaluation);
    saveLocal('instancias', { _id: 'ronda-1', equipo: 'equipo-1', evaluacion: 'evaluacion-1', activadoEn: '2026-01-01T12:00:00.000Z', cantidadEsperada: 4, modoRespuesta: 'anonima', minimoAnonimato: 3, estado: 'activa' });
    saveLocal('respuestas', response('respuesta-1', 5, 1, 'Más espacios de coordinación'));
    saveLocal('respuestas', response('respuesta-2', 4, 2, 'Objetivos más claros'));
    saveLocal('respuestas', response('respuesta-3', 3, 3, 'Mejor documentación'));

    const nuevoEquipo = await crearEquipoService({ nombre: 'Equipo temporal', creadoPor: 'usuario-1' });
    assert.equal((await actualizarEquipoService(nuevoEquipo._id, 'otro-usuario', { nombre: 'Intrusión' })), null);
    assert.equal((await actualizarEquipoService(nuevoEquipo._id, 'usuario-1', { nombre: 'Equipo actualizado' }))?.nombre, 'Equipo actualizado');
    assert.ok(await agregarMiembroService(nuevoEquipo._id, 'usuario-1', 'persona@example.com'));
    assert.equal(await agregarMiembroService(nuevoEquipo._id, 'usuario-1', 'persona@example.com'), null, 'no debe duplicar miembros');
    assert.deepEqual((await quitarMiembroService(nuevoEquipo._id, 'usuario-1', 'persona@example.com'))?.miembros, []);
    assert.ok(await archivarEquipoService(nuevoEquipo._id, 'usuario-1'));
    assert.equal((await listarEquiposPorUsuarioService('usuario-1')).some(item => item._id === nuevoEquipo._id), false);

    const rondaIndividual: any = await crearInstanciaEvaluacionService({ evaluacionId: 'evaluacion-1', alcance: 'individual', activadoEn: new Date('2026-02-01T12:00:00.000Z'), cantidadEsperada: 1 }, 'usuario-1');
    assert.match(String(rondaIndividual.tokenPublico), /^[A-Za-z0-9_-]{43}$/);
    assert.equal((await obtenerRondaPublicaService(String(rondaIndividual.tokenPublico))).titulo, 'Clima');
    assert.equal(String((await obtenerInstanciaPorIdService(String(rondaIndividual._id), 'usuario-1')).evaluacionId), 'evaluacion-1');
    await assertInstanceOwner('usuario-1', String(rondaIndividual._id));
    await assert.rejects(() => assertInstanceOwner('otro-usuario', String(rondaIndividual._id)), /permiso/);
    const primeraRespuesta: any = await crearRespuestaService({ tokenPublico: String(rondaIndividual.tokenPublico), idempotencyKey: 'respuesta-demo-2026-01', respuestas: [{ indicadorId: 'apoyo', valor: 5 }, { indicadorId: 'friccion', valor: 1 }, { indicadorId: 'comentario', texto: 'Flujo por repositorios' }] });
    const reintento: any = await crearRespuestaService({ tokenPublico: String(rondaIndividual.tokenPublico), idempotencyKey: 'respuesta-demo-2026-01', respuestas: [{ indicadorId: 'apoyo', valor: 1 }, { indicadorId: 'friccion', valor: 5 }, { indicadorId: 'comentario', texto: 'duplicado' }] });
    assert.equal(reintento._id, primeraRespuesta._id, 'un reintento idempotente no debe crear otra respuesta');
    await cerrarInstanciaEvaluacionService(String(rondaIndividual._id), 'usuario-1');
    await assert.rejects(() => obtenerRondaPublicaService(String(rondaIndividual.tokenPublico)), /no disponible/);
    const rondasEquipo: any[] = await listarInstanciasPorEquipoService('equipo-1', 'usuario-1');
    assert.equal(rondasEquipo[0].evaluacion.titulo, 'Clima');

    const dashboard = await getEstadoActualDashboard('ronda-1');
    assert.equal(dashboard.equipo, 'Equipo local');
    assert.equal(dashboard.indiceGlobal, 70);
    assert.equal(dashboard.indicadores.find(item => item.id === 'sin-respuesta')?.n, 0);
    assert.deepEqual(dashboard.participacion, { esperada: 4, recibida: 3, porcentaje: 75 });
    assert.equal(dashboard.privacidad?.protegido, false);
    assert.equal(dashboard.cualitativo?.grupos?.[0].comentarios.length, 3);

    const history = await getHistoricoPorEquipoYEvaluacion('equipo-1', 'evaluacion-1', 'usuario-1');
    assert.equal(history.historico.length, 1);
    assert.equal(history.historico[0].indiceGlobal, 70);
    assert.equal(history.seguimiento[0].analisis.length, 0);
    assert.equal(history.seguimiento[0].acciones.length, 0);

    const nuevaVersion: any = await editarEvaluacionService('evaluacion-1', { descripcion: 'Versión ajustada' }, 'usuario-1');
    assert.notEqual(String(nuevaVersion._id), 'evaluacion-1');
    assert.equal(nuevaVersion.version, '2.0');
    assert.equal(nuevaVersion.secciones[0].indicadores[0].tipo, 'cuantitativo');
    assert.ok(getLocal('evaluaciones', 'evaluacion-1'), 'editar debe conservar la versión original');
    await assert.rejects(() => eliminarEvaluacionPorIdService('evaluacion-1', 'otro-usuario'), /No tienes permiso/);

    await eliminarEvaluacionPorIdService('evaluacion-1', 'usuario-1');
    assert.equal(getLocal('evaluaciones', 'evaluacion-1'), null);
    assert.equal(listLocal<any>('instancias').filter(item => item.evaluacion === 'evaluacion-1').length, 0);
    assert.equal(listLocal<any>('respuestas').filter(item => item.instanciaEvaluacion === 'ronda-1').length, 0);
    console.log('local-first-flow.test: ok');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

void run();
