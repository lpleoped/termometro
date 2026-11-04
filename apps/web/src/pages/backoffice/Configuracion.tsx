import { Link } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';

const sections = [
  { href: '/backoffice/configuracion/contexto', eyebrow: 'CONTEXTO', title: 'Contexto del equipo', text: 'Registrá hechos, prioridades, restricciones y contexto del cliente para mejorar los análisis de IA.', action: 'Configurar contexto' },
  { href: '/backoffice/configuracion/ia', eyebrow: 'ANÁLISIS', title: 'Inteligencia artificial', text: 'Proveedores, modelos, activación y conexiones para generar análisis y sugerencias.', action: 'Configurar IA' },
  { href: '/backoffice/configuracion/integraciones', eyebrow: 'DIFUSIÓN', title: 'Canal de difusión', text: 'Conectá Slack para compartir resultados, alertas y acciones con el equipo.', action: 'Configurar canal' },
  { href: '/backoffice/configuracion/integraciones', eyebrow: 'EJECUCIÓN', title: 'Gestor de tareas', text: 'Conectá monday.com para convertir acciones confirmadas en tareas operativas.', action: 'Configurar gestor' },
];

export default function Configuracion() {
  return <LayoutBackoffice><div className="container py-5" style={{ maxWidth: 1060 }}>
    <Link to="/backoffice/home">← Volver al panel</Link>
    <header className="my-4"><p className="text-uppercase text-muted small mb-1">Centro de control</p><h1>Configuraciones</h1><p className="text-muted lead">Un solo lugar para decidir cómo el Termómetro analiza, comunica y convierte los hallazgos en acciones.</p></header>
    <div className="row g-4">{sections.map(section => <div className="col-md-6" key={section.eyebrow}><section className="card h-100 border-0 shadow-sm p-4"><p className="text-uppercase text-primary small fw-semibold mb-2">{section.eyebrow}</p><h2 className="h4">{section.title}</h2><p className="text-muted flex-grow-1">{section.text}</p><Link className="btn btn-outline-primary align-self-start" to={section.href}>{section.action} →</Link></section></div>)}</div>
    <div className="alert alert-light border mt-4"><strong>Privacidad y control.</strong> Las conexiones se configuran por cuenta, las credenciales se guardan en el backend y cada publicación externa requiere una acción explícita.</div>
  </div></LayoutBackoffice>;
}
