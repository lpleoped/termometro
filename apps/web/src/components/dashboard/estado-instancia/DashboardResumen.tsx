import Bueno from '../../../assets/estados/bueno.png';
import Critico from '../../../assets/estados/critico.png';
import Regular from '../../../assets/estados/regular.png';
import Excelente from '../../../assets/estados/excelente.png';

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
      img: Excelente,
    },
    bueno: {
      nombre: 'Bueno',
      color: '#3b82f6',
      colorOscuro: '#2563eb',
      img: Bueno,
    },
    regular: {
      nombre: 'Regular',
      color: '#f59e0b',
      colorOscuro: '#d97706',
      img: Regular,
    },
    critico: {
      nombre: 'Crítico',
      color: '#ef4444',
      colorOscuro: '#dc2626',
      img: Critico,
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
          <div className="resumen-image d-none d-sm-flex">
            <div
              className="termometro-container d-flex align-items-center justify-content-center"
              style={{
                width: '100px',
                height: '100px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                backdropFilter: 'blur(10px)',
              }}
            >
              <img
                src={estadoActual.img}
                alt={estadoActual.nombre}
                className="img-fluid"
                style={{
                  height: '60px',
                  width: 'auto',
                  maxWidth: '80px',
                  filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="resumen-footer px-4 py-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="participacion-info">
            <span className="fw-medium">
              Respondieron {recibida} de {esperada}
            </span>
          </div>

          {(participacionBaja || participacionExcesiva) && (
            <div className="participacion-warning d-flex align-items-center gap-2">
              <span className="small">
                {participacionBaja ? 'Participación baja' : 'Participación excesiva'}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashboardResumen;
