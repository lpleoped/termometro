// src/components/layouts/PublicLayout.tsx
import Header from '../Header'

function Footer() {
  return (
    <footer className="backoffice-footer w-100 border-top">
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

export default function LayoutBackoffice({ children }: { children: React.ReactNode }) {
  return (
    <div className="backoffice-layout min-vh-100 d-flex flex-column">
      <Header />
      <main className="backoffice-main flex-grow-1">
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-12 backoffice-columna">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
