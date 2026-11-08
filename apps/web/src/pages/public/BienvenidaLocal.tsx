import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LayoutPublico from '../../components/LayoutPublico';
import logo from '../../assets/termometro-logo.png';

export default function BienvenidaLocal() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);

  const restore = async (file?: File) => {
    if (!file) return;
    setError('');
    setRestoring(true);
    try {
      const backup = JSON.parse(await file.text());
      await api.post('/installation/restore', backup);
      navigate('/login', { replace: true, state: { restored: true } });
    } catch (reason) {
      const message = typeof reason === 'object' && reason && 'response' in reason
        ? (reason as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(message || 'No pudimos restaurar ese respaldo. Elegí un archivo exportado por Termómetro.');
    } finally {
      setRestoring(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return <LayoutPublico><main className="min-vh-100 d-flex align-items-center py-5"><div className="container"><div className="row justify-content-center"><div className="col-lg-7 col-xl-6"><section className="card border-0 shadow-lg"><div className="card-body p-4 p-md-5 text-center"><img src={logo} width="64" height="64" alt="Termómetro" className="mb-4" /><p className="text-uppercase text-primary fw-semibold small mb-2">Todo listo para empezar</p><h1 className="display-6 fw-bold mb-3">Bienvenido a Termómetro de Equipo</h1><p className="lead text-muted mb-4">Creá tu espacio para escuchar al equipo, abrir rondas y convertir los resultados en mejoras concretas.</p><div className="alert alert-light border text-start mb-4"><strong>Tus datos quedan en esta computadora.</strong><br /><span className="text-muted">Podés llevarlos a otra computadora exportando un respaldo cuando quieras.</span></div>{error && <div className="alert alert-danger text-start" role="alert">{error}</div>}<div className="d-grid gap-3"><button type="button" className="btn btn-primary btn-lg py-3" onClick={() => navigate('/registro', { state: { firstRun: true } })}>Crear mi cuenta y empezar</button><button type="button" className="btn btn-outline-secondary" disabled={restoring} onClick={() => fileInput.current?.click()}>{restoring ? 'Restaurando respaldo…' : 'Restaurar un respaldo'}</button><input ref={fileInput} className="d-none" type="file" accept="application/json,.json" onChange={(event) => void restore(event.target.files?.[0])} /></div></div></section></div></div></div></main></LayoutPublico>;
}
