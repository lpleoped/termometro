import { Link } from 'react-router-dom'
import { TEMAS, type TemaAyuda } from '../ayuda/temas'
import './InfoAyuda.css'

export default function InfoAyuda({ tema }: { tema: TemaAyuda }) {
  const item = TEMAS.find((entrada) => entrada.tema === tema)
  if (!item) return null

  return (
    <Link
      className="info-ayuda"
      to={`/ayuda/${item.tema}`}
      data-ayuda={item.frase}
      aria-label={`Ayuda: ${item.titulo}. ${item.frase}`}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.25" />
        <path d="M10 9.15v5.1" />
        <circle className="info-ayuda-punto" cx="10" cy="6.15" r="0.85" />
      </svg>
    </Link>
  )
}
