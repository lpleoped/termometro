import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import { getEvaluaciones, type Evaluacion } from '../../services/evaluacionService';
import { getEquipos } from '../../services/equipoService';
import { abrirRedLocal, crearInstancia, getEnlacesPublicos, getInstanciaById } from '../../services/instanciaService';
import { ordenarCuestionarios } from '../../domain/cuestionariosEquipo';
import { direccionesDeRed, linkDeLaPagina } from '../../domain/link-respuesta';
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
  equipoId?: string;
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
        equipoId: evaluacion.equipoId,
      };
    })
    .filter((cuestionario) => cuestionario.id && cuestionario.titulo);
}

function elegirCuestionario(opciones: CuestionarioOpcion[], pedido: string | null, equipoId: string): string {
  if (pedido && opciones.some((opcion) => opcion.id === pedido)) return pedido;
  const propio = opciones.find((opcion) => opcion.equipoId === equipoId);
  if (propio) return propio.id;
  if (opciones.length === 1) return opciones[0].id;
  return '';
}

function elegir(opciones: { id: string }[], pedido: string | null): string {
  if (pedido && opciones.some((opcion) => opcion.id === pedido)) return pedido;
  if (opciones.length === 1) return opciones[0].id;
  return '';
}

function cantidadInicial(equipo: EquipoOpcion | undefined): string {
  if (!equipo) return '';
  if (equipo.miembros < 1) return '1';
  return String(equipo.miembros);
}

function ConfirmacionRed({ ocupado, onPermitir, onSoloAqui }: { ocupado: boolean; onPermitir: () => void; onSoloAqui: () => void }) {
  return (
    <div className="alert alert-warning" role="alertdialog" aria-labelledby="red-local-titulo">
      <h3 id="red-local-titulo" className="h6 mb-2">Los celulares de esta red van a poder responder</h3>
      <p className="small mb-3">Termómetro abre el puerto de esta computadora en la red local. Quien esté en el mismo Wi-Fi puede abrir la encuesta. El panel y los resultados siguen solo en esta computadora.</p>
      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn btn-warning btn-sm" disabled={ocupado} onClick={onPermitir}>Permitir en esta red</button>
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={ocupado} onClick={onSoloAqui}>Solo en esta computadora</button>
      </div>
    </div>
  );
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
  const [redPermitida, setRedPermitida] = useState(false);
  const [qr, setQr] = useState('');
  const [networkWarning, setNetworkWarning] = useState<{
    show: boolean;
    isPublic: boolean;
    lanUnhealthy: boolean;
  }>({ show: false, isPublic: false, lanUnhealthy: false });
  const [soloEstaComputadora, setSoloEstaComputadora] = useState(false);
  const [confirmarRed, setConfirmarRed] = useState(false);
  const [abriendoRed, setAbriendoRed] = useState(false);
  const [errorRed, setErrorRed] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setNoEncontrada(false);
    setErrorCarga(false);
    setCopiado(false);
    setCopiaManual(false);
    setNetworkWarning({ show: false, isPublic: false, lanUnhealthy: false });
    setRedPermitida(false);
    setErrorRed(false);
    try {
      const instancia = await getInstanciaById(instanciaId);
      const [equiposRaw, evaluaciones, publicados, salud] = await Promise.all([
        getEquipos(),
        getEvaluaciones(),
        getEnlacesPublicos(instanciaId),
        fetch('/api/health').then((respuesta) => respuesta.ok ? respuesta.json() : null).catch(() => null),
      ]);
      const enRed = salud?.networkListening === 'lan';
      setRedPermitida(enRed);
      setSoloEstaComputadora(salud?.storage === 'json' && !enRed);
      
      // El aviso de firewall solo aplica cuando la red ya fue aceptada.
      try {
        const networkStatus = enRed ? await fetch('/api/network-status').then(r => r.ok ? r.json() : null) : null;
        if (networkStatus && networkStatus.isDesktop) {
          const isPublic = networkStatus.profileType === 'Public';
          const lanUnhealthy = !networkStatus.lanHealthy;
          if (isPublic || lanUnhealthy) {
            setNetworkWarning({ show: true, isPublic, lanUnhealthy });
          }
        }
      } catch {
        // Ignore network check errors (not critical)
      }
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
      const urlList = publicados.urls.map((item: { url?: string } | string) => typeof item === 'string' ? item : item.url || '');
      setEnlaces(urlList);
      const principal = linkDeLaPagina(window.location.origin, publicados.token || '');
      setQr(principal ? await QRCode.toDataURL(principal) : '');
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

  const link = linkDeLaPagina(window.location.origin, ronda?.tokenPublico || '');
  const enLaRed = direccionesDeRed(enlaces, redPermitida, link);

  const permitirRed = async () => {
    setAbriendoRed(true);
    setErrorRed(false);
    try {
      await abrirRedLocal();
      setConfirmarRed(false);
      await cargar();
    } catch {
      setErrorRed(true);
    } finally {
      setAbriendoRed(false);
    }
  };

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
            <Link className="btn btn-sm btn-outline-secondary" to="/backoffice/publicar-evaluacion">Abrir la ronda</Link>
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
        {soloEstaComputadora && (
          <div className="mb-4">
            <p className="small mb-2">Este link solo se abre en esta computadora.</p>
            {errorRed && <p className="text-danger small" role="alert">No se pudo abrir la encuesta en la red local.</p>}
            {confirmarRed ? (
              <ConfirmacionRed ocupado={abriendoRed} onPermitir={() => void permitirRed()} onSoloAqui={() => setConfirmarRed(false)} />
            ) : (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setConfirmarRed(true)}>Permitir respuestas en esta red</button>
            )}
          </div>
        )}
        {networkWarning.show && (
          <div className="alert alert-warning mb-4" role="alert">
            <div className="d-flex gap-2">
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
              </div>
              <div>
                <strong>Aviso de configuración de red</strong>
                <p className="mb-2 mt-2">
                  {networkWarning.isPublic && (
                    <>Tu red Wi-Fi está configurada como <strong>&quot;Red pública&quot;</strong>. Por seguridad, Windows bloquea las conexiones LAN en redes públicas.</>
                  )}
                  {!networkWarning.isPublic && networkWarning.lanUnhealthy && (
                    <>No se puede acceder al servidor desde la red local. El firewall de Windows puede estar bloqueando el puerto 3210.</>
                  )}
                </p>
                <p className="mb-2">
                  <strong>Para que otros dispositivos puedan acceder al cuestionario:</strong>
                </p>
                <ol className="mb-0 ps-3">
                  <li>Abre <strong>Configuración de Windows</strong> → <strong>Red e Internet</strong></li>
                  <li>Selecciona tu conexión Wi-Fi actual</li>
                  <li>En <strong>&quot;Tipo de perfil de red&quot;</strong>, cambia de <strong>&quot;Público&quot;</strong> a <strong>&quot;Privado&quot;</strong></li>
                  <li>Reinstala o actualiza Termómetro a la versión 0.0.9 o superior</li>
                  <li>Recarga esta página para verificar</li>
                </ol>
              </div>
            </div>
          </div>
        )}
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
        {enLaRed.length > 0 && <p className="small text-muted mb-3">En esta red: {enLaRed.join(' · ')}</p>}
        {qr && <div className="text-center mb-3"><img src={qr} alt="Código QR para responder la ronda" width={220} height={220} /></div>}
        {copiaManual && <p className="text-muted">Seleccioná el link y copialo.</p>}
        <button type="button" className="btn btn-primary paso-primaria" onClick={copiar}>
          {copiado ? 'Link copiado' : 'Copiar link para el equipo'}
        </button>
        <p className="mt-4 mb-0">
          Cuando respondan, vas a ver el termómetro y la participación{' '}
          <Link className="btn btn-sm estado-atajo" to={`/backoffice/dashboard?instanciaId=${instanciaId}`}>acá</Link>
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
  const [alcance, setAlcance] = useState<'equipo' | 'persona' | 'individual'>('equipo');
  const [evaluadoNombre, setEvaluadoNombre] = useState('');
  const [evaluacionId, setEvaluacionId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [modoRespuesta, setModoRespuesta] = useState<'anonima' | 'identificada'>('anonima');
  const [minimoAnonimato, setMinimoAnonimato] = useState('3');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [errorApertura, setErrorApertura] = useState(false);
  const [escuchaCerrada, setEscuchaCerrada] = useState(false);
  const [confirmarRed, setConfirmarRed] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    setErrorApertura(false);
    try {
      const [equiposRaw, evaluaciones] = await Promise.all([getEquipos(), getEvaluaciones()]);
      const equiposCargados = equiposDe(equiposRaw);
      const cuestionariosCargados = cuestionariosDe(evaluaciones);
      const equipoElegido = elegir(equiposCargados, equipoPedido);
      const evaluacionElegida = elegirCuestionario(cuestionariosCargados, evaluacionPedida, equipoElegido);
      const cantidadElegida = equipoElegido ? cantidadInicial(equiposCargados.find((equipo) => equipo.id === equipoElegido)) : '';
      setEquipos(equiposCargados);
      setCuestionarios(cuestionariosCargados);
      setEquipoId(equipoElegido);
      setAlcance('equipo');
      setEvaluacionId(evaluacionElegida);
      setCantidad(cantidadElegida);
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
    fetch('/api/health').then((respuesta) => respuesta.ok ? respuesta.json() : null).then((salud) => {
      setEscuchaCerrada(salud?.storage === 'json' && salud?.networkListening !== 'lan');
    }).catch(() => setEscuchaCerrada(false));
  }, [cargar]);

  const elegirEquipo = (id: string) => {
    setEquipoId(id);
    setErrorApertura(false);
    setEvaluacionId((actual) => {
      const propios = cuestionarios.filter((item) => item.equipoId === id);
      if (propios.some((item) => item.id === actual)) return actual;
      return propios[0]?.id || actual;
    });
    setCantidad(id ? cantidadInicial(equipos.find((equipo) => equipo.id === id)) : '1');
    if (!id) {
      setModoRespuesta('identificada');
      setMinimoAnonimato('1');
    }
  };

  const publicar = async () => {
    if (!evaluacionId || !cantidadValida(cantidad)) return;
    const desdeEquipo = Boolean(equipoPedido && equipos.some((item) => item.id === equipoPedido));
    const equipoAPublicar = desdeEquipo ? equipoPedido! : equipoId;
    const alcanceAPublicar = equipoAPublicar
      ? (alcance === 'individual' ? 'equipo' : alcance)
      : alcance;
    if (alcanceAPublicar !== 'individual' && !equipoAPublicar) return;
    setAbriendo(true);
    setErrorApertura(false);
    setConfirmarRed(false);
    try {
      const creada = await crearInstancia({
        ...(equipoAPublicar ? { equipoId: equipoAPublicar } : {}),
        alcance: alcanceAPublicar,
        evaluadoNombre: alcanceAPublicar === 'persona' ? evaluadoNombre.trim() : '',
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

  const abrir = (event: FormEvent) => {
    event.preventDefault();
    if (!evaluacionId || !cantidadValida(cantidad) || abriendo) return;
    if (escuchaCerrada) {
      setConfirmarRed(true);
      return;
    }
    void publicar();
  };

  const permitirRed = async () => {
    setAbriendo(true);
    setErrorApertura(false);
    try {
      await abrirRedLocal();
      setEscuchaCerrada(false);
      setConfirmarRed(false);
      await publicar();
    } catch {
      setErrorApertura(true);
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
          <Link className="btn btn-primary paso-primaria" to="/backoffice/home">
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
          <Link className="btn btn-primary paso-primaria" to={equipoPedido ? `/backoffice/alta-evaluacion?equipoId=${equipoPedido}` : '/backoffice/alta-evaluacion'}>
            Armar el cuestionario
          </Link>
        </div>
      </LayoutBackoffice>
    );
  }

  const desdeEquipo = pedidoValido(equipos, equipoPedido);
  const equipo = equipos.find((item) => item.id === equipoId) || (desdeEquipo ? equipos.find((item) => item.id === equipoPedido) : undefined);
  const cuestionariosVisibles = ordenarCuestionarios(cuestionarios, equipo?.id || equipoId);
  const cuestionario = cuestionariosVisibles.find((item) => item.id === evaluacionId);
  const mostrarEquipo = alcance !== 'individual' && !desdeEquipo;
  const mostrarCuestionario = !pedidoValido(cuestionariosVisibles, evaluacionPedida) && (cuestionariosVisibles.length > 1 || !evaluacionId);
  const alcanceValido = alcance === 'individual'
    ? !desdeEquipo
    : (Boolean(equipoId || desdeEquipo) && (alcance !== 'persona' || evaluadoNombre.trim().length > 0));
  const listo = Boolean(evaluacionId && cantidadValida(cantidad) && alcanceValido);
  const vieneArmado = Boolean(
    (equipoId || desdeEquipo) && evaluacionId
    && (desdeEquipo || equipos.length === 1)
    && (pedidoValido(cuestionarios, evaluacionPedida) || cuestionarios.length === 1),
  );
  const caminoEquipo = desdeEquipo || vieneArmado;
  const ajustarAlcance = (nuevoAlcance: 'equipo' | 'persona' | 'individual') => {
    if (desdeEquipo && nuevoAlcance === 'individual') {
      setAlcance('equipo');
      if (equipoPedido) elegirEquipo(equipoPedido);
      setErrorApertura(false);
      return;
    }
    setAlcance(nuevoAlcance);
    if (nuevoAlcance === 'individual') elegirEquipo('');
    else if (!equipoId && (desdeEquipo ? equipoPedido : equipos[0]?.id)) elegirEquipo((desdeEquipo && equipoPedido) || equipos[0].id);
    setErrorApertura(false);
  };
  const ajusteRonda = (
    <details className="mb-4">
      <summary>Ajustar esta ronda</summary>
      <div className="mt-3">
        <label htmlFor="alcance" className="form-label">Alcance</label>
        <select id="alcance" className="form-select mb-3" value={alcance === 'individual' && desdeEquipo ? 'equipo' : alcance} onChange={(event) => {
          ajustarAlcance(event.target.value as 'equipo' | 'persona' | 'individual');
        }} disabled={abriendo}>
          <option value="equipo">El equipo</option>
          <option value="persona">Una persona</option>
          {!desdeEquipo && <option value="individual">Una sola persona</option>}
        </select>
        {alcance === 'persona' && (
          <div className="mb-3">
            <label htmlFor="evaluado-nombre" className="form-label">Persona</label>
            <input id="evaluado-nombre" className="form-control" value={evaluadoNombre} onChange={(event) => setEvaluadoNombre(event.target.value)} disabled={abriendo} />
          </div>
        )}
        <label htmlFor="modo-respuesta" className="form-label">Respuestas</label>
        <select id="modo-respuesta" className="form-select mb-3" value={modoRespuesta} onChange={(event) => setModoRespuesta(event.target.value as 'anonima' | 'identificada')} disabled={abriendo}>
          <option value="anonima">Sin nombre</option>
          <option value="identificada">Identificadas</option>
        </select>
        {modoRespuesta === 'anonima' && (
          <div>
            <label htmlFor="minimo-anonimato" className="form-label">Mínimo para mostrar el resultado</label>
            <input id="minimo-anonimato" type="number" min={1} step={1} className="form-control" value={minimoAnonimato} onChange={(event) => setMinimoAnonimato(event.target.value)} disabled={abriendo} />
          </div>
        )}
      </div>
    </details>
  );

  return (
    <LayoutBackoffice>
      <div className="container py-4">
        <h2 className="fw-bold mb-4">Abrí la ronda</h2>
        {caminoEquipo ? (
          <form onSubmit={abrir} noValidate>
            {equipo && <p className="mb-1">{equipo.nombre}</p>}
            {mostrarCuestionario ? (
              <div className="mb-3">
                <label htmlFor="cuestionario-equipo" className="form-label">Cuestionario</label>
                <select
                  id="cuestionario-equipo"
                  className="form-select"
                  value={evaluacionId}
                  onChange={(event) => { setEvaluacionId(event.target.value); setErrorApertura(false); }}
                  disabled={abriendo}
                >
                  <option value="">Elegí el cuestionario</option>
                  {cuestionariosVisibles.map((item) => (
                    <option key={item.id} value={item.id}>{item.titulo}</option>
                  ))}
                </select>
              </div>
            ) : (
              cuestionario && <p className="mb-3">{cuestionario.titulo}</p>
            )}
            <div className="mb-4">
              <label htmlFor="cantidad-esperada" className="form-label">Cuántas personas deberían responder</label>
              <input id="cantidad-esperada" type="number" min={1} step={1} className="form-control" value={cantidad} onChange={(event) => { setCantidad(event.target.value); setErrorApertura(false); }} disabled={abriendo} />
            </div>
            {ajusteRonda}
            {errorApertura && <p className="text-danger" role="alert">No se pudo abrir la ronda.</p>}
            {confirmarRed && (
              <div className="mb-3">
                <ConfirmacionRed ocupado={abriendo} onPermitir={() => void permitirRed()} onSoloAqui={() => { setConfirmarRed(false); void publicar(); }} />
              </div>
            )}
            <button type="submit" className="btn btn-primary paso-primaria" disabled={!listo || abriendo}>
              {abriendo ? 'Abriendo la ronda...' : 'Abrir la ronda'}
            </button>
          </form>
        ) : (
        <form onSubmit={abrir} noValidate>
          <div className="mb-3">
            <label htmlFor="alcance" className="form-label">¿Qué querés evaluar?</label>
            <select id="alcance" className="form-select" value={alcance} onChange={(event) => {
              ajustarAlcance(event.target.value as 'equipo' | 'persona' | 'individual');
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
                {cuestionariosVisibles.map((item) => (
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
              {modoRespuesta === 'anonima' ? <p className="small text-muted mb-0">No pedimos el nombre. El resultado agrupado aparece al llegar a {minimoAnonimato} {Number(minimoAnonimato) === 1 ? 'respuesta' : 'respuestas'}. Los comentarios abiertos los leés en el panel.</p> : <p className="small text-muted mb-0">Las respuestas podrán asociarse a una persona. Usá esta opción solo si el equipo fue informado y dio su consentimiento.</p>}
              {modoRespuesta === 'anonima' && <div className="mt-3"><label htmlFor="minimo-anonimato" className="form-label small">Mínimo de respuestas para mostrar resultados</label><input id="minimo-anonimato" type="number" min={1} step={1} className="form-control" value={minimoAnonimato} onChange={(event) => setMinimoAnonimato(event.target.value)} disabled={abriendo} /></div>}
            </div>
          </div>

          {errorApertura && (
            <p className="text-danger" role="alert">
              No se pudo abrir la ronda.
            </p>
          )}

          {confirmarRed && (
            <div className="mb-3">
              <ConfirmacionRed ocupado={abriendo} onPermitir={() => void permitirRed()} onSoloAqui={() => { setConfirmarRed(false); void publicar(); }} />
            </div>
          )}

          <button type="submit" className="btn btn-primary paso-primaria" disabled={!listo || abriendo}>
            {abriendo ? 'Abriendo la ronda...' : 'Abrir la ronda'}
          </button>
        </form>
        )}
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
