import React from 'react';

interface Props {
  contexto: string; // Ej: 'Estado Actual de', 'Histórico de', 'Plan de Acción para'
  titulo: string;
  version: string;
  equipo?: string;
}

const DashboardTituloEvaluacion: React.FC<Props> = ({ contexto, titulo, version, equipo }) => (
  <div className="mb-0">
    <h1 className="fw-bold text-primary mb-0 d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: '2.2rem', lineHeight: 1.1 }}>
      <span>{contexto}</span>
      <span className="fw-bold text-primary" style={{ fontWeight: 800 }}>{titulo}</span>
      <span className="badge bg-light text-secondary border border-1 px-2 py-1 small align-middle" style={{ fontWeight: 500, fontSize: '1rem' }}>
        v{version}
      </span>
      {equipo && (
        <span className="ms-2 text-secondary fw-semibold" style={{ fontSize: '1.1rem' }}>
          — {equipo}
        </span>
      )}
    </h1>
  </div>
);

// Componente reutilizable para mostrar el título homogéneo de la evaluación en todas las pestañas
// Uso: <DashboardTituloEvaluacion contexto="Estado Actual de" titulo={evaluacionTitulo} version={evaluacionVersion} />
export default DashboardTituloEvaluacion; 