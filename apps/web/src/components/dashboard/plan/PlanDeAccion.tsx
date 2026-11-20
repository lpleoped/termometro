import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AccionPlanInput, AccionPlanResponse, HorizonteAccion } from '@termometro/shared';
import api from '../../../services/api';
import { iaMessage } from '../../../services/iaSettingsService';
import SeguimientoAccion from './SeguimientoAccion';

const empty = { descripcion: '', ownerRole: '', horizon: '30d' as HorizonteAccion, successMetric: '', checkInQuestion: '' };

export default function PlanDeAccion({ instanciaId, indice, mostrarPropuestas = true }: { instanciaId: string; indice: number | null; mostrarPropuestas?: boolean }) {
  const [acciones, setAcciones] = useState<AccionPlanResponse[]>([]);
  const [draft, setDraft] = useState<Omit<AccionPlanInput, 'instanciaId'>>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const [publicar, setPublicar] = useState<{ canalId?: string; tareasId?: string }>({});
  const description = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setReadError('');
    api.get<AccionPlanResponse[]>('/acciones', { params: { instanciaId } })
      .then((actions) => { if (!cancelled) setAcciones(actions.data); })
      .catch(cause => { if (!cancelled) setReadError(iaMessage(cause)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    api.get<{ equipoId?: string }>(`/instancias/${instanciaId}`).then((instancia) => {
      const equipoId = typeof instancia.data.equipoId === 'string' ? instancia.data.equipoId : '';
      if (!equipoId || cancelled) return null;
      return api.get<{ slackConnectionId?: string; mondayConnectionId?: string }>(`/equipos/${equipoId}/integraciones`);
    }).then((ajustes) => {
      if (!cancelled && ajustes) setPublicar({ canalId: ajustes.data.slackConnectionId, tareasId: ajustes.data.mondayConnectionId });
    }).catch(() => { if (!cancelled) setPublicar({}); });
    return () => { cancelled = true; };
  }, [instanciaId, retry]);

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
    <p className="text-muted">{indice == null ? 'Esta ronda todavía no tiene índice.' : `Índice de esta ronda: ${indice} / 100.`} Registrá lo aplicado y lo aprendido para orientar las próximas decisiones.</p>
    {loading && <p role="status">Leyendo las acciones…</p>}
    {readError && <div className="alert alert-danger" role="alert">{readError} <button className="btn btn-sm btn-outline-danger" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>}
    {mostrarPropuestas && <p className="mb-4">Las propuestas y las acciones de otras rondas están en Accionables. <Link className="btn btn-sm estado-atajo ms-2" to={`/backoffice/accionables?instanciaId=${instanciaId}`}>Ir a accionables</Link></p>}
    {!!acciones.length && <div className="d-grid gap-3 mb-4">{acciones.map(action => <SeguimientoAccion key={action._id} accion={action} publicar={publicar} onAdapt={adapt} onChange={updated => setAcciones(prev => prev.map(item => item._id === updated._id ? updated : item))} />)}</div>}
    <form onSubmit={save}>
      <h4 className="h6">{draft.adaptadaDe ? 'Ajustar una acción conservando su antecedente' : 'Registrar una acción'}</h4>
      {(draft.analisisId || draft.adaptadaDe) && <p className="small">Podés ajustar todos los campos. Se conserva el vínculo y el texto original para comparar qué cambió. <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy} onClick={() => setDraft(empty)}>Empezar sin antecedente</button></p>}
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
