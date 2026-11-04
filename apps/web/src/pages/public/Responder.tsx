import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import HeaderPublico from '../../components/HeaderPublico';

interface Indicador {
  id?: string;
  texto?: string;
  descripcion?: string;
}

interface Seccion {
  titulo?: string;
  indicadores?: Indicador[];
}

interface Evaluacion {
  titulo?: string;
  secciones?: Seccion[];
}

interface Pregunta {
  id: string;
  texto: string;
  descripcion: string;
  seccion: string;
}

const ESCALA = [1, 2, 3, 4, 5] as const;

function idDe(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (valor && typeof valor === 'object') {
    const doc = valor as { _id?: unknown; id?: unknown };
    if (typeof doc._id === 'string') return doc._id;
    if (typeof doc.id === 'string') return doc.id;
  }
  return '';
}

function esNoEncontrado(error: unknown): boolean {
  if (typeof error !== 'object' || !error || !('response' in error)) return false;
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 404;
}

function preguntasDe(evaluacion: Evaluacion): Pregunta[] {
  const preguntas: Pregunta[] = [];
  for (const seccion of evaluacion.secciones || []) {
    const titulo = typeof seccion.titulo === 'string' ? seccion.titulo.trim() : '';
    for (const indicador of seccion.indicadores || []) {
      const id = typeof indicador.id === 'string' ? indicador.id.trim() : '';
      const texto = typeof indicador.texto === 'string' ? indicador.texto.trim() : '';
      if (!id || !texto) continue;
      const descripcion =
        typeof indicador.descripcion === 'string' ? indicador.descripcion.trim() : '';
      preguntas.push({ id, texto, descripcion, seccion: titulo });
    }
  }
  return preguntas;
}

function claveBorrador(instanciaId: string): string {
  return `termometro-respuesta:${instanciaId}`;
}

function valorLikert(valor: unknown): number | null {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > 5) return null;
  return numero;
}

function leerBorrador(
  instanciaId: string,
  preguntas: Pregunta[],
): { paso: number; valores: Record<string, number> } {
  const vacio = { paso: 0, valores: {} as Record<string, number> };
  try {
    const raw = sessionStorage.getItem(claveBorrador(instanciaId));
    if (!raw) return vacio;
    const data = JSON.parse(raw) as { paso?: unknown; valores?: unknown };
    const ids = new Set(preguntas.map((pregunta) => pregunta.id));
    const valores: Record<string, number> = {};
    if (data.valores && typeof data.valores === 'object') {
      for (const [id, valor] of Object.entries(data.valores as Record<string, unknown>)) {
        if (!ids.has(id)) continue;
        const likert = valorLikert(valor);
        if (likert !== null) valores[id] = likert;
      }
    }
    const primeroPendiente = preguntas.findIndex((pregunta) => valores[pregunta.id] == null);
    let paso = typeof data.paso === 'number' && Number.isInteger(data.paso) ? data.paso : 0;
    if (paso < 0) paso = 0;
    if (paso > preguntas.length - 1) paso = Math.max(0, preguntas.length - 1);
    if (primeroPendiente !== -1 && paso > primeroPendiente) paso = primeroPendiente;
    return { paso, valores };
  } catch {
    return vacio;
  }
}

export default function ResponderEvaluacion() {
  const { instanciaId } = useParams();
  const [titulo, setTitulo] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [paso, setPaso] = useState(0);
  const [valores, setValores] = useState<Record<string, number>>({});
  const [fase, setFase] = useState<'cargando' | 'inicio' | 'error' | 'no-encontrada' | 'vacia' | 'respondiendo' | 'revisando' | 'gracias'>(
    'cargando',
  );
  const [intento, setIntento] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(false);
  const [habiaBorrador, setHabiaBorrador] = useState(false);

  useEffect(() => {
    if (!instanciaId) {
      setFase('no-encontrada');
      return;
    }

    let cancelado = false;
    setFase('cargando');
    setErrorEnvio(false);

    const cargar = async () => {
      try {
        const instancia = await api.get(`/instancias/${instanciaId}`);
        const evaluacionId = idDe(instancia.data?.evaluacionId);
        if (!evaluacionId) throw new Error('sin cuestionario');
        const evaluacion = await api.get(`/evaluaciones/${evaluacionId}`);
        if (cancelado) return;
        const lista = preguntasDe(evaluacion.data as Evaluacion);
        const borrador = leerBorrador(instanciaId, lista);
        const nombre = typeof evaluacion.data?.titulo === 'string' ? evaluacion.data.titulo.trim() : '';
        setTitulo(nombre);
        setPreguntas(lista);
        setPaso(borrador.paso);
        setValores(borrador.valores);
        setHabiaBorrador(Object.keys(borrador.valores).length > 0);
        setFase(lista.length ? 'inicio' : 'vacia');
      } catch (error: unknown) {
        if (cancelado) return;
        setFase(esNoEncontrado(error) ? 'no-encontrada' : 'error');
      }
    };

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [instanciaId, intento]);

  useEffect(() => {
    if (!['respondiendo', 'revisando'].includes(fase) || !instanciaId) return;
    sessionStorage.setItem(claveBorrador(instanciaId), JSON.stringify({ paso, valores }));
  }, [fase, instanciaId, paso, valores]);

  const pregunta = preguntas[paso];
  const valorActual = pregunta ? valores[pregunta.id] : undefined;
  const esUltima = paso === preguntas.length - 1;

  const elegir = (valor: number) => {
    if (!pregunta || enviando) return;
    setValores((prev) => ({ ...prev, [pregunta.id]: valor }));
    setErrorEnvio(false);
  };

  const enviar = async () => {
    if (!instanciaId || !pregunta || enviando) return;
    if (preguntas.some((item) => valores[item.id] == null)) return;

    setEnviando(true);
    setErrorEnvio(false);
    try {
      await api.post('/respuestas', {
        instanciaEvaluacionId: instanciaId,
        respuestas: preguntas.map((item) => ({
          indicadorId: item.id,
          valor: valores[item.id],
        })),
      });
      sessionStorage.removeItem(claveBorrador(instanciaId));
      setFase('gracias');
    } catch {
      setErrorEnvio(true);
    } finally {
      setEnviando(false);
    }
  };

  const iniciar = () => setFase('respondiendo');

  const revisar = (event: FormEvent) => {
    event.preventDefault();
    if (preguntas.some((item) => valores[item.id] == null)) return;
    setFase('revisando');
  };

  const seguir = (event: FormEvent) => {
    event.preventDefault();
    if (valorActual == null || enviando) return;
    if (!esUltima) {
      setPaso((actual) => actual + 1);
      return;
    }
    void enviar();
  };

  return (
    <>
      <HeaderPublico />
      <main className="container py-4" style={{ maxWidth: 640 }}>
        {fase === 'cargando' && (
          <div className="evaluation-panel py-5 px-4 text-center" role="status" aria-live="polite">
            <div className="loading-spinner mx-auto mb-3" aria-hidden="true" />
            <p className="mb-0">Estamos preparando tu evaluación...</p>
          </div>
        )}

        {fase === 'no-encontrada' && (
          <div className="evaluation-panel py-4 px-3 px-sm-4">
            <p className="evaluation-eyebrow mb-2">Link no disponible</p>
            <h1 className="h3 mb-3">Esta evaluación ya no está disponible</h1>
            <p className="mb-4">Revisá que el link esté completo o pedile uno nuevo a la persona que lo compartió.</p>
            <Link className="btn btn-primary w-100 evaluation-primary-action" to="/">Volver al inicio</Link>
          </div>
        )}

        {fase === 'error' && (
          <div>
            <p className="evaluation-eyebrow mb-2">Algo salió mal</p>
            <h1 className="h3 mb-3">No pudimos abrir esta evaluación</h1>
            <p className="mb-4">Puede ser un problema temporal. Intentá de nuevo en unos segundos.</p>
            <button type="button" className="btn btn-primary w-100 evaluation-primary-action" onClick={() => setIntento((n) => n + 1)}>
              Intentar de nuevo
            </button>
          </div>
        )}

        {fase === 'vacia' && (
          <div className="evaluation-panel py-4 px-3 px-sm-4">
            <p className="evaluation-eyebrow mb-2">Evaluación no disponible</p>
            <h1 className="h3 mb-3">Esta evaluación todavía no está lista</h1>
            <p className="mb-0">La persona que la creó tiene que agregar preguntas antes de compartirla.</p>
          </div>
        )}

        {fase === 'gracias' && (
          <div className="evaluation-panel evaluation-success py-5 px-4 text-center">
            <div className="evaluation-success-icon" aria-hidden="true">✓</div>
            <p className="evaluation-eyebrow mb-2">Respuesta enviada</p>
            <h1 className="h3">Tu respuesta quedó registrada</h1>
            <p className="mb-2">Gracias por ayudar a entender cómo está el equipo.</p>
            <p className="small text-muted mb-0">La persona que coordina la evaluación podrá ver el resultado cuando termine la participación.</p>
          </div>
        )}

        {fase === 'inicio' && (
          <div className="evaluation-panel py-4 px-3 px-sm-4">
            <p className="evaluation-eyebrow mb-2">Termómetro de Equipo</p>
            <h1 className="h3 mb-3">{titulo || 'Evaluación del equipo'}</h1>
            <p className="lead mb-4">Queremos conocer cómo estás viviendo este momento del equipo.</p>
            <div className="evaluation-meta mb-4" aria-label="Resumen de la evaluación">
              <span>{preguntas.length} {preguntas.length === 1 ? 'pregunta' : 'preguntas'}</span>
              <span>Menos de 5 minutos</span>
            </div>
            {habiaBorrador && (
              <p className="small evaluation-resume-note mb-4" role="status">
                Tu avance está guardado. Vas a continuar desde la pregunta {paso + 1} de {preguntas.length}.
              </p>
            )}
            <p className="small text-muted mb-4">Vas a responder cada afirmación con una escala del 1 al 5. Tus respuestas se guardan automáticamente en este dispositivo.</p>
            <button type="button" className="btn btn-primary w-100 evaluation-primary-action" onClick={iniciar}>
              {habiaBorrador ? 'Continuar evaluación' : 'Empezar evaluación'}
            </button>
          </div>
        )}

        {fase === 'revisando' && (
          <div className="evaluation-panel py-4 px-3 px-sm-4">
            <p className="evaluation-eyebrow mb-2">Último paso</p>
            <h1 className="h3 mb-3">Revisá tus respuestas</h1>
            <p className="mb-4">Respondiste {preguntas.length} de {preguntas.length} preguntas. Después de enviar no vas a poder modificarlas.</p>
            {errorEnvio && (
              <p className="alert alert-danger" role="alert">
                No pudimos guardar tus respuestas. Tus respuestas siguen acá; probá de nuevo.
              </p>
            )}
            <div className="d-grid gap-2">
              <button type="button" className="btn btn-primary evaluation-primary-action" onClick={() => void enviar()} disabled={enviando}>
                {enviando ? 'Enviando respuestas...' : errorEnvio ? 'Intentar de nuevo' : 'Enviar respuestas'}
              </button>
              <button type="button" className="btn btn-link text-muted" disabled={enviando} onClick={() => setFase('respondiendo')}>Volver a revisar</button>
            </div>
          </div>
        )}

        {fase === 'respondiendo' && pregunta && (
          <form onSubmit={esUltima ? revisar : seguir} className="evaluation-panel py-4 px-3 px-sm-4">
            <div className="d-flex justify-content-between align-items-center gap-3 mb-2">
              <p className="evaluation-eyebrow mb-0">{titulo || 'Evaluación del equipo'}</p>
              <span className="small text-muted">{Math.round(((paso + 1) / preguntas.length) * 100)}%</span>
            </div>
            <p className="small text-muted mb-2">Pregunta {paso + 1} de {preguntas.length}</p>
            <div
              className="progress mb-4"
              style={{ height: 8 }}
              role="progressbar"
              aria-label="Progreso de la evaluación"
              aria-valuemin={1}
              aria-valuemax={preguntas.length}
              aria-valuenow={paso + 1}
              aria-valuetext={`Pregunta ${paso + 1} de ${preguntas.length}`}
            >
              <div
                className="progress-bar"
                style={{
                  width: `${((paso + 1) / preguntas.length) * 100}%`,
                  backgroundColor: '#374151',
                }}
              />
            </div>
            {pregunta.seccion && <p className="text-muted small mb-2">{pregunta.seccion}</p>}
            <h1 className="h4" tabIndex={-1}>
              {pregunta.texto}
            </h1>
            {pregunta.descripcion && <p>{pregunta.descripcion}</p>}
            <p className="text-muted small mb-2" id="escala-ayuda">Elegí una opción. 1 es el valor más bajo y 5 el más alto.</p>
            <div className="evaluation-scale-labels" aria-hidden="true"><span>Más bajo</span><span>Más alto</span></div>
            <div className="d-flex gap-2 mb-4" role="radiogroup" aria-labelledby="escala-ayuda">
              {ESCALA.map((valor) => {
                const elegido = valorActual === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    className={`btn flex-fill evaluation-scale-button ${elegido ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: 48 }}
                    role="radio"
                    aria-checked={elegido}
                    disabled={enviando}
                    onClick={() => elegir(valor)}
                  >
                    {valor}
                  </button>
                );
              })}
            </div>
            {errorEnvio && (
              <p className="text-danger" role="alert">
                No se pudo enviar. Probá de nuevo.
              </p>
            )}
            <button type="submit" className="btn btn-primary w-100 evaluation-primary-action" disabled={valorActual == null || enviando}>
              {esUltima ? 'Revisar y enviar' : 'Siguiente pregunta'}
            </button>
            {paso > 0 && (
              <button
                type="button"
                className="btn btn-link text-muted w-100 mt-2"
                disabled={enviando}
                onClick={() => setPaso((actual) => actual - 1)}
              >
                Anterior
              </button>
            )}
          </form>
        )}
      </main>
    </>
  );
}
