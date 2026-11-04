import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { getEvaluaciones, type Evaluacion } from '../../services/evaluacionService';

function idDe(doc: { _id?: string; id?: string }): string {
  return String(doc._id || doc.id || '');
}

export default function ConsultaEvaluaciones() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const navigate = useNavigate();

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      const lista = await getEvaluaciones();
      if (!Array.isArray(lista)) {
        setErrorCarga(true);
        return;
      }
      setEvaluaciones(lista);
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3">Cargando cuestionarios...</p>
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
            <p className="mb-3">No se pudieron cargar tus cuestionarios</p>
            <button className="btn btn-outline-danger" type="button" onClick={cargar}>
              Reintentar
            </button>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  return (
    <LayoutBackoffice>
      <div className="container py-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
          <h2 className="fw-bold mb-0">Tus cuestionarios</h2>
          {evaluaciones.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/backoffice/alta-evaluacion')}
            >
              Armar un cuestionario
            </button>
          )}
        </div>
        {evaluaciones.length === 0 ? (
          <div>
            <p className="text-muted mb-4">Todavía no armaste un cuestionario.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/backoffice/alta-evaluacion')}
            >
              Armar el cuestionario
            </button>
          </div>
        ) : (
          evaluaciones.map((cuestionario) => {
            const id = idDe(cuestionario);
            return (
              <div key={id || cuestionario.titulo} className="card mb-3 shadow-sm border-0">
                <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div className="fw-semibold fs-5 text-primary">{cuestionario.titulo}</div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/backoffice/consulta-evaluacion/${id}`)}
                    disabled={!id}
                  >
                    Ver el cuestionario
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </LayoutBackoffice>
  );
}
