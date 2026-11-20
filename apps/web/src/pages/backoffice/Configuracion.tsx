import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import InfoAyuda from '../../components/InfoAyuda';
import BackupLocal from '../../components/backoffice/BackupLocal';
import { getEquipos } from '../../services/equipoService';
import { getTeamContext } from '../../services/teamContextService';

interface Equipo { _id?: string; id?: string; nombre?: string }

function idDe(equipo: Equipo): string {
  return String(equipo._id || equipo.id || '');
}

export default function Configuracion() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoId, setEquipoId] = useState('');
  const [tieneContexto, setTieneContexto] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getEquipos().then((lista) => {
      const equiposLista = Array.isArray(lista) ? lista as Equipo[] : [];
      setEquipos(equiposLista);
      if (equiposLista[0]) setEquipoId(idDe(equiposLista[0]));
    }).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!equipoId) { setTieneContexto(false); return; }
    let activo = true;
    getTeamContext(equipoId)
      .then((items) => { if (activo) setTieneContexto(items.some((item) => item.status !== 'obsolete')); })
      .catch(() => { if (activo) setTieneContexto(false); });
    return () => { activo = false; };
  }, [equipoId]);

  const equipo = equipos.find((item) => idDe(item) === equipoId);
  const cuenta = [
    { href: equipoId ? `/backoffice/configuracion/ia?equipoId=${equipoId}` : '/backoffice/configuracion/ia', titulo: 'Inteligencia artificial', impacto: 'Se usa en todos tus equipos: cuestionarios, lecturas y propuestas.', accion: 'Configurar inteligencia' },
    { href: '/backoffice/uso', titulo: 'Uso', impacto: 'Consultas y tokens de esta cuenta.', accion: 'Ver uso' },
  ];
  const delEquipo = equipoId ? [
    { href: tieneContexto ? `/backoffice/configuracion/contexto?equipoId=${equipoId}` : `/backoffice/equipos?equipo=${equipoId}&paso=contexto`, titulo: 'Contexto', impacto: 'Cambia cómo se lee y qué acciones se proponen para ese equipo.', accion: tieneContexto ? 'Ver el contexto' : 'Dar contexto' },
    { href: `/backoffice/configuracion/integraciones?equipoId=${equipoId}&seccion=canal`, titulo: 'Canal', impacto: 'Publica en Slack solo cuando vos lo pedís.', accion: 'Configurar canal' },
    { href: `/backoffice/configuracion/integraciones?equipoId=${equipoId}&seccion=tareas`, titulo: 'Tareas', impacto: 'Crea tareas en monday solo cuando confirmás una acción.', accion: 'Configurar tareas' },
  ] : [];

  return <LayoutBackoffice><div className="container py-5 config-page">
    <Link className="btn btn-sm estado-atajo" to="/backoffice/home">Volver al panel</Link>
      <header className="my-4">
        <div className="d-flex align-items-center gap-2 mb-2">
          <h1 className="mb-0">Configuración</h1>
          <InfoAyuda tema="configuracion" />
        </div>
      <p className="text-muted mb-0">Lo de esta cuenta vale para todos tus equipos. Lo de un equipo cambia solo a ese equipo.</p>
    </header>
    <div className="config-familias">
    <section className="config-familia" aria-labelledby="config-cuenta">
      <h2 id="config-cuenta" className="h4">De esta cuenta</h2>
      <ul className="list-unstyled mt-3 mb-0">
        {cuenta.map((item) => <li key={item.titulo} className="border-top py-3">
          <h3 className="h5 mb-1">{item.titulo}</h3>
          <p className="mb-2">{item.impacto}</p>
          <Link className="btn btn-sm btn-outline-secondary" to={item.href}>{item.accion}</Link>
        </li>)}
        <li className="border-top py-3">
          <h3 className="h5 mb-1">Respaldo</h3>
          <p className="mb-2">Copia todo este espacio para llevarlo a otra computadora.</p>
          <BackupLocal />
        </li>
      </ul>
    </section>
    <section className="config-familia" aria-labelledby="config-equipo">
      <h2 id="config-equipo" className="h4">De un equipo</h2>
      {error ? <p role="alert">No se pudieron cargar los equipos.</p> : equipos.length === 0 ? <p className="mt-3">Primero creá un equipo. El contexto, el canal y las tareas se configuran ahí.</p> : <>
        <label className="form-label mt-3" htmlFor="config-equipo-id">Equipo</label>
        <select id="config-equipo-id" className="form-select mb-3" value={equipoId} onChange={(event) => setEquipoId(event.target.value)}>
          {equipos.map((item) => <option key={idDe(item)} value={idDe(item)}>{item.nombre || 'Equipo'}</option>)}
        </select>
        <p className="text-muted">Estos cambios valen para {equipo?.nombre || 'el equipo elegido'}.</p>
        <ul className="list-unstyled mb-0">
          {delEquipo.map((item) => <li key={item.titulo} className="border-top py-3">
            <h3 className="h5 mb-1">{item.titulo}</h3>
            <p className="mb-2">{item.impacto}</p>
            <Link className="btn btn-sm btn-outline-secondary" to={item.href}>{item.accion}</Link>
          </li>)}
        </ul>
      </>}
    </section>
    </div>
  </div></LayoutBackoffice>;
}
