import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { InstallationStatusResponse } from '@termometro/shared';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import HomePublica from '../pages/public/HomePublica';
import BienvenidaLocal from '../pages/public/BienvenidaLocal';
export default function FirstRunGate() {
  const { lista, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<InstallationStatusResponse | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setError(false);
    api.get<InstallationStatusResponse>('/installation').then(({ data }) => { if (active) setStatus(data); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  if (error) return <div className="container py-5"><p role="alert">No pudimos abrir tu espacio. Revisá la conexión o consultá Ayuda.</p><button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>;
  if (!lista || !status) return <div className="min-vh-100 d-flex align-items-center justify-content-center" role="status">Preparando Termómetro…</div>;
  if (status.storage === 'json' && isAuthenticated) return <Navigate to="/backoffice/home" replace />;
  return status.firstRun ? <BienvenidaLocal /> : <HomePublica />;
}
