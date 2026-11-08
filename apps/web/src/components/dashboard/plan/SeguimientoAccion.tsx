import { useState, type FormEvent } from 'react';
import type { AccionPlanResponse, EstadoAccion, HorizonteAccion } from '@termometro/shared';
import api from '../../../services/api';
import { iaMessage } from '../../../services/iaSettingsService';

export const estadoLabel: Record<EstadoAccion, string> = { generada: 'Propuesta', en_revision: 'En revisión', aprobada: 'Aprobada', rechazada: 'Rechazada', ejecutada: 'Aplicada', verificada: 'Verificada' };
const transitions: Record<EstadoAccion, Array<[EstadoAccion, string]>> = {
  generada: [['en_revision', 'Pasar a revisión']], en_revision: [['aprobada', 'Aprobar'], ['rechazada', 'Rechazar']],
  aprobada: [['ejecutada', 'Marcar como aplicada']], rechazada: [['en_revision', 'Reabrir revisión']], ejecutada: [['verificada', 'Verificar resultado']], verificada: [],
};

export default function SeguimientoAccion({ accion, onChange, onAdapt, readOnly = false }: {
  accion: AccionPlanResponse; onChange?: (action: AccionPlanResponse) => void; onAdapt?: (action: AccionPlanResponse) => void; readOnly?: boolean;
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
  const pendientes = (accion.checkIns || []).filter(item => item.estado === 'pendiente');
  const puedeVerificar = accion.checkIns?.some(item => item.estado === 'completado' && item.nota);
  return <article className="border rounded p-3">
    <div className="d-flex justify-content-between gap-2"><strong>{accion.estado ? estadoLabel[accion.estado] : 'Sin estado registrado'}</strong><small>{new Date(accion.creadaEn).toLocaleDateString('es-UY')}</small></div>
    <p className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>{accion.descripcion}</p>
    <p className="small mb-1"><strong>Responsable:</strong> {accion.ownerRole || 'Sin registrar'} · <strong>Plazo:</strong> {accion.horizon?.replace('d', ' días') || 'Sin registrar'}</p>
    <p className="small mb-1"><strong>Métrica:</strong> {accion.successMetric || 'Sin registrar'}</p>
    <p className="small"><strong>Seguimiento:</strong> {accion.checkInQuestion || 'Sin registrar'}</p>
    {accion.ejecutadaEn && <p className="small">Aplicada el {new Date(accion.ejecutadaEn).toLocaleDateString('es-UY')}</p>}
    {accion.propuestaOriginal && <details className="mb-3"><summary>{accion.adaptadaDe ? 'Ver acción anterior que se ajustó' : 'Ver propuesta original de IA'}</summary><p className="mt-2">{accion.propuestaOriginal}</p></details>}
    {!!accion.checkIns?.length && <ul className="small">{accion.checkIns.map(item => <li key={item.horizonte}>{item.horizonte.replace('d', ' días')} · {item.estado === 'completado' ? 'Registrado' : `Pendiente · ${new Date(item.venceEn).toLocaleDateString('es-UY')}`}{item.nota && <p>{item.nota}</p>}</li>)}</ul>}
    {accion.resultado && <p className="small">Resultado registrado: {accion.resultado.indiceAnterior ?? '—'} → {accion.resultado.indicePosterior ?? '—'} / 100. {accion.resultado.delta !== undefined && `Cambio: ${accion.resultado.delta > 0 ? '+' : ''}${accion.resultado.delta} puntos.`} El cambio no prueba causalidad.</p>}
    {error && <p className="alert alert-danger" role="alert">{error}</p>}
    {!readOnly && <>
      <div className="d-flex flex-wrap gap-2">{(accion.estado ? transitions[accion.estado] : []).map(([state, label]) => <button key={state} type="button" className="btn btn-sm btn-outline-primary" disabled={busy || (state === 'verificada' && !puedeVerificar)} onClick={() => update('estado', { estado: state })}>{label}</button>)}
        {onAdapt && <button className="btn btn-sm btn-outline-secondary" type="button" disabled={busy} onClick={() => onAdapt(accion)}>Ajustar como nueva acción</button>}
      </div>
      {accion.estado === 'ejecutada' && !puedeVerificar && <p className="small text-muted mt-2">Registrá un seguimiento antes de verificar el resultado.</p>}
      {['ejecutada', 'verificada'].includes(accion.estado || '') && pendientes.length > 0 && <details className="mt-3"><summary>Registrar seguimiento y aprendizaje</summary>
        <form className="mt-3" onSubmit={saveCheckIn}>
          <label className="form-label d-block">Momento del seguimiento<select className="form-select" value={pendientes.some(item => item.horizonte === horizonte) ? horizonte : ''} onChange={e => setHorizonte(e.target.value as HorizonteAccion)} required><option value="" disabled>Seleccioná el seguimiento</option>{pendientes.map(item => <option key={item.horizonte} value={item.horizonte}>{item.horizonte.replace('d', ' días')}</option>)}</select></label>
          <label className="form-label d-block">Qué se aplicó, qué observaron y qué ajustarían<textarea className="form-control" value={nota} onChange={e => setNota(e.target.value)} required maxLength={2000} rows={3} /></label>
          <p className="small text-muted">Opcional: registrá índices comparables antes y después. La nota puede describir otras métricas.</p>
          <div className="row g-2"><label className="col-sm-6 form-label">Índice anterior<input className="form-control" type="number" min={0} max={100} step="any" value={anterior} required={posterior !== ''} onChange={e => setAnterior(e.target.value)} /></label><label className="col-sm-6 form-label">Índice posterior<input className="form-control" type="number" min={0} max={100} step="any" value={posterior} required={anterior !== ''} onChange={e => setPosterior(e.target.value)} /></label></div>
          <button className="btn btn-primary btn-sm" disabled={busy || !nota.trim() || !pendientes.some(item => item.horizonte === horizonte)}>Guardar seguimiento</button>
        </form>
      </details>}
    </>}
  </article>;
}
