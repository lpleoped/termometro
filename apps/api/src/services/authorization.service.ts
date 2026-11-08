import { evaluationRepository } from '../repositories/evaluation.repository';
import { roundRepository } from '../repositories/round.repository';
import { teamRepository } from '../repositories/team.repository';

const noPermission = (resource: string) => new Error(`No tienes permiso para acceder a ${resource}`);

export const hasInstanceOwnership = (evaluationOwned: boolean, teamOwned: boolean, hasTeam: boolean) =>
  evaluationOwned && (!hasTeam || teamOwned);

export const assertEvaluationOwner = async (userId: string, evaluacionId: string) => {
  const evaluacion = await evaluationRepository().findById(evaluacionId);
  if (evaluacion && String(evaluacion.creadoPor) === userId) return evaluacion;
  if (!evaluacion) throw noPermission('esta evaluación');
  throw noPermission('esta evaluación');
};

export const assertTeamOwner = async (userId: string, equipoId: string) => {
  const equipo = await teamRepository().findOwnedActive(equipoId, userId);
  if (!equipo) throw noPermission('este equipo');
  return equipo;
};

/**
 * An instance belongs to the evaluation owner and, when scoped to a team,
 * also to the team owner. Requiring both prevents cross-tenant compositions.
 */
export const assertInstanceOwner = async (userId: string, instanciaId: string) => {
  const instancia = await roundRepository().findById(instanciaId);
  if (!instancia) throw new Error('Instancia no encontrada');

  const [evaluacion, equipo] = await Promise.all([
    evaluationRepository().findById(String(instancia.evaluacion)),
    instancia.equipo
      ? teamRepository().findOwnedActive(String(instancia.equipo), userId)
      : null,
  ]);
  const evaluationOwned = Boolean(evaluacion && String(evaluacion.creadoPor) === userId);
  if (!hasInstanceOwnership(evaluationOwned, Boolean(equipo), Boolean(instancia.equipo))) {
    throw noPermission('esta instancia');
  }

  return instancia;
};

export const assertTeamInstanceOwner = async (userId: string, equipoId: string) => {
  await assertTeamOwner(userId, equipoId);
  const owned = new Set((await evaluationRepository().listByOwner(userId)).map(item => String(item._id)));
  return (await roundRepository().listByTeam(equipoId)).filter(item => owned.has(String(item.evaluacion)));
};
