import assert from 'node:assert/strict';
import type { EvaluationRepository } from './evaluation.repository';
import type { ResponseRepository } from './response.repository';
import type { RoundRepository } from './round.repository';
import type { TeamRepository } from './team.repository';
import type { UserRepository } from './user.repository';

export interface RepositoryConformanceSet {
  users: UserRepository;
  teams: TeamRepository;
  evaluations: EvaluationRepository;
  rounds: RoundRepository;
  responses: ResponseRepository;
}

/**
 * Casos mínimos que todo driver debe cumplir. No conoce JSON ni Mongo: la
 * misma función puede ejecutarse contra cualquier conjunto de adaptadores.
 */
export async function assertRepositoryConformance(repositories: RepositoryConformanceSet) {
  assert.equal(await repositories.users.count(), 0);
  const user = await repositories.users.insert({ nombre: 'Conformance', email: 'conformance@example.com', password: 'hash' });
  assert.equal(await repositories.users.count(), 1);
  assert.equal((await repositories.users.findByEmail('CONFORMANCE@example.com'))?._id, user._id);
  assert.equal((await repositories.users.findById(user._id))?.email, 'conformance@example.com');

  const team = await repositories.teams.insert({ nombre: 'Equipo conformance', creadoPor: user._id });
  assert.equal((await repositories.teams.findOwned(team._id, user._id))?._id, team._id);
  assert.equal((await repositories.teams.addMemberOwnedActive(team._id, user._id, 'miembro@example.com'))?.miembros.length, 1);
  assert.equal(await repositories.teams.addMemberOwnedActive(team._id, user._id, 'miembro@example.com'), null);
  assert.equal((await repositories.teams.removeMemberOwnedActive(team._id, user._id, 'miembro@example.com'))?.miembros.length, 0);
  assert.equal(await repositories.teams.findOwned(team._id, '000000000000000000000001'), null);

  const evaluation = await repositories.evaluations.insert({
    titulo: 'Evaluación conformance', version: '1.0', tipo: 'CUSTOM', creadoPor: user._id,
    secciones: [{ titulo: 'Sección', ponderacion: 100, indicadores: [{ id: 'indicador', tipo: 'cuantitativo' }] }],
  });
  assert.equal((await repositories.evaluations.findById(evaluation._id))?.titulo, evaluation.titulo);
  assert.equal((await repositories.evaluations.listByOwner(user._id)).length, 1);

  const round = await repositories.rounds.insert({
    equipo: team._id, alcance: 'equipo', evaluacion: evaluation._id,
    activadoEn: new Date('2026-01-01T00:00:00.000Z'), estado: 'activa', cantidadEsperada: 1,
    modoRespuesta: 'anonima', minimoAnonimato: 1,
  });
  assert.equal((await repositories.rounds.findById(round._id))?._id, round._id);
  assert.equal((await repositories.rounds.listByTeamAndEvaluation(team._id, evaluation._id)).length, 1);

  const response = await repositories.responses.insert({ instanciaEvaluacion: round._id, respuestas: [{ indicadorId: 'indicador', valor: 5 }] });
  assert.equal((await repositories.responses.listByRound(round._id))[0]._id, response._id);
}
