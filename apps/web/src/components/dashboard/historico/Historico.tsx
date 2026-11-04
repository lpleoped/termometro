import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardHistorico } from '../../../services/dashboardService';
import { getInstanciaById } from '../../../services/instanciaService';
import GraficoHistorico from './GraficoHistorico';
import TablaHistorico from './TablaHistorico';

interface Props {
  instanciaId: string;
}

interface PuntoSerie {
  instanciaId: string;
  activadoEn: string;
  indiceGlobal: number;
  participacion: {
    esperada: number;
    recibida: number;
  };
}

interface Serie {
  equipo: string;
  cuestionario: string;
  puntos: PuntoSerie[];
}

function esNoEncontrado(error: unknown): boolean {
  if (typeof error !== 'object' || !error || !('response' in error)) return false;
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 404;
}

function idDe(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number') return String(valor);
  if (valor && typeof valor === 'object' && 'toString' in valor) {
    const texto = String(valor);
    if (texto && texto !== '[object Object]') return texto;
  }
  return '';
}

function fechaDe(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function movimiento(actual: number, anterior: number): string {
  const delta = actual - anterior;
  if (delta > 0) {
    const unidad = delta === 1 ? 'punto' : 'puntos';
    return `Subió ${delta} ${unidad}, de ${anterior} / 100 a ${actual} / 100.`;
  }
  if (delta < 0) {
    const baja = Math.abs(delta);
    const unidad = baja === 1 ? 'punto' : 'puntos';
    return `Bajó ${baja} ${unidad}, de ${anterior} / 100 a ${actual} / 100.`;
  }
  return `Se mantuvo en ${actual} / 100.`;
}

const Historico = ({ instanciaId }: Props) => {
  const [serie, setSerie] = useState<Serie | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [errorLectura, setErrorLectura] = useState(false);
  const [intento, setIntento] = useState(0);
  const volver = `/backoffice/dashboard?instanciaId=${instanciaId}`;

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setNoEncontrada(false);
    setErrorLectura(false);
    setSerie(null);
    getInstanciaById(instanciaId)
      .then((instancia) => {
        const equipoId = idDe(instancia?.equipoId);
        const evaluacionId = idDe(instancia?.evaluacionId);
        if (!equipoId || !evaluacionId) throw new Error('faltan ids');
        return getDashboardHistorico(equipoId, evaluacionId);
      })
      .then((data) => {
        if (cancelado) return;
        setSerie({
          equipo: data.equipo,
          cuestionario: data.evaluacion.titulo,
          puntos: (data.historico || []).map((punto) => ({
            instanciaId: idDe(punto.instanciaId),
            activadoEn:
              typeof punto.activadoEn === 'string' ? punto.activadoEn : punto.activadoEn.toISOString(),
            indiceGlobal: punto.indiceGlobal,
            participacion: {
              esperada: punto.participacion.esperada,
              recibida: punto.participacion.recibida,
            },
          })),
        });
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        if (esNoEncontrado(error)) setNoEncontrada(true);
        else setErrorLectura(true);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [instanciaId, intento]);

  if (cargando) {
    return <p className="text-muted mb-0">Mirando si subió o bajó...</p>;
  }

  if (noEncontrada) {
    return (
      <div>
        <p>No se encontró la ronda.</p>
        <Link className="btn btn-primary" to="/backoffice/home">
          Ir a tus equipos
        </Link>
      </div>
    );
  }

  if (errorLectura || !serie) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-3">No se pudo ver si subió o bajó.</p>
        <button className="btn btn-outline-danger" type="button" onClick={() => setIntento((n) => n + 1)}>
          Reintentar
        </button>
      </div>
    );
  }

  const indiceActual = serie.puntos.findIndex((punto) => punto.instanciaId === instanciaId);
  const actual = indiceActual >= 0 ? serie.puntos[indiceActual] : undefined;
  const anterior = indiceActual > 0 ? serie.puntos[indiceActual - 1] : undefined;
  const ultimo = serie.puntos[serie.puntos.length - 1];

  let frase = 'Todavía no hay rondas para comparar.';
  if (actual && !anterior) {
    frase = `Es la primera ronda. El índice está en ${actual.indiceGlobal} / 100.`;
  } else if (actual && anterior) {
    frase = movimiento(actual.indiceGlobal, anterior.indiceGlobal);
  } else if (ultimo) {
    frase = 'Esta ronda no está en la serie.';
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="fw-bold mb-1">¿Subió o bajó?</h2>
        <p className="text-muted mb-3">
          {serie.equipo}. {serie.cuestionario}
        </p>
        <p className="fs-5 mb-1">{frase}</p>
        {actual && (
          <p className="mb-0">
            En esta ronda, {fechaDe(actual.activadoEn)}, el índice está en {actual.indiceGlobal} / 100.
            Respondieron {actual.participacion.recibida} de {actual.participacion.esperada}.
          </p>
        )}
      </div>
      {serie.puntos.length > 0 && (
        <>
          <GraficoHistorico puntos={serie.puntos} instanciaId={instanciaId} />
          <TablaHistorico puntos={serie.puntos} instanciaId={instanciaId} />
        </>
      )}
      <div>
        <Link className="btn btn-primary" to={volver}>
          Volver al termómetro
        </Link>
      </div>
    </div>
  );
};

export default Historico;
