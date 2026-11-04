import { Link, useSearchParams } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import IAAnalysisPanel from '../../components/dashboard/ia/IAAnalysisPanel';
import './ConfiguracionIA.css';

export default function AnalisisIA() {
  const [params] = useSearchParams();
  const instanciaId = params.get('instanciaId');
  return <LayoutBackoffice><div className="ia-workspace">
    <Link className="ia-back" to={instanciaId ? `/backoffice/dashboard?instanciaId=${instanciaId}` : '/backoffice/home'}>← Volver al equipo</Link>
    <header className="ia-heading"><p className="ia-eyebrow">ASISTENCIA PARA TU EQUIPO</p><h1>Análisis con IA</h1><p>Convertí los resultados de una ronda en ideas para conversar y actuar.</p></header>
    {instanciaId ? <IAAnalysisPanel instanciaId={instanciaId} /> : <div className="ia-card"><h2>Elegí una ronda para analizar</h2><p>Abrí un equipo y seleccioná “Abrir análisis con IA”.</p><Link className="btn btn-primary" to="/backoffice/home">Ver mis equipos</Link></div>}
  </div></LayoutBackoffice>;
}
