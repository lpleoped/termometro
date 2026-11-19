import { elegirContraste } from './contraste-analisis.ts';

function igual(condicion: boolean, mensaje: string) {
  if (!condicion) throw new Error(mensaje);
}

const a1 = { id: 'a1', instanciaId: 'r1', creadoEn: '2026-11-17T19:36:25.000Z' };
const a2 = { id: 'a2', instanciaId: 'r1', creadoEn: '2026-11-17T19:36:59.000Z' };
const b1 = { id: 'b1', instanciaId: 'r2', creadoEn: '2026-12-01T12:00:00.000Z' };

const primera = elegirContraste([{ instanciaId: 'r1', analisis: [a2, a1] }], 'r1', '', '');
igual(primera.hayRondaAnterior === false, 'una sola ronda no arma contraste');
igual(primera.lectura?.id === 'a2', 'en la primera ronda se lee la versión más nueva');
igual(primera.referencia === undefined, 'no hay análisis de una ronda anterior');
igual(primera.versiones.map((item) => item.id).join(',') === 'a1,a2', 'las versiones de la misma ronda quedan por fecha');

const segunda = elegirContraste(
  [
    { instanciaId: 'r1', analisis: [a1, a2] },
    { instanciaId: 'r2', analisis: [b1] },
  ],
  'r2',
  '',
  '',
);
igual(segunda.hayRondaAnterior, 'la segunda ronda sí contrasta');
igual(segunda.lectura?.id === 'b1', 'la lectura es la de la ronda abierta');
igual(segunda.referencia?.id === 'a2', 'la referencia es la última versión de la ronda anterior');

const segundaConDosVersiones = elegirContraste(
  [
    { instanciaId: 'r1', analisis: [a1] },
    { instanciaId: 'r2', analisis: [b1, { id: 'b0', instanciaId: 'r2', creadoEn: '2026-11-20T12:00:00.000Z' }] },
  ],
  'r2',
  '',
  '',
);
igual(segundaConDosVersiones.referencia?.id === 'a1', 'una versión previa de la misma ronda no se usa como referencia');
igual(segundaConDosVersiones.lectura?.id === 'b1', 'la lectura sigue siendo la versión más nueva de la ronda abierta');

const mirandoLaPrimera = elegirContraste(
  [
    { instanciaId: 'r1', analisis: [a1, a2] },
    { instanciaId: 'r2', analisis: [b1] },
  ],
  'r1',
  '',
  '',
);
igual(mirandoLaPrimera.hayRondaAnterior === false, 'la primera ronda no contrasta hacia adelante');
igual(mirandoLaPrimera.lectura?.id === 'a2', 'al mirar la primera ronda se muestra su última versión');

const elegida = elegirContraste([{ instanciaId: 'r1', analisis: [a1, a2] }], 'r1', 'a1', '');
igual(elegida.lectura?.id === 'a1', 'respeta la versión elegida de la misma ronda');
