import resultados from '../../assets/results.png'

export default function SurveyResultPreview() {
  return (
    <div
      className="container-fluid text-center my-6"
      style={{ background: '#fff' }}
      data-aos="fade-up"
      data-aos-delay="200"
      data-aos-duration="1000"
    >
      <img
        src={resultados}
        alt="Resultados de la Encuesta"
        className="img-fluid rounded"
        style={{ maxWidth: '600px' }}
      />
    </div>
  )
}
