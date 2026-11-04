import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { agregarMiembro, archivarEquipo, actualizarEquipo, crearEquipo, getEquipos, quitarMiembro } from '../../services/equipoService';
import { getEvaluaciones } from '../../services/evaluacionService';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';

interface RondaAbierta {
  id: string;
  titulo: string;
  version?: string;
  tipo?: string;
  evaluacionId: string;
  activadoEn?: string;
}

interface EquipoPanel {
  id: string;
  nombre: string;
  rondas: RondaAbierta[];
  miembros: string[];
}

function idDe(doc: { _id?: string; id?: string } | null | undefined): string {
  if (!doc) return '';
  return String(doc._id || doc.id || '');
}

function sinRondas(error: unknown): boolean {
  if (typeof error !== 'object' || !error || !('response' in error)) return false;
  const response = (error as { response?: { status?: number; data?: { error?: string } } }).response;
  if (response?.status !== 400) return false;
  return /no se encontraron instancias/i.test(response.data?.error ?? '');
}

function fechaAbierta(iso?: string): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function titulosRepetidos(rondas: RondaAbierta[]): Set<string> {
  const cuentas = new Map<string, number>();
  for (const ronda of rondas) {
    cuentas.set(ronda.titulo, (cuentas.get(ronda.titulo) ?? 0) + 1);
  }
  return new Set(
    [...cuentas.entries()].filter(([, cantidad]) => cantidad > 1).map(([titulo]) => titulo),
  );
}

async function rondasDelEquipo(equipoId: string): Promise<RondaAbierta[]> {
  try {
    const res = await api.get(`/instancias`, { params: { equipoId } });
    const lista = Array.isArray(res.data) ? res.data : [];
    return lista
      .filter((instancia: { estado?: string }) => instancia.estado === 'activa')
      .map((instancia: {
        _id?: string;
        id?: string;
        activadoEn?: string;
        evaluacion?: { _id?: string; id?: string; titulo?: string; version?: string; tipo?: string } | string;
      }) => {
        const evaluacion =
          instancia.evaluacion && typeof instancia.evaluacion === 'object'
            ? instancia.evaluacion
            : undefined;
        return {
          id: idDe(instancia),
          titulo: evaluacion?.titulo || 'Cuestionario',
          version: evaluacion?.version,
          tipo: evaluacion?.tipo,
          evaluacionId: idDe(evaluacion),
          activadoEn: instancia.activadoEn,
        };
      })
      .filter((ronda) => ronda.id && ronda.evaluacionId);
  } catch (error) {
    if (sinRondas(error)) return [];
    throw error;
  }
}

const HomeBackoffice = () => {
  const [equipos, setEquipos] = useState<EquipoPanel[]>([]);
  const [hayCuestionarios, setHayCuestionarios] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorAlta, setErrorAlta] = useState(false);
  const [errorGestion, setErrorGestion] = useState('');
  const [equipoMiembro, setEquipoMiembro] = useState<EquipoPanel | null>(null);
  const [emailMiembro, setEmailMiembro] = useState('');
  const [guardandoMiembro, setGuardandoMiembro] = useState(false);
  const [equipoEditando, setEquipoEditando] = useState<EquipoPanel | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      const [equiposRaw, evaluaciones] = await Promise.all([getEquipos(), getEvaluaciones()]);
      const equiposCargados = await Promise.all(
        (Array.isArray(equiposRaw) ? equiposRaw : []).map(async (equipo: { _id?: string; id?: string; nombre?: string; miembros?: string[] }) => {
          const id = idDe(equipo);
          if (!id) throw new Error('Equipo sin id');
          const rondas = await rondasDelEquipo(id);
          return { id, nombre: equipo.nombre || 'Equipo', miembros: equipo.miembros || [], rondas };
        }),
      );
      setHayCuestionarios(Array.isArray(evaluaciones) && evaluaciones.length > 0);
      setEquipos(equiposCargados);
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleCrear = async (e: FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || guardando) return;
    setGuardando(true);
    setErrorAlta(false);
    try {
      await crearEquipo(nombreLimpio);
      setNombre('');
      await cargar();
    } catch {
      setErrorAlta(true);
      addNotification({ type: 'error', title: 'No se pudo crear el equipo', message: 'Revisá el nombre e intentá nuevamente.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleRenombrar = async (equipo: EquipoPanel) => {
    setEquipoEditando(equipo);
    setNombreEditado(equipo.nombre);
  };

  const guardarNombre = async () => {
    if (!equipoEditando) return;
    const nuevoNombre = nombreEditado.trim();
    if (!nuevoNombre || nuevoNombre === equipoEditando.nombre) { setEquipoEditando(null); return; }
    try {
      setErrorGestion('');
      await actualizarEquipo(equipoEditando.id, nuevoNombre);
      await cargar();
      addNotification({ type: 'success', title: 'Equipo actualizado', message: 'El nombre del equipo fue actualizado.' });
      setEquipoEditando(null);
    } catch {
      setErrorGestion('No se pudo actualizar el equipo.');
    }
  };

  const handleArchivar = async (equipo: EquipoPanel) => {
    if (!window.confirm(`¿Archivar “${equipo.nombre}”? Sus resultados se conservarán.`)) return;
    try {
      setErrorGestion('');
      await archivarEquipo(equipo.id);
      await cargar();
      addNotification({ type: 'success', title: 'Equipo archivado', message: 'El equipo salió de la vista operativa.' });
    } catch {
      setErrorGestion('No se pudo archivar el equipo.');
    }
  };

  const handleAgregarMiembro = async (equipo: EquipoPanel) => {
    setEquipoMiembro(equipo);
    setEmailMiembro('');
  };

  const guardarMiembro = async () => {
    if (!equipoMiembro || !emailMiembro.trim()) return;
    setGuardandoMiembro(true);
    try { setErrorGestion(''); await agregarMiembro(equipoMiembro.id, emailMiembro.trim()); await cargar(); addNotification({ type: 'success', title: 'Miembro agregado', message: `${emailMiembro.trim()} ya forma parte del equipo.` }); }
    catch { setErrorGestion('No se pudo agregar el miembro. Verificá el email o si ya existe.'); }
    finally { setGuardandoMiembro(false); setEquipoMiembro(null); }
  };

  const handleQuitarMiembro = async (equipo: EquipoPanel, email: string) => {
    if (!window.confirm(`¿Quitar a ${email} del equipo?`)) return;
    try { setErrorGestion(''); await quitarMiembro(equipo.id, email); await cargar(); addNotification({ type: 'success', title: 'Miembro quitado', message: `${email} ya no forma parte del equipo.` }); }
    catch { setErrorGestion('No se pudo quitar el miembro.'); }
  };

  if (cargando) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3">Cargando equipos...</p>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  if (errorCarga) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="alert alert-danger" role="alert">
            <p className="mb-3">No se pudieron cargar tus equipos</p>
            <button className="btn btn-outline-danger" type="button" onClick={cargar}>
              Reintentar
            </button>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  if (equipos.length === 0) {
    const nombreListo = nombre.trim().length > 0;
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <h2 className="fw-bold mb-2">Creá tu equipo</h2>
              <p className="text-muted mb-4">
                Sin un equipo no podés abrir una ronda ni ver el termómetro.
              </p>
              <form onSubmit={handleCrear}>
                <div className="mb-3">
                  <label htmlFor="nombre-equipo" className="form-label fw-semibold">
                    Nombre del equipo
                  </label>
                  <input
                    id="nombre-equipo"
                    type="text"
                    className="form-control"
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      setErrorAlta(false);
                    }}
                    disabled={guardando}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!nombreListo || guardando}
                >
                  {guardando ? 'Creando el equipo...' : 'Crear el primer equipo'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  return (
    <LayoutBackoffice>
      <div className="container py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <p className="text-uppercase text-muted small fw-semibold mb-1">Centro de control</p>
            <h2 className="fw-bold mb-1">Estado de tus equipos</h2>
            <p className="text-muted mb-0">Una vista rápida de las rondas abiertas y los próximos pasos.</p>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => document.getElementById('nuevo-equipo')?.focus()}>
              + Nuevo equipo
            </button>
            <button type="button" className="btn btn-outline-primary" onClick={() => navigate('/backoffice/configuracion')}>
              Configuraciones
            </button>
          </div>
        </div>
        <div className="row g-3 mb-4">
          <div className="col-sm-4"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="text-muted small">Equipos</div><div className="fs-3 fw-bold">{equipos.length}</div><div className="small text-muted">bajo tu gestión</div></div></div></div>
          <div className="col-sm-4"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="text-muted small">Rondas abiertas</div><div className="fs-3 fw-bold">{equipos.reduce((total, equipo) => total + equipo.rondas.length, 0)}</div><div className="small text-muted">listas para consultar</div></div></div></div>
          <div className="col-sm-4"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="text-muted small">Siguiente paso</div><div className="fw-bold mt-2">{equipos.some((equipo) => equipo.rondas.length === 0) ? 'Abrir una ronda' : 'Revisar resultados'}</div><div className="small text-muted">mantené el pulso del equipo</div></div></div></div>
        </div>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <form onSubmit={handleCrear} className="row g-2 align-items-end">
              <div className="col-md-8">
                <label htmlFor="nuevo-equipo" className="form-label fw-semibold mb-1">Crear otro equipo</label>
                <input id="nuevo-equipo" type="text" className="form-control" placeholder="Ej.: Producto, Operaciones o QA" value={nombre} onChange={(e) => { setNombre(e.target.value); setErrorAlta(false); }} disabled={guardando} />
              </div>
              <div className="col-md-4 d-grid">
                <button type="submit" className="btn btn-outline-primary" disabled={!nombre.trim() || guardando}>{guardando ? 'Creando...' : 'Crear equipo'}</button>
              </div>
            </form>
          </div>
        </div>
        {equipos.map((equipo) => {
          const repetidos = titulosRepetidos(equipo.rondas);
          return (
            <div key={equipo.id} className="card mb-3 shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                  <div className="fw-semibold fs-5 text-primary">{equipo.nombre}</div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleRenombrar(equipo)}>Editar</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleArchivar(equipo)}>Archivar</button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2"><span className="small text-muted">Miembros ({equipo.miembros.length})</span><button type="button" className="btn btn-sm btn-link p-0" onClick={() => handleAgregarMiembro(equipo)}>+ Agregar</button></div>
                  {equipo.miembros.length === 0 ? <div className="small text-muted">Todavía no agregaste miembros.</div> : <div className="d-flex flex-wrap gap-2">{equipo.miembros.map((email) => <span key={email} className="badge rounded-pill text-bg-light border fw-normal">{email} <button type="button" className="btn btn-sm p-0 ms-1 text-muted" aria-label={`Quitar ${email}`} onClick={() => handleQuitarMiembro(equipo, email)}>×</button></span>)}</div>}
                </div>
                {equipo.rondas.length === 0 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      navigate(
                        hayCuestionarios
                          ? `/backoffice/publicar-evaluacion?equipoId=${equipo.id}`
                          : '/backoffice/alta-evaluacion',
                      )
                    }
                  >
                    {hayCuestionarios ? 'Abrir la ronda' : 'Armar el cuestionario'}
                  </button>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {equipo.rondas.map((ronda) => {
                      const fecha = repetidos.has(ronda.titulo) ? fechaAbierta(ronda.activadoEn) : '';
                      return (
                        <li
                          key={ronda.id}
                          className="mb-2 p-2 rounded bg-light d-flex flex-wrap align-items-center justify-content-between gap-2"
                        >
                          <div>
                            <div className="fw-medium text-dark">{ronda.titulo}</div>
                            {fecha && <div className="text-muted small">Abierta el {fecha}</div>}
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => navigate(`/backoffice/dashboard?instanciaId=${ronda.id}`)}
                          >
                            Ver cómo está el equipo
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {(equipoMiembro || equipoEditando) && <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="dialogo-equipo-titulo" style={{ background: 'rgba(15, 23, 42, .42)' }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header"><h2 id="dialogo-equipo-titulo" className="modal-title h5">{equipoMiembro ? `Agregar miembro a ${equipoMiembro.nombre}` : `Editar ${equipoEditando?.nombre}`}</h2><button type="button" className="btn-close" aria-label="Cerrar" onClick={() => { setEquipoMiembro(null); setEquipoEditando(null); }} /></div><div className="modal-body">{equipoMiembro ? <><label htmlFor="email-miembro" className="form-label">Email del miembro</label><input id="email-miembro" type="email" className="form-control" autoFocus value={emailMiembro} onChange={(event) => setEmailMiembro(event.target.value)} placeholder="persona@empresa.com" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void guardarMiembro(); } }} /></> : <><label htmlFor="nombre-editado" className="form-label">Nombre del equipo</label><input id="nombre-editado" type="text" className="form-control" autoFocus value={nombreEditado} onChange={(event) => setNombreEditado(event.target.value)} /></>}</div><div className="modal-footer"><button type="button" className="btn btn-light" onClick={() => { setEquipoMiembro(null); setEquipoEditando(null); }}>Cancelar</button><button type="button" className="btn btn-primary" disabled={equipoMiembro ? !emailMiembro.trim() || guardandoMiembro : !nombreEditado.trim()} onClick={() => void (equipoMiembro ? guardarMiembro() : guardarNombre())}>{guardandoMiembro ? 'Guardando…' : 'Guardar'}</button></div></div></div></div>}
    </LayoutBackoffice>
  );
};

export default HomeBackoffice;
