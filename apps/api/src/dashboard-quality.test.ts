import { calidadDe, contarPersonasConRespuestaValida, extraerRespuestasCuantitativas, comentariosDelDashboard } from './services/dashboard.service';

const insufficient = calidadDe([3, 3]);
const preguntasAbiertas = [{ titulo: 'Contexto', indicadores: [{ id: 'abierta', texto: '¿Qué necesitás?', tipo: 'cualitativo' }] }];
const textos = [{ identidad: { email: 'privado@example.com' }, respuestas: [{ indicadorId: 'abierta', texto: 'Necesito apoyo' }], comentariosAbiertos: { mejora: 'Más tiempo' } }];
const grupos = comentariosDelDashboard(preguntasAbiertas, textos, false);
if (grupos[0].comentarios[0] !== 'Necesito apoyo' || grupos[1].comentarios[0] !== 'Más tiempo') throw new Error('Se perdieron respuestas abiertas');
if (JSON.stringify(grupos).includes('privado@example.com')) throw new Error('Se expuso la identidad');
if (comentariosDelDashboard(preguntasAbiertas, textos, true).length) throw new Error('Se expusieron textos protegidos');
if (insufficient.disponible || insufficient.dispersion !== null) throw new Error('Se estimó calidad con una muestra insuficiente');

const floor = calidadDe([1, 1, 1, 2, 1]);
if (!floor.disponible || floor.techoPiso !== 'piso' || floor.dispersion === null) throw new Error('No se detectó piso');

const ceiling = calidadDe([5, 5, 4, 5, 5]);
if (ceiling.techoPiso !== 'techo') throw new Error('No se detectó techo');

const mixed = calidadDe([1, 3, 5, 2, 4]);
if (mixed.techoPiso !== null || mixed.dispersion === null) throw new Error('Se clasificó incorrectamente una distribución mixta');

const cuantitativas = extraerRespuestasCuantitativas([
  { respuestas: [{ indicadorId: 'likert', valor: 5 }, { indicadorId: 'abierta', texto: 'Necesito ayuda' } as any] },
], new Set(['likert']));
if (cuantitativas.likert?.[0] !== 5 || cuantitativas.abierta) {
  throw new Error('Una respuesta cualitativa entró en el conjunto cuantitativo');
}

const personasEnSeccion = contarPersonasConRespuestaValida([
  { respuestas: [{ indicadorId: 'uno', valor: 5 }, { indicadorId: 'dos', valor: 4 }] },
  { respuestas: [{ indicadorId: 'dos', valor: 3 }] },
], new Set(['uno', 'dos']));
if (personasEnSeccion !== 2) throw new Error('La sección contó respuestas en vez de personas');
