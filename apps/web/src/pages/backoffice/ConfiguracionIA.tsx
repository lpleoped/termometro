import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AISettings, AIProviderInput, AIProviderResponse, AIBudgetPreset } from '@termometro/shared';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { getIASettings, putIASettings, getIAProviders, saveIAProvider, removeIAProvider, checkIAProvider, iaMessage } from '../../services/iaSettingsService';
import './ConfiguracionIA.css';

const empty: AIProviderInput = { name: '', kind: 'openai-compatible', endpoint: 'https://api.openai.com/v1', model: '', apiKey: '' };
const statusLabel = { active: 'Generación verificada', invalid: 'Revisar conexión', unverified: 'Pendiente de prueba' };

interface PresetOption {
  value: AIBudgetPreset;
  name: string;
  description: string;
  limits: string;
  costWarning: string;
  requiresConfirmation: boolean;
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    value: 'pequeño',
    name: 'Pequeño',
    description: 'Cuestionarios cortos, equipos chicos (hasta 10 personas)',
    limits: 'Entrada: 8.000 chars (~2k tokens) · Salida: 2k tokens',
    costWarning: 'Costo bajo: ~USD 0.05-0.15 por análisis',
    requiresConfirmation: false,
  },
  {
    value: 'estándar',
    name: 'Estándar (recomendado)',
    description: 'Mayoría de los casos (10-30 personas, contexto moderado)',
    limits: 'Entrada: 24.000 chars (~6k tokens) · Salida: 4k tokens',
    costWarning: 'Costo moderado: ~USD 0.15-0.40 por análisis',
    requiresConfirmation: false,
  },
  {
    value: 'grande',
    name: 'Grande',
    description: 'Equipos grandes con contexto extenso (30-100 personas)',
    limits: 'Entrada: 60.000 chars (~15k tokens) · Salida: 8k tokens',
    costWarning: 'Costo alto: ~USD 0.40-1.20 por análisis',
    requiresConfirmation: false,
  },
  {
    value: 'muy-grande',
    name: 'Muy grande',
    description: 'Organizaciones extensas (100+ personas, mucho histórico)',
    limits: 'Entrada: 120.000 chars (~30k tokens) · Salida: 16k tokens',
    costWarning: 'Costo muy alto: ~USD 1.20-3.50 por análisis',
    requiresConfirmation: false,
  },
  {
    value: 'sin-límite',
    name: 'Sin límite práctico',
    description: 'Casos especiales: análisis exhaustivos sin restricción',
    limits: 'Entrada: 500.000 chars (~125k tokens) · Salida: 32k tokens',
    costWarning: '⚠️ ADVERTENCIA: Costo potencialmente muy elevado (USD 3.50-15.00+ por análisis). Solo para presupuesto asignado.',
    requiresConfirmation: true,
  },
];

export default function ConfiguracionIA() {
  const [settings, setSettings] = useState<AISettings>({ enabled: false, defaultProviderId: null, budgetPreset: 'estándar' });
  const [providers, setProviders] = useState<AIProviderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<AIProviderInput>(empty);
  const [editor, setEditor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingPreset, setPendingPreset] = useState<AIBudgetPreset | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const confirmPresetRef = useRef<HTMLButtonElement>(null);

  const refresh = async () => {
    const [nextSettings, nextProviders] = await Promise.all([getIASettings(), getIAProviders()]);
    setSettings(nextSettings); setProviders(nextProviders);
  };
  useEffect(() => { refresh().catch(e => setError(iaMessage(e))).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (editor !== null) nameRef.current?.focus(); }, [editor]);
  useEffect(() => { if (deleting) cancelDeleteRef.current?.focus(); }, [deleting]);
  useEffect(() => { if (pendingPreset) confirmPresetRef.current?.focus(); }, [pendingPreset]);

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
  
  const changeBudgetPreset = (preset: AIBudgetPreset) => {
    const presetInfo = PRESET_OPTIONS.find(p => p.value === preset);
    
    // "sin-límite" requires explicit confirmation
    if (presetInfo?.requiresConfirmation && preset !== settings.budgetPreset) {
      setPendingPreset(preset);
      return;
    }
    
    changeSettings({ ...settings, budgetPreset: preset });
  };
  
  const confirmBudgetPreset = () => {
    if (pendingPreset) {
      changeSettings({ ...settings, budgetPreset: pendingPreset });
      setPendingPreset(null);
    }
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
          <section className="ia-card" aria-labelledby="budget-title">
            <div className="ia-section-heading">
              <span className="ia-step">03</span>
              <div>
                <h2 id="budget-title">Presupuesto de análisis</h2>
                <p>Elegí el tamaño de contexto y límites según tus necesidades.</p>
              </div>
            </div>
            <label htmlFor="budget-preset" className="form-label fw-semibold">Tamaño de presupuesto</label>
            <select 
              id="budget-preset" 
              className="form-select mb-3" 
              value={settings.budgetPreset ?? 'estándar'} 
              disabled={!!busy}
              onChange={(e) => changeBudgetPreset(e.target.value as AIBudgetPreset)}
            >
              {PRESET_OPTIONS.map(preset => (
                <option key={preset.value} value={preset.value}>
                  {preset.name}
                </option>
              ))}
            </select>
            
            {PRESET_OPTIONS.filter(p => p.value === (settings.budgetPreset ?? 'estándar')).map(preset => (
              <div key={preset.value} className="alert alert-info mb-3" role="status">
                <h6 className="mb-2">{preset.name}</h6>
                <p className="mb-2 small">{preset.description}</p>
                <p className="mb-2 small"><strong>Límites:</strong> {preset.limits}</p>
                <p className="mb-0 small"><strong>Costo estimado (GPT-4):</strong> {preset.costWarning}</p>
              </div>
            ))}
            
            {pendingPreset && (
              <div className="alert alert-warning" role="alertdialog" aria-labelledby="confirm-preset">
                <h6 id="confirm-preset" className="mb-2">⚠️ Confirmar preset &quot;Sin límite práctico&quot;</h6>
                <p className="mb-2 small">
                  Este preset permite análisis exhaustivos sin restricciones, pero puede generar 
                  <strong> costos muy elevados</strong> (USD 3.50-15.00+ por análisis con GPT-4).
                </p>
                <p className="mb-3 small">
                  Solo elegí esta opción si tenés un presupuesto asignado y necesitás analizar 
                  contextos extremadamente extensos (100+ personas, documentos históricos muy largos).
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <button 
                    ref={confirmPresetRef}
                    className="btn btn-warning btn-sm" 
                    disabled={!!busy} 
                    onClick={confirmBudgetPreset}
                  >
                    {busy === 'settings' ? 'Confirmando…' : 'Confirmar y activar'}
                  </button>
                  <button 
                    className="btn btn-outline-secondary btn-sm" 
                    disabled={!!busy} 
                    onClick={() => setPendingPreset(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            
            <p className="ia-footnote mt-3">
              <strong>Recomendación:</strong> El preset &quot;Estándar&quot; es adecuado para la mayoría de los casos. 
              Elegí un preset más grande solo si tus análisis exceden los límites actuales. 
              Los costos mostrados son estimados para GPT-4; pueden variar según el modelo configurado.
            </p>
          </section>
        </div>
        <aside className="ia-sidebar"><div className="ia-card"><p className="ia-eyebrow">UNA CONFIGURACIÓN, TODOS TUS EQUIPOS</p><h2>Vos decidís cuándo</h2><p>Activar habilita las funciones. Cada generación requiere una acción tuya.</p><hr /><h3>¿Dónde se usa?</h3><ul><li>Análisis de resultados e histórico.</li><li>Sugerencias para planes de acción.</li><li>Pruebas de tus conexiones.</li></ul><hr /><p className="ia-footnote">Estas preferencias son generales para tu cuenta. Las claves de otras cuentas no se comparten.</p></div><Link className="ia-back" to="/backoffice/ia">Ir a análisis con IA →</Link></aside>
      </div>
    </>}
  </div></LayoutBackoffice>;
}
