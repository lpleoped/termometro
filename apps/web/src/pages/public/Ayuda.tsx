import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice'
import { useRecorridoEncabezado } from '../../components/useRecorridoEncabezado'
import { useAuth } from '../../context/AuthContext'
import { destinoAlVolver } from '../../domain/pasosEncabezado'
import { TEMAS } from '../../ayuda/temas'
import './Ayuda.css'

export { TEMAS, type TemaAyuda } from '../../ayuda/temas'

const archivos = import.meta.glob('../../ayuda/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function textoDe(tema: string): string | undefined {
  const clave = Object.keys(archivos).find((ruta) => ruta.endsWith(`/${tema}.md`))
  return clave ? archivos[clave] : undefined
}

function origenDe(state: unknown): unknown {
  if (!state || typeof state !== 'object' || !('from' in state)) return undefined
  return (state as { from?: unknown }).from
}

export default function Ayuda() {
  const { tema } = useParams()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const recorrido = useRecorridoEncabezado()
  const texto = tema ? textoDe(tema) : undefined
  if (tema && texto === undefined) return <Navigate to="/ayuda" state={location.state} replace />
  const destino = destinoAlVolver({
    autenticado: isAuthenticated,
    from: origenDe(location.state),
    paso: recorrido.listo ? recorrido.paso : null,
    equipoId: recorrido.equipoId,
  })

  const cuerpo = (
    <>
    <div className="ayuda-volver-fila">
      <Link className="ayuda-volver" to={destino}>Volver</Link>
    </div>
    <div className="ayuda-cuerpo">
        <nav className="ayuda-indice" aria-label="Temas de la ayuda">
          <p className="ayuda-indice-titulo">Temas</p>
          <ul>
            {TEMAS.map((item) => (
              <li key={item.tema}>
                <Link
                  to={`/ayuda/${item.tema}`}
                  aria-current={tema === item.tema ? 'page' : undefined}
                >
                  {item.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="ayuda-prosa">
          {texto ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  href?.startsWith('/')
                    ? <Link to={href}>{children}</Link>
                    : <a href={href}>{children}</a>
                ),
              }}
            >
              {texto}
            </ReactMarkdown>
          ) : (
            <>
              <h1>Ayuda</h1>
              <p>Elegí un tema para ver qué hace esa parte y en base a qué lo hace.</p>
              <ul className="ayuda-mapa">
                {TEMAS.map((item) => (
                  <li key={item.tema}>
                    <Link to={`/ayuda/${item.tema}`}>{item.titulo}</Link>
                    <span>{item.frase}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
    </div>
    </>
  )

  if (isAuthenticated) {
    return <LayoutBackoffice><div className="ayuda ayuda-en-app">{cuerpo}</div></LayoutBackoffice>
  }

  return (
    <div className="ayuda">
      <header className="ayuda-barra">
        <Link to="/">Termómetro de Equipo</Link>
        <span aria-hidden="true">·</span>
        <Link to="/ayuda">Ayuda</Link>
      </header>
      {cuerpo}
    </div>
  )
}
