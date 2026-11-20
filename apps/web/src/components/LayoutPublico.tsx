// src/components/layouts/PublicLayout.tsx
import HeaderPublico from './HeaderPublico'

function Footer() {
  return (
    <footer className="w-100 border-top bg-white px-4 py-3">
      <p className="text-muted small text-center mb-0">
        Código abierto Apache-2.0 · By{' '}
        <a
          className="footer-autor"
          href="https://www.linkedin.com/in/leonardo-pedreira/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Leonardo Pedreira
        </a>.
      </p>
    </footer>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout-publico">
      <HeaderPublico />
      <main>
        <div className="w-100" style={{ maxWidth: '1200px' }}>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
