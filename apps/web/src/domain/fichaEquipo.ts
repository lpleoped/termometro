import type { PasoFacilitador } from '@termometro/shared';

/** Botón de la ficha cuando el equipo todavía no compartió una ronda. */
export interface PrimariaFicha {
  etiqueta: string;
  frase: string;
  destino: string;
  ancla: string;
}

const PASOS_DE_CONEXION = new Set<PasoFacilitador>([
  'crear-equipo',
  'conectar-inteligencia',
  'cargar-proveedor',
  'elegir-proveedor',
  'probar',
  'activar',
]);

/** Traduce el paso de `siguientePaso` al botón visible. No elige el paso. */
export function primariaSinRonda(paso: PasoFacilitador, equipoId: string): PrimariaFicha {
  if (PASOS_DE_CONEXION.has(paso)) {
    return {
      etiqueta: 'Conectar la inteligencia',
      frase: 'El equipo ya está. El siguiente paso es conectar la inteligencia.',
      destino: `/backoffice/configuracion/ia?equipoId=${equipoId}`,
      ancla: `conectar-${equipoId}`,
    };
  }
  if (paso === 'dar-contexto') {
    return {
      etiqueta: 'Dar contexto',
      frase: 'La inteligencia todavía no conoce a este equipo.',
      destino: `/backoffice/equipos?equipo=${equipoId}&paso=contexto`,
      ancla: `contexto-${equipoId}`,
    };
  }
  if (paso === 'armar-a-mano') {
    return {
      etiqueta: 'Armar el cuestionario a mano',
      frase: 'Sin inteligencia vas a escribir las preguntas vos.',
      destino: `/backoffice/alta-evaluacion?equipoId=${equipoId}`,
      ancla: `cuestionario-${equipoId}`,
    };
  }
  if (paso === 'armar-con-ia') {
    return {
      etiqueta: 'Armar el cuestionario',
      frase: 'El siguiente paso es armar el cuestionario.',
      destino: `/backoffice/alta-evaluacion?equipoId=${equipoId}`,
      ancla: `cuestionario-${equipoId}`,
    };
  }
  return {
    etiqueta: 'Abrir la ronda',
    frase: 'Todavía no hay una medición abierta.',
    destino: `/backoffice/publicar-evaluacion?equipoId=${equipoId}`,
    ancla: `paso-${equipoId}`,
  };
}

/** La otra acción del equipo: armar si ya se puede publicar, o publicar si ya hay alguno. */
export function secundariaSinRonda(paso: PasoFacilitador, equipoId: string, hayAlgunCuestionario: boolean): PrimariaFicha | null {
  if (paso === 'compartir' || paso === 'ver-la-ronda') {
    return {
      etiqueta: 'Armar un cuestionario',
      frase: 'Podés armar otro cuestionario para este equipo.',
      destino: `/backoffice/alta-evaluacion?equipoId=${equipoId}`,
      ancla: `otro-cuestionario-${equipoId}`,
    };
  }
  if ((paso === 'armar-con-ia' || paso === 'armar-a-mano') && hayAlgunCuestionario) {
    return {
      etiqueta: 'Abrir la ronda',
      frase: 'También podés publicar un cuestionario que ya existe.',
      destino: `/backoffice/publicar-evaluacion?equipoId=${equipoId}`,
      ancla: `publicar-${equipoId}`,
    };
  }
  return null;
}
