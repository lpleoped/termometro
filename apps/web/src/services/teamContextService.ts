import type { TeamContextInput, TeamContextItem } from '@termometro/shared';
import api from './api';

export const getTeamContext = async (teamId: string) => (await api.get<TeamContextItem[]>(`/equipos/${teamId}/contexto`)).data;
export const createTeamContext = async (teamId: string, input: TeamContextInput) => (await api.post<TeamContextItem>(`/equipos/${teamId}/contexto`, input)).data;
export const updateTeamContext = async (teamId: string, itemId: string, input: Partial<TeamContextInput>) => (await api.patch<TeamContextItem>(`/equipos/${teamId}/contexto/${itemId}`, input)).data;
export const archiveTeamContext = async (teamId: string, itemId: string) => (await api.delete<TeamContextItem>(`/equipos/${teamId}/contexto/${itemId}`)).data;
