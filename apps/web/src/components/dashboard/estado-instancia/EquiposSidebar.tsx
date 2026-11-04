// src/components/EquipoSidebar.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';

interface Equipo {
  id: string;
  nombre: string;
  descripcion?: string;
  cantidadMiembros?: number;
}

interface Instancia {
  id: string;
  evaluacion: {
    id: string;
    titulo: string;
    version: string;
    tipo: string;
  };
  equipo: {
    id: string;
    nombre: string;
  };
  fechaInicio: string;
  fechaFin: string;
  cantidadEsperada: number;
  estado: string;
  creadoPor: string;
  createdAt: string;
}

interface Props {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
}

const EquipoSidebar = ({ isCollapsed = false, onToggleCollapse, onCloseMobile }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const instanciaIdSeleccionada = searchParams.get('instanciaId') || undefined;

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [instanciasPorEquipo, setInstanciasPorEquipo] = useState<Record<string, Instancia[]>>({});
  const [equipoExpandido, setEquipoExpandido] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [equipoCargando, setEquipoCargando] = useState<string | null>(null);
  const [errorRondas, setErrorRondas] = useState<string | null>(null);

  useEffect(() => {
    if (!instanciaIdSeleccionada) return;
    let cancelado = false;
    api.get(`/instancias/${instanciaIdSeleccionada}`).then((res) => {
      const value = res.data?.equipoId;
      const id = typeof value === 'string' ? value : value?._id || value?.id;
      if (!id || cancelado) return;
      setEquipoExpandido(id);
      return api.get('/instancias', { params: { equipoId: id, estado: 'activa' } }).then((rounds) => {
        if (!cancelado && Array.isArray(rounds.data)) setInstanciasPorEquipo((prev) => ({ ...prev, [id]: rounds.data.map((round: any) => ({ ...round, id: round._id || round.id })) }));
      });
    }).catch(() => { if (!cancelado) setErrorRondas('No pudimos cargar las rondas. Elegí el equipo para reintentar.'); });
    return () => { cancelado = true; };
  }, [instanciaIdSeleccionada]);

  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        const res = await api.get('/equipos');
        const equiposBackend = res.data.map((equipo: any) => ({
          ...equipo,
          id: equipo._id
        }));
        setEquipos(equiposBackend);
        setErrorCarga(false);
      } catch (error) {
        setErrorCarga(true);
      } finally {
        setCargando(false);
      }
    };
    fetchEquipos();
  }, []);

  const handleEquipoClick = async (equipoId: string) => {
    if (isCollapsed) onToggleCollapse?.();
    if (!equipoId) {
      return;
    }
    if (!isCollapsed && equipoExpandido === equipoId && instanciasPorEquipo[equipoId]) {
      setEquipoExpandido(null);
      return;
    }

    // ✅ Lógica para cargar instancias y seleccionar automáticamente la más reciente
    if (!instanciasPorEquipo[equipoId]) {
      try {
        setEquipoCargando(equipoId);
        setErrorRondas(null);
        setEquipoExpandido(equipoId);
        const res = await api.get(`/instancias?equipoId=${equipoId}&estado=activa`);
        if (!res.data || !Array.isArray(res.data)) {
          setInstanciasPorEquipo(prev => ({ ...prev, [equipoId]: [] }));
          return;
        }
        
        const instanciasBackend = res.data.map((instancia: any) => ({
          ...instancia,
          id: instancia._id || instancia.id,
          evaluacion: {
            ...instancia.evaluacion,
            id: instancia.evaluacion?._id || instancia.evaluacion?.id
          }
        }));
        const instanciasOrdenadas = instanciasBackend.sort((a: Instancia, b: Instancia) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setInstanciasPorEquipo(prev => ({ ...prev, [equipoId]: instanciasOrdenadas }));
      } catch (error: any) {
        setErrorRondas('No pudimos cargar las rondas. Elegí el equipo para reintentar.');
      } finally {
        setEquipoCargando(null);
      }
    } else {
      setEquipoExpandido(equipoId);
    }

    setEquipoExpandido(equipoId);
  };

  // Función para obtener iniciales del equipo
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className={`equipo-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header p-3 border-bottom d-flex align-items-center justify-content-between" style={{ background: '#fff' }}>
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <span className="fw-bold text-primary" style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
            {!isCollapsed && 'Equipos'}
          </span>
          {!isCollapsed && <span className="small text-muted d-block" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.35 }}>Elegí una ronda para ver sus resultados</span>}
        </div>
        <button
          className="btn btn-menu-toggle d-inline-flex align-items-center justify-content-center ms-2"
          style={{
            width: 44,
            height: 44,
            background: '#fff',
            border: '2px solid #2563eb',
            color: '#2563eb',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(37,99,235,0.10)',
            fontSize: 28,
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s, box-shadow 0.2s, border 0.2s',
            outline: 'none',
          }}
          aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          onClick={onToggleCollapse}
        >
          {isCollapsed ? (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9L19 16L12 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 9L13 16L20 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <button type="button" className="sidebar-close-mobile d-md-none" onClick={onCloseMobile} aria-label="Cerrar equipos">×</button>
      </div>
      
      <div className="sidebar-body p-2">
        {!isCollapsed && errorRondas && <p className="sidebar-error" role="alert">{errorRondas}</p>}
        {cargando ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
            <p className="small text-muted mt-2 mb-0">Cargando equipos...</p>
          </div>
        ) : errorCarga ? (
          <div className="p-2">
            <p className="small text-danger mb-2">No pudimos cargar tus equipos.</p>
            <button type="button" className="btn btn-sm btn-outline-primary w-100" onClick={() => window.location.reload()}>
              Intentar de nuevo
            </button>
          </div>
        ) : equipos.length === 0 ? (
          <div className="p-2">
            <p className="small text-muted mb-0">Todavía no tenés equipos.</p>
          </div>
        ) : (
          <div className="equipos-list">
            {equipos.map((equipo) => (
              <div key={equipo.id} className="equipo-item mb-2">
                <button
                  type="button"
                  className={`equipo-header p-2 rounded cursor-pointer hover-lift d-flex align-items-center justify-content-between ${equipoExpandido === equipo.id ? 'bg-primary text-white' : 'bg-light'}`}
                  style={{
                    backgroundColor: equipoExpandido === equipo.id ? undefined : '#f8f9fa',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    transition: 'all 0.15s',
                    minHeight: 48,
                  }}
                  aria-expanded={equipoExpandido === equipo.id}
                  aria-controls={`rondas-${equipo.id}`}
                  onClick={() => handleEquipoClick(equipo.id)}
                  title={equipo.nombre}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: equipoExpandido === equipo.id ? '#fff' : '#3b82f6',
                        color: equipoExpandido === equipo.id ? '#3b82f6' : '#fff',
                        fontWeight: 'bold',
                        fontSize: 12
                      }}
                    >
                      {getInitials(equipo.nombre)}
                    </div>
                    {!isCollapsed && (
                      <div className="flex-grow-1">
                        <div className="fw-medium text-start" style={{ fontSize: '13px' }}>
                          {equipo.nombre}
                        </div>
                        {equipoExpandido === equipo.id && equipoCargando !== equipo.id && instanciasPorEquipo[equipo.id] && (
                          <div className="small opacity-75">
                            {instanciasPorEquipo[equipo.id].length} ronda{instanciasPorEquipo[equipo.id].length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (equipoCargando === equipo.id ? <span className="spinner-border spinner-border-sm ms-2" aria-label="Cargando rondas" /> : <span className={`sidebar-chevron ${equipoExpandido === equipo.id ? 'is-open' : ''}`} aria-hidden="true" />)}
                </button>

                {/* Lista de instancias del equipo */}
                {!isCollapsed && equipoExpandido === equipo.id && instanciasPorEquipo[equipo.id] && (
                  <div id={`rondas-${equipo.id}`} className="instancias-list ms-4 mt-2" aria-label={`Rondas de ${equipo.nombre}`}>
                    {instanciasPorEquipo[equipo.id].length === 0 ? <p className="small text-muted px-2 mb-2">No hay rondas activas.</p> : instanciasPorEquipo[equipo.id].map((instancia) => {
                      return (
                        <button
                          type="button"
                          key={instancia.id}
                          className={`instancia-item p-2 rounded mb-1 cursor-pointer d-flex align-items-center justify-content-between
                            ${instanciaIdSeleccionada === instancia.id ? 'bg-primary text-white fw-bold border border-primary selected-instance' : 'bg-light'}
                            ${instanciaIdSeleccionada !== instancia.id ? 'sidebar-hover' : ''}
                          `}
                          style={{
                            backgroundColor: instanciaIdSeleccionada === instancia.id ? undefined : '#fff',
                            border: '1px solid #e5e7eb',
                            fontSize: '13px',
                            transition: 'all 0.15s',
                            minHeight: 44,
                            position: 'relative',
                            cursor: 'pointer',
                          }}
                          onClick={() => navigate(`/backoffice/dashboard?instanciaId=${instancia.id}`)}
                          title={instancia.evaluacion.titulo}
                          aria-current={instanciaIdSeleccionada === instancia.id ? 'page' : undefined}
                        >
                          <div className="d-flex align-items-center gap-2 flex-grow-1">
                            <span className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle" style={{ width: 24, height: 24 }}>
                              <span className="sidebar-round-icon" aria-hidden="true">✓</span>
                            </span>
                            <div className="flex-grow-1 min-w-0">
                              <div className="fw-medium" style={{ fontSize: '12px', lineHeight: '1.2' }}>
                                {instancia.evaluacion.titulo}
                              </div>
                              <div className="small text-muted" style={{ fontSize: '11px' }}>
                                v{instancia.evaluacion.version} • {instancia.evaluacion.tipo}
                              </div>
                            </div>
                          </div>
                          {instanciaIdSeleccionada === instancia.id && <span aria-hidden="true">•</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipoSidebar;

/* Agrego estilos sugeridos al final del archivo para mejorar la experiencia visual del hover y la selección */
/*
.selected-instance {
  box-shadow: 0 0 0 2px #0d6efd33;
  z-index: 1;
}
.sidebar-hover:hover {
  background-color: #e7f1ff !important;
  color: #0d6efd !important;
  border-color: #b6d4fe !important;
  transition: all 0.15s;
}
*/
