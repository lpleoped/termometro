import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AIBudgetPreset, AIProviderInput, AIProviderResponse, AISettings } from '@termometro/shared';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import { conexionLista } from '../../domain/conexionProveedor';
import { checkIAProvider, getIAProviders, getIASettings, iaMessage, putIASettings, removeIAProvider, saveIAProvider } from '../../services/iaSettingsService';
import './ConfiguracionIA.css';

const empty: AIProviderInput = { name: '', kind: 'openai-compatible', endpoint: 'https://api.openai.com/v1', model: '', apiKey: '' };
type Paso = 'cargar' | 'elegir' | 'probar' | 'activar' | 'listo';

const presets: Array<{ value: AIBudgetPreset; name: string }> = [
  { value: 'pequeño', name: 'Pequeño' },
  { value: 'estándar', name: 'Estándar' },
  { value: 'grande', name: 'Grande' },
  { value: 'muy-grande', name: 'Muy grande' },
  { value: 'sin-límite', name: 'Sin límite práctico' },
];

function pasoActual(providers: AIProviderResponse[], settings: AISettings): Paso {
  if (!providers.length) return 'cargar';
  const elegido = providers.find((item) => item.id === settings.defaultProviderId);
  if (!elegido) return 'elegir';
  if (elegido.status !== 'active') return 'probar';
  if (!settings.enabled) return 'activar';
  return 'listo';
}

export default function ConfiguracionIA() {
  const [params] = useSearchParams();
  const equipoId = params.get('equipoId') || '';
  const [settings, setSettings] = useState<AISettings>({ enabled: false, defaultProviderId: null, budgetPreset: 'estándar' });
  const [providers, setProviders] = useState<AIProviderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<AIProviderInput>(empty);
  const [vista, setVista] = useState<Paso | null>(null);
  const [elegidoId, setElegidoId] = useState('');

  const refresh = async () => {
    const [nextSettings, nextProviders] = await Promise.all([getIASettings(), getIAProviders()]);
    setSettings(nextSettings);
    setProviders(nextProviders);
    return { nextSettings, nextProviders };
  };
  useEffect(() => { refresh().catch((reason) => setError(iaMessage(reason))).finally(() => setLoading(false)); }, []);

  const actual = pasoActual(providers, settings);
  const paso = vista || actual;
  const conexionId = conexionLista(providers.map((item) => item.id), elegidoId);
  const elegido = providers.find((item) => item.id === (settings.defaultProviderId || conexionId));

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await saveIAProvider(form);
      setForm(empty);
      setVista(null);
      await refresh();
      setNotice('Proveedor guardado.');
    } catch (reason) { setError(iaMessage(reason)); }
    finally { setBusy(false); }
  };
  const usar = async () => {
    if (!conexionId) return;
    setBusy(true); setError('');
    try {
      const updated = await putIASettings({ ...settings, enabled: false, defaultProviderId: conexionId });
      setSettings(updated);
      setVista(null);
    } catch (reason) { setError(iaMessage(reason)); }
    finally { setBusy(false); }
  };
  const probar = async () => {
    if (!settings.defaultProviderId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await checkIAProvider(settings.defaultProviderId);
      setNotice('El modelo respondió.');
      setVista(null);
      await refresh();
    } catch (reason) { setError(iaMessage(reason)); await refresh().catch(() => undefined); }
    finally { setBusy(false); }
  };
  const activar = async () => {
    setBusy(true); setError('');
    try {
      const updated = await putIASettings({ ...settings, enabled: true, budgetPreset: settings.budgetPreset || 'estándar' });
      setSettings(updated);
      setVista(null);
      setNotice('Inteligencia activada.');
    } catch (reason) { setError(iaMessage(reason)); }
    finally { setBusy(false); }
  };
  const cambiarPresupuesto = async (preset: AIBudgetPreset) => {
    if (preset === 'sin-límite' && !window.confirm('Este tamaño puede generar un costo alto. ¿Querés usarlo?')) return;
    setBusy(true); setError('');
    try { setSettings(await putIASettings({ ...settings, budgetPreset: preset })); }
    catch (reason) { setError(iaMessage(reason)); }
    finally { setBusy(false); }
  };
  const quitar = async (id: string) => {
    setBusy(true); setError('');
    try { await removeIAProvider(id); setVista(null); await refresh(); }
    catch (reason) { setError(iaMessage(reason)); }
    finally { setBusy(false); }
  };

  return <LayoutBackoffice><div className="ia-workspace ia-asistente">
    <Link to="/backoffice/configuracion" className="btn btn-sm estado-atajo">Volver a configuración</Link>
    <header className="ia-heading">
      <p className="ia-eyebrow">DE ESTA CUENTA</p>
      <div className="d-flex align-items-center gap-2 mb-1">
        <h1 className="mb-0">Inteligencia artificial</h1>
        <InfoAyuda tema="configuracion" />
      </div>
      <p>Un paso por vez. La prueba no prende la inteligencia.</p>
    </header>
    {error && <div className="ia-notice ia-notice-error" role="alert">{error}</div>}
    {notice && <div className="ia-notice" role="status">{notice}</div>}
    {loading ? <div className="ia-card" role="status">Cargando configuración…</div> : <section className="ia-card">
      <ol className="ia-pasos" aria-label="Progreso de la inteligencia">
        {(['cargar', 'elegir', 'probar', 'activar'] as Paso[]).map((item, indice) => {
          const nombres = ['Cargar proveedor', 'Elegir proveedor', 'Probar', 'Activar'];
          const hecho = ['cargar', 'elegir', 'probar', 'activar', 'listo'].indexOf(actual) > indice;
          const estado = hecho ? 'ia-paso-hecho' : paso === item ? 'ia-paso-actual' : 'ia-paso-pendiente';
          return (
            <li key={item} className={`ia-paso ${estado}`}>
              <span className="ia-paso-marca" aria-hidden="true">{hecho ? '✓' : indice + 1}</span>
              <span>{nombres[indice]}</span>
              {hecho && paso !== item && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setVista(item)}>Cambiar</button>}
            </li>
          );
        })}
      </ol>
      {paso === 'cargar' && <form onSubmit={guardar}>
        <h2 className="h4">Cargá un proveedor</h2>
        <div className="ia-cargar-grid">
          <div>
            <label className="form-label" htmlFor="ia-name">Nombre</label>
            <input id="ia-name" className="form-control" required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={busy} />
          </div>
          <div>
            <label className="form-label" htmlFor="ia-model">Modelo</label>
            <input id="ia-model" className="form-control" required maxLength={150} placeholder="Por ejemplo: gpt-4o-mini" autoComplete="off" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} disabled={busy} />
          </div>
          <div>
            <label className="form-label" htmlFor="ia-endpoint">Dirección del servicio</label>
            <input id="ia-endpoint" className="form-control" type="url" required value={form.endpoint} onChange={(event) => setForm({ ...form, endpoint: event.target.value })} disabled={busy} />
          </div>
          <div>
            <label className="form-label" htmlFor="ia-key">Clave API</label>
            <input id="ia-key" className="form-control" type="password" autoComplete="new-password" value={form.apiKey ?? ''} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} disabled={busy} />
          </div>
        </div>
        <button className="btn btn-primary paso-primaria" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar proveedor'}</button>
      </form>}
      {paso === 'elegir' && <div>
        <h2 className="h4">Elegí el proveedor</h2>
        <label className="form-label" htmlFor="default-provider">Conexión</label>
        <select id="default-provider" className="form-select mb-3" value={conexionId} onChange={(event) => setElegidoId(event.target.value)} disabled={busy}>
          {providers.length !== 1 && <option value="">Seleccioná una conexión</option>}
          {providers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.model}</option>)}
        </select>
        <button className="btn btn-primary paso-primaria" type="button" disabled={busy || !conexionId} onClick={() => void usar()}>Usar este proveedor</button>
      </div>}
      {paso === 'probar' && elegido && <div>
        <h2 className="h4">Probá la conexión</h2>
        <p>{elegido.name} · {elegido.model}. La inteligencia sigue apagada. La prueba hace una consulta corta y puede consumir saldo.</p>
        <button className="btn btn-primary paso-primaria" type="button" disabled={busy} onClick={() => void probar()}>{busy ? 'Probando…' : 'Probar conexión'}</button>
        <button className="btn btn-outline-danger" type="button" disabled={busy} onClick={() => void quitar(elegido.id)}>Quitar este proveedor</button>
      </div>}
      {paso === 'activar' && <div>
        <h2 className="h4">Activar</h2>
        <p>Al generar un cuestionario o pedir una lectura, salen de esta computadora el texto de las preguntas, el contexto del equipo, los números de la ronda y, si ya se alcanzó el mínimo de anonimato, los comentarios abiertos. Van al proveedor y al modelo que acabás de cargar. Un patrón tapa correos, teléfonos y enlaces. No borra un nombre escrito en una frase. La clave es tuya. Termómetro no opera el modelo.</p>
        <button className="btn btn-primary paso-primaria" type="button" disabled={busy} onClick={() => void activar()}>{busy ? 'Activando…' : 'Activar y enviar a mi proveedor'}</button>
      </div>}
      {paso === 'listo' && <div>
        <h2 className="h4">Inteligencia activada</h2>
        <p>Las consultas nuevas usan {elegido?.name || 'el proveedor elegido'}.</p>
        {equipoId && <Link className="btn btn-primary paso-primaria" to={`/backoffice/equipos?equipo=${equipoId}`}>Volver al equipo</Link>}
        <div className="ia-ajustes">
          <h3 className="h5">Ajustes</h3>
          <label className="form-label" htmlFor="budget-preset">Tamaño del presupuesto</label>
          <select id="budget-preset" className="form-select" value={settings.budgetPreset || 'estándar'} disabled={busy} onChange={(event) => void cambiarPresupuesto(event.target.value as AIBudgetPreset)}>
            {presets.map((item) => <option key={item.value} value={item.value}>{item.name}</option>)}
          </select>
          <p className="mt-2 mb-0">El tamaño elegido es {presets.find((item) => item.value === (settings.budgetPreset || 'estándar'))?.name || 'Estándar'}.</p>
        </div>
      </div>}
    </section>}
  </div></LayoutBackoffice>;
}
