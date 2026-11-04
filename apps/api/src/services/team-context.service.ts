import { TeamContextItem } from '../models/TeamContextItem';
import { Equipo } from '../models/Equipo';

export type TeamContextChanges = { type?: string; title?: string; content?: string; source?: string; scope?: string; status?: string; confidence?: number; validFrom?: Date; validUntil?: Date };
const ownsTeam = async (teamId: string, userId: string) => !!await Equipo.exists({ _id: teamId, creadoPor: userId, activo: { $ne: false } });

export const listTeamContext = async (teamId: string, userId: string) => {
  if (!await ownsTeam(teamId, userId)) return null;
  return TeamContextItem.find({ teamId }).sort({ status: 1, updatedAt: -1 }).lean();
};
export const createTeamContext = async (teamId: string, userId: string, input: TeamContextChanges) => {
  if (!await ownsTeam(teamId, userId)) return null;
  return new TeamContextItem({ ...input, teamId, createdBy: userId, updatedBy: userId }).save();
};
export const updateTeamContext = async (teamId: string, itemId: string, userId: string, changes: TeamContextChanges) => {
  if (!await ownsTeam(teamId, userId)) return null;
  return TeamContextItem.findOneAndUpdate({ _id: itemId, teamId }, { $set: { ...changes, updatedBy: userId }, $inc: { version: 1 } }, { new: true, runValidators: true }).lean();
};
export const deleteTeamContext = async (teamId: string, itemId: string, userId: string) => {
  if (!await ownsTeam(teamId, userId)) return null;
  return TeamContextItem.findOneAndUpdate({ _id: itemId, teamId }, { $set: { status: 'obsolete', updatedBy: userId }, $inc: { version: 1 } }, { new: true }).lean();
};
