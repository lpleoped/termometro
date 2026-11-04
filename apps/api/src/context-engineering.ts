import { createHash } from 'node:crypto';
import type { TeamClimateContext } from '@termometro/shared';

export interface RawQualitativeResponse { id: string; question: string; section: string; text: string; }

const PII = /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/\S+|\+?\d[\d\s().-]{7,}|\b(?:soy|me llamo|mi nombre es)\s+[\p{L}'-]+\b)/giu;

export const redactText = (text: string) => text.replace(PII, '[redactado]').replace(/\s+/g, ' ').trim();

export const buildContext = (input: {
  scope: TeamClimateContext['scope'];
  sample: TeamClimateContext['sample'];
  quantitative: TeamClimateContext['quantitative'];
  history?: TeamClimateContext['history'];
  qualitative?: RawQualitativeResponse[];
}): TeamClimateContext => {
  const responses = input.qualitative ?? [];
  const redacted = responses.map((response) => ({ ...response, text: redactText(response.text) }));
  const grouped = new Map<string, { texts: string[]; ids: string[] }>();
  for (const response of redacted) {
    const key = `${response.section}:${response.question}`;
    const group = grouped.get(key) ?? { texts: [], ids: [] };
    group.texts.push(response.text); group.ids.push(response.id); grouped.set(key, group);
  }
  const themes = [...grouped.entries()]
    .filter(([, group]) => group.texts.length >= 3)
    .map(([name, group]) => ({ name, frequency: group.texts.length, sentiment: 'neutral' as const, evidenceIds: group.ids }));
  const limitations = [
    ...(input.sample.received < 3 ? ['Muestra insuficiente para interpretación cualitativa agregada.'] : []),
    ...(responses.length !== themes.reduce((total, theme) => total + theme.frequency, 0) ? ['Se ocultaron grupos cualitativos con menos de 3 respuestas.'] : []),
  ];
  const context: TeamClimateContext = {
    schemaVersion: 'team-climate-context.v1', scope: input.scope, sample: input.sample,
    quantitative: input.quantitative, qualitative: { responsesAnalyzed: redacted.length, themes, redactions: responses.length - redacted.filter((item, index) => item.text === responses[index].text).length },
    history: input.history ?? [], limitations, sources: ['dashboard', 'responses', 'history'],
  };
  return context;
};

export const datasetHash = (context: TeamClimateContext) => createHash('sha256').update(JSON.stringify(context)).digest('hex');
