// src/components/layouts/PublicLayout.tsx
import HeaderPublico from './HeaderPublico'
import logo from '../assets/termometro-logo.png'

function Footer() {
  return (
    <footer className="w-100 text-center d-flex align-items-center justify-content-between px-4 border-top bg-white" style={{ height: '64px', minHeight: '64px', fontSize: '15px', letterSpacing: '0.02em' }}>
      <span className="d-flex align-items-center gap-2">
        <img src={logo} alt="Logo" width={22} height={22} style={{ opacity: 0.7 }} />
        Transforma datos en acción: impulsa la evolución real de tu equipo.
      </span>
      <span className="text-end text-muted small">© 2026 Termómetro de Equipo. Todos los derechos reservados.</span>
    </footer>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderPublico />
      <main className="pt-5 mt-3 d-flex justify-content-center">
        <div className="w-100" style={{ maxWidth: '1200px' }}>
        {children}
        </div>
      </main>
      <Footer />
    </>
  )
}