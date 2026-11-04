import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import EquipoSidebar from '../../components/dashboard/estado-instancia/EquiposSidebar';
import EstadoActual from '../../components/dashboard/estado-instancia/EstadoActual';
import Historico from '../../components/dashboard/historico/Historico';

const DashboardEquipo = () => {
  const [searchParams] = useSearchParams();
  const instanciaId = searchParams.get('instanciaId');
  const verHistorico = searchParams.get('vista') === 'historico';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [instanciaId]);

  useEffect(() => {
    if (!sidebarMobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarMobileOpen]);

  return (
    <LayoutBackoffice>
      <div className={`dashboard-layout-fixed ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <aside
          id="navegacion-equipos"
          className={`dashboard-sidebar-fixed ${sidebarMobileOpen ? 'mobile-open' : ''}`}
        >
          <div className="dashboard-sidebar-inner">
            <EquipoSidebar
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => {
                setSidebarCollapsed((prev) => !prev);
                setSidebarMobileOpen(false);
              }}
              onCloseMobile={() => setSidebarMobileOpen(false)}
            />
          </div>
        </aside>
        {sidebarMobileOpen && (
          <div
            className="sidebar-overlay d-md-none"
            onClick={() => setSidebarMobileOpen(false)}
          />
        )}
        <button
          className="dashboard-mobile-menu d-md-none d-print-none"
          aria-label="Abrir equipos"
          aria-expanded={sidebarMobileOpen}
          aria-controls="navegacion-equipos"
          onClick={() => setSidebarMobileOpen(true)}
        >
          <span aria-hidden="true">☰</span> Equipos
        </button>
        <main className="dashboard-main">
          <div className="dashboard-content">
            {instanciaId ? (
              verHistorico ? (
                <Historico key={instanciaId} instanciaId={instanciaId} />
              ) : (
                <EstadoActual key={instanciaId} instanciaId={instanciaId} />
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
