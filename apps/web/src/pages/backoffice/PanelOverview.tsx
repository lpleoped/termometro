import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { getEquipos } from '../../services/equipoService';

interface Equipo { _id?: string; id?: string; nombre?: string; miembros?: string[] }
const idDe = (equipo: Equipo) => String(equipo._id || equipo.id || '');

export default function PanelOverview() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => { getEquipos().then((data) => setEquipos(Array.isArray(data) ? data : [])).finally(() => setCargando(false)); }, []);
  const totalMiembros = equipos.reduce((total, equipo) => total + (equipo.miembros?.length || 0), 0);
  return <LayoutBackoffice><main className="container py-5" style={{ maxWidth: 1120 }}>
    <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-5"><div><p className="text-uppercase text-muted small fw-semibold mb-1">Panel</p><h1 className="fw-bold mb-2">Una lectura clara del equipo</h1><p className="text-muted mb-0">Acá ves el estado general. La administración vive en Equipos.</p></div><Link className="btn btn-primary" to="/backoffice/equipos">Administrar equipos</Link></div>
    <div className="row g-3 mb-5"><div className="col-md-4"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="text-muted small">Equipos activos</div><div className="display-6 fw-bold">{cargando ? '—' : equipos.length}</div><div className="small text-muted">con seguimiento disponible</div></div></div></div><div className="col-md-4"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="text-muted small">Personas convocadas</div><div className="display-6 fw-bold">{cargando ? '—' : totalMiembros}</div><div className="small text-muted">miembros registrados</div></div></div></div><div className="col-md-4"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="text-muted small">Próximo paso</div><div className="fw-bold fs-5 mt-2">{equipos.length ? 'Abrir o revisar una ronda' : 'Crear tu primer equipo'}</div><Link className="small" to={equipos.length ? '/backoffice/publicar-evaluacion' : '/backoffice/equipos'}>{equipos.length ? 'Ir a mediciones →' : 'Empezar →'}</Link></div></div></div></div>
    <section className="card border-0 shadow-sm"><div className="card-body p-4"><div className="d-flex justify-content-between align-items-center mb-3"><div><p className="text-uppercase text-muted small mb-1">Accesos rápidos</p><h2 className="h4 mb-0">Trabajá con contexto</h2></div><Link to="/backoffice/equipos">Ver todos →</Link></div><div className="row g-3"><div className="col-md-4"><Link className="text-decoration-none" to="/backoffice/publicar-evaluacion"><div className="rounded border p-3 h-100"><strong>Abrir una medición</strong><p className="small text-muted mb-0 mt-1">Elegí equipo, cuestionario y privacidad.</p></div></Link></div><div className="col-md-4"><Link className="text-decoration-none" to="/backoffice/consulta-evaluacion"><div className="rounded border p-3 h-100"><strong>Revisar cuestionarios</strong><p className="small text-muted mb-0 mt-1">Diseñá indicadores cuantitativos y cualitativos.</p></div></Link></div><div className="col-md-4"><Link className="text-decoration-none" to="/backoffice/configuracion"><div className="rounded border p-3 h-100"><strong>Configurar análisis</strong><p className="small text-muted mb-0 mt-1">Reglas de alerta, IA e integraciones.</p></div></Link></div></div></div></section>
  </main></LayoutBackoffice>;
}
