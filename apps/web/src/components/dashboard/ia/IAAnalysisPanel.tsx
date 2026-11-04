import { FormEvent, useEffect, useState } from 'react';
import useIA, { AIProvider, AIProviderInput } from '../../../hooks/useIA';
import { getInstanciaById } from '../../../services/instanciaService';

interface Props { instanciaId: string; }

const idDe = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const item = value as { id?: unknown; _id?: unknown };
    return String(item.id || item._id || '');
  }
  return '';
};

const initialForm: AIProviderInput = {
  name: '', kind: 'openai-compatible', endpoint: 'https://api.openai.com/v1', model: '', apiKey: '',
};

const IAAnalysisPanel = ({ instanciaId }: Props) => {
  const { loading, error, analysis, generateAnalysis, listProviders, saveProvider, testProvider } = useIA();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [providerId, setProviderId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [showConfig, setShowConfig] = useState(false);
  const [message, setMessage] = useState('');
  const [ids, setIds] = useState({ equipoId: '', evaluacionId: '' });
  const proveedorSeleccionado = providers.find((item) => item.id === providerId);

  useEffect(() => {
    listProviders().then((items) => {
      setProviders(items);
      if (items[0]) setProviderId(items[0].id);
    }).catch(() => setMessage('No se pudieron cargar los proveedores configurados.'));
    getInstanciaById(instanciaId).then((item) => setIds({
      equipoId: idDe(item?.equipoId), evaluacionId: idDe(item?.evaluacionId),
    })).catch(() => setMessage('No se pudo resolver el contexto de la ronda.'));
  }, [instanciaId, listProviders]);

  const guardarProveedor = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      const saved = await saveProvider(form);
      setProviders((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setProviderId(saved.id);
      setForm(initialForm);
      setShowConfig(false);
      setMessage('Proveedor guardado. Podés probarlo antes de generar el análisis.');
    } catch { setMessage('No se pudo guardar el proveedor. Revisá los datos.'); }
  };

  const probar = async () => {
    if (!providerId) return;
    try {
      const tested = await testProvider(providerId);
      setProviders((current) => current.map((item) => item.id === tested.id ? tested : item));
      setMessage('Conexión verificada correctamente.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo verificar la conexión con el proveedor.'); }
  };

  const analizar = async () => {
    if (!providerId || !ids.equipoId || !ids.evaluacionId) return;
    setMessage('');
    try { await generateAnalysis({ providerId, instanciaId, ...ids, includeHistorico: true }); }
    catch { /* el hook expone el error */ }
  };

  return (
    <section className="card border-0 shadow-sm mt-4 p-4" aria-labelledby="titulo-ia">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div>
          <p className="evaluation-eyebrow mb-1">Análisis asistido</p>
          <h3 id="titulo-ia" className="h5 mb-1">Interpretar este termómetro con IA</h3>
          <p className="text-muted mb-0">La IA usa los indicadores calculados y el histórico. Revisá sus sugerencias antes de convertirlas en acciones.</p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowConfig((value) => !value)}>
          {showConfig ? 'Cerrar configuración' : 'Configurar proveedor'}
        </button>
      </div>

      {showConfig && <form className="row g-2 mt-3" onSubmit={guardarProveedor}>
        <div className="col-md-4"><label className="form-label" htmlFor="ia-name">Nombre</label><input id="ia-name" className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="ia-endpoint">URL base del proveedor</label><input id="ia-endpoint" type="url" className="form-control" required value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} /><div className="form-text">Ej.: https://api.openai.com/v1. No agregues /models ni /chat/completions.</div></div>
        <div className="col-md-4"><label className="form-label" htmlFor="ia-model">Modelo</label><input id="ia-model" className="form-control" required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
        <div className="col-md-8"><label className="form-label" htmlFor="ia-key">API key <span className="text-muted">(no se muestra luego)</span></label><input id="ia-key" type="password" className="form-control" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></div>
        <div className="col-md-4 d-flex align-items-end"><button className="btn btn-primary w-100" type="submit">Guardar proveedor</button></div>
      </form>}

      {message && <div className="alert alert-info mt-3 mb-0" role="status">{message}</div>}
      {error && <div className="alert alert-danger mt-3 mb-0" role="alert"><strong>No pudimos completar el análisis.</strong><div className="small mt-1">{error}</div><button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={analizar} disabled={!providerId || loading}>Reintentar</button></div>}
      {!providers.length && !showConfig && <div className="alert alert-light border mt-3 mb-0"><strong>Configurá un proveedor para empezar.</strong><p className="small mb-2 mt-1">La conexión se guarda de forma segura y podés probarla antes de enviar datos.</p><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowConfig(true)}>Configurar proveedor</button></div>}
      <div className="d-flex flex-wrap gap-2 align-items-end mt-3">
        <div className="flex-grow-1"><label className="form-label" htmlFor="ia-provider">Proveedor</label><select id="ia-provider" className="form-select" value={providerId} onChange={(e) => setProviderId(e.target.value)}><option value="">Elegí un proveedor</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.model} ({item.status})</option>)}</select></div>
        <button type="button" className="btn btn-outline-secondary" disabled={!providerId} onClick={probar}>Probar conexión</button>
        <button type="button" className="btn btn-primary" disabled={!providerId || loading || !ids.equipoId} onClick={analizar}>{loading ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Analizando señales…</> : 'Generar análisis'}</button>
      </div>
      {proveedorSeleccionado && <p className="small text-muted mt-2 mb-0">Se enviarán indicadores agregados e histórico a <strong>{proveedorSeleccionado.name}</strong>. Revisá el resultado antes de convertirlo en una acción.</p>}
      {loading && <div className="progress mt-3" role="progressbar" aria-label="Generando análisis"><div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '65%' }} /></div>}
      {analysis && <div className="mt-4 ai-result" aria-live="polite">
        {analysis.needsHumanReview && <div className="alert alert-warning"><strong>Revisión humana recomendada.</strong> La muestra, la confianza o las señales requieren conversación del equipo antes de actuar.</div>}
        <h4 className="h6">Lectura del equipo</h4><p>{analysis.resumen}</p>
        {analysis.emotionalSignals?.length ? <div className="mb-4"><h5 className="h6">Señales emocionales agregadas</h5><div className="row g-2">{analysis.emotionalSignals.map((signal) => <div className="col-md-6" key={`${signal.label}-${signal.direction}`}><div className="border rounded p-3 h-100"><div className="d-flex justify-content-between"><strong>{signal.label}</strong><span className="badge text-bg-light">{signal.direction}</span></div><div className="progress mt-2" role="progressbar" aria-label={`Intensidad ${signal.label}`} aria-valuenow={Math.round(signal.intensity * 100)} aria-valuemin={0} aria-valuemax={100}><div className="progress-bar" style={{ width: `${Math.round(signal.intensity * 100)}%` }} /></div><p className="small text-muted mb-0 mt-2">{signal.interpretation} · confianza {Math.round(signal.confidence * 100)}%</p></div></div>)}</div></div> : null}
        <div className="row"><div className="col-md-4"><strong>Fortalezas</strong><ul>{analysis.fortalezas.map((item, index) => <li key={index}>{item}</li>)}</ul></div><div className="col-md-4"><strong>Alertas</strong><ul>{analysis.alertas.map((item, index) => <li key={index}>{item}</li>)}</ul></div><div className="col-md-4"><strong>Acciones sugeridas</strong><ul>{analysis.recomendaciones.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div>
        {analysis.actionPlan?.length ? <div className="mt-3"><h5 className="h6">Plan de acción propuesto</h5>{analysis.actionPlan.map((plan) => <article className="border rounded p-3 mb-2" key={`${plan.priority}-${plan.objective}`}><div className="d-flex justify-content-between"><strong>{plan.objective}</strong><span className="badge text-bg-primary">{plan.horizon}</span></div><p className="small mb-1">Responsable: {plan.ownerRole}</p><ul className="small mb-2">{plan.actions.map((action) => <li key={action}>{action}</li>)}</ul><p className="small text-muted mb-0">Éxito: {plan.successMetrics.join(' · ')}. Check-in: {plan.checkInQuestion}</p></article>)}</div> : null}
        {analysis.limitations?.length ? <div className="alert alert-light small mt-3"><strong>Limitaciones:</strong> {analysis.limitations.join(' · ')}</div> : null}
        <p className="text-muted small mb-0">Confianza estimada: {Math.round(analysis.nivelConfianza * 100)}%. Versión {analysis.promptVersion || 'actual'} · hash {analysis.datasetHash?.slice(0, 10) || 'no disponible'}…</p>
      </div>}
    </section>
  );
};

export default IAAnalysisPanel;
