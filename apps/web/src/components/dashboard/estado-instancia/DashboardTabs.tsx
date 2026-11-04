import { useEffect, useState, useRef } from 'react';
import EstadoActual from './EstadoActual';
import Historico from '../historico/Historico';
import PlanDeAccion from '../plan/PlanDeAccion';
import { getInstanciaById } from '../../../services/instanciaService';
import { getEvaluacionById } from '../../../services/evaluacionService';
import { getEquipoById } from '../../../services/equipoService';
import DashboardTituloEvaluacion from './DashboardTituloEvaluacion';
import logoTermometro from '../../../assets/termometro-logo.png';

interface Props {
  instanciaId: string;
  evaluacionTitulo?: string;
  evaluacionVersion?: string;
  equipoNombre?: string;
  equipoId?: string;
  evaluacionId?: string;
}

const DashboardTabs = ({ instanciaId, evaluacionTitulo: propTitulo, evaluacionVersion: propVersion, equipoNombre: propEquipo, equipoId: propEquipoId, evaluacionId: propEvaluacionId }: Props) => {
  const [activeTab, setActiveTab] = useState('actual');
  const [evaluacionTitulo, setEvaluacionTitulo] = useState(propTitulo || '');
  const [evaluacionVersion, setEvaluacionVersion] = useState(propVersion || '');
  const [equipoInfo, setEquipoInfo] = useState<{ nombre: string; sigla: string; color: string; evaluacionesActivas: number } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Resetear tab activo y datos internos cuando cambia la instancia seleccionada
  useEffect(() => {
    setActiveTab('actual');
    setEvaluacionTitulo(propTitulo || '');
    setEvaluacionVersion(propVersion || '');
    setEquipoInfo(null);
    setLoading(true);
    console.log('DashboardTabs: props cambiaron, instanciaId:', instanciaId, 'titulo:', propTitulo);
  }, [instanciaId, propTitulo, propVersion, propEquipoId, propEvaluacionId]);

  // Debug: log props
  console.log('DashboardTabs props:', { propEquipoId, propEvaluacionId, propTitulo, propEquipo, activeTab });

  useEffect(() => {
    if (propTitulo && propEquipo) {
      setEvaluacionTitulo(propTitulo);
      setEvaluacionVersion(propVersion || '');
      setEquipoInfo((prev) => ({
        ...(prev || {}),
        nombre: propEquipo,
        sigla: propEquipo.slice(0,2).toUpperCase(),
        color: prev?.color || '#3b82f6',
        evaluacionesActivas: prev?.evaluacionesActivas || 0
      }));
      setLoading(false);
      return;
    }
    // Fallback: fetch si no hay props
    const fetchInfo = async () => {
      try {
        setLoading(true);
        const instancia = await getInstanciaById(instanciaId);
        if (instancia.equipoId) {
          const equipo = await getEquipoById(instancia.equipoId);
          setEquipoInfo({
            nombre: equipo.nombre,
            sigla: equipo.sigla || equipo.nombre.slice(0,2).toUpperCase(),
            color: equipo.color || '#3b82f6',
            evaluacionesActivas: equipo.evaluacionesActivas ? equipo.evaluacionesActivas.length : 0
          });
        }
        if (instancia.evaluacion && instancia.evaluacion.titulo) {
          setEvaluacionTitulo(instancia.evaluacion.titulo);
          setEvaluacionVersion(instancia.evaluacion.version || '1.0');
        } else if (instancia.evaluacionId) {
          const evaluacion = await getEvaluacionById(instancia.evaluacionId);
          setEvaluacionTitulo(evaluacion.titulo);
          setEvaluacionVersion((evaluacion as any).version || '1.0');
        } else {
          setEvaluacionTitulo('');
          setEvaluacionVersion('');
        }
      } catch (err) {
        console.error('Error al cargar datos de la instancia:', err);
      } finally {
        setLoading(false);
      }
    };
    if (instanciaId && (!propTitulo || !propEquipo)) {
      fetchInfo();
    }
  }, [instanciaId, propTitulo, propVersion, propEquipo]);

  return (
    <>
      {/* Título homogéneo de la evaluación */}
      <div className="mb-4">
        <DashboardTituloEvaluacion
          contexto={
            activeTab === 'actual'
              ? 'Estado Actual de'
              : activeTab === 'historico'
              ? 'Histórico de'
              : 'Plan de Acción para'
          }
          titulo={evaluacionTitulo}
          version={evaluacionVersion}
          equipo={equipoInfo?.nombre || propEquipo || ''}
        />
      </div>
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'actual' ? 'active' : ''}`}
            onClick={() => setActiveTab('actual')}
          >
            Estado Actual
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'historico' ? 'active' : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            Histórico
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'plan' ? 'active' : ''}`}
            onClick={() => setActiveTab('plan')}
          >
            Plan de Acción
          </button>
        </li>
      </ul>

      {activeTab === 'actual' && (
        console.log('DashboardTabs: renderizando EstadoActual con instanciaId:', instanciaId),
        <EstadoActual instanciaId={instanciaId} />
      )}
      {activeTab === 'historico' && (
        <Historico instanciaId={instanciaId} />
      )}
      {activeTab === 'plan' && (
        <PlanDeAccion instanciaId={instanciaId} indice={0} />
      )}
    </>
  );
};

export default DashboardTabs;



