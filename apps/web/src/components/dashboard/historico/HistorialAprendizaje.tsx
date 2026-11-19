import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AIAnalysisResponse, HistoricoSeguimiento } from '@termometro/shared';
import { elegirContraste } from '../../../domain/contraste-analisis';
import SeguimientoAccion from '../plan/SeguimientoAccion';

const date = (value?: string) => value ? new Date(value).toLocaleString('es-UY') : 'Fecha no registrada';
const label = (analysis: AIAnalysisResponse) => `${date(analysis.creadoEn)} · ${analysis.snapshot?.indiceGlobal ?? 'sin índice'} / 100 · ${analysis.metadata?.modelName || 'modelo no registrado'}`;

function AnalysisSnapshot({ analysis }: { analysis: AIAnalysisResponse }) {
  return <article className="border rounded p-3 h-100">
    <p className="small text-muted">{label(analysis)}</p><p>{analysis.resumen}</p>
    {(['fortalezas', 'alertas', 'recomendaciones'] as const).map((field, index) => <div key={field}><h4 className="h6">{['Fortalezas', 'Alertas', 'Propuestas'][index]}</h4><ul>{(analysis[field] || []).map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}
    {!!analysis.accionesContextuales?.length && <details><summary>Acciones propuestas en este análisis</summary><ul>{analysis.accionesContextuales.map((action, i) => <li key={i}><strong>{action.titulo}:</strong> {action.descripcion} Métrica: {action.successMetric}</li>)}</ul></details>}
    {!!analysis.limitations?.length && <details className="mt-2"><summary>Limitaciones del análisis</summary><ul>{analysis.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
    {!analysis.snapshot && <p className="small text-muted">Análisis anterior al registro de métricas: no se reconstruye su índice con datos actuales.</p>}
  </article>;
}

function mismaMedicion(antes?: AIAnalysisResponse, despues?: AIAnalysisResponse): boolean {
  return !!antes && !!despues && !!antes.instanciaId && antes.instanciaId === despues.instanciaId;
}

export default function HistorialAprendizaje({ rondas, instanciaId }: { rondas: HistoricoSeguimiento[]; instanciaId: string }) {
  const [referenciaId, setReferenciaId] = useState('');
  const [lecturaId, setLecturaId] = useState('');
  const { hayRondaAnterior, lectura, referencia, versiones, opciones } = elegirContraste(rondas, instanciaId, lecturaId, referenciaId);
  const mostrarPar = hayRondaAnterior && !!lectura && !!referencia && lectura.id !== referencia.id;
  const mismaRonda = mismaMedicion(referencia, lectura);
  return <section aria-labelledby="historial-aprendizaje">
    <h3 id="historial-aprendizaje" className="h4">Análisis, acciones y aprendizajes</h3>
    <p>{opciones.length > 0 && !hayRondaAnterior
      ? 'Todavía no hay una ronda anterior con análisis para contrastar. El histórico conserva esta lectura para la medición siguiente.'
      : 'Contrastá las interpretaciones de IA con lo que se aplicó y los resultados registrados. El histórico conserva todas las versiones de análisis.'}</p>
    {opciones.length === 0 ? <p className="text-muted">Todavía no hay análisis de IA guardados para estas rondas.</p> : <>
      {hayRondaAnterior ? <div className="row g-3 mb-3">
        <label className="col-md-6 form-label">Análisis de referencia<select className="form-select" value={referencia?.id || ''} onChange={e => setReferenciaId(e.target.value)}>{opciones.map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
        <label className="col-md-6 form-label">Análisis a contrastar<select className="form-select" value={lectura?.id || ''} onChange={e => setLecturaId(e.target.value)}>{opciones.map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
      </div> : versiones.length > 1 && <>
        <label className="form-label">Versión guardada<select className="form-select" value={lectura?.id || ''} onChange={e => setLecturaId(e.target.value)}>{versiones.map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
        <p className="form-text">Hay {versiones.length} versiones de esta ronda. Una diferencia de redacción no muestra un cambio del equipo.</p>
      </>}
      {mostrarPar && <div className="alert alert-info">
        {mismaRonda
          ? <p className="mb-0">Las dos versiones son de la misma ronda. Una diferencia de redacción no muestra un cambio del equipo.</p>
          : <>
            {referencia.snapshot?.indiceGlobal != null && lectura.snapshot?.indiceGlobal != null && <p className="mb-1">Cambio entre los datos guardados: {Math.round((lectura.snapshot.indiceGlobal - referencia.snapshot.indiceGlobal) * 100) / 100} puntos ({referencia.snapshot.indiceGlobal} → {lectura.snapshot.indiceGlobal}).</p>}
            {referencia.metadata?.datasetHash === lectura.metadata?.datasetHash && <p className="mb-1">Ambos análisis usaron el mismo contexto: una diferencia de redacción no demuestra un cambio en el equipo.</p>}
            <p className="mb-0">Compará también participación, fechas y acciones aplicadas. Que una alerta no se repita no significa que esté resuelta.</p>
          </>}
      </div>}
      <div className="row g-3 mb-4">{mostrarPar && <div className="col-lg-6"><AnalysisSnapshot analysis={referencia} /></div>}{lectura && <div className={mostrarPar ? 'col-lg-6' : 'col-12'}><AnalysisSnapshot analysis={lectura} /></div>}</div>
    </>}
    <div className="d-grid gap-3">{[...rondas].reverse().map(round => <details className="border rounded p-3" key={round.instanciaId} open={round.instanciaId === instanciaId}>
      <summary className="fw-semibold">Ronda del {date(round.activadoEn)} · {round.analisis.length} análisis · {round.acciones.length} acciones</summary>
      <p className="small mt-3">Índice actual de esta ronda: {round.indiceGlobal ?? 'sin datos cuantitativos'} · Participación: {round.participacion.recibida} de {round.participacion.esperada}.</p>
      {round.acciones.length ? <div className="d-grid gap-2">{round.acciones.map(action => <SeguimientoAccion key={action._id} accion={action} readOnly />)}</div> : <p className="text-muted">No se registraron acciones para esta ronda.</p>}
      <Link className="btn btn-sm btn-outline-primary mt-3" to={`/backoffice/dashboard?instanciaId=${round.instanciaId}`}>Abrir ronda para registrar seguimiento o ajustar acciones</Link>
    </details>)}</div>
  </section>;
}
