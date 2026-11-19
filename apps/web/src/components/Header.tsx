import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import logo from '../assets/termometro-logo.png'
import { destinoDePaso, pasosVisibles, type PasoVisible } from '../domain/pasosEncabezado'
import './InfoAyuda.css'
import { useRecorridoEncabezado } from './useRecorridoEncabezado'

const ULTIMA_RONDA = 'termometro-ultima-ronda'

function SignoAyuda() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8.25" />
      <path d="M10 9.15v5.1" />
      <circle className="info-ayuda-punto" cx="10" cy="6.15" r="0.85" />
    </svg>
  )
}

export default function Header() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { listo, yaMide, paso, equipoId } = useRecorridoEncabezado()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsMobileMenuOpen(false)
  }

  const isActive = (path: string) => location.pathname === path.split('?')[0]
  const ultimaRonda = typeof localStorage === 'undefined' ? '' : localStorage.getItem(ULTIMA_RONDA) || ''
  const mostrarPasos = isAuthenticated && listo && !yaMide
  const pasos: PasoVisible[] | null = mostrarPasos ? (pasosVisibles(paso) ?? pasosVisibles('crear-equipo')) : null
  const navItems = !isAuthenticated ? [
    { path: '/', label: 'Inicio' },
    { path: '/login', label: 'Ingresar' },
  ] : yaMide ? [
    { path: '/backoffice/equipos', label: 'Equipos' },
    { path: '/backoffice/consulta-evaluacion', label: 'Cuestionarios' },
    { path: ultimaRonda ? `/backoffice/dashboard?instanciaId=${ultimaRonda}` : '/backoffice/dashboard', label: 'Resultados' },
    { path: ultimaRonda ? `/backoffice/accionables?instanciaId=${ultimaRonda}` : '/backoffice/accionables', label: 'Accionables' },
    { path: '/backoffice/configuracion', label: 'Configuración' },
  ] : []

  const hayMenu = Boolean(pasos) || navItems.length > 0

  return (
    <nav className={`app-navbar navbar ${pasos ? 'navbar-expand-md app-navbar-recorrido' : 'navbar-expand-lg'} fixed-top ${
      isScrolled ? 'bg-white shadow-sm' : 'bg-white'
    }`}>
      <div className={pasos ? 'container-fluid px-3' : 'container'}>
        <Link
          className="navbar-brand d-flex align-items-center text-decoration-none"
          to={isAuthenticated ? '/backoffice/home' : '/'}
          aria-label={isAuthenticated ? 'Ir al panel' : 'Termómetro'}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img
            src={logo}
            width="40"
            height="40"
            className="brand-mark brand-mark-header me-2"
            alt=""
          />
          <span className="fw-semibold text-primary">Termómetro</span>
        </Link>

        {hayMenu && (
          <button
            className="navbar-toggler border-0"
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-label="Menú"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        )}

        <div className={`collapse navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`}>
          {pasos ? (
            <ol className="pasos-recorrido" aria-label="Pasos">
              {pasos.map((item) => (
                <li key={item.id} className={`paso-${item.estado}`} aria-current={item.estado === 'actual' ? 'step' : undefined}>
                  <Link to={destinoDePaso(item.id, equipoId)} onClick={() => setIsMobileMenuOpen(false)}>
                    {item.nombre}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center">
              {navItems.map((item) => (
                <li className="nav-item" key={item.path}>
                  <Link
                    className={`nav-link px-3 py-2 mx-1 rounded ${
                      isActive(item.path)
                        ? 'text-primary fw-medium bg-light'
                        : 'text-secondary'
                    }`}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className={`cuenta-grupo ${pasos ? 'pasos-cuenta' : ''}`}>
            <Link
              className={`cuenta-ayuda ${location.pathname.startsWith('/ayuda') ? 'is-activa' : ''}`}
              to="/ayuda"
              state={{ from: `${location.pathname}${location.search}` }}
              aria-label="Ayuda"
              aria-current={location.pathname.startsWith('/ayuda') ? 'page' : undefined}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <SignoAyuda />
            </Link>
            {isAuthenticated && (
              <button type="button" className="cuenta-salir" onClick={handleLogout}>
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
