import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import NotificationContainer from './components/NotificationContainer'
import PrivateRoute from './routes/PrivateRoute'
import 'aos/dist/aos.css'
import AOS from 'aos'
import useChartPrintFix from './hooks/useChartPrintFix'

// Lazy loading de componentes para mejor performance
const HomePublica = lazy(() => import('./pages/public/HomePublica'))
const AltaEvaluacion = lazy(() => import('./pages/backoffice/AltaEvaluacion'))
const ConsultaEvaluacion = lazy(() => import('./pages/backoffice/Evaluacion'))
const LecturaCuestionario = lazy(() => import('./pages/backoffice/LecturaCuestionario'))
const DashboardEquipo = lazy(() => import('./pages/backoffice/DashboardEquipo'))
const HomeBackoffice = lazy(() => import('./pages/backoffice/BackofficeHome'))
const PublicarEvaluacion = lazy(() => import('./pages/backoffice/PublicarEvaluacion'))
const Responder = lazy(() => import('./pages/public/Responder'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))

// Componente de loading
const LoadingSpinner = () => (
  <div className="min-vh-100 d-flex align-items-center justify-content-center">
    <div className="text-center">
      <div className="loading-spinner mx-auto mb-3" style={{ width: '40px', height: '40px' }}></div>
      <p className="text-muted">Cargando...</p>
    </div>
  </div>
)

// Componente de error
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="error-boundary">
      {children}
    </div>
  )
}

function App() {
  useEffect(() => {
    // Inicializar AOS con configuración mejorada
    AOS.init({ 
      duration: 800, 
      once: true,
      offset: 100,
      easing: 'ease-in-out-cubic'
    })
  }, [])

  useChartPrintFix()

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <div className="app-container">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Rutas públicas */}
                <Route path="/" element={<HomePublica />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="/responder/:instanciaId" element={<Responder />} />
                
                {/* Rutas del backoffice */}
                <Route path="/backoffice">
                  <Route
                    path="home"
                    element={
                      <PrivateRoute>
                        <HomeBackoffice />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="dashboard"
                    element={
                      <PrivateRoute>
                        <DashboardEquipo />
                      </PrivateRoute>
                    }
                  />
                  <Route 
                    path="alta-evaluacion" 
                    element={
                      <PrivateRoute>
                        <AltaEvaluacion />
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="consulta-evaluacion" 
                    element={
                      <PrivateRoute>
                        <ConsultaEvaluacion />
                      </PrivateRoute>
                    } 
                  />
                  <Route
                    path="consulta-evaluacion/:id"
                    element={
                      <PrivateRoute>
                        <LecturaCuestionario />
                      </PrivateRoute>
                    }
                  />
                  <Route 
                    path="publicar-evaluacion" 
                    element={
                      <PrivateRoute>
                        <PublicarEvaluacion />
                      </PrivateRoute>
                    } 
                  />
                </Route>
                
                {/* Ruta por defecto - redirigir a inicio */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            
            {/* Contenedor de notificaciones */}
            <NotificationContainer />
          </div>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  )
}

export default App
