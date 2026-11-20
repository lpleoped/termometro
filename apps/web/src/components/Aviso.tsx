import type { ReactNode } from 'react';

type Tono = 'vacio' | 'problema';

interface Props {
  tono: Tono;
  children: ReactNode;
  onRetry?: () => void;
}

/** Vacío: todavía no hay datos y no es un fallo. Problema: la petición falló y el aviso queda en el lugar, con reintento. */
export default function Aviso({ tono, children, onRetry }: Props) {
  if (tono === 'vacio') {
    return <p className="aviso aviso-vacio">{children}</p>;
  }

  return (
    <div className="aviso aviso-problema" role="alert">
      <p className="mb-0">{children}</p>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
