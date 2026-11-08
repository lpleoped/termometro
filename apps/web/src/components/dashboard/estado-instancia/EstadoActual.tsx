import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardPorInstanciaId, type DashboardData } from '../../../services/dashboardService';
import { getEvaluacionById } from '../../../services/evaluacionService';
import { getInstanciaById } from '../../../services/instanciaService';
import FormaDelClima, { agruparIndicadores, type SeccionClima } from './FormaDelClima';
import DashboardResumen from './DashboardResumen';
import PlanDeAccion from '../plan/PlanDeAccion';
import RespuestasCualitativas from './RespuestasCualitativas';

interface Props {
  instanciaId: string;
}

function esNoEncontrado(error: unknown): boolean {
  if (typeof error !== 'object' || !error || !('response' in error)) return false;
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 404;
}

function lecturaDe(data: DashboardData): string {
  if (data.participacion.recibida === 0) return 'Todavía no respondió nadie.';
  if (data.secciones.length === 0) return '';
  const menor = data.secciones.reduce((actual, candidata) =>
    candidata.valor < actual.valor ? candidata : actual,
  );
  return `La sección más baja es ${menor.titulo}, ${menor.valor} / 100.`;
}

export function ResumenDeRonda({ data }: { data: DashboardData }) {
  if (data.privacidad?.protegido) {
    return (
      <div className="rounded border p-4 mb-4 bg-light" role="status">
        <div className="d-flex gap-3 align-items-start">
          <div className="fs-4" aria-hidden="true">🔒</div>
          <div><h3 className="h5 mb-2">Resultados protegidos por anonimato</h3><p className="mb-1">El resumen se habilita cuando haya al menos {data.privacidad.minimoRespuestas} respuestas.</p><p className="small text-muted mb-0">Ya recibimos {data.participacion.recibida} de {data.participacion.esperada}. No mostramos tendencias ni indicadores individuales antes de alcanzar el mínimo.</p></div>
        </div>
      </div>
    );
  }
  if (data.participacion.recibida === 0) {
    return (
      <div className="alert alert-info mb-4" role="status">
        <h3 className="h5 mb-2">Esperando respuestas</h3>
        <p className="mb-0">Todavía no respondió nadie. Compartí el link con el equipo para empezar a ver el termómetro.</p>
      </div>
    );
  }
  if (data.secciones.length === 0) {
    return <div className="alert alert-info mb-4" role="status"><h3 className="h5 mb-2">Sin métricas cuantitativas</h3><p className="mb-0">Esta ronda contiene respuestas cualitativas, pero no indicadores numéricos para calcular un índice.</p></div>;
  }
  return <DashboardResumen valor={data.indiceGlobal} participacion={data.participacion} lectura={lecturaDe(data)} />;
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
  const linkRef = useRef<HTMLInputElement>(null);
  const link = `${window.location.origin}/responder/${instanciaId}`;

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setNoEncontrada(false);
    setErrorLectura(false);
    setCopiado(false);
    setCopiaManual(false);
    setSecciones([]);
    getDashboardPorInstanciaId(instanciaId)
      .then(async (dashboard) => {
        const instancia = await getInstanciaById(instanciaId);
        const evaluacion = await getEvaluacionById(String(instancia.evaluacionId));
        if (cancelado) return;
        setData(dashboard);
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

  return (
    <div>
      <div className="dashboard-context-header mb-4">
        <p className="evaluation-eyebrow mb-2">Estado actual</p>
        <h2 className="fw-bold mb-1">{data.equipo}</h2>
        <p className="text-muted mb-3">{data.evaluacion.titulo}</p>
        <div className="dashboard-context-meta" aria-label="Resumen de la ronda">
          <span>{data.participacion.recibida} de {data.participacion.esperada} respuestas</span>
          <span>{data.participacion.porcentaje}% de participación</span>
        </div>
      </div>
      <ResumenDeRonda data={data} />
      {data.calidadMedicion && <section className="mt-4 rounded border p-4" aria-labelledby="calidad-medicion">
        <p className="evaluation-eyebrow mb-2">Calidad de la medición</p>
        <h3 id="calidad-medicion" className="h5 mb-2">Cómo leer este resultado</h3>
        <p className="small text-muted mb-2">El semáforo describe el nivel operativo (0–100); no reemplaza la lectura de muestra, participación y dispersión.</p>
        <div className="small mb-2">Muestra: <strong>{data.participacion.recibida}</strong> de {data.participacion.esperada} respuestas ({data.participacion.porcentaje}%).</div>
        {data.calidadMedicion.advertencias.length > 0 ? <ul className="small text-muted mb-0">{data.calidadMedicion.advertencias.map((advertencia, index) => <li key={index}>{advertencia}</li>)}</ul> : <p className="small text-muted mb-0">La muestra permite estimar la dispersión por indicador cuando hay al menos 3 respuestas válidas.</p>}
      </section>}
      {data.alertas && data.alertas.length > 0 && <section className="mt-4" aria-labelledby="alertas-ronda"><p className="evaluation-eyebrow mb-2">Señales detectadas</p><h3 id="alertas-ronda" className="h5 mb-3">Alertas basadas en evidencia</h3><div className="d-grid gap-2">{data.alertas.map((alerta, index) => <div key={`${alerta.titulo}-${index}`} className={`rounded border p-3 ${alerta.severidad === 'critica' ? 'border-danger' : 'border-warning'}`}><div className="d-flex justify-content-between gap-2"><strong>{alerta.titulo}</strong><span className={`badge ${alerta.severidad === 'critica' ? 'text-bg-danger' : 'text-bg-warning'}`}>{alerta.severidad === 'critica' ? 'Crítica' : 'Atención'}</span></div><p className="small text-muted mb-0 mt-1">{alerta.evidencia}</p></div>)}</div></section>}
      {!data.privacidad?.protegido && <div className="mt-4"><FormaDelClima secciones={secciones} hayRespuestas={data.participacion.recibida > 0} /></div>}
      <div className="dashboard-next-steps mt-4" aria-labelledby="siguientes-pasos">
        <p className="evaluation-eyebrow mb-2">Siguientes pasos</p>
        <h3 id="siguientes-pasos" className="h5 mb-3">Elegí qué querés hacer ahora</h3>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={copiar}>
            {copiado ? 'Link copiado' : 'Compartir la ronda'}
          </button>
          <Link
            className="btn btn-outline-primary"
            to={`/backoffice/dashboard?instanciaId=${instanciaId}&vista=historico`}
          >
            Ver histórico
          </Link>
        </div>
      </div>
      {!data.privacidad?.protegido && <PlanDeAccion key={instanciaId} instanciaId={instanciaId} indice={data.indiceGlobal} />}
      <div className="mt-4">
        <label htmlFor="link-equipo" className="form-label">
          Link para el equipo
        </label>
        <input id="link-equipo" ref={linkRef} className="form-control mb-3" readOnly value={link} />
        {copiaManual && <p className="text-muted">Seleccioná el link y copialo.</p>}
        <button type="button" className="btn btn-outline-primary" onClick={copiar}>
          {copiado ? 'Link copiado' : 'Copiar link para el equipo'}
        </button>
      </div>
      {!data.privacidad?.protegido && <Link className="btn btn-outline-secondary mt-4" to={`/backoffice/ia?instanciaId=${instanciaId}`}>Abrir análisis con IA</Link>}
      {resumenCualitativo && <RespuestasCualitativas resumen={resumenCualitativo} />}
    </div>
  );
};

export default EstadoActual;
