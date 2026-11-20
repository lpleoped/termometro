import { Navigate, useSearchParams } from 'react-router-dom';

/** La lectura se pide en Estado actual. Esta ruta solo devuelve a la ronda. */
export default function AnalisisIA() {
  const [params] = useSearchParams();
  const instanciaId = params.get('instanciaId');
  const destino = instanciaId
    ? `/backoffice/dashboard?instanciaId=${instanciaId}`
    : '/backoffice/home';
  return <Navigate to={destino} replace />;
}
