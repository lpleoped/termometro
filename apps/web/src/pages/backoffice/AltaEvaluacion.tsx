import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import { crearEvaluacion } from '../../services/evaluacionService';
import { generarCuestionarioIA, getIASettings } from '../../services/iaSettingsService';

interface PreguntaForm {
  texto: string;
  tipo: 'cuantitativo' | 'cualitativo';
  direccion: 'positiva' | 'negativa';
}

interface SeccionForm {
  titulo: string;
  ponderacion: number | '';
  preguntas: PreguntaForm[];
}

function pesosQueSumanCien(cantidad: number): number[] {
  const base = Math.floor(100 / cantidad);
  const resto = 100 - base * cantidad;
  return Array.from({ length: cantidad }, (_, indice) => base + (indice < resto ? 1 : 0));
}

function seccionNueva(peso: number): SeccionForm {
  return { titulo: '', ponderacion: peso, preguntas: [{ texto: '', tipo: 'cuantitativo', direccion: 'positiva' }] };
}

function conPesosRepartidos(secciones: SeccionForm[]): SeccionForm[] {
  const pesos = pesosQueSumanCien(secciones.length);
  return secciones.map((seccion, indice) => ({ ...seccion, ponderacion: pesos[indice] }));
}

function idDe(doc: { _id?: string; id?: string }): string {
  return String(doc._id || doc.id || '');
}

function ajustarAlturaLectura(elemento: HTMLTextAreaElement) {
  elemento.style.height = 'auto';
  const borde = elemento.offsetHeight - elemento.clientHeight;
  elemento.style.height = `${elemento.scrollHeight + borde}px`;
}

function vigilarAlturaLectura(elemento: HTMLTextAreaElement) {
  ajustarAlturaLectura(elemento);
  const tarjeta = elemento.closest('article');
  if (!(tarjeta instanceof HTMLElement) || tarjeta.dataset.alturaLista === '1') return;
  tarjeta.dataset.alturaLista = '1';
  let ancho = tarjeta.clientWidth;
  const observador = new ResizeObserver(() => {
    if (tarjeta.clientWidth === ancho) return;
    ancho = tarjeta.clientWidth;
    tarjeta.querySelectorAll('textarea.revision-lectura').forEach((nodo) => {
      if (nodo instanceof HTMLTextAreaElement) ajustarAlturaLectura(nodo);
    });
  });
  observador.observe(tarjeta);
}

const AltaEvaluacion = () => {
  const [titulo, setTitulo] = useState('');
  const [secciones, setSecciones] = useState<SeccionForm[]>([seccionNueva(100)]);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [rolIA, setRolIA] = useState('');
  const [lugar, setLugar] = useState('');
  const [mirada, setMirada] = useState<'clima' | 'liderazgo' | 'carga' | 'otra' | ''>('');
  const [iaActiva, setIaActiva] = useState<boolean | null>(null);
  const [guardadoId, setGuardadoId] = useState('');
  const [params] = useSearchParams();
  const equipoId = params.get('equipoId') || '';
  const [solicitudIA, setSolicitudIA] = useState('');
  const [generandoIA, setGenerandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState('');
  const [promptGenerado, setPromptGenerado] = useState('');
  const [generadaConIA, setGeneradaConIA] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [revisionHumanaConfirmada, setRevisionHumanaConfirmada] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { getIASettings().then((ajustes) => setIaActiva(Boolean(ajustes.enabled))).catch(() => setIaActiva(false)); }, []);

  const pesosCompletos = secciones.every((seccion) => seccion.ponderacion !== '');
  const suma = pesosCompletos
    ? secciones.reduce((total, seccion) => total + Number(seccion.ponderacion), 0)
    : null;
  const sumaDistinta = suma !== null && suma !== 100;
  const formularioListo =
    titulo.trim().length > 0 &&
    secciones.length > 0 &&
    secciones.every(
      (seccion) =>
        seccion.titulo.trim().length > 0 &&
        seccion.ponderacion !== '' &&
        seccion.preguntas.length > 0 &&
        seccion.preguntas.every((pregunta) => pregunta.texto.trim().length > 0),
    ) &&
    suma === 100;

  const actualizarSeccion = (indice: number, cambios: Partial<SeccionForm>) => {
    setSecciones((actuales) =>
      actuales.map((seccion, i) => (i === indice ? { ...seccion, ...cambios } : seccion)),
    );
    setErrorGuardado(false);
  };

  const actualizarPregunta = (seccionIndice: number, preguntaIndice: number, texto: string) => {
    setSecciones((actuales) =>
      actuales.map((seccion, i) => {
        if (i !== seccionIndice) return seccion;
        return {
          ...seccion,
          preguntas: seccion.preguntas.map((pregunta, j) =>
        j === preguntaIndice ? { ...pregunta, texto } : pregunta,
          ),
        };
      }),
    );
    setErrorGuardado(false);
  };

  const agregarSeccion = () => {
    setSecciones((actuales) => conPesosRepartidos([...actuales, seccionNueva(0)]));
    setErrorGuardado(false);
  };

  const quitarSeccion = (indice: number) => {
    setSecciones((actuales) => conPesosRepartidos(actuales.filter((_, i) => i !== indice)));
    setErrorGuardado(false);
  };

  const agregarPregunta = (seccionIndice: number) => {
    setSecciones((actuales) =>
      actuales.map((seccion, i) =>
        i === seccionIndice ? { ...seccion, preguntas: [...seccion.preguntas, { texto: '', tipo: 'cuantitativo', direccion: 'positiva' }] } : seccion,
      ),
    );
    setErrorGuardado(false);
  };

  const quitarPregunta = (seccionIndice: number, preguntaIndice: number) => {
    setSecciones((actuales) =>
      actuales.map((seccion, i) => {
        if (i !== seccionIndice) return seccion;
        return {
          ...seccion,
          preguntas: seccion.preguntas.filter((_, j) => j !== preguntaIndice),
        };
      }),
    );
    setErrorGuardado(false);
  };

  const cambiarPeso = (indice: number, valor: string) => {
    if (valor !== '' && !/^-?\d+$/.test(valor)) return;
    actualizarSeccion(indice, { ponderacion: valor === '' ? '' : Number(valor) });
  };

  const handleGuardar = async (event: FormEvent) => {
    event.preventDefault();
    if (!formularioListo || guardando || (generadaConIA && !revisionHumanaConfirmada)) return;
    setGuardando(true);
    setErrorGuardado(false);
    try {
      const creada = await crearEvaluacion({
        titulo: titulo.trim(),
        tipo: 'CUSTOM',
        origenCuestionario: generadaConIA ? 'ia' : 'manual',
        revisionHumanaAprobada: !generadaConIA || revisionHumanaConfirmada,
        ...(equipoId ? { equipoId } : {}),
        secciones: secciones.map((seccion, sidx) => ({
          titulo: seccion.titulo.trim(),
          ponderacion: Number(seccion.ponderacion),
          indicadores: seccion.preguntas.map((pregunta, i) => ({
            id: `custom_${sidx + 1}_${i + 1}`,
            texto: pregunta.texto.trim(),
            tipo: pregunta.tipo,
            direccion: pregunta.direccion,
          })),
        })),
      });
      const id = idDe(creada);
      if (!id) {
        setErrorGuardado(true);
        return;
      }
      setGuardadoId(id);
    } catch {
      setErrorGuardado(true);
    } finally {
      setGuardando(false);
    }
  };

  const handleGenerarConIA = async () => {
    if (!lugar.trim() || !mirada || !solicitudIA.trim() || generandoIA) return;
    setGenerandoIA(true);
    setErrorIA('');
    try {
      const roles = { clima: 'especialista en clima de equipos', liderazgo: 'especialista en liderazgo de equipos', carga: 'especialista en carga y energía del equipo', otra: 'especialista en la mirada que describe quien facilita' };
      const resultado = await generarCuestionarioIA(roles[mirada || 'clima'], `Lugar frente al equipo: ${lugar.trim()}. Qué evaluar: ${solicitudIA.trim()}`, equipoId);
      setTitulo(resultado.cuestionario.titulo);
      setSecciones(resultado.cuestionario.secciones.map((seccion) => ({ titulo: seccion.titulo, ponderacion: seccion.ponderacion, preguntas: seccion.indicadores.map(({ texto, tipo, direccion }) => ({ texto, tipo, direccion })) })));
      setPromptGenerado(resultado.prompt);
      setGeneradaConIA(true);
      setRevisionHumanaConfirmada(false);
      setErrorGuardado(false);
    } catch (error: any) {
      setErrorIA(error?.response?.data?.error || 'No se pudo generar el cuestionario. Revisá la configuración de IA.');
    } finally {
      setGenerandoIA(false);
    }
  };

  const cambiarDireccion = (seccionIndice: number, preguntaIndice: number) => {
    setSecciones((actuales) => actuales.map((seccion, indice) => indice === seccionIndice ? { ...seccion, preguntas: seccion.preguntas.map((pregunta, pi) => pi === preguntaIndice ? { ...pregunta, direccion: pregunta.direccion === 'negativa' ? 'positiva' : 'negativa' } : pregunta) } : seccion));
  };
  const colores = ['#0f766e', '#0369a1', '#b45309', '#7c3aed', '#be123c'];
  if (iaActiva === null) return <LayoutBackoffice><p className="container py-5" role="status">Cargando…</p></LayoutBackoffice>;
  if (guardadoId) return <LayoutBackoffice><div className="container py-5" style={{ maxWidth: 720 }}><h1 className="fw-bold mb-3">El cuestionario quedó guardado</h1><p>El siguiente paso es abrir la ronda y compartir el link.</p><Link className="btn btn-primary btn-lg paso-primaria" to={`/backoffice/publicar-evaluacion?evaluacionId=${guardadoId}${equipoId ? `&equipoId=${equipoId}` : ''}`}>Abrir la ronda</Link></div></LayoutBackoffice>;
  if (iaActiva && !generadaConIA && !modoManual) return <LayoutBackoffice><div className="container py-5" style={{ maxWidth: 720 }}>
    <div className="d-flex align-items-center gap-2 mb-3">
      <h1 className="fw-bold mb-0">Armá el cuestionario</h1>
      <InfoAyuda tema="cuestionarios" />
    </div>
    <label className="form-label" htmlFor="lugar-equipo">¿Qué lugar ocupás frente a este equipo?</label>
    <input id="lugar-equipo" className="form-control mb-1" value={lugar} onChange={(event) => setLugar(event.target.value)} disabled={generandoIA} autoComplete="off" />
    <p className="text-muted">Por ejemplo: facilitás la mejora, liderás el equipo o acompañás desde personas.</p>
    <label className="form-label" htmlFor="solicitud-ia">¿Qué querés evaluar?</label>
    <textarea id="solicitud-ia" className="form-control mb-3" rows={4} value={solicitudIA} onChange={(event) => setSolicitudIA(event.target.value)} disabled={generandoIA} />
    <p className="form-label">Mirada</p>
    <div className="d-flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Mirada">{([['clima', 'Clima del equipo'], ['liderazgo', 'Cómo se lidera'], ['carga', 'Carga y energía'], ['otra', 'Otra mirada']] as const).map(([valor, etiqueta]) => <button key={valor} type="button" className={`btn ${mirada === valor ? 'btn-primary' : 'btn-outline-secondary'}`} aria-pressed={mirada === valor} onClick={() => setMirada(valor)} disabled={generandoIA}>{etiqueta}</button>)}</div>
    {errorIA && <p className="text-danger" role="alert">{errorIA}</p>}
    <button type="button" className="btn btn-primary paso-primaria" disabled={generandoIA || !lugar.trim() || !mirada || !solicitudIA.trim()} onClick={() => void handleGenerarConIA()}>{generandoIA ? 'Diseñando el cuestionario…' : 'Generar cuestionario'}</button>
    <button type="button" className="btn btn-outline-secondary ms-2" onClick={() => setModoManual(true)}>Armar a mano</button>
  </div></LayoutBackoffice>;
  if (iaActiva && generadaConIA) return <LayoutBackoffice><div className="container py-4 revision-cuestionario">
    <div className="d-flex align-items-center gap-2 mb-3">
      <h1 className="fw-bold mb-0">Revisá el cuestionario</h1>
      <InfoAyuda tema="cuestionarios" />
    </div>
    <label className="form-label" htmlFor="nombre-cuestionario">Nombre</label>
    <input id="nombre-cuestionario" className="form-control mb-3" value={titulo} onChange={(event) => setTitulo(event.target.value)} disabled={guardando} />
    <div className="revision-pesos d-flex mb-2" aria-label={suma === 100 ? 'Los pesos suman 100' : `Los pesos suman ${suma ?? 0}`}>{secciones.map((seccion, indice) => <div key={indice} style={{ width: `${Number(seccion.ponderacion) || 0}%`, background: colores[indice % colores.length] }} title={`${seccion.titulo}: ${seccion.ponderacion}`} />)}</div>
    <p className="text-muted">{suma === 100 ? 'Los pesos suman 100.' : `Los pesos suman ${suma ?? 0}. Tienen que sumar 100.`}</p>
    <div className="revision-secciones">{secciones.map((seccion, sidx) => (
      <article key={sidx} className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h5">{seccion.titulo || `Sección ${sidx + 1}`}</h2>
          <p>Peso {seccion.ponderacion}</p>
          <p className="revision-leyenda">El equipo va a leer</p>
          {seccion.preguntas.map((pregunta, indice) => (
            <div key={indice} className="border-top pt-3 mt-3 revision-pregunta">
              <textarea
                id={`lectura-${sidx}-${indice}`}
                className="form-control revision-lectura"
                rows={1}
                aria-label="El equipo va a leer"
                value={pregunta.texto}
                ref={(nodo) => { if (nodo) vigilarAlturaLectura(nodo); }}
                onChange={(event) => {
                  actualizarPregunta(sidx, indice, event.target.value);
                  ajustarAlturaLectura(event.currentTarget);
                }}
                disabled={guardando}
              />
              {pregunta.tipo === 'cualitativo' ? (
                <p className="text-muted mb-0">Comentario abierto. No entra al índice.</p>
              ) : (
                <p className="revision-direccion mb-0">
                  {pregunta.direccion === 'negativa' ? 'Si eligen 5, hay un problema.' : 'Si eligen 5, el equipo está mejor.'}{' '}
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => cambiarDireccion(sidx, indice)} disabled={guardando}>Cambiar</button>
                </p>
              )}
            </div>
          ))}
        </div>
      </article>
    ))}</div>
    <section className={`revision-puerta${revisionHumanaConfirmada ? ' revision-puerta-lista' : ''}`} role="status">
      <p className="revision-puerta-titulo">{revisionHumanaConfirmada ? 'Tu revisión permite guardar.' : 'Falta tu revisión para poder guardar.'}</p>
      <label className="revision-puerta-check">
        <input type="checkbox" checked={revisionHumanaConfirmada} onChange={(event) => setRevisionHumanaConfirmada(event.target.checked)} disabled={guardando} />
        <span>Revisé cada pregunta y apruebo este cuestionario para publicarlo.</span>
      </label>
    </section>
    {errorGuardado && <p className="text-danger" role="alert">No se pudo guardar el cuestionario.</p>}
    <div className="revision-guardar">
      <button type="button" className="btn btn-primary paso-primaria" disabled={!formularioListo || guardando || !revisionHumanaConfirmada} onClick={(event) => void handleGuardar(event)}>{guardando ? 'Guardando…' : 'Guardar cuestionario'}</button>
      {!revisionHumanaConfirmada && <p className="revision-guardar-motivo">Falta tu aprobación.</p>}
    </div>
  </div></LayoutBackoffice>;

  const destinoInteligencia = equipoId ? `/backoffice/configuracion/ia?equipoId=${equipoId}` : '/backoffice/configuracion/ia';

  return (
    <LayoutBackoffice>
      <div className="container py-4 alta-evaluacion-page alta-evaluacion-manual">
        <div className="alta-evaluacion-header">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <h1 className="fw-bold mb-0">Armá el cuestionario</h1>
              <InfoAyuda tema="cuestionarios" />
            </div>
            <p className="text-muted mb-0">
              Las secciones ya suman 100. Ajustá el peso si hace falta.
            </p>
            <p className="alta-inteligencia">
              {iaActiva ? (
                <button type="button" onClick={() => setModoManual(false)}>
                  Volver a generar con inteligencia
                </button>
              ) : (
                <>
                  Podés escribir las preguntas acá. Si preferís que las proponga,{' '}
                  <Link to={destinoInteligencia}>conectá la inteligencia</Link>.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="alta-builder-column">
            <form className="alta-builder" onSubmit={handleGuardar}>
              {errorGuardado && (
                <div className="alert alert-danger" role="alert">
                  No se pudo guardar el cuestionario.
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="nombre-cuestionario" className="form-label fw-semibold">
                  Nombre del cuestionario
                </label>
                <input
                  id="nombre-cuestionario"
                  type="text"
                  className="form-control"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    setErrorGuardado(false);
                  }}
                  disabled={guardando}
                  autoComplete="off"
                />
              </div>

              {secciones.map((seccion, sidx) => (
                <div key={sidx} className="card mb-3 shadow-sm border-0">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="fw-semibold">Sección {sidx + 1}</div>
                      {secciones.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => quitarSeccion(sidx)}
                          disabled={guardando}
                        >
                          Quitar sección
                        </button>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor={`seccion-${sidx}`} className="form-label">
                        Nombre de la sección
                      </label>
                      <input
                        id={`seccion-${sidx}`}
                        type="text"
                        className="form-control"
                        value={seccion.titulo}
                        onChange={(e) => actualizarSeccion(sidx, { titulo: e.target.value })}
                        disabled={guardando}
                        autoComplete="off"
                      />
                    </div>
                    <div className="mb-3">
                      <div className="revision-pesos d-flex mb-2" aria-hidden="true">{secciones.map((item, indice) => <div key={indice} style={{ width: `${Number(item.ponderacion) || 0}%`, background: colores[indice % colores.length], opacity: indice === sidx ? 1 : 0.35 }} />)}</div>
                      <label htmlFor={`peso-${sidx}`} className="form-label">Parte de esta sección</label>
                      <input
                        id={`peso-${sidx}`}
                        type="number"
                        inputMode="numeric"
                        className="form-control"
                        aria-describedby="pesos-suma"
                        value={seccion.ponderacion}
                        onChange={(e) => cambiarPeso(sidx, e.target.value)}
                        disabled={guardando}
                      />
                    </div>
                    {seccion.preguntas.map((pregunta, i) => (
                      <div key={i} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <label htmlFor={`pregunta-${sidx}-${i}`} className="form-label mb-1">
                            Pregunta
                          </label>
                          {seccion.preguntas.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => quitarPregunta(sidx, i)}
                              disabled={guardando}
                            >
                              Quitar pregunta
                            </button>
                          )}
                        </div>
                        <input
                          id={`pregunta-${sidx}-${i}`}
                          type="text"
                          className="form-control"
                          value={pregunta.texto}
                          onChange={(e) => actualizarPregunta(sidx, i, e.target.value)}
                          disabled={guardando}
                          autoComplete="off"
                        />
                        <select className="form-select mt-2" aria-label="Tipo de pregunta" value={pregunta.tipo} onChange={(e) => setSecciones((actuales) => actuales.map((seccion, si) => si === sidx ? { ...seccion, preguntas: seccion.preguntas.map((item, pi) => pi === i ? { ...item, tipo: e.target.value as PreguntaForm['tipo'] } : item) } : seccion))} disabled={guardando}>
                          <option value="cuantitativo">Escala</option>
                          <option value="cualitativo">Comentario</option>
                        </select>
                        {pregunta.tipo === 'cuantitativo' && (
                          <fieldset className="mt-2" disabled={guardando}>
                            <legend className="form-label">Si eligen 5, ¿el equipo está mejor o peor?</legend>
                            <div className="d-flex gap-2">
                              <button type="button" className={`btn btn-sm ${pregunta.direccion === 'positiva' ? 'btn-success' : 'btn-outline-secondary'}`} aria-pressed={pregunta.direccion === 'positiva'} onClick={() => setSecciones((actuales) => actuales.map((seccion, si) => si === sidx ? { ...seccion, preguntas: seccion.preguntas.map((item, pi) => pi === i ? { ...item, direccion: 'positiva' } : item) } : seccion))}>Mejor</button>
                              <button type="button" className={`btn btn-sm ${pregunta.direccion === 'negativa' ? 'btn-danger' : 'btn-outline-secondary'}`} aria-pressed={pregunta.direccion === 'negativa'} onClick={() => setSecciones((actuales) => actuales.map((seccion, si) => si === sidx ? { ...seccion, preguntas: seccion.preguntas.map((item, pi) => pi === i ? { ...item, direccion: 'negativa' } : item) } : seccion))}>Peor</button>
                            </div>
                          </fieldset>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => agregarPregunta(sidx)}
                      disabled={guardando}
                    >
                      Agregar una pregunta
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-outline-secondary mb-4"
                onClick={agregarSeccion}
                disabled={guardando}
              >
                Agregar una sección
              </button>

              {sumaDistinta && (
                <div id="pesos-suma" className="alert alert-warning" role="status">
                  Los pesos suman {suma}. Tienen que sumar 100.
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="btn btn-primary paso-primaria"
                  disabled={!formularioListo || guardando || (generadaConIA && !revisionHumanaConfirmada)}
                >
                  {guardando ? 'Guardando el cuestionario...' : 'Guardar el cuestionario'}
                </button>
              </div>
            </form>
        </div>
      </div>
    </LayoutBackoffice>
  );
};

export default AltaEvaluacion;
