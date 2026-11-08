import { featureRepository } from './feature.repository';
export interface HistoryAttachments { analyses: any[]; actions: any[]; }
export interface HistoryAttachmentsRepository {
  list(userId: string | undefined, teamId: string, evaluationId: string, roundIds: string[]): Promise<HistoryAttachments>;
}
export const historyAttachmentsRepository = (): HistoryAttachmentsRepository => ({
  async list(userId, equipoId, evaluacionId, roundIds) {
    if (!userId || !roundIds.length) return { analyses: [], actions: [] };
    const [analyses, actions] = await Promise.all([
      featureRepository('aiAnalyses').list({ userId, equipoId, evaluacionId, instanciaId: roundIds }, { creadoEn: 1, _id: 1 }),
      featureRepository('accionesPlan').list({ instanciaEvaluacion: roundIds }, { creadaEn: 1, _id: 1 }),
    ]);
    return { analyses, actions };
  },
});
