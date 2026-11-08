import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AIAnalysisResponse, HistoricoSeguimiento } from '@termometro/shared';
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

export default function HistorialAprendizaje({ rondas, instanciaId }: { rondas: HistoricoSeguimiento[]; instanciaId: string }) {
  const analyses = rondas.flatMap(round => round.analisis).sort((a, b) => (a.creadoEn || '').localeCompare(b.creadoEn || '') || a.id.localeCompare(b.id));
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');
  const after = analyses.find(item => item.id === afterId) || analyses.filter(item => item.instanciaId === instanciaId).at(-1) || analyses.at(-1);
  const afterIndex = analyses.findIndex(item => item.id === after?.id);
  const before = analyses.find(item => item.id === beforeId) || analyses[Math.max(0, afterIndex - 1)];
  return <section aria-labelledby="historial-aprendizaje">
    <h3 id="historial-aprendizaje" className="h4">Análisis, acciones y aprendizajes</h3>
    <p>Contrastá las interpretaciones de IA con lo que se aplicó y los resultados registrados. El histórico conserva todas las versiones de análisis.</p>
    {analyses.length === 0 ? <p className="text-muted">Todavía no hay análisis de IA guardados para estas rondas.</p> : <>
      <div className="row g-3 mb-3">
        <label className="col-md-6 form-label">Análisis de referencia<select className="form-select" value={before?.id || ''} onChange={e => setBeforeId(e.target.value)}>{analyses.map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
        <label className="col-md-6 form-label">Análisis a contrastar<select className="form-select" value={after?.id || ''} onChange={e => setAfterId(e.target.value)}>{analyses.map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
      </div>
      {before && after && before.id !== after.id && <div className="alert alert-info">
        {before.snapshot?.indiceGlobal != null && after.snapshot?.indiceGlobal != null && <p className="mb-1">Cambio entre los datos guardados: {Math.round((after.snapshot.indiceGlobal - before.snapshot.indiceGlobal) * 100) / 100} puntos ({before.snapshot.indiceGlobal} → {after.snapshot.indiceGlobal}).</p>}
        {before.metadata?.datasetHash === after.metadata?.datasetHash && <p className="mb-1">Ambos análisis usaron el mismo contexto: una diferencia de redacción no demuestra un cambio en el equipo.</p>}
        <p className="mb-0">Compará también participación, fechas y acciones aplicadas. Que una alerta no se repita no significa que esté resuelta.</p>
      </div>}
      <div className="row g-3 mb-4">{before && before.id !== after?.id && <div className="col-lg-6"><AnalysisSnapshot analysis={before} /></div>}{after && <div className={before?.id !== after.id ? 'col-lg-6' : 'col-12'}><AnalysisSnapshot analysis={after} /></div>}</div>
    </>}
    <div className="d-grid gap-3">{[...rondas].reverse().map(round => <details className="border rounded p-3" key={round.instanciaId} open={round.instanciaId === instanciaId}>
      <summary className="fw-semibold">Ronda del {date(round.activadoEn)} · {round.analisis.length} análisis · {round.acciones.length} acciones</summary>
      <p className="small mt-3">Índice actual de esta ronda: {round.indiceGlobal ?? 'sin datos cuantitativos'} · Participación: {round.participacion.recibida} de {round.participacion.esperada}.</p>
      {round.acciones.length ? <div className="d-grid gap-2">{round.acciones.map(action => <SeguimientoAccion key={action._id} accion={action} readOnly />)}</div> : <p className="text-muted">No se registraron acciones para esta ronda.</p>}
      <Link className="btn btn-sm btn-outline-primary mt-3" to={`/backoffice/dashboard?instanciaId=${round.instanciaId}`}>Abrir ronda para registrar seguimiento o ajustar acciones</Link>
    </details>)}</div>
  </section>;
}
