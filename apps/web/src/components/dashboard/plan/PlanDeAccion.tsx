import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { AccionPlanInput, AccionPlanResponse, AIAnalysisResponse, ContextualAction, HorizonteAccion } from '@termometro/shared';
import api from '../../../services/api';
import { iaMessage } from '../../../services/iaSettingsService';
import SeguimientoAccion from './SeguimientoAccion';

const empty = { descripcion: '', ownerRole: '', horizon: '30d' as HorizonteAccion, successMetric: '', checkInQuestion: '' };

export default function PlanDeAccion({ instanciaId, indice }: { instanciaId: string; indice: number }) {
  const [acciones, setAcciones] = useState<AccionPlanResponse[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [draft, setDraft] = useState<Omit<AccionPlanInput, 'instanciaId'>>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const description = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setReadError('');
    Promise.all([api.get<AccionPlanResponse[]>('/acciones', { params: { instanciaId } }), api.get<AIAnalysisResponse[]>('/ai/analyses', { params: { instanciaId } })])
      .then(([actions, analyses]) => { if (!cancelled) { setAcciones(actions.data); setAnalysis(analyses.data[0] || null); } })
      .catch(cause => { if (!cancelled) setReadError(iaMessage(cause)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [instanciaId, retry]);

  const useProposal = (proposal: ContextualAction, index: number) => {
    setDraft({ descripcion: proposal.descripcion, ownerRole: proposal.ownerRole, horizon: proposal.horizon, successMetric: proposal.successMetric, checkInQuestion: proposal.checkInQuestion, evidenciaIds: proposal.evidenceIds, analisisId: analysis?.id, propuestaIndice: index });
    setSaved(false); setError(''); description.current?.focus();
  };
  const adapt = (action: AccionPlanResponse) => {
    setDraft({ descripcion: action.descripcion, ownerRole: action.ownerRole || '', horizon: action.horizon || '30d', successMetric: action.successMetric || '', checkInQuestion: action.checkInQuestion || '', adaptadaDe: action._id });
    setSaved(false); setError(''); description.current?.focus();
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setSaved(false);
    try {
      const response = await api.post<AccionPlanResponse>('/acciones', { ...draft, instanciaId });
      setAcciones(prev => [response.data, ...prev]); setDraft(empty); setSaved(true);
    } catch (cause) { setError(iaMessage(cause)); }
    finally { setBusy(false); }
  };
  const change = (field: keyof typeof empty, value: string) => { setDraft(prev => ({ ...prev, [field]: value })); setSaved(false); };

  return <section className="action-plan mt-4" aria-labelledby="titulo-accion">
    <h3 id="titulo-accion" className="h5 fw-bold">Plan de acción y seguimiento</h3>
    <p className="text-muted">Índice actual: {indice} / 100. Registrá lo propuesto, lo aplicado y lo aprendido para orientar las próximas decisiones.</p>
    {loading && <p role="status">Leyendo acciones y propuestas…</p>}
    {readError && <div className="alert alert-danger" role="alert">{readError} <button className="btn btn-sm btn-outline-danger" onClick={() => setRetry(value => value + 1)}>Reintentar lectura</button></div>}
    {!!analysis?.accionesContextuales?.length && <details className="mb-4"><summary className="fw-semibold">Propuestas del último análisis de IA ({analysis.accionesContextuales.length})</summary>
      <div className="d-grid gap-3 mt-3">{analysis.accionesContextuales.map((proposal, index) => <article className="border rounded p-3" key={index}>
        <h4 className="h6">{proposal.titulo}</h4><p>{proposal.descripcion}</p>
        <p className="small">Responsable: {proposal.ownerRole} · Plazo: {proposal.horizon.replace('d', ' días')} · Métrica: {proposal.successMetric}</p>
        <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => useProposal(proposal, index)}>Revisar y usar en el plan</button>
      </article>)}</div>
    </details>}
    {!!acciones.length && <div className="d-grid gap-3 mb-4">{acciones.map(action => <SeguimientoAccion key={action._id} accion={action} onAdapt={adapt} onChange={updated => setAcciones(prev => prev.map(item => item._id === updated._id ? updated : item))} />)}</div>}
    <form onSubmit={save}>
      <h4 className="h6">{draft.adaptadaDe ? 'Ajustar una acción conservando su antecedente' : 'Registrar una acción'}</h4>
      {(draft.analisisId || draft.adaptadaDe) && <p className="small">Podés ajustar todos los campos. Se conserva el vínculo y el texto original para comparar qué cambió. <button type="button" className="btn btn-link btn-sm" disabled={busy} onClick={() => setDraft(empty)}>Empezar sin antecedente</button></p>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {saved && <p className="text-success" role="status">La acción quedó guardada como propuesta. Pasala a revisión cuando esté lista.</p>}
      <fieldset disabled={busy}>
        <label className="form-label d-block">Qué van a hacer<textarea ref={description} className="form-control" rows={3} required maxLength={4000} value={draft.descripcion} onChange={e => change('descripcion', e.target.value)} /></label>
        <div className="row g-3"><label className="col-md-8 form-label">Responsable (rol)<input className="form-control" required maxLength={200} value={draft.ownerRole} onChange={e => change('ownerRole', e.target.value)} placeholder="Por ejemplo: facilitador del equipo" /></label>
          <label className="col-md-4 form-label">Plazo<select className="form-select" value={draft.horizon} onChange={e => change('horizon', e.target.value)}><option value="7d">7 días</option><option value="30d">30 días</option><option value="90d">90 días</option></select></label></div>
        <label className="form-label d-block">Cómo van a medir el resultado<input className="form-control" required maxLength={500} value={draft.successMetric} onChange={e => change('successMetric', e.target.value)} /></label>
        <label className="form-label d-block">Pregunta para el seguimiento<input className="form-control" required maxLength={500} value={draft.checkInQuestion} onChange={e => change('checkInQuestion', e.target.value)} /></label>
        <button className="btn btn-primary" disabled={!draft.descripcion.trim() || !draft.ownerRole.trim() || !draft.successMetric.trim() || !draft.checkInQuestion.trim()}>{busy ? 'Guardando…' : 'Guardar la acción'}</button>
      </fieldset>
    </form>
  </section>;
}
