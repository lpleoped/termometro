import type { PasoFacilitador } from '@termometro/shared';
import { primariaSinRonda, secundariaSinRonda } from './fichaEquipo.ts';

function igual(condicion: boolean, mensaje: string) {
  if (!condicion) throw new Error(mensaje);
}

const casos: Array<[PasoFacilitador, string, string]> = [
  ['conectar-inteligencia', 'Conectar la inteligencia', 'conectar-operaciones'],
  ['cargar-proveedor', 'Conectar la inteligencia', 'conectar-operaciones'],
  ['dar-contexto', 'Dar contexto', 'contexto-operaciones'],
  ['armar-con-ia', 'Armar el cuestionario', 'cuestionario-operaciones'],
  ['armar-a-mano', 'Armar el cuestionario a mano', 'cuestionario-operaciones'],
  ['compartir', 'Abrir la ronda', 'paso-operaciones'],
  ['ver-la-ronda', 'Abrir la ronda', 'paso-operaciones'],
];

casos.forEach(([paso, etiqueta, ancla]) => {
  const primaria = primariaSinRonda(paso, 'operaciones');
  igual(primaria.etiqueta === etiqueta, `${paso}: etiqueta ${primaria.etiqueta}`);
  igual(primaria.ancla === ancla, `${paso}: ancla ${primaria.ancla}`);
  igual(!/equipos activos|personas registradas|\b0\b/i.test(`${primaria.etiqueta} ${primaria.frase}`), `${paso}: la primaria no muestra un cero`);
  console.log(`✓ ${paso}`);
});

const manual = primariaSinRonda('armar-a-mano', 'operaciones');
igual(manual.frase === 'Sin inteligencia vas a escribir las preguntas vos.', 'la vía a mano dice que las preguntas las escribe la persona');
igual(primariaSinRonda('conectar-inteligencia', 'operaciones').destino === '/backoffice/configuracion/ia?equipoId=operaciones', 'conectar abre el asistente del equipo');

const armarOtro = secundariaSinRonda('compartir', 'operaciones', true);
igual(armarOtro?.etiqueta === 'Armar un cuestionario', 'con ronda por abrir se puede armar otro');
igual(armarOtro?.destino === '/backoffice/alta-evaluacion?equipoId=operaciones', 'armar otro queda en este equipo');
igual(secundariaSinRonda('ver-la-ronda', 'operaciones', false)?.etiqueta === 'Armar un cuestionario', 'ver la ronda también deja armar');
const publicar = secundariaSinRonda('armar-con-ia', 'operaciones', true);
igual(publicar?.etiqueta === 'Abrir la ronda', 'si ya hay un cuestionario, publicar queda al lado de armar');
igual(publicar?.destino === '/backoffice/publicar-evaluacion?equipoId=operaciones', 'publicar abre la ronda de este equipo');
igual(secundariaSinRonda('armar-a-mano', 'operaciones', false) === null, 'sin cuestionarios no se ofrece publicar');
igual(secundariaSinRonda('dar-contexto', 'operaciones', true) === null, 'el contexto no mezcla publicar');
