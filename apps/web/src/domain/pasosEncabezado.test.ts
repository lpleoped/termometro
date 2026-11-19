import { siguientePaso, type EstadoFacilitador, type PasoFacilitador } from '@termometro/shared';
import { destinoAlVolver, destinoDePaso, pasosVisibles, type IdPasoVisible } from './pasosEncabezado.ts';

function igual(condicion: boolean, mensaje: string) {
  if (!condicion) throw new Error(mensaje);
}

const base = (parcial: Partial<EstadoFacilitador>): EstadoFacilitador => ({
  tieneEquipo: true,
  proveedores: 0,
  proveedorElegido: false,
  proveedorProbado: false,
  iaActiva: false,
  iaApagadaAProposito: false,
  tieneContexto: false,
  tieneCuestionario: false,
  hayAlgunCuestionario: false,
  rondaCompartida: false,
  lugar: 'recorrido',
  ...parcial,
});

const casos: Array<[string, Partial<EstadoFacilitador>, IdPasoVisible | null]> = [
  ['sin equipo', { tieneEquipo: false }, 'equipo'],
  ['con equipo y sin proveedor', {}, 'cuestionario'],
  ['dentro del asistente, cargar', { lugar: 'asistente' }, 'inteligencia'],
  ['dentro del asistente, elegir', { proveedores: 1, lugar: 'asistente' }, 'inteligencia'],
  ['dentro del asistente, probar', { proveedores: 1, proveedorElegido: true, lugar: 'asistente' }, 'inteligencia'],
  ['dentro del asistente, activar', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, lugar: 'asistente' }, 'inteligencia'],
  ['IA activa, sin contexto', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true }, 'contexto'],
  ['IA activa, con contexto, sin cuestionario', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, tieneContexto: true }, 'cuestionario'],
  ['IA apagada a propósito, sin cuestionario', { iaApagadaAProposito: true }, 'cuestionario'],
  ['con cuestionario, sin ronda', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, tieneContexto: true, tieneCuestionario: true }, 'compartir'],
  ['ya compartió una ronda', { rondaCompartida: true }, null],
];

const orden = ['Equipo', 'Inteligencia', 'Contexto', 'Cuestionario', 'Compartir'];

casos.forEach(([nombre, parcial, esperado]) => {
  const paso: PasoFacilitador = siguientePaso(base(parcial));
  const visibles = pasosVisibles(paso);
  if (esperado === null) {
    igual(visibles === null, `${nombre}: el encabezado de trabajo no lleva la escalera`);
    console.log(`✓ ${nombre}`);
    return;
  }
  if (!visibles) throw new Error(`${nombre}: tiene que haber cinco pasos`);
  igual(visibles.map((item) => item.nombre).join('|') === orden.join('|'), `${nombre}: el orden cambió`);
  const actual = visibles.find((item) => item.estado === 'actual');
  igual(actual?.id === esperado, `${nombre}: se marcó ${actual?.id}, se esperaba ${esperado}`);
  const indice = visibles.findIndex((item) => item.estado === 'actual');
  igual(visibles.slice(indice + 1).every((item) => item.estado === 'futuro'), `${nombre}: un paso posterior no quedó como futuro`);
  igual(visibles.slice(0, indice).every((item) => item.estado === 'hecho'), `${nombre}: un paso anterior no quedó como hecho`);
  console.log(`✓ ${nombre}`);
});

const equipo = '6afe6217508f0c99a1be85a4';
igual(destinoDePaso('equipo', equipo) === `/backoffice/equipos?equipo=${equipo}`, 'equipo');
igual(destinoDePaso('inteligencia', equipo) === `/backoffice/configuracion/ia?equipoId=${equipo}`, 'inteligencia');
igual(destinoDePaso('contexto', equipo) === `/backoffice/equipos?equipo=${equipo}&paso=contexto`, 'contexto');
igual(destinoDePaso('cuestionario', equipo) === `/backoffice/alta-evaluacion?equipoId=${equipo}`, 'cuestionario');
igual(destinoDePaso('compartir', equipo) === `/backoffice/publicar-evaluacion?equipoId=${equipo}`, 'compartir');
igual(destinoDePaso('cuestionario', '  ') === '/backoffice/alta-evaluacion', 'sin equipo el cuestionario no lleva query');
igual(
  destinoAlVolver({ autenticado: false, from: `/backoffice/alta-evaluacion?equipoId=${equipo}`, paso: 'armar-a-mano', equipoId: equipo }) === '/',
  'sin sesión vuelve al inicio',
);
igual(
  destinoAlVolver({ autenticado: true, from: `/backoffice/alta-evaluacion?equipoId=${equipo}`, paso: 'armar-a-mano', equipoId: equipo }) === `/backoffice/alta-evaluacion?equipoId=${equipo}`,
  'vuelve a la pantalla de origen',
);
igual(
  destinoAlVolver({ autenticado: true, from: '/ayuda/que-es', paso: 'armar-a-mano', equipoId: equipo }) === `/backoffice/alta-evaluacion?equipoId=${equipo}`,
  'no vuelve a otra página de ayuda',
);
igual(
  destinoAlVolver({ autenticado: true, from: 'https://evil.test/alta', paso: 'armar-a-mano', equipoId: equipo }) === `/backoffice/alta-evaluacion?equipoId=${equipo}`,
  'un origen externo no sale de la app',
);
igual(
  destinoAlVolver({ autenticado: true, from: undefined, paso: 'ver-la-ronda', equipoId: equipo }) === '/backoffice/home',
  'sin paso de primer uso vuelve al panel',
);
console.log('✓ destinos del encabezado y de la ayuda');
