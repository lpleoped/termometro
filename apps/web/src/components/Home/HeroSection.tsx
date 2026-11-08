import logoTermometro from '../../assets/termometro-logo.png';
import graficoBarras from '../../assets/bars.png';
import { Link } from 'react-router-dom';

const highlights = [
  ['✓', 'Análisis'],
  ['◌', 'Métricas'],
  ['⌁', 'Insights'],
  ['→', 'Acción'],
];

export default function HeroSection() {
  return (
    <div className="container-fluid py-4" style={{ background: '#fff' }}>
      <div className="row align-items-center justify-content-between g-5">
        <div className="col-lg-6 text-center text-lg-start" data-aos="fade-right" data-aos-delay="100">
          <div className="mb-4">
            <img src={logoTermometro} width="48" height="48" className="mb-3" alt="Logo Termómetro" />
            <h1 className="display-5 fw-bold text-primary mb-3">Termómetro</h1>
          </div>

          <p className="lead text-secondary mb-4 fs-5">
            Una herramienta para medir, entender y mejorar el clima de tu equipo con
            evaluaciones y decisiones basadas en sus propias respuestas.
          </p>

          <div className="row g-4 mb-5">
            {highlights.map(([icon, label]) => (
              <div className="col-6 col-md-3" key={label}>
                <div className="text-center">
                  <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2 border text-primary" style={{ width: '40px', height: '40px' }} aria-hidden="true">
                    {icon}
                  </div>
                  <div className="text-secondary small">{label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
            <Link to="/login" className="btn btn-primary btn-lg px-4 py-3 fw-medium">Comenzar ahora</Link>
            <button className="btn btn-outline-secondary btn-lg px-4 py-3 fw-medium" onClick={() => document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' })}>
              Saber más
            </button>
          </div>

          <div className="mt-5 pt-4 border-top text-secondary small">
            Tus resultados se mantienen dentro de tu espacio de trabajo y se muestran cuando ingresas a tu cuenta.
          </div>
        </div>

        <div className="col-lg-5 text-center" data-aos="zoom-in" data-aos-delay="300">
          <img src={graficoBarras} alt="Ejemplo de gráfico de barras" className="img-fluid rounded" style={{ maxHeight: '280px' }} />
        </div>
      </div>
    </div>
  );
}
