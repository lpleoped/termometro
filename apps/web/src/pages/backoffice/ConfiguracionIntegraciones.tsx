import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import { useNotifications } from '../../context/NotificationContext';

type Connection = { id: string; provider: 'slack' | 'monday'; name: string; status: string; metadata?: { boardId?: string } };
type Team = { _id?: string; id?: string; nombre?: string };

export default function ConfiguracionIntegraciones() {
  const [params] = useSearchParams();
  const seccion = params.get('seccion') === 'tareas' ? 'tareas' : params.get('seccion') === 'canal' ? 'canal' : '';
  const equipoInicial = params.get('equipoId') || '';
  const proveedor: 'slack' | 'monday' = seccion === 'tareas' ? 'monday' : 'slack';
  const [items, setItems] = useState<Connection[]>([]);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [boardId, setBoardId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { addNotification } = useNotifications();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [slackConnectionId, setSlackConnectionId] = useState('');
  const [mondayConnectionId, setMondayConnectionId] = useState('');
  const [mondayBoardId, setMondayBoardId] = useState('');

  const load = async () => {
    const [connections, equipos] = await Promise.all([api.get('/integrations'), api.get('/equipos')]);
    setItems(connections.data);
    setTeams(Array.isArray(equipos.data) ? equipos.data : []);
  };
  const loadTeam = async (id: string) => {
    setTeamId(id);
    if (!id) return;
    const data = (await api.get(`/equipos/${id}/integraciones`)).data;
    setSlackConnectionId(data.slackConnectionId || '');
    setMondayConnectionId(data.mondayConnectionId || '');
    setMondayBoardId(data.mondayBoardId || '');
  };
  useEffect(() => {
    load().then(() => { if (equipoInicial) return loadTeam(equipoInicial); }).catch(() => setError('No se pudo cargar la configuración.'));
  }, []);

  const saveTeam = async () => {
    if (!teamId) return;
    setBusy(true);
    setError('');
    try {
      await api.put(`/equipos/${teamId}/integraciones`, {
        slackConnectionId: slackConnectionId || undefined,
        mondayConnectionId: mondayConnectionId || undefined,
        mondayBoardId: mondayBoardId || undefined,
      });
      setMessage('Quedó guardado para este equipo.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = { provider: proveedor, name, secret, metadata: proveedor === 'monday' ? { boardId } : {} };
      if (editingId) await api.put('/integrations/' + editingId, data);
      else await api.post('/integrations', data);
      setEditingId(null);
      setName('');
      setSecret('');
      setBoardId('');
      await load();
      setMessage(seccion === 'tareas' ? 'monday quedó conectado.' : 'Slack quedó conectado.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  };
  const test = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/integrations/${id}/test`);
      await load();
      setMessage('La conexión respondió.');
      addNotification({ type: 'success', title: 'Conexión verificada', message: 'Respondió bien.' });
    } catch (e: any) {
      setError(e.response?.data?.error || 'La prueba falló.');
      addNotification({ type: 'error', title: 'La prueba falló', message: e.response?.data?.error || 'Revisá los datos.' });
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm(seccion === 'tareas' ? '¿Desconectar monday?' : '¿Desconectar Slack?')) return;
    await api.delete(`/integrations/${id}`);
    await load();
  };

  const destino = (cual: 'canal' | 'tareas') => {
    const query = new URLSearchParams();
    if (equipoInicial) query.set('equipoId', equipoInicial);
    query.set('seccion', cual);
    return `/backoffice/configuracion/integraciones?${query.toString()}`;
  };
  const visibles = items.filter((item) => item.provider === proveedor);
  const titulo = seccion === 'tareas' ? 'Tareas' : 'Canal';
  const bajada = seccion === 'tareas'
    ? 'Cuando confirmás una acción, podés crear la tarea en monday.'
    : 'Cuando lo pedís, el resultado se publica en Slack.';

  if (!seccion) {
    return <LayoutBackoffice><div className="container py-5" style={{ maxWidth: 720 }}>
      <Link className="btn btn-sm estado-atajo" to="/backoffice/configuracion">Volver a configuración</Link>
      <header className="my-4">
        <p className="text-uppercase text-muted small mb-1">De un equipo</p>
        <div className="d-flex align-items-center gap-2 mb-2">
          <h1 className="mb-0">Canal y tareas</h1>
          <InfoAyuda tema="configuracion" />
        </div>
        <p>Elegí dónde se publica el resultado y dónde queda la tarea.</p>
      </header>
      <div className="d-grid gap-3">
        <Link className="card p-4 text-decoration-none" to={destino('canal')}><h2 className="h5 mb-1">Canal</h2><p className="mb-0 text-muted">Slack, cuando vos lo pedís.</p></Link>
        <Link className="card p-4 text-decoration-none" to={destino('tareas')}><h2 className="h5 mb-1">Tareas</h2><p className="mb-0 text-muted">monday, cuando confirmás una acción.</p></Link>
      </div>
    </div></LayoutBackoffice>;
  }

  return <LayoutBackoffice><div className="container py-5" style={{ maxWidth: 980 }}>
    <Link className="btn btn-sm estado-atajo" to="/backoffice/configuracion">Volver a configuración</Link>
    <header className="my-4">
      <p className="text-uppercase text-muted small mb-1">De un equipo</p>
      <div className="d-flex align-items-center gap-2 mb-2">
        <h1 className="mb-0">{titulo}</h1>
        <InfoAyuda tema="configuracion" />
      </div>
      <p>{bajada}</p>
    </header>
    {error && <div className="alert alert-danger">{error}</div>}
    {message && <div className="alert alert-success">{message}</div>}
    <section className="card p-4 mb-4">
      <h2 className="h4">{seccion === 'tareas' ? 'monday de este equipo' : 'Slack de este equipo'}</h2>
      <div className="row g-3 align-items-end">
        <div className="col-md-4">
          <label className="form-label" htmlFor="team-settings">Equipo</label>
          <select id="team-settings" className="form-select" value={teamId} onChange={(event) => loadTeam(event.target.value)}>
            <option value="">Elegí un equipo</option>
            {teams.map((team) => <option key={String(team._id || team.id)} value={String(team._id || team.id)}>{team.nombre || 'Equipo'}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="conexion-equipo">{seccion === 'tareas' ? 'Conexión de monday' : 'Conexión de Slack'}</label>
          <select id="conexion-equipo" className="form-select" value={seccion === 'tareas' ? mondayConnectionId : slackConnectionId} disabled={!teamId} onChange={(event) => seccion === 'tareas' ? setMondayConnectionId(event.target.value) : setSlackConnectionId(event.target.value)}>
            <option value="">Sin asignar</option>
            {visibles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <button className="btn btn-outline-secondary w-100" type="button" disabled={!teamId || busy} onClick={saveTeam}>Guardar para este equipo</button>
        </div>
      </div>
      {seccion === 'tareas' && <div className="mt-3">
        <label className="form-label" htmlFor="tablero-equipo">Tablero</label>
        <input id="tablero-equipo" className="form-control" value={mondayBoardId} onChange={(event) => setMondayBoardId(event.target.value)} disabled={!teamId} placeholder="El tablero donde van las tareas" />
      </div>}
    </section>
    <div className="row g-4">
      <div className="col-lg-7">
        <section className="card p-4">
          <h2 className="h4">{seccion === 'tareas' ? 'Conexiones de monday' : 'Conexiones de Slack'}</h2>
          {visibles.length === 0 && <p>Todavía no hay ninguna.</p>}
          {visibles.map((item) => <article key={item.id} className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between gap-2">
              <div>
                <h3 className="h5 mb-1">{item.name}</h3>
                <span className="text-muted">{item.status === 'active' ? 'Activa' : 'Revisar'}</span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary btn-sm" type="button" disabled={busy} onClick={() => test(item.id)}>Probar</button>
                <button className="btn btn-outline-secondary btn-sm" type="button" disabled={busy} onClick={() => { setEditingId(item.id); setName(item.name); setSecret(''); setBoardId(String(item.metadata?.boardId || '')); }}>Editar</button>
                <button className="btn btn-outline-danger btn-sm" type="button" disabled={busy} onClick={() => remove(item.id)}>Desconectar</button>
              </div>
            </div>
          </article>)}
        </section>
      </div>
      <div className="col-lg-5">
        <section className="card p-4">
          <h2 className="h4">{editingId ? 'Editar' : seccion === 'tareas' ? 'Conectar monday' : 'Conectar Slack'}</h2>
          <form onSubmit={submit}>
            <label className="form-label" htmlFor="integration-name">Nombre</label>
            <input id="integration-name" className="form-control mb-3" required value={name} onChange={(event) => setName(event.target.value)} placeholder={seccion === 'tareas' ? 'monday del equipo' : 'Canal del equipo'} />
            <label className="form-label" htmlFor="integration-secret">{seccion === 'tareas' ? 'Clave de monday' : 'Dirección del canal'}</label>
            <input id="integration-secret" type="password" autoComplete="new-password" className="form-control mb-3" required={!editingId} placeholder={editingId ? 'Dejala vacía para conservar la actual' : ''} value={secret} onChange={(event) => setSecret(event.target.value)} />
            {seccion === 'tareas' && <>
              <label className="form-label" htmlFor="integration-board">Tablero</label>
              <input id="integration-board" className="form-control mb-3" required value={boardId} onChange={(event) => setBoardId(event.target.value)} placeholder="El tablero de las tareas" />
            </>}
            <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </form>
        </section>
      </div>
    </div>
  </div></LayoutBackoffice>;
}
