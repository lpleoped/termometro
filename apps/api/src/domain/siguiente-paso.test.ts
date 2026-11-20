import assert from 'node:assert/strict';
import { siguientePaso, type EstadoFacilitador, type PasoFacilitador } from '@termometro/shared';

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

const casos: Array<[string, Partial<EstadoFacilitador>, PasoFacilitador]> = [
  ['sin equipo, aunque el resto esté completo', { tieneEquipo: false, rondaCompartida: true, iaActiva: true, tieneCuestionario: true }, 'crear-equipo'],
  ['con equipo y sin proveedor, en el recorrido', { lugar: 'recorrido' }, 'armar-a-mano'],
  ['con proveedor sin elegir, el recorrido arma el cuestionario', { proveedores: 1, lugar: 'recorrido' }, 'armar-a-mano'],
  ['sin proveedor, dentro del asistente', { lugar: 'asistente' }, 'cargar-proveedor'],
  ['con proveedor y sin elegir, en el asistente', { proveedores: 1, lugar: 'asistente' }, 'elegir-proveedor'],
  ['elegido y sin probar, en el asistente', { proveedores: 1, proveedorElegido: true, lugar: 'asistente' }, 'probar'],
  ['probado y con la IA apagada, en el asistente', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, lugar: 'asistente' }, 'activar'],
  ['IA activa, sin contexto y sin cuestionario', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true }, 'dar-contexto'],
  ['IA activa, con contexto y sin cuestionario', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, tieneContexto: true }, 'armar-con-ia'],
  ['IA apagada a propósito y sin cuestionario', { iaApagadaAProposito: true }, 'armar-a-mano'],
  ['IA activa, con cuestionario y sin ronda', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, tieneContexto: true, tieneCuestionario: true }, 'compartir'],
  ['IA apagada a propósito, con cuestionario y sin ronda', { iaApagadaAProposito: true, tieneCuestionario: true }, 'compartir'],
  ['ya compartió una ronda', { rondaCompartida: true, iaApagadaAProposito: true }, 'ver-la-ronda'],
  ['ya compartió, aunque falte contexto', { proveedores: 1, proveedorElegido: true, iaActiva: true, rondaCompartida: true }, 'ver-la-ronda'],
  ['IA activa sin contexto, con cuestionario ya armado', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, tieneCuestionario: true }, 'dar-contexto'],
  ['IA activa, con contexto y con cuestionario, sin ronda', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, tieneContexto: true, tieneCuestionario: true }, 'compartir'],
  ['IA activa marcada sin ningún proveedor vuelve a cargar', { iaActiva: true, lugar: 'asistente' }, 'cargar-proveedor'],
  ['equipo con contexto y con otro cuestionario en la cuenta', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, tieneContexto: true, tieneCuestionario: false, hayAlgunCuestionario: true }, 'armar-con-ia'],
  ['ese equipo ya tiene el suyo', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, tieneContexto: true, tieneCuestionario: true, hayAlgunCuestionario: true }, 'compartir'],
  ['IA apagada, sin cuestionario propio y con uno en la cuenta', { hayAlgunCuestionario: true }, 'armar-a-mano'],
  ['IA activa, sin contexto propio, con un cuestionario de otro equipo', { proveedores: 1, proveedorElegido: true, proveedorProbado: true, iaActiva: true, hayAlgunCuestionario: true }, 'dar-contexto'],
];

casos.forEach(([nombre, parcial, esperado], indice) => {
  const lugar = parcial.lugar ?? 'recorrido';
  assert.equal(siguientePaso(base({ ...parcial, lugar })), esperado, nombre);
  console.log(`✓ ${indice + 1}. ${nombre}`);
});
