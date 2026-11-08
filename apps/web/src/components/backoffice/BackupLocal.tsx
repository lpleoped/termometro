import { useEffect, useRef, useState } from 'react';
import type { InstallationStatusResponse } from '@termometro/shared';
import api from '../../services/api';
const backupName = () => `termometro-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
export default function BackupLocal() {
  const input = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api.get<InstallationStatusResponse>('/installation').then(({data}) => { if (active) setLocal(data.storage === 'json'); }).catch(() => { if (active) setError('No se pudo comprobar la disponibilidad de restauración.'); });
    return () => { active = false; };
  }, []);
  const exportBackup = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await api.get('/backup');
      const href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = href; link.download = backupName(); link.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      setMessage('Respaldo descargado. Incluye tu cuenta y su histórico. Guardalo en un lugar seguro.');
    } catch { setError('No se pudo exportar el respaldo en este momento.'); }
    finally { setBusy(false); }
  };
  const restore = async (file?: File) => {
    if (!file) return;
    if (!window.confirm('La restauración reemplaza los datos de esta instalación. Se conservará una copia de recuperación. ¿Continuar?')) { if (input.current) input.current.value = ''; return; }
    setBusy(true); setError(''); setMessage('');
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('El respaldo supera el tamaño admitido de 25 MB.');
      await api.post('/backup/restore', JSON.parse(await file.text()));
      localStorage.removeItem('token'); window.location.assign('/login');
    } catch (reason) {
      const response = (reason as { response?: { data?: { error?: string } } })?.response;
      setError(response?.data?.error || 'No se pudo restaurar ese respaldo. Verificá el archivo y su tamaño (hasta 25 MB).');
    } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return <section className="card border-0 shadow-sm p-4 mt-4">
    <h2 className="h4">Respaldo de tu espacio</h2>
    <p>Incluye equipos, cuestionarios, rondas, respuestas, contexto, análisis, acciones y configuración de tu cuenta.</p>
    <p className="text-muted">Las claves de IA e integraciones no se exportan. Al restaurar, volvé a ingresarlas y activá las conexiones. El respaldo contiene información privada y la cuenta de acceso: guardalo en un lugar seguro.</p>
    {!local && <p className="text-muted">Podés llevar este respaldo a la aplicación instalada. La instalación local es independiente de esta web.</p>}
    <div className="d-flex flex-wrap gap-2">
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void exportBackup()}>Exportar respaldo</button>
      {local && <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => input.current?.click()}>Importar respaldo</button>}
      <input ref={input} className="d-none" type="file" accept="application/json,.json" aria-label="Seleccionar respaldo" onChange={event => void restore(event.target.files?.[0])} />
    </div>
    {message && <p className="text-success mt-3 mb-0" role="status">{message}</p>}
    {error && <p className="text-danger mt-3 mb-0" role="alert">{error}</p>}
  </section>;
}
