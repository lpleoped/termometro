import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ConsultaUso, MotivoUso, ResumenUso } from '@termometro/shared';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import api from '../../services/api';

const MOTIVO: Record<MotivoUso, string> = {
  prueba: 'Prueba de conexión',
  cuestionario: 'Cuestionario',
  lectura: 'Lectura',
  tono: 'Tono',
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function claveDe(desde: string) {
  const fecha = new Date(desde);
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

function mover(clave: string, delta: number) {
  const [anio, mes] = clave.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1 + delta, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

function titulo(clave: string) {
  const [anio, mes] = clave.split('-').map(Number);
  const nombre = MESES[mes - 1] || clave;
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

function tokensDe(consulta: ConsultaUso) {
  if (consulta.tokensEntrada == null && consulta.tokensSalida == null) return 'tokens no informados';
  const entrada = consulta.tokensEntrada == null ? 'entrada no informada' : `${consulta.tokensEntrada} de entrada`;
  const salida = consulta.tokensSalida == null ? 'salida no informada' : `${consulta.tokensSalida} de salida`;
  return `${entrada}, ${salida}`;
}

function costoDe(valor: number | null) {
  return valor == null ? 'no informado' : String(valor);
}

function fechaDe(valor: string) {
  return new Date(valor).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Uso() {
  const [periodo, setPeriodo] = useState('');
  const [resumen, setResumen] = useState<ResumenUso | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setError(false);
    api.get<ResumenUso>('/uso', { params: periodo ? { periodo } : {} })
      .then((respuesta) => { if (!cancelado) setResumen(respuesta.data); })
      .catch(() => { if (!cancelado) setError(true); });
    return () => { cancelado = true; };
  }, [periodo, intento]);

  const clave = resumen ? claveDe(resumen.periodo.desde) : periodo;
  const actual = claveDe(new Date().toISOString());
  const totales = resumen?.totales;
  const sinTokens = Boolean(totales && totales.consultas > 0 && totales.consultasSinTokens === totales.consultas);

  return <LayoutBackoffice><div className="container py-5 uso-pagina" style={{ maxWidth: 960 }}>
    <Link className="btn btn-sm estado-atajo" to="/backoffice/home">Volver al panel</Link>
      <header className="my-4">
        <div className="d-flex align-items-center gap-2 mb-2">
          <h1 className="mb-0">Uso</h1>
          <InfoAyuda tema="uso" />
        </div>
      <p className="text-muted mb-0">Consultas de esta cuenta. No se guarda el texto enviado ni las respuestas.</p>
    </header>
    {error && <div className="alert alert-danger" role="alert"><p className="mb-3">No se pudo leer el uso.</p><button className="btn btn-outline-danger" type="button" onClick={() => setIntento((valor) => valor + 1)}>Reintentar</button></div>}
    {!error && !resumen && <p role="status">Cargando el uso…</p>}
    {resumen && <>
      <section className="uso-totales mb-4" aria-label="Totales del período">
        <p className="uso-numero">{totales?.consultas || 0}</p>
        <p className="mb-2">{totales?.consultas === 1 ? 'consulta' : 'consultas'} en {titulo(clave)}</p>
        {totales && totales.consultas > 0 && <>
          <p className="mb-1">{sinTokens ? 'tokens no informados' : `${totales.tokensEntrada} tokens de entrada · ${totales.tokensSalida} de salida`}</p>
          {totales.consultasSinTokens > 0 && totales.consultasSinTokens < totales.consultas && <p className="mb-1">{totales.consultasSinTokens} {totales.consultasSinTokens === 1 ? 'consulta sin tokens informados' : 'consultas sin tokens informados'}.</p>}
          <p className="mb-3">Costo estimado: {costoDe(totales.costoEstimado)}</p>
          <ul className="list-unstyled d-flex flex-wrap gap-3 mb-0">
            {resumen.porMotivo.map((grupo) => <li key={grupo.motivo}><strong>{MOTIVO[grupo.motivo]}.</strong> {grupo.consultas}</li>)}
          </ul>
        </>}
      </section>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h2 className="h5 mb-0">Detalle de {titulo(clave)}</h2>
        <div className="uso-periodo">
          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setPeriodo(mover(clave, -1))}>Mes anterior</button>
          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setPeriodo(mover(clave, 1))} disabled={clave >= actual}>Mes siguiente</button>
        </div>
      </div>
      {resumen.consultas.length === 0 && <p>Todavía no hay consultas en este período.</p>}
      {resumen.nuncaConsulto && <p><Link className="btn btn-primary paso-primaria" to="/backoffice/configuracion/ia">Conectar la inteligencia</Link></p>}
      {resumen.consultas.length > 0 && <>
        <div className="d-none d-md-block">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Motivo</th><th>Modelo</th><th>Tokens</th><th>Costo</th></tr></thead>
            <tbody>
              {resumen.consultas.map((consulta) => <tr key={consulta.id}><td>{fechaDe(consulta.fecha)}</td><td>{MOTIVO[consulta.motivo]}</td><td>{consulta.modelo}</td><td>{tokensDe(consulta)}</td><td>{costoDe(consulta.costoEstimado)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="d-md-none d-grid gap-3">
          {resumen.consultas.map((consulta) => <article key={consulta.id} className="rounded border p-3"><p className="mb-1"><strong>{MOTIVO[consulta.motivo]}</strong></p><p className="mb-1">{fechaDe(consulta.fecha)} · {consulta.modelo}</p><p className="mb-1">{tokensDe(consulta)}</p><p className="mb-0">Costo: {costoDe(consulta.costoEstimado)}</p></article>)}
        </div>
      </>}
    </>}
  </div></LayoutBackoffice>;
}
