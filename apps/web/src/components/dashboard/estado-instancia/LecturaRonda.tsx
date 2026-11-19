import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AIAnalysisResponse, AISettings } from '@termometro/shared';
import useIA from '../../../hooks/useIA';
import { frasePropuestas } from '../../../domain/indice-ronda';
import api from '../../../services/api';
import { getIASettings, iaMessage } from '../../../services/iaSettingsService';

interface Props {
  instanciaId: string;
  equipoId: string;
  onAnalisis?: (analisis: AIAnalysisResponse | null) => void;
}

function puedePedir(settings: AISettings | null): boolean {
  return Boolean(settings?.enabled && settings.defaultProviderId);
}

export default function LecturaRonda({ instanciaId, equipoId, onAnalisis }: Props) {
  const { loading, error, generateAnalysis } = useIA();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [analisis, setAnalisis] = useState<AIAnalysisResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [intento, setIntento] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const activar = equipoId
    ? `/backoffice/configuracion/ia?equipoId=${equipoId}`
    : '/backoffice/configuracion/ia';

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setErrorCarga('');
    Promise.all([
      getIASettings(),
      api.get<AIAnalysisResponse[]>('/ai/analyses', { params: { instanciaId } }),
    ])
      .then(([ajustes, lecturas]) => {
        if (cancelado) return;
        setSettings(ajustes);
        const ultima = lecturas.data[0] || null;
        setAnalisis(ultima);
        onAnalisis?.(ultima);
      })
      .catch((causa: unknown) => {
        if (!cancelado) setErrorCarga(iaMessage(causa));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [instanciaId, intento]);

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const inicio = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const pedir = async () => {
    try {
      const creada = await generateAnalysis({ instanciaId, includeHistorico: true });
      if (creada) {
        setAnalisis(creada);
        onAnalisis?.(creada);
      }
    } catch {
      /* El mensaje queda en el hook y el botón reintenta. */
    }
  };

  const propuestas = analisis?.accionesContextuales?.length || 0;
  const lista = Boolean(analisis);

  return (
    <section className="dashboard-next-steps mt-3" aria-labelledby="lectura-ronda">
      <p className="evaluation-eyebrow mb-2">Lectura</p>
      <h3 id="lectura-ronda" className="h5 mb-3">Cómo se lee esta ronda</h3>
      {cargando && <p role="status">Revisando si esta ronda ya tiene una lectura.</p>}
      {errorCarga && (
        <div className="alert alert-danger" role="alert">
          <p className="mb-3">{errorCarga}</p>
          <button className="btn btn-outline-danger" type="button" onClick={() => setIntento((valor) => valor + 1)}>
            Reintentar
          </button>
        </div>
      )}
      {!cargando && !errorCarga && lista && (
        <>
          <p className="mb-3">{frasePropuestas(propuestas)}</p>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {puedePedir(settings) ? (
              <button className="btn btn-primary" type="button" disabled={loading} onClick={() => void pedir()}>
                Pedir otra lectura
              </button>
            ) : (
              <Link className="btn btn-primary" to={activar}>Pedir otra lectura</Link>
            )}
          </div>
          <p className="text-muted mt-3 mb-0">Se pidió en Estado actual.</p>
        </>
      )}
      {!cargando && !errorCarga && !lista && (
        puedePedir(settings) ? (
          <button className="btn btn-primary" type="button" disabled={loading} onClick={() => void pedir()}>
            {loading ? 'Se está leyendo esta ronda' : 'Pedir una lectura'}
          </button>
        ) : (
          <Link className="btn btn-primary" to={activar}>Pedir una lectura</Link>
        )
      )}
      {loading && (
        <p className="mt-3 mb-0" role="status">
          Se está leyendo esta ronda. <span aria-hidden="true">{elapsed} s</span>
        </p>
      )}
      {error && (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          <p className="mb-3">{error}</p>
          <button className="btn btn-outline-danger" type="button" disabled={loading} onClick={() => void pedir()}>
            Reintentar
          </button>
        </div>
      )}
    </section>
  );
}
