import { useState, type FormEvent } from 'react';
import type { AccionPlanResponse, EstadoAccion, HorizonteAccion, VeredictoAccion } from '@termometro/shared';
import api from '../../../services/api';
import { iaMessage } from '../../../services/iaSettingsService';

export const estadoLabel: Record<EstadoAccion, string> = { generada: 'Propuesta', en_revision: 'En revisión', aprobada: 'Aprobada', rechazada: 'Rechazada', ejecutada: 'Aplicada', verificada: 'Verificada' };
const etiquetaVeredicto: Record<VeredictoAccion, string> = {
  sin_medicion_posterior: 'sin medición posterior',
  todavia_es_pronto: 'todavía es pronto',
  hay_una_senal: 'hay una señal de mejora',
  no_se_movio: 'no se movió',
  se_movio_en_contra: 'se movió en contra',
};
const transitions: Record<EstadoAccion, Array<[EstadoAccion, string]>> = {
  generada: [['en_revision', 'Pasar a revisión']], en_revision: [['aprobada', 'Aprobar'], ['rechazada', 'Rechazar']],
  aprobada: [['ejecutada', 'Marcar como aplicada']], rechazada: [['en_revision', 'Reabrir revisión']], ejecutada: [['verificada', 'Verificar resultado']], verificada: [],
};

export default function SeguimientoAccion({ accion, onChange, onAdapt, readOnly = false, ronda, publicar }: {
  accion: AccionPlanResponse; onChange?: (action: AccionPlanResponse) => void; onAdapt?: (action: AccionPlanResponse) => void; readOnly?: boolean;
  ronda?: string;
  publicar?: { canalId?: string; tareasId?: string };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nota, setNota] = useState('');
  const [horizonte, setHorizonte] = useState<HorizonteAccion>('7d');
  const [anterior, setAnterior] = useState('');
  const [posterior, setPosterior] = useState('');
  const update = async (path: string, body: unknown) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await api.patch<AccionPlanResponse>(`/acciones/${accion._id}/${path}`, body);
      onChange?.(response.data); setNota(''); setAnterior(''); setPosterior('');
    } catch (cause) { setError(iaMessage(cause)); }
    finally { setBusy(false); }
  };
  const saveCheckIn = (event: FormEvent) => {
    event.preventDefault();
    void update('checkins', { horizonte, nota, ...(anterior !== '' && posterior !== '' ? { resultado: { indiceAnterior: Number(anterior), indicePosterior: Number(posterior), interpretacion: nota } } : {}) });
  };
  const publicarEn = async (connectionId: string) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await api.post<{ provider: 'slack' | 'monday'; externalId?: string; url?: string; status: 'published' | 'error'; error?: string; publishedAt: string }>(`/acciones/${accion._id}/publicar`, { connectionId });
      onChange?.({ ...accion, integraciones: [...(accion.integraciones || []), response.data] });
    } catch (cause) { setError(iaMessage(cause)); }
    finally { setBusy(false); }
  };
  const pendientes = (accion.checkIns || []).filter(item => item.estado === 'pendiente');
  const puedeVerificar = accion.checkIns?.some(item => item.estado === 'completado' && item.nota);
  const proximos = accion.estado ? transitions[accion.estado] : [];
  const [siguiente, ...resto] = proximos;
  return <article className="border rounded p-3">
    <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{accion.descripcion}</p>
    {!readOnly && siguiente && (
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <button type="button" className="btn btn-sm btn-primary" disabled={busy || (siguiente[0] === 'verificada' && !puedeVerificar)} onClick={() => update('estado', { estado: siguiente[0] })}>{siguiente[1]}</button>
        {resto.map(([state, label]) => <button key={state} type="button" className="btn btn-sm btn-outline-secondary" disabled={busy || (state === 'verificada' && !puedeVerificar)} onClick={() => update('estado', { estado: state })}>{label}</button>)}
      </div>
    )}
    {error && <p className="alert alert-danger mt-2" role="alert">{error}</p>}
    <details className="mt-3">
      <summary>Ver el seguimiento</summary>
      <div className="mt-3">
        <p className="small text-muted mb-1">{accion.estado ? estadoLabel[accion.estado] : 'Sin estado'}{ronda ? ` · ${ronda}` : ''}</p>
        <p className="small mb-1"><strong>Responsable:</strong> {accion.ownerRole || 'Sin registrar'} · <strong>Plazo:</strong> {accion.horizon?.replace('d', ' días') || 'Sin registrar'}</p>
        <p className="small mb-1"><strong>Métrica:</strong> {accion.successMetric || 'Sin registrar'}</p>
        <p className="small"><strong>Seguimiento:</strong> {accion.checkInQuestion || 'Sin registrar'}</p>
        {accion.ejecutadaEn && <p className="small">Aplicada el {new Date(accion.ejecutadaEn).toLocaleDateString('es-UY')}</p>}
        {accion.propuestaOriginal && <p className="small">{accion.adaptadaDe ? 'Acción anterior: ' : 'Propuesta original: '}{accion.propuestaOriginal}</p>}
        {!!accion.checkIns?.length && <ul className="small">{accion.checkIns.map(item => <li key={item.horizonte}>{item.horizonte.replace('d', ' días')} · {item.estado === 'completado' ? 'Registrado' : `Pendiente · ${new Date(item.venceEn).toLocaleDateString('es-UY')}`}{item.nota && <p>{item.nota}</p>}</li>)}</ul>}
        {!!accion.veredictos?.length && <ul className="small">{accion.veredictos.map(item => <li key={item.indicadorId}><strong>{item.texto || item.indicadorId}</strong> · al adoptarla {typeof item.valorAdopcion === 'number' ? `${item.valorAdopcion} / 100` : 'sin medición'} · después {typeof item.valorPosterior === 'number' ? `${item.valorPosterior} / 100` : 'sin medición'} · {etiquetaVeredicto[item.veredicto]}</li>)}</ul>}
        {!!accion.veredictos?.length && <p className="small text-muted">El veredicto es un indicio. No reemplaza la nota del seguimiento.</p>}
        {accion.resultado && <p className="small">Resultado registrado: {accion.resultado.indiceAnterior ?? '—'} → {accion.resultado.indicePosterior ?? '—'} / 100. {accion.resultado.delta !== undefined && `Cambio: ${accion.resultado.delta > 0 ? '+' : ''}${accion.resultado.delta} puntos.`} El cambio no prueba causalidad.</p>}
        {!readOnly && <>
          {onAdapt && <button className="btn btn-sm btn-outline-secondary" type="button" disabled={busy} onClick={() => onAdapt(accion)}>Ajustar como nueva</button>}
          {['aprobada', 'ejecutada', 'verificada'].includes(accion.estado || '') && (publicar?.canalId || publicar?.tareasId) && <div className="d-flex flex-wrap gap-2 mt-2">
            {publicar.canalId && !(accion.integraciones || []).some(item => item.provider === 'slack' && item.status === 'published') && <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => void publicarEn(publicar.canalId!)}>Compartir en el canal</button>}
            {publicar.tareasId && !(accion.integraciones || []).some(item => item.provider === 'monday' && item.status === 'published') && <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => void publicarEn(publicar.tareasId!)}>Crear la tarea</button>}
          </div>}
          {(accion.integraciones || []).filter(item => item.status === 'published').map(item => <p className="small mb-0 mt-2" key={item.provider}>{item.provider === 'slack' ? 'Compartida en el canal' : 'Tarea creada'}{item.url ? <> · <a href={item.url} target="_blank" rel="noreferrer">ver enlace</a></> : null}</p>)}
          {accion.estado === 'ejecutada' && !puedeVerificar && <p className="small text-muted mt-2">Registrá un seguimiento antes de verificar el resultado.</p>}
          {['ejecutada', 'verificada'].includes(accion.estado || '') && pendientes.length > 0 && (
            <form className="mt-3" onSubmit={saveCheckIn}>
              <label className="form-label d-block">Momento del seguimiento<select className="form-select" value={pendientes.some(item => item.horizonte === horizonte) ? horizonte : ''} onChange={e => setHorizonte(e.target.value as HorizonteAccion)} required><option value="" disabled>Seleccioná el seguimiento</option>{pendientes.map(item => <option key={item.horizonte} value={item.horizonte}>{item.horizonte.replace('d', ' días')}</option>)}</select></label>
              <label className="form-label d-block">Qué se aplicó, qué observaron y qué ajustarían<textarea className="form-control" value={nota} onChange={e => setNota(e.target.value)} required maxLength={2000} rows={3} /></label>
              <p className="small text-muted">Opcional: registrá índices comparables antes y después. La nota puede describir otras métricas.</p>
              <div className="row g-2"><label className="col-sm-6 form-label">Índice anterior<input className="form-control" type="number" min={0} max={100} step="any" value={anterior} required={posterior !== ''} onChange={e => setAnterior(e.target.value)} /></label><label className="col-sm-6 form-label">Índice posterior<input className="form-control" type="number" min={0} max={100} step="any" value={posterior} required={anterior !== ''} onChange={e => setPosterior(e.target.value)} /></label></div>
              <button className="btn btn-outline-primary btn-sm" disabled={busy || !nota.trim() || !pendientes.some(item => item.horizonte === horizonte)}>Guardar seguimiento</button>
            </form>
          )}
        </>}
      </div>
    </details>
  </article>;
}
