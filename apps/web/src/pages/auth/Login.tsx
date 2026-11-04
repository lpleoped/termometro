// src/pages/auth/Login.tsx
import { useState } from 'react'
import { useNavigate, Link, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import LayoutPublico from '../../components/LayoutPublico'
import logo from '../../assets/termometro-logo.png'

function destinoTrasEntrar(from: unknown): string {
  if (typeof from === 'string' && from.startsWith('/backoffice')) return from
  return '/backoffice/home'
}

export default function Login() {
  const { login, lista, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('') // Limpiar error al escribir
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await api.post('/auth/login', formData)
      const token = res.data.token
      login(token)
      const from = (location.state as { from?: unknown } | null)?.from
      navigate(destinoTrasEntrar(from))
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined
      setError(
        status === 401
          ? 'Ese correo o la contraseña no coinciden.'
          : 'No se pudo entrar.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const isValidForm = formData.email && formData.password

  if (!lista) {
    return (
      <LayoutPublico>
        <p className="text-center text-muted mt-5">Cargando...</p>
      </LayoutPublico>
    )
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: unknown } | null)?.from
    return <Navigate to={destinoTrasEntrar(from)} replace />
  }

  return (
    <LayoutPublico>
      <div className="min-vh-100 d-flex align-items-center justify-content-center py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5 col-xl-4">
              {/* Card de login */}
              <div className="card shadow-lg border-0">
                <div className="card-body p-5">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle mb-3" style={{ width: '60px', height: '60px' }}>
                      <img src={logo} width="35" height="35" alt="Logo" />
                    </div>
                    <h2 className="fw-bold text-primary mb-2">Entrá a tu cuenta</h2>
                  </div>

                  {/* Formulario */}
                  <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                    {error && (
                      <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                        </svg>
                        {error}
                      </div>
                    )}

                    {/* Email */}
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label fw-semibold">
                        Correo electrónico
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                          </svg>
                        </span>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className="form-control border-start-0"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="tu@email.com"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                      <label htmlFor="password" className="form-label fw-semibold">
                        Contraseña
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
                          </svg>
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          className="form-control border-start-0 border-end-0"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary border-start-0"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            {showPassword ? (
                              <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                            ) : (
                              <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C13.879 11.332 12.119 12.5 10 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                            )}
                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Botón de envío */}
                    <button 
                      type="submit" 
                      className={`btn btn-primary w-100 py-3 fw-semibold ${isLoading ? 'loading' : ''}`}
                      disabled={!isValidForm || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="loading-spinner me-2"></div>
                          Entrando...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                          </svg>
                          Entrar
                        </>
                      )}
                    </button>
                  </form>

                  {/* Enlaces adicionales */}
                  <div className="text-center mt-4">
                    <p className="text-muted small mb-0">
                      ¿No tenés cuenta?{' '}
                      <Link to="/registro" className="text-primary fw-semibold">
                        Crear cuenta
                      </Link>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </LayoutPublico>
  )
}