import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardPorInstanciaId, type DashboardData } from '../../../services/dashboardService';
import { getEvaluacionById } from '../../../services/evaluacionService';
import { getInstanciaById } from '../../../services/instanciaService';
import FormaDelClima, { agruparIndicadores, type SeccionClima } from './FormaDelClima';
import DashboardResumen from './DashboardResumen';
import PlanDeAccion from '../plan/PlanDeAccion';

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
      {data.participacion.recibida === 0 && (
        <div className="alert alert-info mb-4" role="status">
          <h3 className="h5 mb-2">Esperando respuestas</h3>
          <p className="mb-0">Todavía no respondió nadie. Compartí el link con el equipo para empezar a ver el termómetro.</p>
        </div>
      )}
      <DashboardResumen
        valor={data.indiceGlobal}
        participacion={data.participacion}
        lectura={lecturaDe(data)}
      />
      <div className="mt-4">
        <FormaDelClima secciones={secciones} hayRespuestas={data.participacion.recibida > 0} />
      </div>
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
      <PlanDeAccion instanciaId={instanciaId} indice={data.indiceGlobal} />
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
    </div>
  );
};

export default EstadoActual;
