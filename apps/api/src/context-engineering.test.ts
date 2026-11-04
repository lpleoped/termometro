import { buildContext, datasetHash, redactText } from './context-engineering';

const base = { scope: { equipoId: 'e1', instanciaId: 'i1', evaluacionId: 'v1', periodo: '2026-Q4' }, sample: { expected: 4, received: 4, participation: 1 }, quantitative: { globalIndex: 62, sections: [], indicators: [] } };

if (redactText('Contactame en ana@example.com o https://example.com') !== 'Contactame en [redactado] o [redactado]') throw new Error('PII no redactada');
const context = buildContext({ ...base, qualitative: [1, 2, 3].map((n) => ({ id: `r${n}`, question: 'q', section: 's', text: 'Necesitamos más claridad' })) });
if (context.qualitative.themes.length !== 1 || context.qualitative.themes[0].frequency !== 3) throw new Error('Agrupación incorrecta');
if (datasetHash(context).length !== 64 || datasetHash(context) !== datasetHash(context)) throw new Error('Hash no reproducible');
