import { FormEvent, useEffect, useState } from 'react';
import api from '../../../services/api';

interface Props {
  instanciaId: string;
  indice: number;
}

interface AccionGuardada {
  id: string;
  descripcion: string;
  creadaEn?: string;
}

interface AccionContextual {
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta';
  alcance: 'equipo' | 'liderazgo' | 'proyecto';
  hallazgo?: string;
  contextoAplicado?: string[];
  esCondicionPrevia?: boolean;
  requiereValidacion: boolean;
}

function idDe(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (valor && typeof valor === 'object') {
    const doc = valor as { _id?: unknown; id?: unknown };
    if (typeof doc._id === 'string' || typeof doc.id === 'string') {
      return String(doc._id || doc.id);
    }
  }
  return '';
}

function normalizarAccion(doc: unknown): AccionGuardada | null {
  if (!doc || typeof doc !== 'object') return null;
  const raw = doc as { _id?: unknown; id?: unknown; descripcion?: unknown; creadaEn?: unknown };
  const id = idDe(raw);
  const descripcion = typeof raw.descripcion === 'string' ? raw.descripcion.trim() : '';
  if (!id || !descripcion) return null;
  const creadaEn = typeof raw.creadaEn === 'string' ? raw.creadaEn : undefined;
  return { id, descripcion, creadaEn };
}

function fechaGuardada(iso?: string): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PlanDeAccion = ({ instanciaId, indice }: Props) => {
  const [acciones, setAcciones] = useState<AccionGuardada[]>([]);
  const [leyendo, setLeyendo] = useState(true);
  const [errorLectura, setErrorLectura] = useState(false);
  const [intentoLectura, setIntentoLectura] = useState(0);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [sugerencia, setSugerencia] = useState<string | null>(null);
  const [accionesContextuales, setAccionesContextuales] = useState<AccionContextual[]>([]);

  useEffect(() => {
    let cancelado = false;
    setLeyendo(true);
    setErrorLectura(false);
    api
      .get('/acciones', { params: { instanciaId } })
      .then((res) => {
        if (cancelado) return;
        const lista = Array.isArray(res.data) ? res.data : [];
        setAcciones(lista.map(normalizarAccion).filter((accion): accion is AccionGuardada => accion !== null));
      })
      .catch(() => {
        if (!cancelado) setErrorLectura(true);
      })
      .finally(() => {
        if (!cancelado) setLeyendo(false);
      });
    return () => {
      cancelado = true;
    };
  }, [instanciaId, intentoLectura]);

  useEffect(() => {
    let cancelado = false;
    setSugerencia(null);

    const buscar = async () => {
      try {
        const res = await api.get('/ai/analyses', { params: { instanciaId } });
        const latest = res.data?.[0];
        const contextual = Array.isArray(latest?.accionesContextuales) ? latest.accionesContextuales : [];
        if (!cancelado) setAccionesContextuales(contextual);
        const recommendations = latest?.recomendaciones;
        const plan = Array.isArray(recommendations) ? recommendations.join('\n') : '';
        if (!cancelado) setSugerencia(plan);
      } catch {
        // Previously saved suggestions are optional; no AI request is started here.
      }
    };

    buscar();
    return () => {
      cancelado = true;
    };
  }, [instanciaId]);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const descripcion = texto.trim();
    if (!descripcion || guardando) return;
    setGuardando(true);
    setErrorGuardado(false);
    setGuardada(false);
    try {
      const res = await api.post('/acciones', { instanciaId, descripcion });
      const nueva = normalizarAccion(res.data) ?? {
        id: `local-${Date.now()}`,
        descripcion,
        creadaEn: new Date().toISOString(),
      };
      setAcciones((prev) => [nueva, ...prev.filter((accion) => accion.id !== nueva.id)]);
      setTexto('');
      setGuardada(true);
    } catch {
      setErrorGuardado(true);
    } finally {
      setGuardando(false);
    }
  };

  const usarSugerencia = () => {
    if (!sugerencia) return;
    setTexto(sugerencia);
    setGuardada(false);
    setErrorGuardado(false);
  };

  const usarAccionContextual = (accion: AccionContextual) => {
    const detalle = accion.esCondicionPrevia ? `Condición previa: ${accion.descripcion}` : accion.descripcion;
    setTexto(detalle);
    setGuardada(false);
    setErrorGuardado(false);
  };

  const textoListo = texto.trim().length > 0;

  return (
    <section className="action-plan mt-4" aria-labelledby="titulo-accion">
      <h3 id="titulo-accion" className="h5 fw-bold mb-1">
        Dejá una acción
      </h3>
      <p className="text-muted mb-3">Con el índice en {indice} / 100, anotá qué van a hacer.</p>

      {sugerencia && (
        <div className="mb-3">
          <p className="fw-semibold mb-1">Sugerencias del último análisis guardado</p>
          <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
            {sugerencia}
          </p>
          <button type="button" className="btn btn-outline-secondary" onClick={usarSugerencia}>
            Usar esta sugerencia
          </button>
        </div>
      )}

      {accionesContextuales.length > 0 && (
        <div className="mb-4" aria-labelledby="acciones-contextuales-title">
          <p id="acciones-contextuales-title" className="fw-semibold mb-2">Propuestas contextualizadas</p>
          <p className="text-muted small">La IA relacionó estas propuestas con hallazgos y contexto del equipo. Revisalas antes de incorporarlas al plan.</p>
          <div className="d-grid gap-2">
            {accionesContextuales.map((accion, index) => (
              <article key={`${accion.titulo}-${index}`} className="border rounded p-3">
                <div className="d-flex justify-content-between gap-2 align-items-start">
                  <h4 className="h6 mb-1">{accion.titulo}</h4>
                  <span className="badge text-bg-light">Prioridad {accion.prioridad}</span>
                </div>
                <p className="mb-2">{accion.descripcion}</p>
                {accion.esCondicionPrevia && <p className="small text-primary mb-2"><strong>Condición previa:</strong> debe resolverse antes de avanzar con otras acciones.</p>}
                {accion.hallazgo && <p className="small text-muted mb-1"><strong>Hallazgo:</strong> {accion.hallazgo}</p>}
                {accion.contextoAplicado?.length ? <p className="small text-muted mb-2"><strong>Contexto aplicado:</strong> {accion.contextoAplicado.join(', ')}</p> : null}
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => usarAccionContextual(accion)}>Revisar y usar en el plan</button>
              </article>
            ))}
          </div>
        </div>
      )}

      {leyendo && <p className="text-muted">Leyendo las acciones...</p>}
      {errorLectura && (
        <div className="alert alert-danger" role="alert">
          <p className="mb-3">No se pudieron leer las acciones guardadas.</p>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => setIntentoLectura((n) => n + 1)}
          >
            Reintentar
          </button>
        </div>
      )}
      {acciones.length > 0 && (
        <ul className="list-unstyled mb-3">
          {acciones.map((accion) => {
            const fecha = fechaGuardada(accion.creadaEn);
            return (
              <li key={accion.id} className="mb-2 p-3 rounded bg-light">
                <p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                  {accion.descripcion}
                </p>
                {fecha && <p className="text-muted small mb-0">Guardada el {fecha}</p>}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={guardar}>
        {errorGuardado && (
          <div className="alert alert-danger" role="alert">
            No se pudo guardar la acción.
          </div>
        )}
        {guardada && (
          <p className="text-success mb-3" role="status">
            La acción quedó guardada.
          </p>
        )}
        <div className="mb-3">
          <label htmlFor="accion-ronda" className="form-label fw-semibold">
            Qué van a hacer
          </label>
          <textarea
            id="accion-ronda"
            className="form-control"
            rows={3}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setGuardada(false);
              setErrorGuardado(false);
            }}
            disabled={guardando}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={!textoListo || guardando}>
          {guardando ? 'Guardando la acción...' : 'Guardar la acción'}
        </button>
      </form>
    </section>
  );
};

export default PlanDeAccion;
