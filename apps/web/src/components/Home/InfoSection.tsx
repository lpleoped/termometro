import resultsPreview from '../../assets/results.png'

export default function InfoSection() {
  return (
    <section id="info-section" className="container-fluid my-4" style={{ background: '#fff' }}>
      <div className="row align-items-start">
        <div className="col-md-6" data-aos="fade-right" data-aos-delay="100" data-aos-offset="200">
          <h3 className="fw-bold">Medir el clima organizacional</h3>
          <p className="text-muted">
            Evalúa periódicamente el ambiente laboral mediante encuestas personalizadas.
          </p>
        </div>

        <div className="col-md-6" data-aos="fade-left" data-aos-delay="200" data-aos-offset="200">
          <h3 className="fw-bold mt-4">Obtener información valiosa</h3>
          <p className="text-muted">
            Accede a los resultados y análisis para identificar áreas de mejora.
          </p>
        </div>
      </div>
      <div className="col-md-2" data-aos="fade-left" data-aos-delay="200" data-aos-offset="200">
        <img
          src={resultsPreview}
          width={500}
          className="mb-6"
          alt="Vista de resultados del Termómetro de Equipo"
        />
      </div>
    </section>
  )
}
