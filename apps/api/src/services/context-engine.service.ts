import { featureRepository } from '../repositories/feature.repository';
import { toSafeTeamContext } from './privacy-transformer.service';

const MAX_ITEMS = 20;
const MAX_CHARS = Number(process.env.AI_MAX_CONTEXT_CHARS) || 32000; // Increased from 16000 for detailed context
const importancePriority: Record<string, number> = { critical: 30, relevant: 20, informative: 10 };
const influencePriority: Record<string, number> = { precondition: 30, action: 28, interpretation_and_action: 26, risk: 24, group_action: 22, interpretation: 15, do_not_act_directly: 8 };

export interface SelectedTeamContextItem {
  id: string;
  type: string;
  title: string;
  content: string;
  source?: string;
  status: string;
  confidence: number;
  version: number;
  importance: string;
  sensitivity: string;
  influence: string;
}

export interface TeamContextSelection {
  items: SelectedTeamContextItem[];
  itemIds: string[];
  omittedCount: number;
  characterCount: number;
}

export const selectContextCandidates = (candidates: Array<any>, now = new Date()): TeamContextSelection => {
  const eligible = candidates.filter(item =>
    (item.status === 'active' || item.status === 'review') &&
    (!item.validFrom || new Date(item.validFrom) <= now) &&
    (!item.validUntil || new Date(item.validUntil) >= now));
  eligible.sort((a, b) => ((importancePriority[b.importance] || 0) + (influencePriority[b.influence] || 0)) - ((importancePriority[a.importance] || 0) + (influencePriority[a.influence] || 0)) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const selected: SelectedTeamContextItem[] = [];
  let characterCount = 0;
  for (const item of eligible) {
    if (selected.length >= MAX_ITEMS) break;
    const projected = characterCount + item.title.length + item.content.length;
    if (projected > MAX_CHARS) continue;
    selected.push(toSafeTeamContext({ id: String(item._id || item.id), type: item.type, title: item.title, content: item.content, source: item.source, status: item.status, confidence: item.confidence, version: item.version, importance: item.importance || 'relevant', sensitivity: item.sensitivity || 'normal', influence: item.influence || 'interpretation_and_action' }));
    characterCount = projected;
  }
  return { items: selected, itemIds: selected.map(item => item.id), omittedCount: eligible.length - selected.length, characterCount };
};

/**
 * Compila contexto gobernado para una tarea concreta. No envía documentos
 * completos ni elementos obsoletos: el presupuesto es parte del contrato.
 */
export const selectTeamContext = async (teamId: string, now = new Date()): Promise<TeamContextSelection> => {
  const candidates = await featureRepository('teamContextItems').list({ teamId });
  return selectContextCandidates(candidates, now);
};
