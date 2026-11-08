import type { DashboardEstadoActual } from '@termometro/shared';

export default function RespuestasCualitativas({ resumen }: { resumen: NonNullable<DashboardEstadoActual['cualitativo']> }) {
  return <details className="mt-4 rounded border p-4">
    <summary className="fw-bold">Respuestas cualitativas · {resumen.disponible ? `${resumen.respuestas} respuestas con texto` : 'Protegidas por anonimato'}</summary>
    <div className="pt-3">
      <p>Comentarios por pregunta. No tienen puntaje ni modifican el índice cuantitativo.</p>
      {!resumen.disponible ? <p className="mb-0">Se habilitan al alcanzar el mínimo de anonimato configurado.</p> : <>
        {resumen.grupos?.length ? resumen.grupos.map(grupo => <article key={grupo.id} className="border-top pt-3 mt-3">
          <p className="small text-muted mb-1">{grupo.seccion}</p><h3 className="h6">{grupo.pregunta}</h3>
          <p className="small">{grupo.comentarios.length} comentarios</p>
          {grupo.comentarios.map((texto, index) => <blockquote key={index} className="border-start border-3 ps-3 py-2 mb-3" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{texto}</blockquote>)}
        </article>) : <p className="mb-0">No hay comentarios abiertos registrados en esta ronda.</p>}
      </>}
    </div>
  </details>;
}
