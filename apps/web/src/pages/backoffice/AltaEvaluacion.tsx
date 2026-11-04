import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { crearEvaluacion } from '../../services/evaluacionService';

interface PreguntaForm {
  texto: string;
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
  return { titulo: '', ponderacion: peso, preguntas: [{ texto: '' }] };
}

function conPesosRepartidos(secciones: SeccionForm[]): SeccionForm[] {
  const pesos = pesosQueSumanCien(secciones.length);
  return secciones.map((seccion, indice) => ({ ...seccion, ponderacion: pesos[indice] }));
}

function idDe(doc: { _id?: string; id?: string }): string {
  return String(doc._id || doc.id || '');
}

const AltaEvaluacion = () => {
  const [titulo, setTitulo] = useState('');
  const [secciones, setSecciones] = useState<SeccionForm[]>([seccionNueva(100)]);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const navigate = useNavigate();

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
            j === preguntaIndice ? { texto } : pregunta,
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
        i === seccionIndice ? { ...seccion, preguntas: [...seccion.preguntas, { texto: '' }] } : seccion,
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
    if (!formularioListo || guardando) return;
    setGuardando(true);
    setErrorGuardado(false);
    try {
      const creada = await crearEvaluacion({
        titulo: titulo.trim(),
        tipo: 'CUSTOM',
        secciones: secciones.map((seccion, sidx) => ({
          titulo: seccion.titulo.trim(),
          ponderacion: Number(seccion.ponderacion),
          indicadores: seccion.preguntas.map((pregunta, i) => ({
            id: `custom_${sidx + 1}_${i + 1}`,
            texto: pregunta.texto.trim(),
          })),
        })),
      });
      const id = idDe(creada);
      if (!id) {
        setErrorGuardado(true);
        return;
      }
      navigate(`/backoffice/consulta-evaluacion/${id}`);
    } catch {
      setErrorGuardado(true);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <LayoutBackoffice>
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h2 className="fw-bold mb-2">Armá el cuestionario</h2>
            <p className="text-muted mb-4">
              Las secciones ya suman 100. Ajustá el peso si hace falta.
            </p>
            <form onSubmit={handleGuardar}>
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
                      <label htmlFor={`peso-${sidx}`} className="form-label">
                        Peso de la sección
                      </label>
                      <input
                        id={`peso-${sidx}`}
                        type="number"
                        inputMode="numeric"
                        className="form-control"
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
                              className="btn btn-sm btn-link text-secondary"
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
                <div className="alert alert-warning" role="status">
                  Los pesos suman {suma}. Tienen que sumar 100.
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!formularioListo || guardando}
                >
                  {guardando ? 'Guardando el cuestionario...' : 'Guardar el cuestionario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </LayoutBackoffice>
  );
};

export default AltaEvaluacion;
