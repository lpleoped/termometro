import type { CSSProperties } from 'react';

interface Props {
  valor: number;
  participacion: {
    esperada: number;
    recibida: number;
    porcentaje: number;
  };
  lectura: string;
}

const DashboardResumen = ({ valor, participacion, lectura }: Props) => {
  const estadosConfig = {
    excelente: {
      nombre: 'Excelente',
      color: '#10b981',
      colorOscuro: '#059669',
    },
    bueno: {
      nombre: 'Bueno',
      color: '#3b82f6',
      colorOscuro: '#2563eb',
    },
    regular: {
      nombre: 'Regular',
      color: '#f59e0b',
      colorOscuro: '#d97706',
    },
    critico: {
      nombre: 'Crítico',
      color: '#ef4444',
      colorOscuro: '#dc2626',
    },
  };

  let estadoClave: keyof typeof estadosConfig = 'critico';
  if (valor >= 80) {
    estadoClave = 'excelente';
  } else if (valor >= 60) {
    estadoClave = 'bueno';
  } else if (valor >= 40) {
    estadoClave = 'regular';
  }
  const estadoActual = estadosConfig[estadoClave];

  const { esperada, recibida, porcentaje } = participacion;
  const participacionBaja = recibida > 0 && porcentaje < 50;
  const participacionExcesiva = recibida > esperada;

  const tono = { '--resumen-estado': estadoActual.color } as CSSProperties;

  return (
    <section
      className={`dashboard-resumen resumen-${estadoClave}`}
      aria-label="Resumen del índice de clima"
      style={tono}
    >
      <div className="resumen-header">
        <p className="resumen-kicker">Índice</p>
        <p className="resumen-cifra">
          <span className="resumen-numero">{valor}</span>
          <span className="resumen-techo">/ 100</span>
        </p>
        <p className="resumen-semaforo">{estadoActual.nombre}</p>
      </div>
      {lectura ? <p className="resumen-lectura">{lectura}</p> : null}

      {(participacionBaja || participacionExcesiva) && (
        <div className="resumen-alert px-4 py-3" role="status">
          {participacionBaja ? 'La participación todavía es baja.' : 'Hay más respuestas que personas esperadas.'}
        </div>
      )}
    </section>
  );
};

export default DashboardResumen;
