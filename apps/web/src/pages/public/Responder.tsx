import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import HeaderPublico from '../../components/HeaderPublico';
import InfoAyuda from '../../components/InfoAyuda';

interface Indicador {
  id?: string;
  texto?: string;
  descripcion?: string;
  tipo?: 'cuantitativo' | 'cualitativo';
  direccion?: 'positiva' | 'negativa';
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
  tipo: 'cuantitativo' | 'cualitativo';
  direccion: 'positiva' | 'negativa';
}

const ESCALA = [1, 2, 3, 4, 5] as const;

function tonoEscala(direccion: 'positiva' | 'negativa', valor: number): 'alivia' | 'neutro' | 'preocupa' {
  const favorable = direccion === 'negativa' ? valor <= 2 : valor >= 4;
  const preocupa = direccion === 'negativa' ? valor >= 4 : valor <= 2;
  if (favorable) return 'alivia';
  if (preocupa) return 'preocupa';
  return 'neutro';
}

function significadoEscala(direccion: 'positiva' | 'negativa', valor: number): string {
  if (direccion === 'negativa' && valor === 5) return 'Esto marcaría que el problema se siente mucho.';
  if (direccion === 'negativa' && valor === 1) return 'Esto marcaría que el problema casi no se siente.';
  if (direccion === 'positiva' && valor === 5) return 'Esto marcaría que esto se sostiene.';
  if (direccion === 'positiva' && valor === 1) return 'Esto marcaría que esto casi no se sostiene.';
  if (valor === 3) return 'Esto marcaría un punto intermedio.';
  return direccion === 'negativa' ? 'Esto marcaría que el problema se siente bastante.' : 'Esto marcaría que esto se sostiene en parte.';
}

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
      preguntas.push({ id, texto, descripcion, seccion: titulo, tipo: indicador.tipo === 'cualitativo' ? 'cualitativo' : 'cuantitativo', direccion: indicador.direccion === 'negativa' ? 'negativa' : 'positiva' });
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
): { paso: number; valores: Record<string, number>; textos: Record<string, string> } {
  const vacio = { paso: 0, valores: {} as Record<string, number>, textos: {} as Record<string, string> };
  try {
    const raw = sessionStorage.getItem(claveBorrador(instanciaId));
    if (!raw) return vacio;
    const data = JSON.parse(raw) as { paso?: unknown; valores?: unknown; textos?: unknown };
    const ids = new Set(preguntas.map((pregunta) => pregunta.id));
    const valores: Record<string, number> = {};
    const textos: Record<string, string> = {};
    if (data.valores && typeof data.valores === 'object') {
      for (const [id, valor] of Object.entries(data.valores as Record<string, unknown>)) {
        if (!ids.has(id)) continue;
        const likert = valorLikert(valor);
        if (likert !== null) valores[id] = likert;
      }
    }
    if (data.textos && typeof data.textos === 'object') {
      for (const [id, valor] of Object.entries(data.textos as Record<string, unknown>)) {
        if (!ids.has(id) || typeof valor !== 'string') continue;
        const texto = valor.trim().slice(0, 2000);
        if (texto) textos[id] = texto;
      }
    }
    const primeroPendiente = preguntas.findIndex((pregunta) => pregunta.tipo === 'cuantitativo' ? valores[pregunta.id] == null : !textos[pregunta.id]);
    let paso = typeof data.paso === 'number' && Number.isInteger(data.paso) ? data.paso : 0;
    if (paso < 0) paso = 0;
    if (paso > preguntas.length - 1) paso = Math.max(0, preguntas.length - 1);
    if (primeroPendiente !== -1 && paso > primeroPendiente) paso = primeroPendiente;
    return { paso, valores, textos };
  } catch {
    return vacio;
  }
}

export default function ResponderEvaluacion() {
  const { token } = useParams();
  const instanciaId = token || '';
  const [titulo, setTitulo] = useState('');
  const [evaluadoNombre, setEvaluadoNombre] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [paso, setPaso] = useState(0);
  const [apoyo, setApoyo] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<string, number>>({});
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [fase, setFase] = useState<'cargando' | 'inicio' | 'error' | 'no-encontrada' | 'vacia' | 'respondiendo' | 'revisando' | 'gracias'>(
    'cargando',
  );
  const [intento, setIntento] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(false);
  const [modoRespuesta, setModoRespuesta] = useState<'anonima' | 'identificada'>('anonima');
  const [minimoRespuestas, setMinimoRespuestas] = useState(3);
  const [consentimiento, setConsentimiento] = useState(false);
  const [identidad, setIdentidad] = useState({ nombre: '', email: '' });

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
        const instancia = await api.get(`/r/${instanciaId}`);
        if (cancelado) return;
        const lista = preguntasDe(instancia.data as Evaluacion);
        const borrador = leerBorrador(instanciaId, lista);
        const nombre = typeof instancia.data?.titulo === 'string' ? instancia.data.titulo.trim() : '';
        setTitulo(nombre);
        setEvaluadoNombre(typeof instancia.data?.evaluadoNombre === 'string' ? instancia.data.evaluadoNombre.trim() : '');
        setModoRespuesta(instancia.data?.modoRespuesta === 'identificada' ? 'identificada' : 'anonima');
        const minimo = Number(instancia.data?.minimoAnonimato);
        setMinimoRespuestas(Number.isInteger(minimo) && minimo >= 1 ? minimo : 3);
        setPreguntas(lista);
        setPaso(borrador.paso);
        setValores(borrador.valores);
        setTextos(borrador.textos);
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
    setApoyo(null);
  }, [paso]);

  useEffect(() => {
    if (!['respondiendo', 'revisando'].includes(fase) || !instanciaId) return;
    sessionStorage.setItem(claveBorrador(instanciaId), JSON.stringify({ paso, valores, textos }));
  }, [fase, instanciaId, paso, valores, textos]);

  const pregunta = preguntas[paso];
  const valorActual = pregunta ? valores[pregunta.id] : undefined;
  const textoActual = pregunta ? textos[pregunta.id] || '' : '';
  const esUltima = paso === preguntas.length - 1;

  const elegir = (valor: number) => {
    if (!pregunta || enviando) return;
    setValores((prev) => ({ ...prev, [pregunta.id]: valor }));
    setErrorEnvio(false);
  };

  const enviar = async () => {
    if (!instanciaId || !pregunta || enviando) return;
    if (preguntas.some((item) => item.tipo === 'cuantitativo' ? valores[item.id] == null : !textos[item.id]?.trim())) return;

    setEnviando(true);
    setErrorEnvio(false);
    try {
      await api.post('/respuestas', {
        tokenPublico: instanciaId,
        respuestas: preguntas.map((item) => ({
          indicadorId: item.id,
          ...(item.tipo === 'cuantitativo' ? { valor: valores[item.id] } : { texto: textos[item.id]?.trim() }),
        })),
        identidad: modoRespuesta === 'identificada' ? identidad : undefined,
        consentimientoIdentificado: modoRespuesta === 'identificada' ? consentimiento : undefined,
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
    if (preguntas.some((item) => item.tipo === 'cuantitativo' ? valores[item.id] == null : !textos[item.id]?.trim())) return;
    setFase('revisando');
  };

  const seguir = (event: FormEvent) => {
    event.preventDefault();
    if ((pregunta.tipo === 'cuantitativo' ? valorActual == null : !textoActual.trim()) || enviando) return;
    if (!esUltima) {
      setPaso((actual) => actual + 1);
      return;
    }
    void enviar();
  };

  return (
    <>
      <HeaderPublico />
      <main className="evaluation-page container py-4">
        {fase === 'cargando' && (
          <div className="evaluation-panel text-center" role="status" aria-live="polite">
            <div className="loading-spinner mx-auto mb-3" aria-hidden="true" />
            <p className="mb-0">Estamos preparando las preguntas...</p>
          </div>
        )}

        {fase === 'no-encontrada' && (
          <div className="evaluation-panel">
            <p className="evaluation-eyebrow mb-2">Link no disponible</p>
            <h1 className="h3 mb-3">Este link ya no está disponible</h1>
            <p className="mb-4">Revisá que el link esté completo o pedile uno nuevo a la persona que lo compartió.</p>
            <Link className="btn btn-primary w-100 evaluation-primary-action" to="/">Volver al inicio</Link>
          </div>
        )}

        {fase === 'error' && (
          <div className="evaluation-panel">
            <p className="evaluation-eyebrow mb-2">Algo salió mal</p>
            <h1 className="h3 mb-3">No pudimos abrir estas preguntas</h1>
            <p className="mb-4">Puede ser un problema temporal. Intentá de nuevo en unos segundos.</p>
            <button type="button" className="btn btn-primary w-100 evaluation-primary-action" onClick={() => setIntento((n) => n + 1)}>
              Intentar de nuevo
            </button>
          </div>
        )}

        {fase === 'vacia' && (
          <div className="evaluation-panel">
            <p className="evaluation-eyebrow mb-2">Todavía no</p>
            <h1 className="h3 mb-3">Estas preguntas todavía no están listas</h1>
            <p className="mb-0">La persona que la creó tiene que agregar preguntas antes de compartirla.</p>
          </div>
        )}

        {fase === 'gracias' && (
          <div className="evaluation-panel evaluation-success text-center">
            <div className="evaluation-success-icon" aria-hidden="true">✓</div>
            <p className="evaluation-eyebrow mb-2">Respuesta enviada</p>
            <h1 className="h3">Tu respuesta quedó registrada</h1>
            <p className="mb-2">Gracias por ayudar a entender cómo está el equipo.</p>
            <p className="small text-muted mb-0">Quien coordina va a ver el resultado cuando termine la participación.</p>
          </div>
        )}

        {fase === 'inicio' && (
          <div className="evaluation-panel">
            <div className="d-flex align-items-start gap-2 mb-3">
              <h1 className="h3 mb-0">{titulo || 'Cómo está el equipo'}</h1>
              <InfoAyuda tema="responder" />
            </div>
            <p className="mb-4">Queremos conocer cómo estás viviendo este momento del equipo.</p>
            {evaluadoNombre && <p className="mb-3">Las preguntas son sobre <strong>{evaluadoNombre}</strong>.</p>}
            {modoRespuesta === 'anonima' ? <div className="rounded border p-3 mb-4 bg-light"><strong className="d-block mb-1">Sin nombre</strong><span className="small text-muted">No pedimos tu nombre. Quien coordina ve el resultado agrupado cuando hay al menos {minimoRespuestas} {minimoRespuestas === 1 ? 'respuesta' : 'respuestas'}, y también lee los comentarios. Un comentario puede reconocerte aunque no lleve tu nombre.</span></div> : <div className="rounded border p-3 mb-4"><strong className="d-block mb-2">Con tu nombre</strong><input className="form-control mb-2" placeholder="Tu nombre (opcional)" value={identidad.nombre} onChange={(event) => setIdentidad((actual) => ({ ...actual, nombre: event.target.value }))} /><input className="form-control mb-2" type="email" placeholder="Tu email" value={identidad.email} onChange={(event) => setIdentidad((actual) => ({ ...actual, email: event.target.value }))} /><label className="small d-flex gap-2 align-items-start"><input type="checkbox" className="mt-1" checked={consentimiento} onChange={(event) => setConsentimiento(event.target.checked)} /><span>Acepto que mi respuesta quede asociada a mi identidad para esta medición.</span></label></div>}
            <button type="button" className="btn btn-primary w-100 evaluation-primary-action" onClick={iniciar} disabled={modoRespuesta === 'identificada' && (!consentimiento || !identidad.email.includes('@'))}>
              Empezar
            </button>
          </div>
        )}

        {fase === 'revisando' && (
          <div className="evaluation-panel">
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
              <button type="button" className="btn btn-outline-secondary" disabled={enviando} onClick={() => setFase('respondiendo')}>Volver a revisar</button>
            </div>
          </div>
        )}

        {fase === 'respondiendo' && pregunta && (
          <form onSubmit={esUltima ? revisar : seguir} className="evaluation-panel">
            <div className="evaluation-progress-row">
              <p className="evaluation-eyebrow mb-0">{titulo || 'Cómo está el equipo'}</p>
              <span className="evaluation-progress-value">{Math.round(((paso + 1) / preguntas.length) * 100)}%</span>
            </div>
            <p className="evaluation-step">Pregunta {paso + 1} de {preguntas.length}</p>
            <div
              className="progress evaluation-progress"
              role="progressbar"
              aria-label="Progreso"
              aria-valuemin={1}
              aria-valuemax={preguntas.length}
              aria-valuenow={paso + 1}
              aria-valuetext={`Pregunta ${paso + 1} de ${preguntas.length}`}
            >
              <div
                className="progress-bar"
                style={{ width: `${((paso + 1) / preguntas.length) * 100}%` }}
              />
            </div>
            {pregunta.seccion && <p className="evaluation-section">{pregunta.seccion}</p>}
            <h1 className="evaluation-question" tabIndex={-1}>
              {pregunta.texto}
            </h1>
            {pregunta.descripcion && <p>{pregunta.descripcion}</p>}
            {pregunta.tipo === 'cualitativo' ? <><p className="text-muted small mb-2">Compartí una respuesta concreta. Evitá incluir nombres o datos personales de otras personas.</p><textarea className="form-control mb-4" rows={6} maxLength={2000} value={textoActual} onChange={(event) => setTextos((actual) => ({ ...actual, [pregunta.id]: event.target.value }))} disabled={enviando} placeholder="Escribí tu respuesta..." /></> : <><p className="text-muted small mb-2" id="escala-ayuda">Elegí una opción. 1 es casi nunca y 5 es casi siempre.</p>
            <div className="evaluation-scale-labels" aria-hidden="true"><span>Casi nunca</span><span>Casi siempre</span></div>
            <div className="evaluation-scale" role="radiogroup" aria-labelledby="escala-ayuda">
              {ESCALA.map((valor) => {
                const elegido = valorActual === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    className={`evaluation-scale-button is-${tonoEscala(pregunta.direccion, valor)}${elegido ? ' is-selected' : ''}`}
                    role="radio"
                    aria-checked={elegido}
                    disabled={enviando}
                    onMouseEnter={() => setApoyo(valor)}
                    onMouseLeave={() => setApoyo(null)}
                    onFocus={() => setApoyo(valor)}
                    onBlur={() => setApoyo(null)}
                    onClick={() => elegir(valor)}
                  >
                    {valor}
                  </button>
                );
              })}
            </div>
            <p className="evaluation-scale-meaning" aria-live="polite">{apoyo == null ? 'Apoyá una opción para ver qué significa.' : significadoEscala(pregunta.direccion, apoyo)}</p></>}
            {errorEnvio && (
              <p className="text-danger" role="alert">
                No se pudo enviar. Probá de nuevo.
              </p>
            )}
            <button type="submit" className="btn btn-primary w-100 evaluation-primary-action" disabled={(pregunta.tipo === 'cuantitativo' ? valorActual == null : !textoActual.trim()) || enviando}>
              {esUltima ? 'Revisar y enviar' : 'Siguiente pregunta'}
            </button>
            {paso > 0 && (
              <button
                type="button"
                className="btn btn-outline-secondary w-100 mt-2"
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
