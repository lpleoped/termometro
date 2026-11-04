import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import LayoutPublico from '../../components/LayoutPublico'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/termometro-logo.png'

type ErrorRegistro = '' | 'duplicado' | 'generico'

function clasificarError(err: unknown): ErrorRegistro {
  const data =
    typeof err === 'object' && err && 'response' in err
      ? (err as { response?: { data?: { error?: string } } }).response?.data
      : undefined
  const mensaje = data?.error ?? ''
  if (/registrad/i.test(mensaje)) return 'duplicado'
  return 'generico'
}

export default function Register() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ErrorRegistro>('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login, lista, isAuthenticated } = useAuth()

  const formularioListo = nombre.trim() && email.trim() && password

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await api.post('/auth/register', { nombre: nombre.trim(), email: email.trim(), password })
      const token = res.data.token
      login(token)
      navigate('/backoffice/home')
    } catch (err) {
      setError(clasificarError(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (!lista) {
    return (
      <LayoutPublico>
        <p className="text-center text-muted mt-5">Cargando...</p>
      </LayoutPublico>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/backoffice/home" replace />
  }

  return (
    <LayoutPublico>
      <div className="min-vh-100 d-flex align-items-center justify-content-center py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5 col-xl-4">
              <div className="card shadow-lg border-0">
                <div className="card-body p-5">
                  <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle mb-3" style={{ width: '60px', height: '60px' }}>
                      <img src={logo} width="35" height="35" alt="Logo" />
                    </div>
                    <h2 className="fw-bold text-primary mb-2">Creá tu cuenta</h2>
                  </div>

                  <form onSubmit={handleRegister}>
                    {error === 'duplicado' && (
                      <div className="alert alert-danger" role="alert">
                        Ese correo ya tiene cuenta.{' '}
                        <Link to="/login" className="alert-link">Entrar</Link>
                      </div>
                    )}
                    {error === 'generico' && (
                      <div className="alert alert-danger" role="alert">
                        No se pudo crear la cuenta.
                      </div>
                    )}

                    <div className="mb-3">
                      <label htmlFor="nombre" className="form-label fw-semibold">Nombre</label>
                      <input
                        id="nombre"
                        type="text"
                        className="form-control"
                        value={nombre}
                        onChange={e => {
                          setNombre(e.target.value)
                          setError('')
                        }}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label fw-semibold">Correo electrónico</label>
                      <input
                        id="email"
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value)
                          setError('')
                        }}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="password" className="form-label fw-semibold">Contraseña</label>
                      <input
                        id="password"
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value)
                          setError('')
                        }}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-3 fw-semibold"
                      disabled={!formularioListo || isLoading}
                    >
                      {isLoading ? 'Creando la cuenta...' : 'Crear cuenta'}
                    </button>
                  </form>

                  <div className="text-center mt-4">
                    <p className="text-muted small mb-0">
                      ¿Ya tenés cuenta?{' '}
                      <Link to="/login" className="text-primary fw-semibold">Entrar</Link>
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
