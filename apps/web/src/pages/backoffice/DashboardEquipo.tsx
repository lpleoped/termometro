import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import EquipoSidebar from '../../components/dashboard/estado-instancia/EquiposSidebar';
import EstadoActual from '../../components/dashboard/estado-instancia/EstadoActual';
import Historico from '../../components/dashboard/historico/Historico';
import IAAnalysisPanel from '../../components/dashboard/ia/IAAnalysisPanel';

const DashboardEquipo = () => {
  const [searchParams] = useSearchParams();
  const instanciaId = searchParams.get('instanciaId');
  const verHistorico = searchParams.get('vista') === 'historico';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  return (
    <LayoutBackoffice>
      <div className="dashboard-layout-fixed">
        <aside
          className={`dashboard-sidebar-fixed position-relative ${sidebarMobileOpen ? 'mobile-open' : ''}`}
          style={{ width: sidebarCollapsed ? 72 : 288 }}
        >
          <div className="dashboard-sidebar-inner">
            <EquipoSidebar
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => {
                setSidebarCollapsed((prev) => !prev);
                setSidebarMobileOpen(false);
              }}
            />
          </div>
        </aside>
        {sidebarMobileOpen && (
          <div
            className="sidebar-overlay d-md-none"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.18)',
              zIndex: 99,
            }}
            onClick={() => setSidebarMobileOpen(false)}
          />
        )}
        <button
          className="btn btn-menu-fab d-md-none d-print-none"
          style={{
            position: 'fixed',
            top: 16,
            left: 8,
            zIndex: 2001,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#fff',
            border: '2px solid #2563eb',
            boxShadow: '0 4px 16px rgba(37,99,235,0.12)',
            display: sidebarMobileOpen ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            cursor: 'pointer',
          }}
          aria-label={sidebarMobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setSidebarMobileOpen(true)}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="13" fill="#fff" />
            <path d="M10 7L18 14L10 21" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <main className="dashboard-main">
          <div className="dashboard-content">
            {instanciaId ? (
              verHistorico ? (
                <Historico key={instanciaId} instanciaId={instanciaId} />
              ) : (
                <>
                  <EstadoActual key={instanciaId} instanciaId={instanciaId} />
                  <IAAnalysisPanel instanciaId={instanciaId} />
                </>
              )
            ) : (
              <div className="py-4">
                <p className="evaluation-eyebrow mb-2">Resultados del equipo</p>
                <h2 className="h4 mb-2">Elegí una ronda para ver el termómetro</h2>
                <p className="text-muted mb-4">Vas a encontrar la participación, el estado actual y el plan de acción.</p>
                <Link className="btn btn-primary" to="/backoffice/home">
                  Ver mis equipos
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </LayoutBackoffice>
  );
};

export default DashboardEquipo;
