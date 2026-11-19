import { siguientePaso, type EstadoFacilitador, type PasoFacilitador } from '@termometro/shared';
import { pasosVisibles, type IdPasoVisible } from './pasosEncabezado.ts';

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
