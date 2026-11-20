import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardPorInstanciaId, type DashboardData } from '../../../services/dashboardService';
import { getEvaluacionById } from '../../../services/evaluacionService';
import { getInstanciaById } from '../../../services/instanciaService';
import { indiceVisible } from '../../../domain/indice-ronda';
import { linkDeLaPagina } from '../../../domain/link-respuesta';
import FormaDelClima, { agruparIndicadores, type SeccionClima } from './FormaDelClima';
import DashboardResumen from './DashboardResumen';
import LecturaRonda from './LecturaRonda';
import TonoEscrito from './TonoEscrito';
import InfoAyuda from '../../InfoAyuda';
import QualitativeInsights from '../ia/QualitativeInsights';
import type { AIAnalysisResponse } from '@termometro/shared';

interface Props {
  instanciaId: string;
}

function esNoEncontrado(error: unknown): boolean {
  if (typeof error !== 'object' || !error || !('response' in error)) return false;
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 404;
}

function lecturaDe(data: DashboardData): string {
  const conDatos = data.secciones.filter((seccion) => (seccion.n || 0) > 0);
  if (conDatos.length === 0) return '';
  const menor = conDatos.reduce((actual, candidata) =>
    candidata.valor < actual.valor ? candidata : actual,
  );
  const parcial = data.participacion.recibida < data.participacion.esperada
    ? ' El índice usa las respuestas que ya llegaron.'
    : '';
  return `La sección más baja es ${menor.titulo}, ${menor.valor} / 100.${parcial}`;
}

export function ResumenDeRonda({ data }: { data: DashboardData }) {
  if (data.participacion.recibida === 0) {
    return (
      <div className="alert alert-info mb-4" role="status">
        <h3 className="h5 mb-2">Esperando respuestas</h3>
        <p className="mb-0">Todavía no respondió nadie. No hay índice ni semáforo hasta que llegue la primera respuesta.</p>
      </div>
    );
  }
  if (data.privacidad?.protegido) {
    return (
      <div className="rounded border p-4 mb-4 bg-light" role="status">
        <div className="d-flex gap-3 align-items-start">
          <div className="fs-4" aria-hidden="true">🔒</div>
          <div><h3 className="h5 mb-2">Resultados protegidos por anonimato</h3><p className="mb-1">Respondieron {data.participacion.recibida} de {data.participacion.esperada}. El índice se muestra con esas respuestas cuando haya al menos {data.privacidad.minimoRespuestas}.</p><p className="small text-muted mb-0">Antes de ese mínimo no hay índice ni semáforo.</p></div>
        </div>
      </div>
    );
  }
  const indice = indiceVisible(data);
  if (indice == null) {
    return <div className="alert alert-info mb-4" role="status"><h3 className="h5 mb-2">Sin índice todavía</h3><p className="mb-0">Respondieron {data.participacion.recibida} de {data.participacion.esperada}. Esta ronda no tiene indicadores numéricos para calcular un índice.</p></div>;
  }
  return <DashboardResumen valor={indice} participacion={data.participacion} lectura={lecturaDe(data)} />;
}

const EstadoActual = ({ instanciaId }: Props) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [secciones, setSecciones] = useState<SeccionClima[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [errorLectura, setErrorLectura] = useState(false);
  const [intento, setIntento] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [copiaManual, setCopiaManual] = useState(false);
  const [tokenPublico, setTokenPublico] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [analisis, setAnalisis] = useState<AIAnalysisResponse | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const link = linkDeLaPagina(window.location.origin, tokenPublico);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setNoEncontrada(false);
    setErrorLectura(false);
    setCopiado(false);
    setCopiaManual(false);
    setEquipoId('');
    setAnalisis(null);
    setSecciones([]);
    getDashboardPorInstanciaId(instanciaId)
      .then(async (dashboard) => {
        const instancia = await getInstanciaById(instanciaId);
        const evaluacion = await getEvaluacionById(String(instancia.evaluacionId));
        if (cancelado) return;
        setData(dashboard);
        setTokenPublico(typeof instancia.tokenPublico === 'string' ? instancia.tokenPublico : '');
        setEquipoId(typeof instancia.equipoId === 'string' ? instancia.equipoId : '');
        setSecciones(agruparIndicadores(dashboard.secciones, dashboard.indicadores, evaluacion));
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        setData(null);
        if (esNoEncontrado(error)) setNoEncontrada(true);
        else setErrorLectura(true);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [instanciaId, intento]);

  const copiar = async () => {
    if (!link) return;
    setCopiaManual(false);
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setCopiado(false);
      setCopiaManual(true);
      linkRef.current?.focus();
      linkRef.current?.select();
    }
  };

  if (cargando) {
    return <p className="text-muted mb-0">Leyendo el termómetro...</p>;
  }

  if (noEncontrada) {
    return (
      <div>
        <p>No se encontró la ronda.</p>
        <Link className="btn btn-primary" to="/backoffice/home">
          Ir a tus equipos
        </Link>
      </div>
    );
  }

  if (errorLectura || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-3">No se pudo leer el termómetro.</p>
        <button className="btn btn-outline-danger" type="button" onClick={() => setIntento((n) => n + 1)}>
          Reintentar
        </button>
      </div>
    );
  }

  const resumenCualitativo = data.cualitativo;
  const indice = indiceVisible(data);
  const hayRespuestas = data.participacion.recibida > 0;
  const clima = secciones.filter((seccion) => seccion.n > 0);
  const rutaAccionables = `/backoffice/accionables?instanciaId=${instanciaId}`;
  const hayTexto = Boolean(resumenCualitativo && (resumenCualitativo.preguntas > 0 || resumenCualitativo.respuestas > 0));

  return (
    <div>
      <div className="dashboard-context-header">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <p className="evaluation-eyebrow mb-2">Estado actual</p>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="fw-bold mb-0">{data.equipo}</h2>
              <InfoAyuda tema="resultados" />
            </div>
            <p className="text-muted mb-0">{data.evaluacion.titulo}</p>
          </div>
          {hayRespuestas && (
            <Link className="btn btn-sm estado-atajo" to={rutaAccionables}>
              Accionables
            </Link>
          )}
        </div>
        <div className="dashboard-context-meta mt-3" aria-label="Resumen de la ronda">
          <span>Respondieron {data.participacion.recibida} de {data.participacion.esperada}</span>
        </div>
      </div>
      <ResumenDeRonda data={data} />
      {indice != null && (
        <div className="estado-cuantitativo">
          <FormaDelClima secciones={clima} hayRespuestas={hayRespuestas} />
        </div>
      )}
      {hayRespuestas && (
        <div className="estado-cualitativo">
          <LecturaRonda instanciaId={instanciaId} equipoId={equipoId} onAnalisis={setAnalisis} />
          {analisis && <QualitativeInsights analysis={analisis} />}
          {hayTexto && (
            <TonoEscrito
              textos={resumenCualitativo?.disponible ? resumenCualitativo.respuestas : 0}
              tono={analisis?.tono}
            />
          )}
        </div>
      )}
      {!hayRespuestas && (
        <div className="dashboard-next-steps mt-4" aria-labelledby="siguientes-pasos">
          <p className="evaluation-eyebrow mb-2">Siguiente paso</p>
          <h3 id="siguientes-pasos" className="h5 mb-3">Compartí la ronda para empezar</h3>
          <label htmlFor="link-equipo" className="form-label">Link para el equipo</label>
          <input id="link-equipo" ref={linkRef} className="form-control mb-3" readOnly value={link} />
          {copiaManual && <p className="text-muted">Seleccioná el link y copialo.</p>}
          <button type="button" className="btn btn-primary paso-primaria" onClick={copiar} disabled={!link}>
            {copiado ? 'Link copiado' : 'Compartir de nuevo'}
          </button>
        </div>
      )}
      {hayRespuestas && (
        <details className="mt-4 rounded border p-3">
          <summary>Ver el detalle de esta ronda</summary>
          <div className="mt-3">
            <label htmlFor="link-equipo" className="form-label">Link para el equipo</label>
            <input id="link-equipo" ref={linkRef} className="form-control mb-2" readOnly value={link} />
            {copiaManual && <p className="text-muted">Seleccioná el link y copialo.</p>}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={copiar} disabled={!link}>
              {copiado ? 'Link copiado' : 'Copiar link'}
            </button>
            <p className="mb-0 mt-3"><Link className="btn btn-sm estado-atajo" to={`/backoffice/dashboard?instanciaId=${instanciaId}&vista=historico`}>Ver histórico</Link></p>
          </div>
          {indice != null && data.calidadMedicion && <section className="mt-4" aria-labelledby="calidad-medicion">
            <h3 id="calidad-medicion" className="h6 mb-2">Calidad de la medición</h3>
            <p className="small text-muted mb-2">El semáforo describe el nivel de 0 a 100. La muestra, la participación y la dispersión siguen al lado.</p>
            <div className="small mb-2">Muestra: <strong>{data.participacion.recibida}</strong> de {data.participacion.esperada} respuestas ({data.participacion.porcentaje}%).</div>
            {data.calidadMedicion.advertencias.length > 0 ? <ul className="small text-muted mb-0">{data.calidadMedicion.advertencias.map((advertencia, index) => <li key={index}>{advertencia}</li>)}</ul> : <p className="small text-muted mb-0">Con al menos 3 respuestas se puede mirar la dispersión de cada pregunta.</p>}
          </section>}
          {indice != null && data.alertas && data.alertas.length > 0 && <section className="mt-4" aria-labelledby="alertas-ronda"><h3 id="alertas-ronda" className="h6 mb-3">Alertas</h3><div className="d-grid gap-2">{data.alertas.map((alerta, index) => <div key={`${alerta.titulo}-${index}`} className={`rounded border p-3 ${alerta.severidad === 'critica' ? 'border-danger' : 'border-warning'}`}><div className="d-flex justify-content-between gap-2"><strong>{alerta.titulo}</strong><span className={`badge ${alerta.severidad === 'critica' ? 'text-bg-danger' : 'text-bg-warning'}`}>{alerta.severidad === 'critica' ? 'Crítica' : 'Atención'}</span></div><p className="small text-muted mb-0 mt-1">{alerta.evidencia}</p></div>)}</div></section>}
        </details>
      )}
      {hayRespuestas && (
        <section className="estado-cierre" aria-labelledby="cierre-accionables">
          <div>
            <p className="evaluation-eyebrow mb-2">Ya leíste</p>
            <h2 id="cierre-accionables">Ir a accionables</h2>
            <p>El índice y lo escrito de esta ronda ya están arriba. El siguiente paso es decidir qué se sigue.</p>
          </div>
          <Link className="btn estado-cierre-btn" to={rutaAccionables}>Ir a accionables</Link>
        </section>
      )}
    </div>
  );
};

export default EstadoActual;
