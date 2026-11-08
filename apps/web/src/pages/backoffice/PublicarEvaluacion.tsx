import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { getEvaluaciones, type Evaluacion } from '../../services/evaluacionService';
import { getEquipos } from '../../services/equipoService';
import { crearInstancia, getInstanciaById } from '../../services/instanciaService';
import { getEnlacesPublicos } from '../../services/instanciaService';
import QRCode from 'qrcode';

interface EquipoOpcion {
  id: string;
  nombre: string;
  miembros: number;
}

interface CuestionarioOpcion {
  id: string;
  titulo: string;
  version?: string;
  tipo?: string;
}

interface RondaAbierta {
  equipoId?: string;
  alcance?: 'equipo' | 'persona' | 'individual';
  evaluadoNombre?: string;
  equipo: string;
  evaluacionId: string;
  titulo: string;
  version?: string;
  tipo?: string;
  cantidadEsperada: number;
  modoRespuesta: 'anonima' | 'identificada';
  minimoAnonimato: number;
  tokenPublico?: string;
}

function idDe(doc: { _id?: string; id?: string } | string | null | undefined): string {
  if (!doc) return '';
  if (typeof doc === 'string') return doc;
  return String(doc._id || doc.id || '');
}

function esNoEncontrado(error: unknown): boolean {
  if (typeof error !== 'object' || !error || !('response' in error)) return false;
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 404;
}

function cantidadValida(valor: string): boolean {
  return /^[1-9]\d*$/.test(valor);
}

function equiposDe(lista: unknown): EquipoOpcion[] {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item) => {
      const equipo = item as { _id?: string; id?: string; nombre?: string; miembros?: unknown };
      return {
        id: idDe(equipo),
        nombre: equipo.nombre || 'Equipo',
        miembros: Array.isArray(equipo.miembros) ? equipo.miembros.length : 0,
      };
    })
    .filter((equipo) => equipo.id);
}

function cuestionariosDe(lista: Evaluacion[]): CuestionarioOpcion[] {
  return lista
    .map((evaluacion) => {
      const extra = evaluacion as Evaluacion & { version?: string };
      return {
        id: idDe(evaluacion),
        titulo: evaluacion.titulo,
        version: extra.version,
        tipo: evaluacion.tipo,
      };
    })
    .filter((cuestionario) => cuestionario.id && cuestionario.titulo);
}

function elegir(opciones: { id: string }[], pedido: string | null): string {
  if (pedido && opciones.some((opcion) => opcion.id === pedido)) return pedido;
  if (opciones.length === 1) return opciones[0].id;
  return '';
}

function cantidadInicial(equipo: EquipoOpcion | undefined): string {
  if (!equipo || equipo.miembros < 1) return '';
  return String(equipo.miembros);
}

function Cargando({ texto }: { texto: string }) {
  return (
    <LayoutBackoffice>
      <div className="container py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-3">{texto}</p>
        </div>
      </div>
    </LayoutBackoffice>
  );
}

function RondaLista({ instanciaId }: { instanciaId: string }) {
  const linkRef = useRef<HTMLInputElement>(null);
  const [ronda, setRonda] = useState<RondaAbierta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [copiaManual, setCopiaManual] = useState(false);
  const [enlaces, setEnlaces] = useState<string[]>([]);
  const [qr, setQr] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setNoEncontrada(false);
    setErrorCarga(false);
    setCopiado(false);
    setCopiaManual(false);
    try {
      const instancia = await getInstanciaById(instanciaId);
      const [equiposRaw, evaluaciones, publicados] = await Promise.all([getEquipos(), getEvaluaciones(), getEnlacesPublicos(instanciaId)]);
      const equipos = equiposDe(equiposRaw);
      const cuestionarios = cuestionariosDe(evaluaciones);
      const equipoId = idDe(instancia.equipoId);
      const evaluacionId = idDe(instancia.evaluacionId);
      const equipo = equipos.find((item) => item.id === equipoId);
      const cuestionario = cuestionarios.find((item) => item.id === evaluacionId);
      setRonda({
        equipoId,
        alcance: instancia.alcance,
        evaluadoNombre: instancia.evaluadoNombre,
        equipo: equipo?.nombre || '',
        evaluacionId,
        titulo: cuestionario?.titulo || '',
        version: cuestionario?.version,
        tipo: cuestionario?.tipo,
        cantidadEsperada: Number(instancia.cantidadEsperada) || 0,
        modoRespuesta: instancia.modoRespuesta === 'identificada' ? 'identificada' : 'anonima',
        minimoAnonimato: Number(instancia.minimoAnonimato) || 1,
        tokenPublico: publicados.token,
      });
      setEnlaces(publicados.urls);
      setQr(await QRCode.toDataURL(publicados.urls.find((url: string) => !url.includes('localhost')) || publicados.urls[0]));
    } catch (error) {
      setRonda(null);
      if (esNoEncontrado(error)) setNoEncontrada(true);
      else setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, [instanciaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const link = enlaces.find((url) => !url.includes('localhost')) || enlaces[0] || `${window.location.origin}/r/${ronda?.tokenPublico || ''}`;

  const copiar = async () => {
    setCopiaManual(false);
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setCopiado(false);
      setCopiaManual(true);
      linkRef.current?.focus();
      linkRef.current?.select();
    }
  };

  if (cargando) return <Cargando texto="Cargando la ronda..." />;

  if (noEncontrada) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="alert alert-warning" role="alert">
            <p className="mb-3">No se encontró la ronda.</p>
            <Link to="/backoffice/publicar-evaluacion">Abrir la ronda</Link>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  if (errorCarga || !ronda) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="alert alert-danger" role="alert">
            <p className="mb-3">No se pudo cargar la ronda.</p>
            <button className="btn btn-outline-danger" type="button" onClick={cargar}>
              Reintentar
            </button>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  return (
    <LayoutBackoffice>
      <div className="container py-4">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <h2 className="fw-bold mb-0">Listo para compartir</h2>
          <span className="badge rounded-pill text-bg-success">Ronda abierta</span>
        </div>
        <p className="text-muted mb-4">Compartí este link con el equipo para empezar a recibir respuestas.</p>
        {ronda.equipo && <p className="mb-1">{ronda.equipo}</p>}
        {ronda.evaluadoNombre && <p className="mb-1">Persona evaluada: {ronda.evaluadoNombre}</p>}
        {ronda.titulo && <p className="mb-1">{ronda.titulo}</p>}
        <p className="mb-2">
          {ronda.cantidadEsperada === 1
            ? 'Debería responder 1 persona.'
            : `Deberían responder ${ronda.cantidadEsperada} personas.`}
        </p>
        <p className="small text-muted mb-4">Participación: 0 de {ronda.cantidadEsperada} respuestas</p>
        <label htmlFor="link-equipo" className="form-label">
          Link para el equipo
        </label>
        <input
          id="link-equipo"
          ref={linkRef}
          className="form-control mb-3"
          readOnly
          value={link}
        />
        {enlaces.length > 1 && <div className="small text-muted mb-3">Enlaces disponibles en esta computadora: {enlaces.join(' · ')}</div>}
        {qr && <div className="text-center mb-3"><img src={qr} alt="Código QR para responder la ronda" width={220} height={220} /></div>}
        {copiaManual && <p className="text-muted">Seleccioná el link y copialo.</p>}
        <button type="button" className="btn btn-primary" onClick={copiar}>
          {copiado ? 'Link copiado' : 'Copiar link para el equipo'}
        </button>
        <p className="mt-4 mb-0">
          Cuando respondan, vas a ver el termómetro y la participación{' '}
          <Link to={`/backoffice/dashboard?instanciaId=${instanciaId}`}>acá</Link>
          .
        </p>
      </div>
    </LayoutBackoffice>
  );
}

function AbrirRonda({
  equipoPedido,
  evaluacionPedida,
}: {
  equipoPedido: string | null;
  evaluacionPedida: string | null;
}) {
  const navigate = useNavigate();
  const [equipos, setEquipos] = useState<EquipoOpcion[]>([]);
  const [cuestionarios, setCuestionarios] = useState<CuestionarioOpcion[]>([]);
  const [equipoId, setEquipoId] = useState('');
  const [alcance, setAlcance] = useState<'equipo' | 'persona' | 'individual'>(equipoPedido ? 'equipo' : 'individual');
  const [evaluadoNombre, setEvaluadoNombre] = useState('');
  const [evaluacionId, setEvaluacionId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [modoRespuesta, setModoRespuesta] = useState<'anonima' | 'identificada'>('anonima');
  const [minimoAnonimato, setMinimoAnonimato] = useState('1');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [errorApertura, setErrorApertura] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    setErrorApertura(false);
    try {
      const [equiposRaw, evaluaciones] = await Promise.all([getEquipos(), getEvaluaciones()]);
      const equiposCargados = equiposDe(equiposRaw);
      const cuestionariosCargados = cuestionariosDe(evaluaciones);
      const equipoElegido = elegir(equiposCargados, equipoPedido);
      setEquipos(equiposCargados);
      setCuestionarios(cuestionariosCargados);
      setEquipoId(equipoElegido);
       setAlcance(equipoElegido ? 'equipo' : 'individual');
      setEvaluacionId(elegir(cuestionariosCargados, evaluacionPedida));
       setCantidad(equipoElegido ? cantidadInicial(equiposCargados.find((equipo) => equipo.id === equipoElegido)) : '1');
       if (!equipoElegido) {
         setModoRespuesta('identificada');
         setMinimoAnonimato('1');
       }
    } catch {
      setEquipos([]);
      setCuestionarios([]);
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, [equipoPedido, evaluacionPedida]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegirEquipo = (id: string) => {
    setEquipoId(id);
    setErrorApertura(false);
    setCantidad(id ? cantidadInicial(equipos.find((equipo) => equipo.id === id)) : '1');
    if (!id) {
      setModoRespuesta('identificada');
      setMinimoAnonimato('1');
    }
  };

  const abrir = async (event: FormEvent) => {
    event.preventDefault();
    if (!evaluacionId || !cantidadValida(cantidad) || abriendo) return;
    setAbriendo(true);
    setErrorApertura(false);
    try {
      const creada = await crearInstancia({
        ...(equipoId ? { equipoId } : {}),
        alcance,
        evaluadoNombre: alcance === 'persona' ? evaluadoNombre.trim() : '',
        evaluacionId,
        activadoEn: new Date().toISOString(),
        cantidadEsperada: Number(cantidad),
        descripcionLider: '',
        modoRespuesta,
        minimoAnonimato: Number(minimoAnonimato),
      });
      const id = idDe(creada);
      if (!id) throw new Error('La ronda no devolvió un id');
      navigate(`/backoffice/publicar-evaluacion?instanciaId=${id}`, { replace: true });
    } catch {
      setErrorApertura(true);
    } finally {
      setAbriendo(false);
    }
  };

  if (cargando) return <Cargando texto="Cargando..." />;

  if (errorCarga) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <div className="alert alert-danger" role="alert">
            <p className="mb-3">No se pudieron cargar los equipos y los cuestionarios.</p>
            <button className="btn btn-outline-danger" type="button" onClick={cargar}>
              Reintentar
            </button>
          </div>
        </div>
      </LayoutBackoffice>
    );
  }

  if (equipos.length === 0 && !cuestionarios.length) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <h2 className="fw-bold mb-3">Abrí la ronda</h2>
          <p className="mb-4">Primero creá el equipo.</p>
          <Link className="btn btn-primary" to="/backoffice/home">
            Crear el equipo
          </Link>
        </div>
      </LayoutBackoffice>
    );
  }

  if (cuestionarios.length === 0) {
    return (
      <LayoutBackoffice>
        <div className="container py-4">
          <h2 className="fw-bold mb-3">Abrí la ronda</h2>
          <p className="mb-4">Primero armá el cuestionario.</p>
          <Link className="btn btn-primary" to="/backoffice/alta-evaluacion">
            Armar el cuestionario
          </Link>
        </div>
      </LayoutBackoffice>
    );
  }

  const equipo = equipos.find((item) => item.id === equipoId);
  const cuestionario = cuestionarios.find((item) => item.id === evaluacionId);
  const mostrarEquipo = alcance !== 'individual';
  const mostrarCuestionario = cuestionarios.length > 1 && !pedidoValido(cuestionarios, evaluacionPedida);
  const alcanceValido = alcance !== 'persona' || (Boolean(equipoId) && evaluadoNombre.trim().length > 0);
  const listo = Boolean(evaluacionId && cantidadValida(cantidad) && alcanceValido);

  return (
    <LayoutBackoffice>
      <div className="container py-4">
        <h2 className="fw-bold mb-4">Abrí la ronda</h2>
        <form onSubmit={abrir} noValidate>
          <div className="mb-3">
            <label htmlFor="alcance" className="form-label">¿Qué querés evaluar?</label>
            <select id="alcance" className="form-select" value={alcance} onChange={(event) => {
              const nuevoAlcance = event.target.value as 'equipo' | 'persona' | 'individual';
              setAlcance(nuevoAlcance);
              if (nuevoAlcance === 'individual') elegirEquipo('');
              else if (!equipoId && equipos.length === 1) elegirEquipo(equipos[0].id);
              setErrorApertura(false);
            }} disabled={abriendo}>
              <option value="equipo">El equipo</option>
              <option value="persona">Una persona evaluada por el equipo</option>
              <option value="individual">Una evaluación individual</option>
            </select>
            <p className="small text-muted mt-2 mb-0">{alcance === 'persona' ? 'El equipo responderá sobre la persona indicada.' : alcance === 'individual' ? 'Una sola persona responderá la evaluación.' : 'El equipo responderá sobre su propia experiencia.'}</p>
          </div>
          {alcance === 'persona' && (
            <div className="mb-3">
              <label htmlFor="evaluado-nombre" className="form-label">Persona evaluada</label>
              <input id="evaluado-nombre" className="form-control" value={evaluadoNombre} onChange={(event) => setEvaluadoNombre(event.target.value)} placeholder="Ej.: María González" disabled={abriendo} />
            </div>
          )}
          {mostrarEquipo ? (
            <div className="mb-3">
              <label htmlFor="equipo" className="form-label">
                Equipo
              </label>
              <select
                id="equipo"
                className="form-select"
                value={equipoId}
                onChange={(event) => elegirEquipo(event.target.value)}
                disabled={abriendo}
              >
                <option value="">Elegí el equipo</option>
                {equipos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            equipo && <p className="mb-3">{equipo.nombre}</p>
          )}

          {mostrarCuestionario ? (
            <div className="mb-3">
              <label htmlFor="cuestionario" className="form-label">
                Cuestionario
              </label>
              <select
                id="cuestionario"
                className="form-select"
                value={evaluacionId}
                onChange={(event) => {
                  setEvaluacionId(event.target.value);
                  setErrorApertura(false);
                }}
                disabled={abriendo}
              >
                <option value="">Elegí el cuestionario</option>
                {cuestionarios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.titulo}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            cuestionario && <p className="mb-3">{cuestionario.titulo}</p>
          )}

          <div className="mb-4">
            <label htmlFor="cantidad-esperada" className="form-label">
              Cuántas personas deberían responder
            </label>
            <input
              id="cantidad-esperada"
              type="number"
              min={1}
              step={1}
              className="form-control"
              value={cantidad}
              onChange={(event) => {
                setCantidad(event.target.value);
                setErrorApertura(false);
              }}
              disabled={abriendo}
            />
          </div>

          <div className="card bg-light border-0 mb-4">
            <div className="card-body">
              <label htmlFor="modo-respuesta" className="form-label fw-semibold">Privacidad de las respuestas</label>
              <select id="modo-respuesta" className="form-select mb-2" value={modoRespuesta} onChange={(event) => setModoRespuesta(event.target.value as 'anonima' | 'identificada')} disabled={abriendo}>
                <option value="anonima">Anónimas (recomendado)</option>
                <option value="identificada">Identificadas</option>
              </select>
              {modoRespuesta === 'anonima' ? <p className="small text-muted mb-0">No se mostrará quién respondió. Los resultados individuales no estarán disponibles y el resumen se habilita al alcanzar {minimoAnonimato} {Number(minimoAnonimato) === 1 ? 'respuesta' : 'respuestas'}.</p> : <p className="small text-muted mb-0">Las respuestas podrán asociarse a una persona. Usá esta opción solo si el equipo fue informado y dio su consentimiento.</p>}
              {modoRespuesta === 'anonima' && <div className="mt-3"><label htmlFor="minimo-anonimato" className="form-label small">Mínimo de respuestas para mostrar resultados</label><input id="minimo-anonimato" type="number" min={1} step={1} className="form-control" value={minimoAnonimato} onChange={(event) => setMinimoAnonimato(event.target.value)} disabled={abriendo} /></div>}
            </div>
          </div>

          {errorApertura && (
            <p className="text-danger" role="alert">
              No se pudo abrir la ronda.
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={!listo || abriendo}>
            {abriendo ? 'Abriendo la ronda...' : 'Abrir la ronda'}
          </button>
        </form>
      </div>
    </LayoutBackoffice>
  );
}

function pedidoValido(opciones: { id: string }[], pedido: string | null): boolean {
  return Boolean(pedido && opciones.some((opcion) => opcion.id === pedido));
}

export default function PublicarEvaluacion() {
  const [searchParams] = useSearchParams();
  const instanciaId = searchParams.get('instanciaId');
  if (instanciaId) return <RondaLista instanciaId={instanciaId} />;
  return (
    <AbrirRonda
      equipoPedido={searchParams.get('equipoId')}
      evaluacionPedida={searchParams.get('evaluacionId')}
    />
  );
}
