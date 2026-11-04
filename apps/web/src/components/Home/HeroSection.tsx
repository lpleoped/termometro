import logoTermometro from '../../assets/termometro-logo.png'
import graficoBarras from '../../assets/bars.png'
import { Link } from 'react-router-dom'

export default function HeroSection() {
  return (
    <div className="container-fluid py-4" style={{ background: '#fff' }}>
      <div className="row align-items-center justify-content-between g-5">
        
        {/* Columna de texto */}
        <div
          className="col-lg-6 text-center text-lg-start"
          data-aos="fade-right"
          data-aos-delay="100"
          data-aos-duration="1000"
        >
          {/* Logo y título */}
          <div className="mb-4">
            <img 
              src={logoTermometro} 
              width="48" 
              height="48"
              className="mb-3" 
              alt="Logo Termómetro" 
            />
            <h1 className="display-5 fw-bold text-primary mb-3">
              Termómetro de Equipo
            </h1>
          </div>

          {/* Descripción */}
          <p className="lead text-secondary mb-4 fs-5">
            Una herramienta inteligente para medir, entender y mejorar el clima organizacional de tu equipo. 
            Obtén insights valiosos y toma decisiones basadas en datos reales.
          </p>

          {/* Características principales - más minimalistas */}
          <div className="row g-4 mb-5">
            <div className="col-6 col-md-3">
              <div className="text-center">
                <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px' }}>
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                  </svg>
                </div>
                <div className="text-secondary small">Análisis</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px' }}>
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4zM3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.389.389 0 0 0-.029-.518z"/>
                  </svg>
                </div>
                <div className="text-secondary small">Métricas</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px' }}>
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                  </svg>
                </div>
                <div className="text-secondary small">Insights</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px' }}>
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                  </svg>
                </div>
                <div className="text-secondary small">Acción</div>
              </div>
            </div>
          </div>

          {/* Botones de acción - más sobrios */}
          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
            <Link 
              to="/login" 
              className="btn btn-primary btn-lg px-4 py-3 fw-medium"
            >
              Comenzar Ahora
            </Link>
            <button 
              className="btn btn-outline-secondary btn-lg px-4 py-3 fw-medium"
              onClick={() => document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Saber Más
            </button>
          </div>

          {/* Estadísticas - más minimalistas */}
          <div className="row g-4 mt-5 pt-4 border-top">
            <div className="col-4 text-center">
              <div className="fw-bold fs-4 text-primary">500+</div>
              <div className="text-secondary small">Equipos</div>
            </div>
            <div className="col-4 text-center">
              <div className="fw-bold fs-4 text-primary">10k+</div>
              <div className="text-secondary small">Evaluaciones</div>
            </div>
            <div className="col-4 text-center">
              <div className="fw-bold fs-4 text-primary">98%</div>
              <div className="text-secondary small">Satisfacción</div>
            </div>
          </div>
        </div>

        {/* Columna del gráfico */}
        <div
          className="col-lg-5 text-center"
          data-aos="zoom-in"
          data-aos-delay="300"
          data-aos-duration="1000"
        >
          <div className="position-relative">
            {/* Imagen principal */}
            <div className="position-relative">
              <img
                src={graficoBarras}
                alt="Gráfico de barras"
                className="img-fluid rounded"
                style={{ maxHeight: '280px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
