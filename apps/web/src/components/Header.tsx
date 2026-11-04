import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import logo from '../assets/termometro-logo.png'

export default function Header() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Detectar scroll para cambiar el estilo del navbar
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

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const navItems = [
    { path: '/', label: 'Inicio', public: true },
    { path: '/login', label: 'Ingresar', public: true, auth: false },
    { path: '/backoffice/home', label: 'Panel', auth: true },
    { path: '/backoffice/equipos', label: 'Equipos', auth: true },
    { path: '/backoffice/consulta-evaluacion', label: 'Evaluaciones', auth: true },
    { path: '/backoffice/publicar-evaluacion', label: 'Publicar', auth: true },
    { path: '/backoffice/configuracion', label: 'Configuración', auth: true },
  ]

  const filteredNavItems = navItems.filter(item => {
    if (item.path === '/login') return !isAuthenticated;
    if (item.auth) return isAuthenticated;
    return item.public && (item.auth === undefined || item.auth === false);
  })

  return (
    <nav className={`app-navbar navbar navbar-expand-lg fixed-top transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-sm' : 'bg-white'
    }`}>
      <div className="container">
        {/* Logo y marca */}
        <Link 
          className="navbar-brand d-flex align-items-center text-decoration-none" 
          to="/"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img 
            src={logo} 
            width="32" 
            height="32" 
            className="me-2" 
            alt="Logo Termómetro" 
          />
          <span className="fw-semibold text-primary">Termómetro de Equipo</span>
        </Link>

        {/* Botón hamburguesa para móvil */}
        <button
          className={`navbar-toggler border-0 ${isMobileMenuOpen ? 'collapsed' : ''}`}
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Menú de navegación */}
        <div className={`collapse navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center">
            {filteredNavItems.map((item) => (
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
            
            {/* Botón de cerrar sesión */}
            {isAuthenticated && (
              <li className="nav-item ms-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}
