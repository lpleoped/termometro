import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { getEquipos } from '../../services/equipoService';
import { getEvaluaciones } from '../../services/evaluacionService';
interface Equipo { _id?: string; nombre?: string; miembros?: string[] }
export default function PanelOverview() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [evaluaciones, setEvaluaciones] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setCargando(true); setError(false);
    Promise.all([getEquipos(), getEvaluaciones()]).then(([teams, evaluations]) => {
      if (!active) return;
      setEquipos(Array.isArray(teams) ? teams : []);
      setEvaluaciones(Array.isArray(evaluations) ? evaluations.length : 0);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setCargando(false); });
    return () => { active = false; };
  }, [attempt]);
  const totalMiembros = equipos.reduce((total, equipo) => total + (equipo.miembros?.length || 0), 0);
  const next = !evaluaciones
    ? { title: 'Crear mi primer termómetro', href: '/backoffice/alta-evaluacion', text: 'Armá tu cuestionario de forma guiada o prepará una base con IA desde Configuración.' }
    : !equipos.length
      ? { title: 'Crear mi primer equipo', href: '/backoffice/equipos', text: 'Tu cuestionario está listo. Creá el equipo al que vas a invitar a responder.' }
      : { title: 'Abrir una ronda', href: '/backoffice/publicar-evaluacion', text: 'Elegí el equipo, el cuestionario y la privacidad. Después compartí el enlace o el QR.' };
  return <LayoutBackoffice><div className="container py-5" style={{ maxWidth: 1120 }}>
    <header className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4"><div><p className="text-uppercase text-muted small mb-1">Panel</p><h1>Una lectura clara del equipo</h1><p className="text-muted">Escuchá al equipo, seguí los resultados y convertí los hallazgos en acciones.</p></div><Link className="btn btn-outline-primary" to="/backoffice/configuracion">Configuración y respaldos</Link></header>
    {cargando ? <p role="status">Cargando tu espacio…</p> : error ? <div role="alert"><p>No pudimos cargar el panel.</p><button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div> : <>
      <section className="card border-0 shadow-sm p-4 mb-4"><h2 className="h4">{next.title}</h2><p>{next.text}</p><div className="d-flex flex-wrap gap-3"><Link className="btn btn-primary" to={next.href}>{next.title}</Link><Link className="btn btn-outline-secondary" to="/backoffice/configuracion">Importar o exportar respaldo</Link></div></section>
      <section className="row g-3 mb-4" aria-label="Resumen"><div className="col-md-4"><div className="card p-3"><span>Equipos activos</span><strong className="display-6">{equipos.length}</strong></div></div><div className="col-md-4"><div className="card p-3"><span>Personas convocadas</span><strong className="display-6">{totalMiembros}</strong></div></div><div className="col-md-4"><div className="card p-3"><span>Cuestionarios</span><strong className="display-6">{evaluaciones}</strong></div></div></section>
      <nav aria-label="Accesos al trabajo" className="d-flex flex-wrap gap-3"><Link to="/backoffice/equipos">Administrar equipos</Link><Link to="/backoffice/consulta-evaluacion">Revisar cuestionarios</Link><Link to="/backoffice/configuracion/contexto">Contexto del equipo</Link><Link to="/backoffice/ia">Análisis con IA</Link></nav>
    </>}
  </div></LayoutBackoffice>;
}
