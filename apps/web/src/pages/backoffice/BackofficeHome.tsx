import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { AIProviderResponse, AISettings } from '@termometro/shared';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import { marcasDeCuestionario } from '../../domain/cuestionariosEquipo';
import { primariaSinRonda, secundariaSinRonda } from '../../domain/fichaEquipo';
import { pasoDelEquipo } from '../../domain/pasoFacilitador';
import { agregarMiembro, archivarEquipo, actualizarEquipo, crearEquipo, getEquipos, quitarMiembro } from '../../services/equipoService';
import { getEvaluaciones, type Evaluacion } from '../../services/evaluacionService';
import { getIAProviders, getIASettings } from '../../services/iaSettingsService';
import { createTeamContext, getTeamContext } from '../../services/teamContextService';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import './BackofficeHome.css';

interface RondaAbierta { id: string; titulo: string; evaluacionId: string; activadoEn?: string }
interface EquipoPanel {
  id: string;
  nombre: string;
  rondas: RondaAbierta[];
  miembros: string[];
  contextoVigente: boolean;
  contextoTitulos: string[];
  rondaCompartida: boolean;
}

function idDe(doc: { _id?: string; id?: string } | null | undefined): string {
  return doc ? String(doc._id || doc.id || '') : '';
}

function sinRondas(error: unknown): boolean {
  if (typeof error !== 'object' || !error || !('response' in error)) return false;
  const response = (error as { response?: { status?: number; data?: { error?: string } } }).response;
  return response?.status === 400 && /no se encontraron instancias/i.test(response.data?.error ?? '');
}

function fechaAbierta(iso?: string): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function rondasDelEquipo(equipoId: string): Promise<{ abiertas: RondaAbierta[]; compartida: boolean }> {
  try {
    const res = await api.get('/instancias', { params: { equipoId } });
    const lista = Array.isArray(res.data) ? res.data : [];
    const abiertas = lista
      .filter((instancia: { estado?: string }) => instancia.estado === 'activa')
      .map((instancia: { _id?: string; id?: string; activadoEn?: string; evaluacion?: { _id?: string; id?: string; titulo?: string } }) => ({
        id: idDe(instancia),
        titulo: instancia.evaluacion?.titulo || 'Cuestionario',
        evaluacionId: idDe(instancia.evaluacion),
        activadoEn: instancia.activadoEn,
      }))
      .filter((ronda: RondaAbierta) => ronda.id && ronda.evaluacionId);
    return { abiertas, compartida: lista.length > 0 };
  } catch (error) {
    if (sinRondas(error)) return { abiertas: [], compartida: false };
    throw error;
  }
}

function PersonasEquipo({ equipo, onAgregar, onQuitar }: { equipo: EquipoPanel; onAgregar: () => void; onQuitar: (email: string) => void }) {
  return (
    <div className="members-section mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="section-label">Personas</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onAgregar}>Agregar persona</button>
      </div>
      {equipo.miembros.length === 0 ? <p className="small text-muted mb-0">Todavía no agregaste personas.</p> : (
        <div className="d-flex flex-wrap gap-2">
          {equipo.miembros.map((email) => (
            <span key={email} className="member-chip">
              {email}
              <button type="button" aria-label={`Quitar ${email}`} onClick={() => onQuitar(email)}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function lineaConConteo(personas: number, rondas: number): string {
  const partes = [
    personas > 0 ? `${personas} ${personas === 1 ? 'persona' : 'personas'}` : '',
    rondas > 0 ? `${rondas} ${rondas === 1 ? 'ronda abierta' : 'rondas abiertas'}` : '',
  ].filter(Boolean);
  return partes.join(' · ');
}

function AjusteEquipo({ equipo, onRenombrar, onArchivar, onAgregar, onQuitar }: {
  equipo: EquipoPanel;
  onRenombrar: () => void;
  onArchivar: () => void;
  onAgregar: () => void;
  onQuitar: (email: string) => void;
}) {
  const resumen = lineaConConteo(equipo.miembros.length, equipo.rondas.length);
  return (
    <details className="ajustar-equipo">
      <summary>Ajustar el equipo</summary>
      <div className="mt-3">
        {resumen && <p className="text-muted small mb-3">{resumen}</p>}
        <div className="team-actions mb-3">
          <button type="button" className="btn btn-sm btn-light" onClick={onRenombrar}>Editar nombre</button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onArchivar}>Archivar</button>
        </div>
        <PersonasEquipo equipo={equipo} onAgregar={onAgregar} onQuitar={onQuitar} />
      </div>
    </details>
  );
}

const HomeBackoffice = () => {
  const [equipos, setEquipos] = useState<EquipoPanel[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [ajustesIA, setAjustesIA] = useState<AISettings | null>(null);
  const [proveedores, setProveedores] = useState<AIProviderResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mostrarAlta, setMostrarAlta] = useState(false);
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
  const [params] = useSearchParams();
  const equipoDestacado = params.get('equipo') || '';
  const capturaContexto = params.get('paso') === 'contexto' && Boolean(equipoDestacado);
  const [textoContexto, setTextoContexto] = useState('');
  const [errorContexto, setErrorContexto] = useState('');
  const { addNotification } = useNotifications();

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      const [equiposRaw, evaluaciones, settings, providers] = await Promise.all([
        getEquipos(),
        getEvaluaciones(),
        getIASettings().catch(() => null),
        getIAProviders().catch(() => [] as AIProviderResponse[]),
      ]);
      const cargados = await Promise.all((Array.isArray(equiposRaw) ? equiposRaw : []).map(async (equipo: { _id?: string; id?: string; nombre?: string; miembros?: string[] }) => {
        const id = idDe(equipo);
        if (!id) throw new Error('Equipo sin id');
        const contexto = await getTeamContext(id).catch(() => []);
        const vigentes = contexto.filter((item) => item.status !== 'obsolete');
        const rondas = await rondasDelEquipo(id);
        return {
          id,
          nombre: equipo.nombre || 'Equipo',
          miembros: equipo.miembros || [],
          rondas: rondas.abiertas,
          contextoVigente: vigentes.length > 0,
          contextoTitulos: vigentes.map((item) => item.title),
          rondaCompartida: rondas.compartida,
        };
      }));
      setEvaluaciones(Array.isArray(evaluaciones) ? evaluaciones : []);
      setAjustesIA(settings);
      setProveedores(Array.isArray(providers) ? providers : []);
      setEquipos(cargados);
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    if (!equipoDestacado || cargando || capturaContexto) return;
    const primaria = document.getElementById(`conectar-${equipoDestacado}`)
      || document.getElementById(`contexto-${equipoDestacado}`)
      || document.getElementById(`cuestionario-${equipoDestacado}`)
      || document.getElementById(`paso-${equipoDestacado}`);
    primaria?.focus();
  }, [equipoDestacado, cargando, equipos, capturaContexto]);

  const guardarContexto = async (event: FormEvent) => {
    event.preventDefault();
    const texto = textoContexto.trim();
    if (!texto || !equipoDestacado) return;
    setGuardando(true);
    setErrorContexto('');
    try {
      await createTeamContext(equipoDestacado, {
        type: 'stable_fact',
        title: 'Cómo es este equipo',
        content: texto,
        scope: 'team',
        status: 'active',
        confidence: 1,
        importance: 'relevant',
        sensitivity: 'normal',
        influence: 'interpretation_and_action',
      });
      setTextoContexto('');
      navigate(`/backoffice/equipos?equipo=${equipoDestacado}`);
      await cargar();
    } catch {
      setErrorContexto('No se pudo guardar el contexto.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCrear = async (event: FormEvent) => {
    event.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || guardando) return;
    setGuardando(true);
    setErrorAlta(false);
    try {
      const creado = await crearEquipo(nombreLimpio) as { _id?: string; id?: string };
      const id = idDe(creado);
      setNombre('');
      setMostrarAlta(false);
      if (id) navigate(`/backoffice/equipos?equipo=${id}`);
      await cargar();
      addNotification({ type: 'success', title: 'Equipo creado', message: 'Seguí con el paso de esta ficha.' });
    } catch {
      setErrorAlta(true);
      addNotification({ type: 'error', title: 'No se pudo crear el equipo', message: 'Revisá el nombre e intentá nuevamente.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleRenombrar = (equipo: EquipoPanel) => {
    setEquipoEditando(equipo);
    setNombreEditado(equipo.nombre);
  };

  const guardarNombre = async () => {
    if (!equipoEditando) return;
    const nuevo = nombreEditado.trim();
    if (!nuevo || nuevo === equipoEditando.nombre) {
      setEquipoEditando(null);
      return;
    }
    try {
      setErrorGestion('');
      await actualizarEquipo(equipoEditando.id, nuevo);
      await cargar();
      setEquipoEditando(null);
      addNotification({ type: 'success', title: 'Equipo actualizado', message: 'El nombre fue actualizado.' });
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

  const guardarMiembro = async () => {
    if (!equipoMiembro || !emailMiembro.trim()) return;
    setGuardandoMiembro(true);
    try {
      setErrorGestion('');
      await agregarMiembro(equipoMiembro.id, emailMiembro.trim());
      await cargar();
      addNotification({ type: 'success', title: 'Miembro agregado', message: `${emailMiembro.trim()} ya forma parte del equipo.` });
      setEquipoMiembro(null);
    } catch {
      setErrorGestion('No se pudo agregar el miembro. Verificá el email o si ya existe.');
    } finally {
      setGuardandoMiembro(false);
    }
  };

  const quitar = async (equipo: EquipoPanel, email: string) => {
    if (!window.confirm(`¿Quitar a ${email} del equipo?`)) return;
    try {
      setErrorGestion('');
      await quitarMiembro(equipo.id, email);
      await cargar();
      addNotification({ type: 'success', title: 'Miembro quitado', message: `${email} ya no forma parte del equipo.` });
    } catch {
      setErrorGestion('No se pudo quitar el miembro.');
    }
  };

  const ir = (destino: string) => navigate(destino);
  const abrirAlta = () => {
    setMostrarAlta((visible) => !visible);
    setTimeout(() => document.getElementById('nuevo-equipo')?.focus(), 0);
  };

  if (cargando) {
    return (
      <LayoutBackoffice>
        <div className="container py-5 text-center">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-3 text-muted">Cargando equipos...</p>
        </div>
      </LayoutBackoffice>
    );
  }

  if (errorCarga) {
    return (
      <LayoutBackoffice>
        <div className="container py-5">
          <div className="alert alert-danger">
            <p className="mb-3">No se pudieron cargar tus equipos.</p>
            <button className="btn btn-outline-danger" type="button" onClick={() => void cargar()}>Reintentar</button>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  const equipoCaptura = equipos.find((equipo) => equipo.id === equipoDestacado);
  if (capturaContexto) {
    if (!equipoCaptura) {
      return (
        <LayoutBackoffice>
          <div className="container py-5" style={{ maxWidth: 720 }}>
            <h1 className="h3">No encontramos ese equipo</h1>
            <p>Volvé a la lista y elegí el equipo para contarle a la inteligencia cómo es.</p>
            <button className="btn btn-primary" type="button" onClick={() => navigate('/backoffice/equipos')}>Volver a equipos</button>
          </div>
        </LayoutBackoffice>
      );
    }
    return (
      <LayoutBackoffice>
        <div className="container py-4 py-lg-5" style={{ maxWidth: 720 }}>
          <h1 className="h3 mb-3">Contale a la inteligencia cómo es {equipoCaptura.nombre}</h1>
          <p>En un solo texto: quiénes son, qué está pasando ahora y qué no hay que ignorar.</p>
          <form onSubmit={guardarContexto}>
            <label className="form-label" htmlFor="contexto-breve">Contexto del equipo</label>
            <textarea id="contexto-breve" className="form-control mb-3" rows={8} required value={textoContexto} onChange={(event) => { setTextoContexto(event.target.value); setErrorContexto(''); }} autoFocus disabled={guardando} />
            <p className="text-muted">El detalle queda para cuando quieras ajustar este contexto.</p>
            {errorContexto && <p className="text-danger" role="alert">{errorContexto}</p>}
            <button className="btn btn-primary paso-primaria" type="submit" disabled={guardando || !textoContexto.trim()}>{guardando ? 'Guardando…' : 'Guardar contexto'}</button>
          </form>
        </div>
      </LayoutBackoffice>
    );
  }

  const contenidoVacio = equipos.length === 0;
  const algunaRonda = equipos.some((equipo) => equipo.rondaCompartida);
  const foco = equipoDestacado || equipos[0]?.id || '';
  const sinMedicion = !algunaRonda
    ? [...equipos.filter((equipo) => equipo.id === foco), ...equipos.filter((equipo) => equipo.id !== foco)]
    : [];

  const panelAlta = mostrarAlta && (
    <section className="new-team-panel card border-0 shadow-sm mb-4" aria-label="Crear equipo">
      <form onSubmit={handleCrear} className="row g-3 align-items-end">
        <div className="col-md-8">
          <label htmlFor="nuevo-equipo" className="form-label fw-semibold mb-1">Nombre del nuevo equipo</label>
          <input id="nuevo-equipo" className="form-control form-control-lg" placeholder="Ej.: Producto, Operaciones o QA" value={nombre} onChange={(event) => { setNombre(event.target.value); setErrorAlta(false); }} disabled={guardando} />
          {errorAlta && <div className="text-danger small mt-2">No se pudo crear el equipo. Intentá nuevamente.</div>}
        </div>
        <div className="col-md-4 d-grid">
          <button type="submit" className="btn btn-primary btn-lg" disabled={!nombre.trim() || guardando}>{guardando ? 'Creando...' : 'Crear equipo'}</button>
        </div>
      </form>
    </section>
  );

  return (
    <LayoutBackoffice>
      <div className="equipos-page container py-4">
        {contenidoVacio ? (
          <>
            <header className="equipos-hero mb-4">
              <p className="eyebrow mb-2">Gestión</p>
              <div className="d-flex align-items-center gap-2 mb-2">
                <h1 className="display-6 fw-bold mb-0">Equipos</h1>
                <InfoAyuda tema="equipos" />
              </div>
              <p className="text-muted mb-0">Organizá personas y seguí el clima de cada equipo.</p>
            </header>
            <section className="empty-state card border-0 shadow-sm text-center p-4 p-md-5">
              <div className="empty-state-icon">+</div>
              <h2 className="h3 fw-bold">Creá tu primer equipo</h2>
              <p className="text-muted mx-auto mb-4">Necesitás un equipo para abrir una ronda y empezar a medir su clima.</p>
              <form onSubmit={handleCrear} className="empty-state-form mx-auto">
                <label htmlFor="nombre-equipo" className="visually-hidden">Nombre del equipo</label>
                <div className="input-group input-group-lg">
                  <input id="nombre-equipo" className="form-control" placeholder="Ej.: Producto, Operaciones o QA" value={nombre} onChange={(event) => { setNombre(event.target.value); setErrorAlta(false); }} disabled={guardando} autoFocus />
                  <button className="btn btn-primary" type="submit" disabled={!nombre.trim() || guardando}>{guardando ? 'Creando...' : 'Crear equipo'}</button>
                </div>
                {errorAlta && <div className="text-danger small mt-2">No se pudo crear el equipo. Intentá nuevamente.</div>}
              </form>
            </section>
          </>
        ) : algunaRonda ? (
          <>
            <header className="equipos-hero d-flex flex-wrap justify-content-between align-items-end gap-4 mb-4">
              <div>
                <p className="eyebrow mb-2">Gestión</p>
                <div className="d-flex align-items-center gap-2 mb-2">
                <h1 className="display-6 fw-bold mb-0">Equipos</h1>
                <InfoAyuda tema="equipos" />
              </div>
                <p className="text-muted mb-0">Organizá personas y seguí el clima de cada equipo.</p>
              </div>
              <button type="button" className="btn btn-outline-secondary" onClick={abrirAlta}>{mostrarAlta ? 'Cerrar' : 'Nuevo equipo'}</button>
            </header>
            {panelAlta}
            <ContadoresEquipos equipos={equipos} />
            {equipos.map((equipo) => (
              equipo.rondaCompartida ? (
                <TarjetaGestion
                  key={equipo.id}
                  equipo={equipo}
                  ajustesIA={ajustesIA}
                  proveedores={proveedores}
                  evaluaciones={evaluaciones}
                  onRenombrar={() => handleRenombrar(equipo)}
                  onArchivar={() => void handleArchivar(equipo)}
                  onAgregar={() => { setEquipoMiembro(equipo); setEmailMiembro(''); }}
                  onQuitar={(email) => void quitar(equipo, email)}
                  onIr={ir}
                />
              ) : (
                <FichaSinRonda
                  key={equipo.id}
                  equipo={equipo}
                  principal={equipo.id === foco}
                  ajustesIA={ajustesIA}
                  proveedores={proveedores}
                  evaluaciones={evaluaciones}
                  onRenombrar={() => handleRenombrar(equipo)}
                  onArchivar={() => void handleArchivar(equipo)}
                  onAgregar={() => { setEquipoMiembro(equipo); setEmailMiembro(''); }}
                  onQuitar={(email) => void quitar(equipo, email)}
                  onIr={ir}
                />
              )
            ))}
          </>
        ) : (
          <div className="ficha-siguiente">
            {sinMedicion.map((equipo) => (
              <FichaSinRonda
                key={equipo.id}
                equipo={equipo}
                principal={equipo.id === foco}
                ajustesIA={ajustesIA}
                proveedores={proveedores}
                evaluaciones={evaluaciones}
                onRenombrar={() => handleRenombrar(equipo)}
                onArchivar={() => void handleArchivar(equipo)}
                onAgregar={() => { setEquipoMiembro(equipo); setEmailMiembro(''); }}
                onQuitar={(email) => void quitar(equipo, email)}
                onIr={ir}
              />
            ))}
            <button type="button" className="btn btn-outline-secondary" onClick={abrirAlta}>{mostrarAlta ? 'Cerrar' : 'Nuevo equipo'}</button>
            {panelAlta}
          </div>
        )}
        {errorGestion && <div className="alert alert-warning mt-3" role="alert">{errorGestion}</div>}
      </div>
      {(equipoMiembro || equipoEditando) && (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="dialogo-equipo-titulo" style={{ background: 'rgba(15, 23, 42, .42)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h2 id="dialogo-equipo-titulo" className="modal-title h5">{equipoMiembro ? `Agregar persona a ${equipoMiembro.nombre}` : `Editar ${equipoEditando?.nombre}`}</h2>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => { setEquipoMiembro(null); setEquipoEditando(null); }} />
              </div>
              <div className="modal-body">
                {equipoMiembro ? (
                  <>
                    <label htmlFor="email-miembro" className="form-label">Email de la persona</label>
                    <input id="email-miembro" type="email" className="form-control" autoFocus value={emailMiembro} onChange={(event) => setEmailMiembro(event.target.value)} placeholder="persona@empresa.com" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void guardarMiembro(); } }} />
                  </>
                ) : (
                  <>
                    <label htmlFor="nombre-editado" className="form-label">Nombre del equipo</label>
                    <input id="nombre-editado" type="text" className="form-control" autoFocus value={nombreEditado} onChange={(event) => setNombreEditado(event.target.value)} />
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => { setEquipoMiembro(null); setEquipoEditando(null); }}>Cancelar</button>
                <button type="button" className="btn btn-primary" disabled={equipoMiembro ? !emailMiembro.trim() || guardandoMiembro : !nombreEditado.trim()} onClick={() => void (equipoMiembro ? guardarMiembro() : guardarNombre())}>{guardandoMiembro ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </LayoutBackoffice>
  );
};

function FichaSinRonda({ equipo, principal, ajustesIA, proveedores, evaluaciones, onRenombrar, onArchivar, onAgregar, onQuitar, onIr }: {
  equipo: EquipoPanel;
  principal: boolean;
  ajustesIA: AISettings | null;
  proveedores: AIProviderResponse[];
  evaluaciones: Evaluacion[];
  onRenombrar: () => void;
  onArchivar: () => void;
  onAgregar: () => void;
  onQuitar: (email: string) => void;
  onIr: (destino: string) => void;
}) {
  const marcas = marcasDeCuestionario(evaluaciones, equipo.id);
  const paso = pasoDelEquipo({
    tieneEquipo: true,
    settings: ajustesIA,
    providers: proveedores,
    tieneCuestionario: marcas.tieneCuestionario,
    hayAlgunCuestionario: marcas.hayAlgunCuestionario,
    tieneContexto: equipo.contextoVigente,
    rondaCompartida: false,
  });
  const primaria = primariaSinRonda(paso, equipo.id);
  const secundaria = secundariaSinRonda(paso, equipo.id, marcas.hayAlgunCuestionario);
  const Titulo = principal ? 'h1' : 'h2';
  return (
    <article className={principal ? 'mb-4' : 'mb-5'}>
      <Titulo className={principal ? 'fw-bold mb-3' : 'h3 fw-bold mb-3'}>{equipo.nombre}</Titulo>
      <p className="text-muted">{primaria.frase}</p>
      <button id={primaria.ancla} className={`btn btn-primary btn-lg${principal ? ' paso-primaria' : ''}`} type="button" onClick={() => onIr(primaria.destino)}>
        {primaria.etiqueta}
      </button>
      {secundaria && <button id={secundaria.ancla} className="btn btn-outline-secondary ms-2" type="button" onClick={() => onIr(secundaria.destino)}>{secundaria.etiqueta}</button>}
      <AjusteEquipo equipo={equipo} onRenombrar={onRenombrar} onArchivar={onArchivar} onAgregar={onAgregar} onQuitar={onQuitar} />
    </article>
  );
}

function ContadoresEquipos({ equipos }: { equipos: EquipoPanel[] }) {
  const rondas = equipos.reduce((total, equipo) => total + equipo.rondas.length, 0);
  const personas = equipos.reduce((total, equipo) => total + equipo.miembros.length, 0);
  const tarjetas = [
    equipos.length > 0 ? { etiqueta: 'Equipos activos', valor: equipos.length } : null,
    rondas > 0 ? { etiqueta: 'Rondas abiertas', valor: rondas } : null,
    personas > 0 ? { etiqueta: 'Personas registradas', valor: personas } : null,
  ].filter((tarjeta): tarjeta is { etiqueta: string; valor: number } => Boolean(tarjeta));
  if (!tarjetas.length) return null;
  return (
    <section className="team-stats row g-3 mb-4" aria-label="Resumen de equipos">
      {tarjetas.map((tarjeta) => (
        <div className="col-sm-4" key={tarjeta.etiqueta}><div className="stat-card"><span>{tarjeta.etiqueta}</span><strong>{tarjeta.valor}</strong></div></div>
      ))}
    </section>
  );
}

function TarjetaGestion({ equipo, ajustesIA, proveedores, evaluaciones, onRenombrar, onArchivar, onAgregar, onQuitar, onIr }: {
  equipo: EquipoPanel;
  ajustesIA: AISettings | null;
  proveedores: AIProviderResponse[];
  evaluaciones: Evaluacion[];
  onRenombrar: () => void;
  onArchivar: () => void;
  onAgregar: () => void;
  onQuitar: (email: string) => void;
  onIr: (destino: string) => void;
}) {
  const marcas = marcasDeCuestionario(evaluaciones, equipo.id);
  const paso = pasoDelEquipo({
    tieneEquipo: true,
    settings: ajustesIA,
    providers: proveedores,
    tieneCuestionario: marcas.tieneCuestionario,
    hayAlgunCuestionario: marcas.hayAlgunCuestionario,
    tieneContexto: equipo.contextoVigente,
    rondaCompartida: equipo.rondaCompartida,
  });
  const primaria = primariaSinRonda(paso, equipo.id);
  const secundaria = secundariaSinRonda(paso, equipo.id, marcas.hayAlgunCuestionario);
  const rondaAbierta = equipo.rondas[0];
  const verRonda = paso === 'ver-la-ronda' && rondaAbierta
    ? { etiqueta: 'Ver la ronda', destino: `/backoffice/dashboard?instanciaId=${rondaAbierta.id}`, ancla: `paso-${equipo.id}` }
    : primaria;
  const resumen = lineaConConteo(equipo.miembros.length, equipo.rondas.length);
  const pedirContexto = Boolean(ajustesIA?.enabled) && !equipo.contextoVigente && paso !== 'dar-contexto';
  return (
    <article className="team-card card border-0 shadow-sm mb-3">
      <div className="card-body p-4">
        <h2 className="h4 fw-bold mb-1">{equipo.nombre}</h2>
        {resumen && <p className="text-muted small mb-3">{resumen}</p>}
        <p className="mb-3">{paso === 'dar-contexto' ? 'La inteligencia todavía no conoce a este equipo.' : verRonda.etiqueta === 'Ver la ronda' ? 'La ronda de este equipo está abierta.' : primaria.frase}</p>
        <button id={verRonda.ancla} type="button" className="btn btn-primary" onClick={() => onIr(verRonda.destino)}>{verRonda.etiqueta}</button>
        {secundaria && <button id={secundaria.ancla} type="button" className="btn btn-outline-secondary ms-2" onClick={() => onIr(secundaria.destino)}>{secundaria.etiqueta}</button>}
        {pedirContexto && (
          <div className="round-empty mt-3 mb-3">
            <span>La inteligencia todavía no conoce a este equipo.</span>
            <button id={`contexto-${equipo.id}`} type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onIr(`/backoffice/equipos?equipo=${equipo.id}&paso=contexto`)}>Dar contexto</button>
          </div>
        )}
        {equipo.contextoVigente && (
          <div className="mb-3 mt-3">
            <span className="section-label">Contexto</span>
            <ul className="mb-2">{equipo.contextoTitulos.map((titulo) => <li key={titulo}>{titulo}</li>)}</ul>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onIr(`/backoffice/configuracion/contexto?equipoId=${equipo.id}`)}>Ajustar este contexto</button>
          </div>
        )}
        {equipo.rondas.length > 0 && (
          <div className="rounds-section mt-3">
            <div className="section-label mb-2">Rondas abiertas</div>
            <div className="round-list">
              {equipo.rondas.map((ronda) => (
                <div key={ronda.id} className="round-row">
                  <div>
                    <strong>{ronda.titulo}</strong>
                    {ronda.activadoEn && <span className="small text-muted d-block">Abierta el {fechaAbierta(ronda.activadoEn)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <AjusteEquipo equipo={equipo} onRenombrar={onRenombrar} onArchivar={onArchivar} onAgregar={onAgregar} onQuitar={onQuitar} />
      </div>
    </article>
  );
}

export default HomeBackoffice;
