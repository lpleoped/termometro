export default function InfoSection() {
  const steps = [
    ['01', 'Diseña la evaluación', 'Crea preguntas alineadas con el momento y las necesidades de tu equipo.'],
    ['02', 'Escucha las respuestas', 'Comparte la evaluación y reúne señales de forma clara y respetuosa.'],
    ['03', 'Decide el siguiente paso', 'Consulta el análisis de tu equipo y convierte los hallazgos en acciones.'],
  ];

  return (
    <section id="info-section" className="container-fluid my-4" style={{ background: '#fff' }}>
      <div className="text-center mb-5">
        <span className="text-primary fw-semibold text-uppercase small">Cómo funciona</span>
        <h2 className="fw-bold mt-2">Una conversación con datos reales</h2>
        <p className="text-muted mx-auto" style={{ maxWidth: '620px' }}>
          Termómetro acompaña a tu equipo desde la encuesta hasta las decisiones de mejora,
          sin llenar la pantalla con números que todavía no existen.
        </p>
      </div>

      <div className="row g-4">
        {steps.map(([number, title, description], index) => (
          <div className="col-md-4" data-aos="fade-up" data-aos-delay={100 * (index + 1)} key={number}>
            <article className="h-100 border rounded-4 p-4 bg-light">
              <div className="text-primary fw-bold fs-4 mb-3">{number}</div>
              <h3 className="h5 fw-bold">{title}</h3>
              <p className="text-muted mb-0">{description}</p>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
