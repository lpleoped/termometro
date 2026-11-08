import { buildContext, datasetHash, redactText } from './context-engineering';

const base = { scope: { equipoId: 'e1', instanciaId: 'i1', evaluacionId: 'v1', periodo: '2026-Q4' }, sample: { expected: 4, received: 4, participation: 1 }, quantitative: { globalIndex: 62, sections: [], indicators: [] } };

if (redactText('Contactame en ana@example.com o https://example.com') !== 'Contactame en [redactado] o [redactado]') throw new Error('PII no redactada');
const smallGroup = buildContext({ ...base, qualitative: [1, 2].map((n) => ({ id: `small-${n}`, question: 'q', section: 's', text: `respuesta ${n}` })) });
if (smallGroup.qualitative.themes.length !== 0 || !smallGroup.limitations.some(item => item.includes('ocultaron'))) throw new Error('Grupo pequeno expuesto');
const missing = buildContext({ ...base, quantitative: { globalIndex: 0, sections: [{ id: 's1', name: 'S', score: null, weight: 100, n: 0 }], indicators: [{ id: 'i1', name: 'I', score: null, n: 0 }] } });
if (missing.quantitative.indicators[0].score !== null || missing.quantitative.indicators[0].n !== 0) throw new Error('Dato faltante convertido en cero');
if (missing.quantitative.sections[0].score !== null || missing.quantitative.sections[0].n !== 0) throw new Error('SecciÃ³n sin datos convertida en cero');
const protectedContext = buildContext({ ...base, sample: { expected: 5, received: 2, participation: 0.4 }, qualitative: [], qualitativeSuppressedReason: 'protected' });
if (protectedContext.qualitative.themes.length !== 0 || !protectedContext.limitations.includes('protected')) throw new Error('Ronda protegida sin limitacion');
const context = buildContext({ ...base, qualitative: [1, 2, 3].map((n) => ({ id: `r${n}`, question: 'q', section: 's', text: 'Necesitamos más claridad' })) });
if (context.qualitative.themes.length !== 1 || context.qualitative.themes[0].frequency !== 3) throw new Error('Agrupación incorrecta');
if (datasetHash(context).length !== 64 || datasetHash(context) !== datasetHash(context)) throw new Error('Hash no reproducible');
