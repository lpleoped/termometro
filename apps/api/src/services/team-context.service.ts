import type { TeamContextInput } from '@termometro/shared';
import { teamRepository } from '../repositories/team.repository';
import { featureRepository } from '../repositories/feature.repository';
import { newFeature, validateFeature } from '../domain/feature-validation';
export type TeamContextChanges = Partial<TeamContextInput>;
const ownsTeam = (teamId: string, userId: string) => teamRepository().findOwnedActive(teamId, userId);
const fields = (input: TeamContextChanges) => Object.fromEntries(
  ['type','title','content','source','scope','status','confidence','validFrom','validUntil','importance','sensitivity','influence']
    .filter(key => (input as any)[key] !== undefined).map(key => [key, (input as any)[key]]));
export const listTeamContext = async (teamId: string, userId: string) => {
  if (!await ownsTeam(teamId, userId)) return null;
  return featureRepository('teamContextItems').list({ teamId }, { status: 1, updatedAt: -1 });
};
export const createTeamContext = async (teamId: string, userId: string, input: TeamContextChanges) => {
  if (!await ownsTeam(teamId, userId)) return null;
  return featureRepository('teamContextItems').insert(newFeature('teamContextItems', { ...fields(input), teamId, createdBy: userId, updatedBy: userId }));
};
export const updateTeamContext = async (teamId: string, itemId: string, userId: string, changes: TeamContextChanges) => {
  if (!await ownsTeam(teamId, userId)) return null;
  const repository = featureRepository('teamContextItems');
  const previous = await repository.find({ _id: itemId, teamId });
  if (!previous) return null;
  const record = { ...previous, ...fields(changes), updatedBy: userId, updatedAt: new Date(), version: previous.version + 1 };
  validateFeature('teamContextItems', record);
  return repository.save(record);
};
export const deleteTeamContext = (teamId: string, itemId: string, userId: string) =>
  updateTeamContext(teamId, itemId, userId, { status: 'obsolete' });
