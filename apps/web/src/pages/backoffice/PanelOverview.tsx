import axios from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AccionPlanResponse, AIAnalysisResponse, AIProviderResponse, AISettings, TeamContextItem } from '@termometro/shared';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import { lecturaMasReciente, ordenarAccionables } from '../../domain/accionables';
import { elegirHoy, indiceAnteriorComparable, mapaHoy, type EquipoHoy, type FilaMapa, type HoyElegido } from '../../domain/atencion';
import { indiceVisible } from '../../domain/indice-ronda';
import { marcasDeCuestionario } from '../../domain/cuestionariosEquipo';
import { pasoDelEquipo } from '../../domain/pasoFacilitador';
import { primariaSinRonda } from '../../domain/fichaEquipo';
import api from '../../services/api';
import { getDashboardHistorico, getDashboardPorInstanciaId } from '../../services/dashboardService';
import { crearEquipo, getEquipos } from '../../services/equipoService';
import { getEvaluaciones } from '../../services/evaluacionService';
import { getIAProviders, getIASettings } from '../../services/iaSettingsService';
import { getTeamContext } from '../../services/teamContextService';

interface Equipo { _id?: string; id?: string; nombre?: string }
interface Ronda {
  _id?: string;
  id?: string;
  estado?: string;
  activadoEn?: string | Date;
  evaluacion?: { _id?: string; id?: string } | string;
}

interface Escalera { nombre: string; frase: string; etiqueta: string; destino: string }
type Vista =
  | { tipo: 'cargando' }
  | { tipo: 'error'; hoy: boolean }
  | { tipo: 'alta' }
  | { tipo: 'escalera'; paso: Escalera }
  | { tipo: 'hoy'; elegido: HoyElegido; mapa: FilaMapa[]; sinRonda: Array<{ equipoId: string; nombre: string }> };

const ULTIMA_RONDA = 'termometro-ultima-ronda';
const EQUIPO_ACTIVO = 'termometro-equipo-activo';

const BANDAS: Array<{ id: FilaMapa['banda']; titulo: string }> = [
  { id: 'atender', titulo: 'Para atender' },
  { id: 'curso', titulo: 'En curso' },
  { id: 'calma', titulo: 'Sin novedad' },
];

function numeroDe(valor: number): string {
  const redondo = Math.round(valor * 10) / 10;
  return String(redondo);
}

function claveSemaforo(nombre: string): string {
  return nombre === 'Crítico' ? 'critico' : nombre.toLowerCase();
}

function MapaEquipos({ mapa, sinRonda }: { mapa: FilaMapa[]; sinRonda: Array<{ equipoId: string; nombre: string }> }) {
  if (!mapa.length && !sinRonda.length) return null;
  return (
    <section className="mapa-equipos" aria-labelledby="mapa-equipos-titulo">
      <h2 id="mapa-equipos-titulo">Cómo están los equipos</h2>
      {BANDAS.map((banda) => {
        const filas = mapa.filter((fila) => fila.banda === banda.id);
        if (!filas.length) return null;
        return (
          <div key={banda.id} className="mapa-banda">
            <h3 className="mapa-banda-titulo">{banda.titulo}</h3>
            <ul className="mapa-filas">
              {filas.map((fila) => (
                <li key={fila.equipoId}>
                  <Link className="mapa-fila" to={fila.destino}>
                    <span className="mapa-nombre">{fila.nombre}</span>
                    <span className="mapa-motivo">{fila.motivo}</span>
                    {fila.indice != null && fila.semaforo && (
                      <span className={`mapa-indice mapa-${claveSemaforo(fila.semaforo)}`}>{numeroDe(fila.indice)} · {fila.semaforo}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {sinRonda.length > 0 && (
        <div className="mapa-banda">
          <h3 className="mapa-banda-titulo">Todavía sin ronda</h3>
          <ul className="mapa-filas">
            {sinRonda.map((equipo) => (
              <li key={equipo.equipoId}>
                <Link className="mapa-fila" to={`/backoffice/equipos?equipo=${equipo.equipoId}`}>
                  <span className="mapa-nombre">{equipo.nombre}</span>
                  <span className="mapa-motivo">Todavía no hay una ronda.</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function idDe(doc: { _id?: string; id?: string } | null | undefined): string {
  return doc ? String(doc._id || doc.id || '') : '';
}

function momento(ronda: Ronda): string {
  const valor = ronda.activadoEn;
  if (valor instanceof Date) return valor.toISOString();
  return String(valor || '');
}

function evaluacionIdDe(ronda: Ronda | undefined): string {
  const evaluacion = ronda?.evaluacion;
  if (!evaluacion) return '';
  if (typeof evaluacion === 'string') return evaluacion;
  return String(evaluacion._id || evaluacion.id || '');
}

function sinRondas(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return String(error.response?.data?.error || '').includes('No se encontraron instancias');
}

async function rondasDelEquipo(equipoId: string): Promise<Ronda[]> {
  try {
    const res = await api.get<Ronda[]>('/instancias', { params: { equipoId } });
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    if (sinRondas(error)) return [];
    throw error;
  }
}

function equipoRecordado(): string | null {
  try { return localStorage.getItem(EQUIPO_ACTIVO) || null; } catch { return null; }
}

function recordar(elegido: HoyElegido) {
  try {
    localStorage.setItem(EQUIPO_ACTIVO, elegido.equipoId);
    if (elegido.instanciaId) localStorage.setItem(ULTIMA_RONDA, elegido.instanciaId);
  } catch { /* el navegador puede bloquear el almacenamiento */ }
}

async function carteraDe(fila: { equipoId: string; nombre: string; rondas: Ronda[] }): Promise<EquipoHoy> {
  const rondas = [...fila.rondas].sort((a, b) => momento(b).localeCompare(momento(a)));
  const ultima = rondas[0];
  const instanciaId = idDe(ultima);
  const [accionesRes, analisisRes, tablero] = await Promise.all([
    api.get<AccionPlanResponse[]>('/acciones', { params: { equipoId: fila.equipoId } }),
    api.get<AIAnalysisResponse[]>('/ai/analyses', { params: { equipoId: fila.equipoId } }),
    instanciaId ? getDashboardPorInstanciaId(instanciaId) : Promise.resolve(null),
  ]);
  const acciones = Array.isArray(accionesRes.data) ? accionesRes.data : [];
  const analisis = Array.isArray(analisisRes.data) ? analisisRes.data : [];
  const protegido = Boolean(tablero?.privacidad?.protegido);
  const indice = tablero ? (protegido ? tablero.indiceGlobal : indiceVisible(tablero)) : null;
  const evaluacionId = evaluacionIdDe(ultima);
  let anterior: EquipoHoy['anterior'] = null;
  if (indice != null && !protegido && evaluacionId && instanciaId) {
    const historico = await getDashboardHistorico(fila.equipoId, evaluacionId);
    const previo = indiceAnteriorComparable(
      (historico.historico || []).map((punto) => ({
        instanciaId: punto.instanciaId,
        activadoEn: punto.activadoEn instanceof Date ? punto.activadoEn.toISOString() : String(punto.activadoEn),
        indice: punto.indiceGlobal,
      })),
      instanciaId,
      historico.comparabilidad?.valida !== false,
    );
    if (previo != null) anterior = { indice: previo, comparable: true };
  }
  const ids = rondas.map(idDe).filter(Boolean);
  const lectura = lecturaMasReciente(analisis, ids);
  return {
    equipoId: fila.equipoId,
    nombre: fila.nombre,
    ultimaRonda: tablero && instanciaId ? {
      instanciaId,
      abierta: ultima?.estado === 'activa',
      indice,
      protegido,
      recibidas: tablero.participacion?.recibida ?? 0,
      esperadas: tablero.participacion?.esperada ?? 0,
      sinLectura: !analisis.some((item) => item.instanciaId === instanciaId),
    } : null,
    anterior,
    seguimientos: acciones.flatMap((accion) => accion.checkIns || []),
    propuestasSinDecidir: ordenarAccionables(acciones, lectura).propuestas.length > 0,
  };
}

export default function PanelOverview() {
  const navigate = useNavigate();
  const [vista, setVista] = useState<Vista>({ tipo: 'cargando' });
  const [attempt, setAttempt] = useState(0);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorAlta, setErrorAlta] = useState('');

  useEffect(() => {
    let active = true;
    setVista({ tipo: 'cargando' });
    let midio = false;
    getEquipos().then(async (teams) => {
      if (!active) return;
      const lista = Array.isArray(teams) ? teams as Equipo[] : [];
      if (!lista.length) { setVista({ tipo: 'alta' }); return; }
      const porEquipo = await Promise.all(lista.map(async (equipo) => {
        const equipoId = idDe(equipo);
        const [rondas, contexto] = await Promise.all([
          rondasDelEquipo(equipoId),
          getTeamContext(equipoId).catch(() => [] as TeamContextItem[]),
        ]);
        return { equipoId, nombre: equipo.nombre || 'Equipo', rondas, contexto };
      }));
      if (!active) return;
      const medidos = porEquipo.filter((fila) => fila.rondas.length > 0);
      if (!medidos.length) {
        const [evaluaciones, settings, providers] = await Promise.all([
          getEvaluaciones(),
          getIASettings().catch(() => null),
          getIAProviders().catch(() => [] as AIProviderResponse[]),
        ]);
        if (!active) return;
        const ids = porEquipo.map((fila) => fila.equipoId).filter(Boolean);
        const recordado = equipoRecordado();
        const foco = recordado && ids.includes(recordado) ? recordado : ids[0];
        const fila = porEquipo.find((item) => item.equipoId === foco) || porEquipo[0];
        const cuestionarios = marcasDeCuestionario(evaluaciones, fila.equipoId);
        const paso = pasoDelEquipo({
          tieneEquipo: true,
          settings: settings && typeof settings === 'object' ? settings as AISettings : null,
          providers: Array.isArray(providers) ? providers : [],
          tieneCuestionario: cuestionarios.tieneCuestionario,
          hayAlgunCuestionario: cuestionarios.hayAlgunCuestionario,
          tieneContexto: fila.contexto.some((item) => item.status !== 'obsolete'),
          rondaCompartida: false,
        });
        const primaria = primariaSinRonda(paso, fila.equipoId);
        setVista({ tipo: 'escalera', paso: { nombre: fila.nombre, frase: primaria.frase, etiqueta: primaria.etiqueta, destino: primaria.destino } });
        return;
      }
      midio = true;
      const ahora = Date.now();
      const recordado = equipoRecordado();
      const cartera = await Promise.all(medidos.map((fila) => carteraDe(fila)));
      if (!active) return;
      const elegido = elegirHoy(cartera, recordado, ahora);
      if (!elegido) { setVista({ tipo: 'error', hoy: true }); return; }
      recordar(elegido);
      const sinRonda = porEquipo
        .filter((fila) => fila.rondas.length === 0)
        .map((fila) => ({ equipoId: fila.equipoId, nombre: fila.nombre }));
      setVista({ tipo: 'hoy', elegido, mapa: mapaHoy(cartera, recordado, ahora), sinRonda });
    }).catch(() => { if (active) setVista({ tipo: 'error', hoy: midio }); });
    return () => { active = false; };
  }, [attempt]);

  const crear = async (event: FormEvent) => {
    event.preventDefault();
    const limpio = nombre.trim();
    if (limpio.length < 2 || guardando) return;
    setGuardando(true);
    setErrorAlta('');
    try {
      const creado = await crearEquipo(limpio) as Equipo;
      const id = idDe(creado);
      navigate(id ? `/backoffice/equipos?equipo=${id}` : '/backoffice/equipos');
    } catch {
      setErrorAlta('No se pudo crear el equipo. Revisá el nombre e intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const reintentar = () => setAttempt((value) => value + 1);

  return <LayoutBackoffice><div className="container py-5" style={{ maxWidth: vista.tipo === 'hoy' ? 760 : 720 }}>
    {vista.tipo === 'cargando' ? <p role="status">Cargando tu espacio…</p> : vista.tipo === 'error' ? <div role="alert"><p>{vista.hoy ? 'No pudimos ver a quién atender.' : 'No pudimos cargar el panel.'}</p><button className="btn btn-primary" onClick={reintentar}>Reintentar</button></div> : vista.tipo === 'alta' ? <section>
      <div className="d-flex align-items-center gap-2 mb-3">
        <h1 className="fw-bold mb-0">Creá el equipo que vas a escuchar</h1>
        <InfoAyuda tema="equipos" />
      </div>
      <p className="text-muted">Vas a escuchar a un equipo y seguir una acción.</p>
      <p>Tus datos quedan en esta computadora. No hay recupero de contraseña por correo.</p>
      <form onSubmit={crear}>
        <label htmlFor="nombre-equipo" className="form-label">Nombre del equipo</label>
        <input id="nombre-equipo" className="form-control form-control-lg mb-3" value={nombre} onChange={(event) => { setNombre(event.target.value); setErrorAlta(''); }} placeholder="Ej.: Producto, Operaciones o QA" autoFocus disabled={guardando} autoComplete="off" />
        {errorAlta && <p className="text-danger" role="alert">{errorAlta}</p>}
        <button className="btn btn-primary btn-lg paso-primaria" type="submit" disabled={nombre.trim().length < 2 || guardando}>{guardando ? 'Creando…' : 'Crear equipo'}</button>
      </form>
    </section> : vista.tipo === 'hoy' ? <section className="hoy-panel" aria-labelledby="hoy-frase">
      <p className="text-uppercase small fw-semibold text-primary mb-2">Hoy</p>
      <div className="d-flex align-items-start gap-2">
        <h1 id="hoy-frase" className="hoy-frase">{vista.elegido.frase}</h1>
        <InfoAyuda tema="que-es" />
      </div>
      <Link className="btn btn-primary btn-lg paso-primaria" to={vista.elegido.destino}>{vista.elegido.gesto}</Link>
      <MapaEquipos mapa={vista.mapa} sinRonda={vista.sinRonda} />
    </section> : <section>
      <h1 className="fw-bold mb-3">{vista.paso.nombre}</h1>
      <p>{vista.paso.frase}</p>
      <Link className="btn btn-primary btn-lg paso-primaria" to={vista.paso.destino}>{vista.paso.etiqueta}</Link>
    </section>}
  </div></LayoutBackoffice>;
}
