import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { crearEquipo, getEquipos } from '../../services/equipoService';
import { getEvaluaciones } from '../../services/evaluacionService';
import api from '../../services/api';

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
  const navigate = useNavigate();

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      const [equiposRaw, evaluaciones] = await Promise.all([getEquipos(), getEvaluaciones()]);
      const equiposCargados = await Promise.all(
        (Array.isArray(equiposRaw) ? equiposRaw : []).map(async (equipo: { _id?: string; id?: string; nombre?: string }) => {
          const id = idDe(equipo);
          if (!id) throw new Error('Equipo sin id');
          const rondas = await rondasDelEquipo(id);
          return { id, nombre: equipo.nombre || 'Equipo', rondas };
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
    } finally {
      setGuardando(false);
    }
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
                {errorAlta && (
                  <div className="alert alert-danger" role="alert">
                    No se pudo crear el equipo.
                  </div>
                )}
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
        <h2 className="fw-bold mb-4">Tus equipos</h2>
        {equipos.map((equipo) => {
          const repetidos = titulosRepetidos(equipo.rondas);
          return (
            <div key={equipo.id} className="card mb-3 shadow-sm border-0">
              <div className="card-body">
                <div className="fw-semibold fs-5 text-primary mb-3">{equipo.nombre}</div>
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
    </LayoutBackoffice>
  );
};

export default HomeBackoffice;
