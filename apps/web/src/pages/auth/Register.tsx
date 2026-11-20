import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import LayoutPublico from '../../components/LayoutPublico'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/termometro-logo.png'

type ErrorRegistro = '' | 'duplicado' | 'password' | 'generico'

const MIN_PASSWORD_LENGTH = 8

function clasificarError(err: unknown): ErrorRegistro {
  const data =
    typeof err === 'object' && err && 'response' in err
      ? (err as { response?: { data?: { error?: string } } }).response?.data
      : undefined
  const mensaje = data?.error ?? ''
  if (/contraseña/i.test(mensaje)) return 'password'
  // La API usa "No se pudo completar el registro" ante email duplicado.
  if (/registrad|completar el registro/i.test(mensaje)) return 'duplicado'
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

  const formularioListo = Boolean(nombre.trim() && email.trim() && password.length >= MIN_PASSWORD_LENGTH)

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
      <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5 col-xl-4">
              <div className="card shadow-lg border-0">
                <div className="card-body p-5">
                  <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle mb-3" style={{ width: '60px', height: '60px' }}>
                      <img src={logo} width="40" height="40" className="brand-mark brand-mark-auth" alt="Termómetro" />
                    </div>
                    <h2 className="fw-bold text-primary mb-2">Creá tu cuenta</h2>
                    <p className="mb-0">Tus datos quedan en esta computadora. No hay recupero de contraseña por correo.</p>
                  </div>

                  <form onSubmit={handleRegister}>
                    {error === 'duplicado' && (
                      <div className="alert alert-danger" role="alert">
                        Ese correo ya tiene cuenta.
                        <div className="mt-2"><Link to="/login" className="btn btn-sm btn-outline-secondary">Entrar</Link></div>
                      </div>
                    )}
                    {error === 'password' && (
                      <div className="alert alert-danger" role="alert">
                        La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres.
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
                        minLength={MIN_PASSWORD_LENGTH}
                        disabled={isLoading}
                      />
                      <div className="form-text">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</div>
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
                    <p className="text-muted small mb-2">¿Ya tenés cuenta?</p>
                    <Link to="/login" className="btn btn-outline-secondary">Entrar</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </LayoutPublico>
  )
}
