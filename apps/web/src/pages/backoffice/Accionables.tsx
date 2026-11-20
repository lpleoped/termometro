import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AccionPlanInput, AccionPlanResponse, AIAnalysisResponse, DashboardEstadoActual, HorizonteAccion } from '@termometro/shared';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import SeguimientoAccion from '../../components/dashboard/plan/SeguimientoAccion';
import { lecturaMasReciente, ordenarAccionables } from '../../domain/accionables';
import { indiceVisible } from '../../domain/indice-ronda';
import api from '../../services/api';
import { getDashboardPorInstanciaId } from '../../services/dashboardService';
import { getEquipos } from '../../services/equipoService';
import { iaMessage } from '../../services/iaSettingsService';

const EQUIPO_ACTIVO = 'termometro-equipo-activo';
const empty = { descripcion: '', ownerRole: '', horizon: '30d' as HorizonteAccion, successMetric: '', checkInQuestion: '' };

interface Equipo { _id?: string; id?: string; nombre?: string }
interface Ronda { _id?: string; id?: string; activadoEn?: string; evaluacion?: { titulo?: string } }
interface Borrador extends Omit<AccionPlanInput, 'instanciaId'> {
  instanciaId: string;
  indicadores: Array<{ id: string; texto: string }>;
}

function idDe(doc: { _id?: string; id?: string } | null | undefined): string {
  return doc ? String(doc._id || doc.id || '') : '';
}

function traerAltaALaVista(nodo: HTMLElement): boolean {
  const boton = nodo.querySelector<HTMLElement>('[data-guardar-accion]');
  if (!boton) return false;
  const header = document.querySelector('.app-navbar')?.getBoundingClientRect().height ?? 72;
  const margen = 16;
  const arriba = header + margen;
  const limite = window.innerHeight - margen;
  const top = nodo.getBoundingClientRect().top;
  const bottom = boton.getBoundingClientRect().bottom;
  const alto = bottom - top;
  const espacio = limite - arriba;
  if (alto > espacio) {
    const delta = top - arriba;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'auto' });
    return true;
  }
  let delta = 0;
  if (bottom > limite) delta = bottom - limite;
  if (top + delta < arriba) delta = top - arriba;
  if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'auto' });
  return false;
}

function nombreIndicador(id: string, tablero: DashboardEstadoActual | null): string {
  const indicador = tablero?.indicadores.find((item) => item.id === id);
  if (indicador) return indicador.texto;
  const seccion = /^section-(\d+)$/.exec(id);
  if (seccion) return tablero?.secciones[Number(seccion[1]) - 1]?.titulo || id;
  return id;
}

export default function Accionables() {
  const [params, setParams] = useSearchParams();
  const deUrl = params.get('instanciaId') || '';
  const equipoDeUrl = params.get('equipoId') || '';
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoId, setEquipoId] = useState(equipoDeUrl);
  const [rondas, setRondas] = useState<Ronda[]>([]);
  const [acciones, setAcciones] = useState<AccionPlanResponse[]>([]);
  const [lectura, setLectura] = useState<AIAnalysisResponse | null>(null);
  const [tablero, setTablero] = useState<DashboardEstadoActual | null>(null);
  const [publicar, setPublicar] = useState<{ canalId?: string; tareasId?: string }>({});
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [altaManual, setAltaManual] = useState(false);
  const [guardarFijo, setGuardarFijo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [omitida, setOmitida] = useState('');
  const [confirmarOmitir, setConfirmarOmitir] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [intento, setIntento] = useState(0);
  const descripcion = useRef<HTMLTextAreaElement>(null);
  const altaRef = useRef<HTMLElement | null>(null);
  const avisoGuardado = useRef<HTMLParagraphElement>(null);
  const avisoOmitida = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    setConfirmarOmitir(null);
    setOmitida('');
    getEquipos().then(async (listaCruda) => {
      const lista = (Array.isArray(listaCruda) ? listaCruda : []) as Equipo[];
      if (cancelado) return;
      setEquipos(lista);
      const porEquipo = await Promise.all(lista.map(async (equipo) => {
        const id = idDe(equipo);
        if (!id) return { id, rondas: [] as Ronda[] };
        try {
          const res = await api.get<Ronda[]>('/instancias', { params: { equipoId: id } });
          return { id, rondas: Array.isArray(res.data) ? res.data : [] };
        } catch {
          return { id, rondas: [] as Ronda[] };
        }
      }));
      if (cancelado) return;
      const guardado = localStorage.getItem(EQUIPO_ACTIVO) || '';
      const porRonda = deUrl ? porEquipo.find((fila) => fila.rondas.some((ronda) => idDe(ronda) === deUrl)) : undefined;
      const elegido = equipoDeUrl || porRonda?.id || (porEquipo.some((fila) => fila.id === guardado) ? guardado : '') || porEquipo[0]?.id || '';
      setEquipoId(elegido);
      if (!elegido) { setCargando(false); return; }
      const delEquipo = porEquipo.find((fila) => fila.id === elegido)?.rondas || [];
      setRondas(delEquipo);
      const [accionesRes, analisisRes, ajustesRes] = await Promise.all([
        api.get<AccionPlanResponse[]>('/acciones', { params: { equipoId: elegido } }),
        api.get<AIAnalysisResponse[]>('/ai/analyses', { params: { equipoId: elegido } }),
        api.get<{ slackConnectionId?: string; mondayConnectionId?: string }>(`/equipos/${elegido}/integraciones`).catch(() => ({ data: {} as { slackConnectionId?: string; mondayConnectionId?: string } })),
      ]);
      if (cancelado) return;
      const listaAcciones = Array.isArray(accionesRes.data) ? accionesRes.data : [];
      const analisis = Array.isArray(analisisRes.data) ? analisisRes.data : [];
      const ids = new Set<string>([
        ...delEquipo.map(idDe),
        ...listaAcciones.map((accion) => accion.instanciaEvaluacion),
        ...analisis.map((item) => item.instanciaId || ''),
      ]);
      ids.delete('');
      const ultima = lecturaMasReciente(analisis, [...ids]);
      if (ultima?.instanciaId) ids.add(ultima.instanciaId);
      setAcciones(listaAcciones);
      setLectura(ultima);
      setPublicar({ canalId: ajustesRes.data.slackConnectionId, tareasId: ajustesRes.data.mondayConnectionId });
      localStorage.setItem(EQUIPO_ACTIVO, elegido);
      const rondaIndice = (deUrl && ids.has(deUrl) ? deUrl : '') || ultima?.instanciaId || idDe(delEquipo[0]);
      if (rondaIndice) {
        const data = await getDashboardPorInstanciaId(rondaIndice).catch(() => null);
        if (!cancelado) setTablero(data);
      } else if (!cancelado) setTablero(null);
    }).catch((causa) => {
      if (!cancelado) setError(iaMessage(causa));
    }).finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [deUrl, equipoDeUrl, intento]);

  const elegirEquipo = (id: string) => {
    setParams({ equipoId: id }, { replace: true });
  };

  const enfocar = (siguiente: Borrador) => {
    setAltaManual(false);
    setBorrador(siguiente);
    setGuardado(false);
    setAviso('');
    setConfirmarOmitir(null);
    setTimeout(() => descripcion.current?.focus({ preventScroll: true }), 0);
  };

  const abrirRegistro = () => {
    setBorrador(null);
    setAltaManual(true);
    setGuardado(false);
    setAviso('');
    setConfirmarOmitir(null);
    setTimeout(() => descripcion.current?.focus({ preventScroll: true }), 0);
  };

  const volver = () => {
    setBorrador(null);
    setAltaManual(false);
    setAviso('');
    setGuardado(false);
    setConfirmarOmitir(null);
  };

  const quedarse = async (indice: number) => {
    if (!lectura?.instanciaId || ocupado) return;
    const propuesta = lectura.accionesContextuales?.[indice];
    if (!propuesta) return;
    const data = await getDashboardPorInstanciaId(lectura.instanciaId).catch(() => tablero);
    const indicadores = (propuesta.evidenceIds || []).map((id) => ({ id, texto: nombreIndicador(id, data) }));
    enfocar({
      ...empty,
      descripcion: propuesta.descripcion,
      ownerRole: propuesta.ownerRole,
      horizon: propuesta.horizon,
      successMetric: propuesta.successMetric,
      checkInQuestion: propuesta.checkInQuestion,
      evidenciaIds: propuesta.evidenceIds || [],
      analisisId: lectura.id,
      propuestaIndice: indice,
      instanciaId: lectura.instanciaId,
      indicadores,
    });
  };

  const dejarPasar = async (indice: number, titulo: string) => {
    if (!lectura || ocupado) return;
    setOcupado(true);
    setAviso('');
    try {
      const res = await api.post<{ propuestasOmitidas: number[] }>(`/ai/analyses/${lectura.id}/omitir`, { indice });
      setLectura({ ...lectura, propuestasOmitidas: res.data.propuestasOmitidas });
      setBorrador((prev) => (prev?.analisisId === lectura.id && prev.propuestaIndice === indice ? null : prev));
      setConfirmarOmitir(null);
      setOmitida(titulo);
      setGuardado(false);
    } catch (causa) {
      setAviso(iaMessage(causa));
    } finally {
      setOcupado(false);
    }
  };

  const ajustar = (accion: AccionPlanResponse) => {
    const indicadores = (accion.evidenciaIds || []).map((id) => ({ id, texto: nombreIndicador(id, tablero) }));
    enfocar({
      descripcion: accion.descripcion,
      ownerRole: accion.ownerRole || '',
      horizon: accion.horizon || '30d',
      successMetric: accion.successMetric || '',
      checkInQuestion: accion.checkInQuestion || '',
      evidenciaIds: accion.evidenciaIds || [],
      adaptadaDe: accion._id,
      instanciaId: accion.instanciaEvaluacion,
      indicadores,
    });
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    if (!borrador || ocupado) return;
    if (borrador.indicadores.length > 0 && (borrador.evidenciaIds || []).length === 0) {
      setAviso('Elegí al menos un indicador que esta acción quiere mover.');
      return;
    }
    setOcupado(true);
    setAviso('');
    setGuardado(false);
    try {
      const { indicadores, ...cuerpo } = borrador;
      void indicadores;
      const res = await api.post<AccionPlanResponse>('/acciones', cuerpo);
      setAcciones((prev) => [res.data, ...prev]);
      setBorrador(null);
      setAltaManual(false);
      setOmitida('');
      setGuardado(true);
    } catch (causa) {
      setAviso(iaMessage(causa));
    } finally {
      setOcupado(false);
    }
  };

  const equipo = equipos.find((item) => idDe(item) === equipoId);
  const { abiertas, propuestas, cerradas } = ordenarAccionables(acciones, lectura);
  const indice = tablero ? indiceVisible(tablero) : undefined;
  const rondaParaRegistrar = borrador?.instanciaId || lectura?.instanciaId || idDe(rondas[0]) || acciones[0]?.instanciaEvaluacion || '';
  const tituloRonda = (id: string) => {
    const ronda = rondas.find((item) => idDe(item) === id);
    if (ronda?.evaluacion?.titulo) return ronda.evaluacion.titulo;
    return id === (deUrl || lectura?.instanciaId) ? 'Esta ronda' : 'Ronda anterior de este equipo';
  };

  const cambiarCampo = (campo: keyof typeof empty, valor: string) => {
    setBorrador((prev) => ({
      ...(prev || { ...empty, evidenciaIds: [], instanciaId: rondaParaRegistrar, indicadores: [] }),
      [campo]: valor,
    }));
    setGuardado(false);
  };

  const altaJuntoAPropuesta = Boolean(borrador?.analisisId && borrador.propuestaIndice !== undefined);
  const mostrarRegistro = !altaJuntoAPropuesta && (altaManual || Boolean(borrador?.adaptadaDe) || propuestas.length === 0);
  const anclaAlta = altaJuntoAPropuesta
    ? `propuesta:${borrador?.propuestaIndice}`
    : borrador?.adaptadaDe
      ? `ajuste:${borrador.adaptadaDe}`
      : altaManual
        ? 'manual'
        : '';
  const botonFijo = guardarFijo !== '' && guardarFijo === anclaAlta;
  const puedeGuardar = Boolean(borrador?.descripcion.trim() && borrador.ownerRole.trim() && borrador.successMetric.trim() && borrador.checkInQuestion.trim());
  const puedeVolver = altaJuntoAPropuesta || Boolean(borrador?.adaptadaDe) || altaManual;
  const mostrarAltaDistinta = !altaManual && (propuestas.length > 0 || Boolean(borrador?.adaptadaDe));

  useLayoutEffect(() => {
    if (!anclaAlta) {
      setGuardarFijo('');
      return;
    }
    const nodo = document.querySelector<HTMLElement>('[data-alta-accion]');
    if (!nodo) return;
    setGuardarFijo(traerAltaALaVista(nodo) ? anclaAlta : '');
  }, [anclaAlta]);

  useEffect(() => {
    if (!guardado) return;
    avisoGuardado.current?.scrollIntoView({ block: 'nearest' });
  }, [guardado]);

  useEffect(() => {
    if (!omitida) return;
    avisoOmitida.current?.scrollIntoView({ block: 'nearest' });
  }, [omitida]);

  const alta = (
    <form className={altaJuntoAPropuesta ? undefined : 'alta-propuesta mb-4'} data-alta-accion={altaJuntoAPropuesta ? undefined : ''} onSubmit={guardar}>
      <h2 className="h5">{borrador?.adaptadaDe ? 'Ajustar como nueva' : borrador?.analisisId ? 'Revisar esta propuesta' : 'Registrar una acción'}</h2>
      {!rondaParaRegistrar && <p className="mb-3">Abrí una ronda antes de registrar una acción. <Link className="btn btn-sm btn-outline-secondary ms-2" to="/backoffice/publicar-evaluacion">Abrir la ronda</Link></p>}
      {borrador?.analisisId && <p className="small">Podés ajustar el texto antes de registrarla. El texto original de la lectura queda asociado.</p>}
      {borrador?.adaptadaDe && <p className="small">Se conserva el antecedente y el texto anterior, en este equipo.</p>}
      {aviso && <p className="alert alert-danger" role="alert">{aviso}</p>}
      <fieldset disabled={ocupado || !rondaParaRegistrar}>
        <label className="form-label d-block">Qué van a hacer<textarea ref={descripcion} className="form-control" rows={3} required maxLength={4000} value={borrador?.descripcion || ''} onChange={(event) => cambiarCampo('descripcion', event.target.value)} /></label>
        <div className="row g-3">
          <label className="col-md-8 form-label">Responsable<input className="form-control" required maxLength={200} value={borrador?.ownerRole || ''} onChange={(event) => cambiarCampo('ownerRole', event.target.value)} placeholder="Por ejemplo: facilitás la mejora" /></label>
          <label className="col-md-4 form-label">Plazo<select className="form-select" value={borrador?.horizon || '30d'} onChange={(event) => cambiarCampo('horizon', event.target.value)}><option value="7d">7 días</option><option value="30d">30 días</option><option value="90d">90 días</option></select></label>
        </div>
        <label className="form-label d-block">Cómo van a medir el resultado<input className="form-control" required maxLength={500} value={borrador?.successMetric || ''} onChange={(event) => cambiarCampo('successMetric', event.target.value)} /></label>
        <label className="form-label d-block">Pregunta para el seguimiento<input className="form-control" required maxLength={500} value={borrador?.checkInQuestion || ''} onChange={(event) => cambiarCampo('checkInQuestion', event.target.value)} /></label>
        {!!borrador?.indicadores.length && (
          <fieldset className="mb-3">
            <legend className="form-label">Indicadores que quiere mover</legend>
            {borrador.indicadores.map((item) => (
              <label className="d-block" key={item.id}>
                <input className="form-check-input me-2" type="checkbox" checked={(borrador.evidenciaIds || []).includes(item.id)} onChange={(event) => setBorrador((prev) => prev ? { ...prev, evidenciaIds: event.target.checked ? [...(prev.evidenciaIds || []), item.id] : (prev.evidenciaIds || []).filter((id) => id !== item.id) } : prev)} />
                {item.texto}
              </label>
            ))}
          </fieldset>
        )}
      </fieldset>
      <div className={`alta-decision${botonFijo ? ' alta-guardar-fijo' : ''}`} data-guardar-accion>
        <div className="alta-decision-interior">
          {altaJuntoAPropuesta && <p>Todavía no está registrada.</p>}
          <button className="btn btn-primary" type="submit" disabled={ocupado || !rondaParaRegistrar || !puedeGuardar}>{ocupado ? 'Guardando…' : 'Registrar esta acción'}</button>
          {puedeVolver && <button className="btn btn-outline-secondary" type="button" disabled={ocupado} onClick={volver}>Volver</button>}
        </div>
      </div>
    </form>
  );

  return (
    <LayoutBackoffice>
      <div className="container py-5 accionables-pagina" style={{ maxWidth: 720 }}>
        <div className="d-flex align-items-center gap-2 mb-3">
          <h1 className="fw-bold mb-0">Accionables</h1>
          <InfoAyuda tema="accionables" />
        </div>
        <p>Cada propuesta se registra o no se sigue; hasta registrarla no aparece arriba, en Acciones que se siguen. Una acción de una ronda anterior sigue acá aunque abras otra.</p>
        {cargando && <p role="status">Leyendo las acciones del equipo…</p>}
        {error && <div className="alert alert-danger" role="alert"><p>{error}</p><button className="btn btn-outline-danger" type="button" onClick={() => setIntento((n) => n + 1)}>Reintentar</button></div>}
        {!cargando && !error && equipos.length === 0 && <p>Primero creá un equipo. <Link className="btn btn-sm btn-primary ms-2" to="/backoffice/home">Crear equipo</Link></p>}
        {!cargando && !error && equipos.length > 1 && (
          <label className="form-label d-block mb-4">Equipo
            <select className="form-select" value={equipoId} onChange={(event) => elegirEquipo(event.target.value)}>
              {equipos.map((item) => <option key={idDe(item)} value={idDe(item)}>{item.nombre || 'Equipo'}</option>)}
            </select>
          </label>
        )}
        {!cargando && !error && equipo && <p className="text-muted">{equipo.nombre || 'Equipo'}</p>}
        {!cargando && !error && tablero && (
          <p>
            {typeof indice === 'number' ? `Índice de esta ronda: ${indice} / 100.` : 'Esta ronda no tiene índice.'}
            {' '}Respondieron {tablero.participacion.recibida} de {tablero.participacion.esperada}.
          </p>
        )}
        {!cargando && !error && equipoId && (
          <>
            <h2 className="h5 mt-4">Acciones que se siguen</h2>
            {guardado && <p ref={avisoGuardado} className="text-success alta-aviso" role="status">Quedó registrada. La ves en esta lista.</p>}
            {abiertas.length === 0 && <p>No hay acciones abiertas.</p>}
            <div className="d-grid gap-3 mb-4">
              {abiertas.map((accion) => (
                <SeguimientoAccion key={accion._id} accion={accion} publicar={publicar} ronda={tituloRonda(accion.instanciaEvaluacion)} onAdapt={ajustar} onChange={(actualizada) => setAcciones((prev) => prev.map((item) => item._id === actualizada._id ? actualizada : item))} />
              ))}
            </div>
            <h2 className="h5">Propuestas de la última lectura</h2>
            {omitida && <p ref={avisoOmitida} role="status">No se registró “{omitida}”.</p>}
            {aviso && !altaJuntoAPropuesta && !mostrarRegistro && <p className="alert alert-danger" role="alert">{aviso}</p>}
            {propuestas.length === 0 && <p>No hay propuestas pendientes. Podés registrar una acción igual.</p>}
            <div className="d-grid gap-3 mb-4">
              {propuestas.map(({ propuesta, indice: numero }) => {
                const elegida = altaJuntoAPropuesta && borrador?.propuestaIndice === numero;
                return (
                  <article className={`border rounded p-3${elegida ? ' alta-propuesta' : ''}`} data-alta-accion={elegida ? '' : undefined} key={numero}>
                    <h3 className="h6">{propuesta.titulo}</h3>
                    {!elegida && (
                      <>
                        <p>{propuesta.descripcion}</p>
                        <p className="small">Responsable: {propuesta.ownerRole} · Plazo: {propuesta.horizon.replace('d', ' días')} · Métrica: {propuesta.successMetric}</p>
                        {!!propuesta.evidenceIds?.length && <p className="small">Indicadores que pretende mover: {propuesta.evidenceIds.map((id) => nombreIndicador(id, tablero)).join(' · ')}</p>}
                        <p className="small mb-2">Todavía no está registrada.</p>
                        <div className="d-flex flex-wrap gap-2">
                          {confirmarOmitir === numero ? (
                            <>
                              <button className="btn btn-sm btn-outline-secondary" type="button" disabled={ocupado} onClick={() => void dejarPasar(numero, propuesta.titulo)}>No se registra. Confirmar</button>
                              <button className="btn btn-sm btn-outline-secondary" type="button" disabled={ocupado} onClick={() => setConfirmarOmitir(null)}>Volver</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-sm btn-primary" type="button" disabled={ocupado} onClick={() => void quedarse(numero)}>Revisar para registrarla</button>
                              <button className="btn btn-sm btn-outline-secondary" type="button" disabled={ocupado} onClick={() => setConfirmarOmitir(numero)}>No seguir esta</button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    {elegida && alta}
                  </article>
                );
              })}
            </div>
            {mostrarAltaDistinta && (
              <p className="mb-4"><button className="btn btn-outline-secondary" type="button" onClick={abrirRegistro}>Registrar una acción distinta</button></p>
            )}
            {mostrarRegistro && alta}
            {cerradas.length > 0 && (
              <details className="mt-4">
                <summary>Verificadas y rechazadas ({cerradas.length})</summary>
                <div className="d-grid gap-3 mt-3 small">
                  {cerradas.map((accion) => (
                    <SeguimientoAccion key={accion._id} accion={accion} publicar={publicar} ronda={tituloRonda(accion.instanciaEvaluacion)} onAdapt={ajustar} onChange={(actualizada) => setAcciones((prev) => prev.map((item) => item._id === actualizada._id ? actualizada : item))} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </LayoutBackoffice>
  );
}
