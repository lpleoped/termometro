import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AISettings } from '@termometro/shared';
import useIA from '../../../hooks/useIA';
import { getIASettings, iaMessage } from '../../../services/iaSettingsService';
import QualitativeInsights from './QualitativeInsights';

interface Props { instanciaId: string; }

function AnalysisContent({ instanciaId }: Props) {
  const { loading, error, analysis, generateAnalysis, loadLatestAnalysis } = useIA();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [message, setMessage] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getIASettings().then(value => { if (!cancelled) setSettings(value); }).catch(e => { if (!cancelled) setMessage(iaMessage(e)); });
    loadLatestAnalysis(instanciaId).catch(e => { if (!cancelled) setMessage(iaMessage(e)); });
    return () => { cancelled = true; };
  }, [instanciaId, loadLatestAnalysis]);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const generate = async () => {
    setMessage('');
    try { await generateAnalysis({ instanciaId, includeHistorico: true }); }
    catch { /* The hook exposes the server's actionable error. */ }
    finally { getIASettings().then(setSettings).catch(e => setMessage(iaMessage(e))); }
  };

  return <section className="ia-card" aria-labelledby="analysis-title">
    <h2 id="analysis-title">Interpretar esta ronda</h2>
    <p>Contrasta los indicadores y comentarios agregados con análisis anteriores, acciones aplicadas y resultados de seguimiento para ajustar las próximas propuestas.</p>
    {message && <div className="ia-notice ia-notice-error" role="alert">{message}</div>}
    {error && <div className="ia-notice ia-notice-error" role="alert">{error}</div>}
    {settings && !settings.enabled && <div className="ia-notice"><strong>La IA está apagada.</strong><p className="mb-2">Podés consultar resultados anteriores. Para generar uno nuevo, activá la IA en la configuración general.</p><Link to="/backoffice/configuracion/ia">Abrir configuración general →</Link></div>}
    {settings?.enabled && <p className="ia-footnote mb-3">IA activada · Usa tu conexión predeterminada. Generar realiza una consulta al proveedor.</p>}
    {!settings && !message && <p role="status">Consultando disponibilidad de IA…</p>}
    <button className="btn btn-primary" disabled={!settings?.enabled || !settings.defaultProviderId || loading} onClick={generate}>{loading ? 'Generando análisis…' : analysis ? 'Generar nuevo análisis' : 'Generar análisis'}</button>
    {loading && <p className="mt-3" role="status">{elapsed < 30 ? 'El modelo está preparando el análisis.' : 'El modelo sigue trabajando. La solicitud continúa hasta un máximo de 2 minutos.'} <span aria-hidden="true">({elapsed} s)</span></p>}
    {analysis && <div className="mt-4">
      <p className="ia-eyebrow">ÚLTIMO ANÁLISIS GUARDADO</p><h3>Resumen general</h3><p>{analysis.resumen}</p>
      <div className="row g-3">{(['fortalezas', 'alertas', 'recomendaciones'] as const).map((field, index) => <div className="col-md-4" key={field}><h3>{['Fortalezas', 'Alertas', 'Recomendaciones'][index]}</h3><ul>{analysis[field].map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}</div>
      {analysis.hallazgos?.length > 0 && <details className="ia-qualitative-details mt-3"><summary>Ver hallazgos trazables</summary><div className="ia-details-content"><ul>{analysis.hallazgos.map((item, i) => <li key={i}><strong>{item.titulo}</strong> · {item.tipo} · severidad {item.severidad} · evidencia: {item.evidenciaIds.join(', ')}</li>)}</ul></div></details>}
      {!!analysis.accionesContextuales?.length && <div className="ia-context-used mt-3"><strong>Acciones para revisar</strong><ul>{analysis.accionesContextuales.map((item, i) => <li key={i}><strong>{item.titulo}</strong> · responsable: {item.ownerRole} · horizonte: {item.horizon} · métrica: {item.successMetric} · seguimiento: {item.checkInQuestion}</li>)}</ul></div>}
      <p className="ia-footnote">Sugerencias generadas con IA. Revisalas con el equipo antes de decidir acciones.</p>
      {analysis.fuentes?.length > 0 && <details className="ia-qualitative-details mt-3"><summary>Ver base del análisis</summary><div className="ia-details-content"><p>La IA utilizó estas señales e información:</p><ul className="mb-0">{analysis.fuentes.map((fuente, i) => <li key={i}>{fuente}</li>)}</ul></div></details>}
      {analysis.contextoUtilizado && <details className="ia-qualitative-details mt-3"><summary>Ver contexto considerado</summary><div className="ia-details-content"><ul>{analysis.contextoUtilizado.map((item, i) => <li key={i}>{item}</li>)}</ul>{analysis.contextoOmitido ? <small>{analysis.contextoOmitido} elemento(s) quedaron fuera por los límites del análisis.</small> : <small>El análisis usó solo el contexto seleccionado como relevante.</small>}</div></details>}
      <Link className="btn btn-outline-primary mt-3" to={'/backoffice/dashboard?instanciaId=' + instanciaId}>Volver al equipo y registrar una acción</Link>
      <Link className="btn btn-outline-secondary mt-3 ms-2" to={`/backoffice/dashboard?instanciaId=${instanciaId}&vista=historico`}>Comparar análisis y acciones en el histórico</Link>
      <details className="ia-qualitative-details mt-4"><summary>Explorar el análisis cualitativo</summary><div className="ia-details-content"><QualitativeInsights analysis={analysis} /></div></details>
    </div>}
  </section>;
}

export default function IAAnalysisPanel(props: Props) {
  return <AnalysisContent key={props.instanciaId} {...props} />;
}
