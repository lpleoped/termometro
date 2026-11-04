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

  return (
    <section className={`dashboard-resumen resumen-${estadoClave}`} aria-label="Resumen del índice de clima">
      <div className="resumen-header p-4">
        <div className="d-flex align-items-center justify-content-between">
          <div className="resumen-content">
            <h6 className="mb-2 fw-semibold opacity-90">Índice</h6>
            <div className="d-flex align-items-baseline gap-2 mb-2">
              <span className="display-6 fw-bold">{valor}</span>
              <span className="fs-6 opacity-90">/ 100</span>
            </div>
            <p className="mb-0 fs-6 opacity-90">
              El índice del equipo es <strong>{estadoActual.nombre}</strong>.
            </p>
            {lectura && (
              <p className="mb-0 mt-2 fs-6 opacity-90">
                {lectura}
              </p>
            )}
          </div>
        </div>
      </div>

      {(participacionBaja || participacionExcesiva) && (
        <div className="resumen-alert px-4 py-3" role="status">
          {participacionBaja ? 'La participación todavía es baja.' : 'Hay más respuestas que personas esperadas.'}
        </div>
      )}
    </section>
  );
};

export default DashboardResumen;
