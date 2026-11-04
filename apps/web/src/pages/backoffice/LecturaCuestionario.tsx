import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { getEvaluacionById, type Evaluacion } from '../../services/evaluacionService';

function esNoEncontrado(error: unknown): boolean {
  if (typeof error !== 'object' || !error || !('response' in error)) return false;
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 404;
}

export default function LecturaCuestionario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cuestionario, setCuestionario] = useState<Evaluacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) {
      setCargando(false);
      setNoEncontrado(true);
      return;
    }
    setCargando(true);
    setNoEncontrado(false);
    setErrorCarga(false);
    try {
      const data = await getEvaluacionById(id);
      setCuestionario(data);
    } catch (error) {
      setCuestionario(null);
      if (esNoEncontrado(error)) setNoEncontrado(true);
      else setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const volver = (
    <Link to="/backoffice/consulta-evaluacion">Volver a tus cuestionarios</Link>
  );

  if (cargando) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3">Cargando el cuestionario...</p>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  if (noEncontrado) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="alert alert-warning" role="alert">
            <p className="mb-3">No se encontró el cuestionario.</p>
            {volver}
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  if (errorCarga || !cuestionario) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="alert alert-danger" role="alert">
            <p className="mb-3">No se pudo cargar el cuestionario.</p>
            <button className="btn btn-outline-danger" type="button" onClick={cargar}>
              Reintentar
            </button>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  const descripcion = cuestionario.descripcion?.trim();

  return (
    <LayoutBackoffice>
      <div className="container py-4">
        <h2 className="fw-bold mb-2">{cuestionario.titulo}</h2>
        {descripcion && <p className="text-muted mb-4">{descripcion}</p>}
        {cuestionario.secciones.map((seccion, indice) => (
          <div key={`${seccion.titulo}-${indice}`} className="card mb-3 shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                <div className="fw-semibold">{seccion.titulo}</div>
                <div className="text-muted">Peso {seccion.ponderacion}</div>
              </div>
              <ul className="mb-0">
                {seccion.indicadores.map((pregunta) => (
                  <li key={pregunta.id || pregunta.texto}>{pregunta.texto}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        <div className="d-flex flex-wrap align-items-center gap-3 mt-4">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/backoffice/publicar-evaluacion?evaluacionId=${id}`)}
          >
            Abrir la ronda
          </button>
          {volver}
        </div>
      </div>
    </LayoutBackoffice>
  );
}
