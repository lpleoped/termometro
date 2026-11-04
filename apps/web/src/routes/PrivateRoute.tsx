import { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, lista } = useAuth()
  const location = useLocation()

  if (!lista) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <p className="text-muted mb-0">Cargando...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return children
}
