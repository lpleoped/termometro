import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import type { AIProviderResponse, AISettings, PasoFacilitador, TeamContextItem } from '@termometro/shared'
import logo from '../assets/termometro-logo.png'
import { marcasDeCuestionario } from '../domain/cuestionariosEquipo'
import { pasoDelEquipo } from '../domain/pasoFacilitador'
import { pasosVisibles, type PasoVisible } from '../domain/pasosEncabezado'
import './InfoAyuda.css'
import api from '../services/api'
import { getEquipos } from '../services/equipoService'
import { getEvaluaciones } from '../services/evaluacionService'
import { getIAProviders, getIASettings } from '../services/iaSettingsService'
import { getTeamContext } from '../services/teamContextService'

const ULTIMA_RONDA = 'termometro-ultima-ronda'
const EQUIPO_ACTIVO = 'termometro-equipo-activo'

interface EquipoMin { _id?: string; id?: string }

function idDe(doc: EquipoMin | null | undefined): string {
  return doc ? String(doc._id || doc.id || '') : ''
}

function equipoEnCurso(ids: string[], search: string): string {
  const params = new URLSearchParams(search)
  const enUrl = params.get('equipo') || params.get('equipoId') || ''
  if (enUrl && ids.includes(enUrl)) return enUrl
  let guardado = ''
  try { guardado = localStorage.getItem(EQUIPO_ACTIVO) || '' } catch { guardado = '' }
  if (guardado && ids.includes(guardado)) return guardado
  return ids[0] || ''
}

async function hayRonda(equipoId: string): Promise<boolean> {
  try {
    const res = await api.get('/instancias', { params: { equipoId } })
    return Array.isArray(res.data) && res.data.length > 0
  } catch {
    return false
  }
}

export default function Header() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [listo, setListo] = useState(false)
  const [yaMide, setYaMide] = useState(false)
  const [paso, setPaso] = useState<PasoFacilitador>('crear-equipo')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setListo(true)
      setYaMide(false)
      setPaso('crear-equipo')
      return
    }
    let activo = true
    setListo(false)
    Promise.all([
      getEquipos(),
      getEvaluaciones().catch(() => []),
      getIASettings().catch(() => null),
      getIAProviders().catch(() => [] as AIProviderResponse[]),
    ]).then(async ([equiposRaw, evaluaciones, settings, providers]) => {
      const lista = Array.isArray(equiposRaw) ? equiposRaw as EquipoMin[] : []
      const ids = lista.map(idDe).filter(Boolean)
      const marcas = await Promise.all(ids.map(async (equipoId) => {
        const [ronda, contexto] = await Promise.all([
          hayRonda(equipoId),
          getTeamContext(equipoId).catch(() => [] as TeamContextItem[]),
        ])
        return { equipoId, ronda, vigente: contexto.some((item) => item.status !== 'obsolete') }
      }))
      if (!activo) return
      const midio = marcas.some((marca) => marca.ronda)
      const foco = equipoEnCurso(ids, location.search)
      const elegido = marcas.find((marca) => marca.equipoId === foco)
      const ajustes = settings && typeof settings === 'object' ? settings as AISettings : null
      const cuestionarios = marcasDeCuestionario(evaluaciones, foco)
      setYaMide(midio)
      setPaso(pasoDelEquipo({
        tieneEquipo: ids.length > 0,
        settings: ajustes,
        providers: Array.isArray(providers) ? providers : [],
        tieneCuestionario: cuestionarios.tieneCuestionario,
        hayAlgunCuestionario: cuestionarios.hayAlgunCuestionario,
        tieneContexto: Boolean(elegido?.vigente),
        rondaCompartida: Boolean(elegido?.ronda),
      }))
    }).catch(() => {
      if (!activo) return
      setYaMide(false)
      setPaso('crear-equipo')
    }).finally(() => { if (activo) setListo(true) })
    return () => { activo = false }
  }, [isAuthenticated, location.pathname, location.search])

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
          to={isAuthenticated ? '/inicio' : '/'}
          aria-label={isAuthenticated ? 'Ir al inicio' : 'Termómetro'}
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
                  <span>{item.nombre}</span>
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

          <Link
            className={`ayuda-enlace ${location.pathname.startsWith('/ayuda') ? 'is-activa' : ''} ${pasos ? 'pasos-cuenta' : 'ms-2'}`}
            to="/ayuda"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Ayuda
          </Link>

          {isAuthenticated && (
            <button
              className={`btn btn-outline-secondary btn-sm ${pasos ? 'pasos-cuenta' : 'ms-2'}`}
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
