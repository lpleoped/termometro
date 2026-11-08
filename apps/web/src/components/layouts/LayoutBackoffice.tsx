// src/components/layouts/PublicLayout.tsx
import Header from '../Header'
import logo from '../../assets/termometro-logo.png';

function Footer() {
  return (
    <footer className="w-100 text-center d-flex align-items-center justify-content-between px-4 border-top bg-white" style={{ height: '64px', minHeight: '64px', fontSize: '15px', letterSpacing: '0.02em' }}>
      <span className="d-flex align-items-center gap-2">
        <img src={logo} alt="Logo" width={22} height={22} style={{ opacity: 0.7 }} />
        Herramienta para medir y mejorar el clima organizacional
      </span>
        <span className="text-end text-muted small">© 2026 Termómetro. Todos los derechos reservados.</span>
    </footer>
  );
}

export default function LayoutBackoffice({ children }: { children: React.ReactNode }) {
  return (
    <div className="backoffice-layout min-vh-100 d-flex flex-column">
      <Header />
      <main className="backoffice-main flex-grow-1">
        <div className="container-fluid px-4">
          <div className="row justify-content-center">
            <div className="col-12" style={{ maxWidth: '1400px' }}>
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
