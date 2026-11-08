import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AISettings, AIProviderInput, AIProviderResponse } from '@termometro/shared';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { getIASettings, putIASettings, getIAProviders, saveIAProvider, removeIAProvider, checkIAProvider, iaMessage } from '../../services/iaSettingsService';
import './ConfiguracionIA.css';

const empty: AIProviderInput = { name: '', kind: 'openai-compatible', endpoint: 'https://api.openai.com/v1', model: '', apiKey: '' };
const statusLabel = { active: 'Generación verificada', invalid: 'Revisar conexión', unverified: 'Pendiente de prueba' };

export default function ConfiguracionIA() {
  const [settings, setSettings] = useState<AISettings>({ enabled: false, defaultProviderId: null, limits: {} });
  const [providers, setProviders] = useState<AIProviderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<AIProviderInput>(empty);
  const [editor, setEditor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showLimits, setShowLimits] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  const refresh = async () => {
    const [nextSettings, nextProviders] = await Promise.all([getIASettings(), getIAProviders()]);
    setSettings(nextSettings); setProviders(nextProviders);
  };
  useEffect(() => { refresh().catch(e => setError(iaMessage(e))).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (editor !== null) nameRef.current?.focus(); }, [editor]);
  useEffect(() => { if (deleting) cancelDeleteRef.current?.focus(); }, [deleting]);

  const run = async (operation: string, work: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(operation); setError(''); setNotice('');
    try { await work(); }
    catch (e) { setError(iaMessage(e)); }
    finally { locked.current = false; setBusy(''); }
  };

  const changeSettings = (next: AISettings) => run('settings', async () => {
    const updated = await putIASettings(next);
    setSettings(updated);
    setNotice(next.enabled ? 'IA activada. Todas las funciones usarán la conexión predeterminada.' : 'IA apagada. Tus conexiones y análisis siguen guardados.');
  });
  
  const changeLimits = (limits: Partial<AISettings['limits']>) => {
    changeSettings({ ...settings, limits: { ...settings.limits, ...limits } });
  };
  const openEditor = (provider?: AIProviderResponse) => {
    setDeleting(null); setError(''); setNotice('');
    setEditor(provider?.id ?? 'new');
    setForm(provider ? { name: provider.name, kind: provider.kind, endpoint: provider.endpoint, model: provider.model, apiKey: '' } : { ...empty });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run('save', async () => {
      await saveIAProvider(form, editor === 'new' ? undefined : editor ?? undefined);
      setEditor(null); setForm({ ...empty });
      await refresh(); setNotice('Conexión guardada. Podés elegirla como predeterminada.');
    });
  };
  const remove = (provider: AIProviderResponse) => run('delete', async () => {
    await removeIAProvider(provider.id);
    setProviders(items => items.filter(p => p.id !== provider.id));
    if (settings.defaultProviderId === provider.id) setSettings({ enabled: false, defaultProviderId: null });
    if (editor === provider.id) { setEditor(null); setForm({ ...empty }); }
    setDeleting(null);
    await refresh();
    setNotice('Conexión eliminada. Los análisis guardados se conservaron.');
  });
  const check = (provider: AIProviderResponse) => run(provider.id, async () => {
    try { await checkIAProvider(provider.id); setNotice('El modelo generó una respuesta válida. Conexión verificada.'); }
    finally { await refresh(); }
  });
  const selected = providers.find(p => p.id === settings.defaultProviderId);

  return <LayoutBackoffice><div className="ia-workspace">
    <Link to="/backoffice/home" className="ia-back">← Volver al panel</Link>
    <header className="ia-heading">
      <p className="ia-eyebrow">CONFIGURACIÓN GENERAL</p>
      <h1>Inteligencia artificial</h1>
      <p>Un solo lugar para decidir cuándo usar IA y qué conexión utilizan todas tus funciones.</p>
    </header>
    {error && <div className="ia-notice ia-notice-error" role="alert">{error}<button type="button" className="btn btn-link" disabled={!!busy} onClick={() => run('reload', refresh)}>Actualizar configuración</button></div>}
    {notice && <div className="ia-notice" role="status">{notice}</div>}
    {loading ? <div className="ia-card" role="status">Cargando configuración…</div> : <>
      <section className="ia-control ia-card" aria-labelledby="ia-control-title">
        <div className="ia-control-copy"><span className={settings.enabled ? 'ia-state is-on' : 'ia-state'}>{settings.enabled ? 'ACTIVADA' : 'APAGADA'}</span>
          <h2 id="ia-control-title">IA en tu espacio de trabajo</h2>
          <p>{settings.enabled ? 'Disponible en todos tus equipos. Las consultas se realizan cuando las solicitás.' : 'Las funciones de IA están en pausa. Podés seguir consultando tus análisis guardados.'}</p>
          <p className="ia-footnote">Apagar impide nuevas consultas, incluidas las pruebas. Una consulta que ya comenzó puede terminar.</p>
        </div>
        <button type="button" role="switch" aria-checked={settings.enabled} aria-label="Activar inteligencia artificial" className="ia-toggle" disabled={!!busy || (!settings.enabled && !selected)} onClick={() => changeSettings({ ...settings, enabled: !settings.enabled })}><span aria-hidden="true" /></button>
      </section>
      <div className="ia-settings-grid">
        <div>
          <section className="ia-card" aria-labelledby="default-title">
            <div className="ia-section-heading"><span className="ia-step">01</span><div><h2 id="default-title">Conexión predeterminada</h2><p>Se usa para análisis, sugerencias y nuevas funciones de IA.</p></div></div>
            <label htmlFor="default-provider" className="form-label">Conexión para todas las funciones</label>
            <select id="default-provider" className="form-select" value={settings.defaultProviderId ?? ''} disabled={!!busy || providers.length === 0} onChange={e => changeSettings({ enabled: !!e.target.value && settings.enabled, defaultProviderId: e.target.value || null })}>
              <option value="">Seleccioná una conexión</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name} · {p.model}</option>)}
            </select>
            <p className="ia-footnote mt-3">{selected ? 'Cambiar esta selección se aplica a todas las consultas nuevas.' : 'Agregá una conexión, elegila aquí y activá la IA con el interruptor.'}</p>
          </section>
          <section className="ia-card" aria-labelledby="connections-title">
            <div className="ia-section-heading ia-heading-actions"><div className="d-flex gap-3"><span className="ia-step">02</span><div><h2 id="connections-title">Tus conexiones</h2><p>Administrá proveedores, modelos y claves.</p></div></div><button className="btn btn-primary" disabled={!!busy} onClick={() => openEditor()}>Agregar conexión</button></div>
            {providers.length === 0 && editor === null && <div className="ia-empty"><h3>Tu primera conexión empieza acá</h3><p>Necesitás un modelo y una clave API de tu proveedor.</p><button className="btn btn-outline-primary" onClick={() => openEditor()}>Conectar un proveedor</button></div>}
            {providers.map(provider => <article className="ia-connection" key={provider.id}>
              <div className="ia-connection-top"><div><h3>{provider.name}</h3><p>{provider.model}</p></div>{settings.defaultProviderId === provider.id && <span className="ia-pill">Predeterminada</span>}</div>
              <p className="ia-endpoint">{provider.endpoint}</p>
              <span className={'ia-status ia-status-' + provider.status}>{statusLabel[provider.status]}</span>
              <div className="ia-connection-actions"><button className="btn btn-outline-secondary btn-sm" disabled={!!busy} onClick={() => openEditor(provider)}>Editar</button><button className="btn btn-outline-secondary btn-sm" disabled={!!busy || !settings.enabled} onClick={() => check(provider)}>{busy === provider.id ? 'Probando…' : 'Probar generación'}</button><button className="btn btn-link text-danger btn-sm" disabled={!!busy} onClick={() => { setDeleting(provider.id); setError(''); }}>Eliminar</button></div>
              {deleting === provider.id && <div className="ia-delete" role="alertdialog" aria-labelledby={'delete-' + provider.id}>
                <h4 id={'delete-' + provider.id}>¿Eliminar “{provider.name}”?</h4>
                <p>Se elimina la conexión y su clave guardada. Los análisis se conservan.{settings.defaultProviderId === provider.id ? ' Como es la predeterminada, la IA se apagará.' : ''}</p>
                <div className="d-flex flex-wrap gap-2"><button ref={cancelDeleteRef} className="btn btn-outline-secondary btn-sm" disabled={!!busy} onClick={() => setDeleting(null)}>Conservar conexión</button><button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => remove(provider)}>{busy === 'delete' ? 'Eliminando…' : 'Eliminar conexión'}</button></div>
              </div>}
            </article>)}
            {providers.length > 0 && <p className="ia-footnote mt-3">Probar generación realiza una consulta breve al proveedor y puede consumir saldo. La IA debe estar activada.</p>}
          </section>
          {editor !== null && <section className="ia-card ia-editor" aria-labelledby="editor-title"><h2 id="editor-title">{editor === 'new' ? 'Nueva conexión' : 'Editar conexión'}</h2>
            <form onSubmit={submit}><fieldset disabled={!!busy}><div className="row g-3 mt-1">
              <div className="col-md-6"><label htmlFor="ia-name" className="form-label">Nombre</label><input ref={nameRef} id="ia-name" className="form-control" required maxLength={80} placeholder="Mi conexión de OpenAI" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="col-md-6"><label htmlFor="ia-model" className="form-label">Modelo</label><input id="ia-model" className="form-control" required maxLength={150} placeholder="Identificador del modelo" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
              <div className="col-12"><label htmlFor="ia-endpoint" className="form-label">Dirección del servicio compatible con OpenAI</label><input id="ia-endpoint" className="form-control" type="url" required value={form.endpoint} onChange={e => setForm({ ...form, endpoint: e.target.value })} /><p className="form-text">Para OpenAI, conservá https://api.openai.com/v1. Para otro servicio, usá su dirección compatible.</p></div>
              <div className="col-12"><label htmlFor="ia-key" className="form-label">Clave API</label><input id="ia-key" className="form-control" type="password" autoComplete="new-password" value={form.apiKey ?? ''} onChange={e => setForm({ ...form, apiKey: e.target.value })} /><p className="form-text">{editor === 'new' ? 'Ingresá la clave de tu proveedor. Algunos servicios locales no requieren una.' : 'Dejala vacía para conservar la clave guardada.'}</p></div>
            </div><div className="d-flex gap-2 mt-4"><button className="btn btn-primary" type="submit">{busy === 'save' ? 'Guardando…' : 'Guardar conexión'}</button><button className="btn btn-outline-secondary" type="button" onClick={() => { setEditor(null); setForm({ ...empty }); }}>Cancelar</button></div></fieldset></form>
          </section>}
          <section className="ia-card" aria-labelledby="limits-title">
            <div className="ia-section-heading">
              <span className="ia-step">03</span>
              <div>
                <h2 id="limits-title">Límites y presupuesto</h2>
                <p>Controla el tamaño de entrada y la frecuencia de análisis.</p>
              </div>
            </div>
            <button
              className="btn btn-outline-secondary btn-sm mb-3"
              onClick={() => setShowLimits(!showLimits)}
            >
              {showLimits ? 'Ocultar límites avanzados' : 'Mostrar límites avanzados'}
            </button>
            {showLimits && (
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="limit-questionnaire" className="form-label">
                    Límite de entrada para cuestionarios (caracteres)
                  </label>
                  <input
                    id="limit-questionnaire"
                    type="number"
                    className="form-control"
                    min="1000"
                    step="1000"
                    placeholder="24000 (predeterminado)"
                    value={settings.limits?.maxQuestionnaireInput ?? ''}
                    disabled={!!busy}
                    onChange={(e) => changeLimits({ maxQuestionnaireInput: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <p className="form-text">
                    Máximo de caracteres para la descripción al generar un cuestionario con IA.
                  </p>
                </div>
                <div className="col-md-6">
                  <label htmlFor="limit-qualitative" className="form-label">
                    Límite por respuesta cualitativa (caracteres)
                  </label>
                  <input
                    id="limit-qualitative"
                    type="number"
                    className="form-control"
                    min="500"
                    step="500"
                    placeholder="4000 (predeterminado)"
                    value={settings.limits?.maxQualitativeText ?? ''}
                    disabled={!!busy}
                    onChange={(e) => changeLimits({ maxQualitativeText: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <p className="form-text">
                    Máximo de caracteres por respuesta cualitativa en análisis.
                  </p>
                </div>
                <div className="col-md-6">
                  <label htmlFor="limit-context" className="form-label">
                    Límite de contexto del equipo (caracteres)
                  </label>
                  <input
                    id="limit-context"
                    type="number"
                    className="form-control"
                    min="5000"
                    step="5000"
                    placeholder="32000 (predeterminado)"
                    value={settings.limits?.maxContextChars ?? ''}
                    disabled={!!busy}
                    onChange={(e) => changeLimits({ maxContextChars: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <p className="form-text">
                    Máximo de caracteres de contexto del equipo incluido en análisis.
                  </p>
                </div>
                <div className="col-md-6">
                  <label htmlFor="limit-analyses" className="form-label">
                    Límite de análisis por hora
                  </label>
                  <input
                    id="limit-analyses"
                    type="number"
                    className="form-control"
                    min="1"
                    step="1"
                    placeholder="20 (predeterminado)"
                    value={settings.limits?.maxAnalysesPerHour ?? ''}
                    disabled={!!busy}
                    onChange={(e) => changeLimits({ maxAnalysesPerHour: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <p className="form-text">
                    Máximo de análisis de IA que podés solicitar por hora.
                  </p>
                </div>
              </div>
            )}
            <p className="ia-footnote mt-3">
              Los límites predeterminados son adecuados para la mayoría de los casos. Aumentalos si necesitás analizar encuestas muy largas o contextos extensos. Los valores vacíos usan los predeterminados del sistema.
            </p>
          </section>
        </div>
        <aside className="ia-sidebar"><div className="ia-card"><p className="ia-eyebrow">UNA CONFIGURACIÓN, TODOS TUS EQUIPOS</p><h2>Vos decidís cuándo</h2><p>Activar habilita las funciones. Cada generación requiere una acción tuya.</p><hr /><h3>¿Dónde se usa?</h3><ul><li>Análisis de resultados e histórico.</li><li>Sugerencias para planes de acción.</li><li>Pruebas de tus conexiones.</li></ul><hr /><p className="ia-footnote">Estas preferencias son generales para tu cuenta. Las claves de otras cuentas no se comparten.</p></div><Link className="ia-back" to="/backoffice/ia">Ir a análisis con IA →</Link></aside>
      </div>
    </>}
  </div></LayoutBackoffice>;
}
