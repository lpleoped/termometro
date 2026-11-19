import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { TeamContextImportance, TeamContextInfluence, TeamContextInput, TeamContextItem, TeamContextSensitivity, TeamContextType } from '@termometro/shared';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import { getEquipos } from '../../services/equipoService';
import { archiveTeamContext, createTeamContext, getTeamContext, updateTeamContext } from '../../services/teamContextService';
import { iaMessage } from '../../services/iaSettingsService';
import './ConfiguracionContexto.css';

type Team = { _id: string; nombre: string };
const empty: TeamContextInput = { type: 'stable_fact', title: '', content: '', scope: 'team', status: 'active', confidence: 1, importance: 'relevant', sensitivity: 'normal', influence: 'interpretation_and_action' };
const labels: Record<TeamContextType, string> = { stable_fact: 'Hecho estable', team_role: 'Rol del equipo', client_context: 'Entorno de trabajo', priority: 'Prioridad', constraint: 'Restricción', external_actor: 'Actor externo', decision: 'Decisión', hypothesis: 'Hipótesis', learning: 'Aprendizaje' };

export default function ConfiguracionContexto() {
  const [params] = useSearchParams();
  const equipoPedido = params.get('equipoId') || '';
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [items, setItems] = useState<TeamContextItem[]>([]);
  const [form, setForm] = useState<TeamContextInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ajustar, setAjustar] = useState(false);

  useEffect(() => {
    getEquipos().then((next: Team[]) => {
      setTeams(next);
      const elegido = next.find((team) => team._id === equipoPedido);
      setTeamId(elegido?._id || (next[0] ? next[0]._id : ''));
    }).catch((e) => setError(iaMessage(e))).finally(() => setLoading(false));
  }, [equipoPedido]);

  useEffect(() => {
    if (!teamId) return;
    getTeamContext(teamId).then(setItems).catch((e) => setError(iaMessage(e)));
  }, [teamId]);

  const reset = () => { setForm(empty); setEditing(null); };
  const vigentes = items.filter((item) => item.status !== 'obsolete');
  const equipo = teams.find((item) => item._id === teamId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!teamId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = editing ? await updateTeamContext(teamId, editing, form) : await createTeamContext(teamId, form);
      setItems((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      reset();
      setNotice('Contexto guardado.');
    } catch (e) { setError(iaMessage(e)); } finally { setBusy(false); }
  };

  const edit = (item: TeamContextItem) => {
    setEditing(item.id);
    setAjustar(true);
    setForm({ type: item.type, title: item.title, content: item.content, source: item.source, scope: item.scope, status: item.status, confidence: item.confidence, importance: item.importance ?? 'relevant', sensitivity: item.sensitivity ?? 'normal', influence: item.influence ?? 'interpretation_and_action', validFrom: item.validFrom, validUntil: item.validUntil });
  };

  const archive = async (item: TeamContextItem) => {
    if (!teamId || !window.confirm(`¿Archivar “${item.title}”?`)) return;
    setBusy(true);
    try {
      const saved = await archiveTeamContext(teamId, item.id);
      setItems((current) => current.map((row) => row.id === saved.id ? saved : row));
    } catch (e) { setError(iaMessage(e)); } finally { setBusy(false); }
  };

  return (
    <LayoutBackoffice>
      <div className="context-workspace">
        <Link to="/backoffice/configuracion" className="btn btn-sm estado-atajo">Volver a configuración</Link>
        <header className="context-heading">
          <p className="context-eyebrow">DE UN EQUIPO</p>
          <div className="d-flex align-items-center gap-2 mb-2">
            <h1 className="mb-0">Contexto de {equipo?.nombre || 'este equipo'}</h1>
            <InfoAyuda tema="configuracion" />
          </div>
          <p>La inteligencia usa este texto para leer la ronda y proponer acciones.</p>
        </header>
        {error && <div className="context-notice context-error" role="alert">{error}</div>}
        {notice && <div className="context-notice" role="status">{notice}</div>}
        {loading ? <div className="context-card">Cargando equipos…</div> : (
          <main>
            <section className="context-card">
              <label className="form-label" htmlFor="context-team">Equipo</label>
              <select id="context-team" className="form-select" value={teamId} onChange={(event) => { setTeamId(event.target.value); reset(); setAjustar(false); }}>
                <option value="">Elegí un equipo</option>
                {teams.map((team) => <option key={team._id} value={team._id}>{team.nombre}</option>)}
              </select>
            </section>
            {teamId && vigentes.length === 0 && (
              <section className="context-card">
                <h2>Este equipo todavía no tiene contexto</h2>
                <p>Contale a la inteligencia cómo es, en un solo texto.</p>
                <Link className="btn btn-primary" to={`/backoffice/equipos?equipo=${teamId}&paso=contexto`}>Dar contexto</Link>
              </section>
            )}
            {teamId && vigentes.length > 0 && (
              <section className="context-card">
                <div className="context-section-head">
                  <div>
                    <p className="context-eyebrow">LO QUE YA SABE</p>
                    <h2>Contexto del equipo</h2>
                  </div>
                  <span className="context-count">{vigentes.length} {vigentes.length === 1 ? 'vigente' : 'vigentes'}</span>
                </div>
                <div>
                  {items.map((item) => (
                    <article className={'context-item ' + (item.status === 'obsolete' ? 'is-obsolete' : '')} key={item.id}>
                      <div className="context-item-top">
                        <div>
                          <span className="context-type">{labels[item.type]}</span>
                          <h3>{item.title}</h3>
                        </div>
                        <span className={'context-status context-status-' + item.status}>{item.status === 'active' ? 'Vigente' : item.status === 'review' ? 'En revisión' : 'Obsoleto'}</span>
                      </div>
                      <p>{item.content}</p>
                      {item.status !== 'obsolete' && (
                        <div className="context-item-actions">
                          <button className="btn btn-outline-secondary btn-sm" type="button" disabled={busy} onClick={() => edit(item)}>Editar</button>
                          <button className="btn btn-outline-danger btn-sm" type="button" disabled={busy} onClick={() => void archive(item)}>Archivar</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
            {teamId && (
              <details className="context-card" open={ajustar} onToggle={(event) => setAjustar(event.currentTarget.open)}>
                <summary>Ajustar este contexto</summary>
                <form className="mt-3" onSubmit={submit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="context-type">Tipo</label>
                      <select id="context-type" className="form-select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TeamContextType })}>
                        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="context-title">Título</label>
                      <input id="context-title" className="form-control" required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="context-content">Información</label>
                      <textarea id="context-content" className="form-control" required maxLength={8000} rows={5} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="context-importance">Importancia</label>
                      <select id="context-importance" className="form-select" value={form.importance} onChange={(event) => setForm({ ...form, importance: event.target.value as TeamContextImportance })}>
                        <option value="informative">Informativa</option>
                        <option value="relevant">Relevante</option>
                        <option value="critical">Crítica</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="context-influence">Influencia</label>
                      <select id="context-influence" className="form-select" value={form.influence} onChange={(event) => setForm({ ...form, influence: event.target.value as TeamContextInfluence })}>
                        <option value="interpretation">Interpretar</option>
                        <option value="risk">Detectar riesgos</option>
                        <option value="action">Proponer acciones</option>
                        <option value="precondition">Establecer condición previa</option>
                        <option value="group_action">Acción grupal</option>
                        <option value="interpretation_and_action">Interpretar y accionar</option>
                        <option value="do_not_act_directly">No accionar directamente</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="context-sensitivity">Sensibilidad</label>
                      <select id="context-sensitivity" className="form-select" value={form.sensitivity} onChange={(event) => setForm({ ...form, sensitivity: event.target.value as TeamContextSensitivity })}>
                        <option value="normal">Normal</option>
                        <option value="sensitive">Sensible</option>
                        <option value="highly_sensitive">Altamente sensible</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="context-source">Fuente</label>
                      <input id="context-source" className="form-control" maxLength={500} value={form.source ?? ''} onChange={(event) => setForm({ ...form, source: event.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="context-status">Estado</label>
                      <select id="context-status" className="form-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TeamContextInput['status'] })}>
                        <option value="active">Vigente</option>
                        <option value="review">En revisión</option>
                        <option value="obsolete">Obsoleto</option>
                      </select>
                    </div>
                  </div>
                  <button className="btn btn-outline-primary mt-4" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar este ajuste'}</button>
                  {editing && <button className="btn btn-outline-secondary" type="button" onClick={reset}>Cancelar edición</button>}
                </form>
              </details>
            )}
          </main>
        )}
      </div>
    </LayoutBackoffice>
  );
}
