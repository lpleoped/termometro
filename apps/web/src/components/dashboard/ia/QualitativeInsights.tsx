import type { AIAnalysisResponse } from '@termometro/shared';

interface Props {
  analysis: Pick<AIAnalysisResponse, 'senalesEmocionales' | 'temasRecurrentes'>;
}

const directionLabel: Record<string, string> = {
  positiva: 'positiva',
  negativa: 'negativa',
  mixta: 'mixta',
  neutral: 'neutral',
};

export default function QualitativeInsights({ analysis }: Props) {
  const emotions = [...(analysis.senalesEmocionales || [])].sort((a, b) => b.intensidad - a.intensidad);
  const themes = [...(analysis.temasRecurrentes || [])].sort((a, b) => b.frecuencia - a.frecuencia);
  const topEmotion = emotions[0];
  const topTheme = themes[0];
  const maxFrequency = Math.max(...themes.map(theme => theme.frecuencia), 1);

  return (
    <section className="ia-qualitative" aria-labelledby="qualitative-title">
      <div className="ia-qualitative-heading">
        <div>
          <p className="ia-eyebrow mb-1">LECTURA CUALITATIVA</p>
          <h3 id="qualitative-title">Lo que aparece en los comentarios</h3>
          <p className="mb-0">Resumen agregado de temas repetidos y señales de tono expresadas por el equipo.</p>
        </div>
        <span className="ia-private-badge" aria-label="El detalle está cerrado inicialmente">Detalle cerrado</span>
      </div>

      <div className="ia-qualitative-summary" aria-label="Resumen cualitativo">
        <article>
          <span className="ia-summary-label">Señal principal</span>
          <strong>{topEmotion?.etiqueta || 'Sin señal suficiente'}</strong>
          <small>{topEmotion ? `${Math.round(topEmotion.intensidad * 100)}% de intensidad · dirección ${directionLabel[topEmotion.direccion] || topEmotion.direccion}` : 'Se necesitan más comentarios'}</small>
        </article>
        <article>
          <span className="ia-summary-label">Tema más repetido</span>
          <strong>{topTheme?.tema || 'Sin tema suficiente'}</strong>
          <small>{topTheme ? `${topTheme.frecuencia} respuestas lo mencionan` : 'Se necesitan más coincidencias'}</small>
        </article>
        <article>
          <span className="ia-summary-label">Lectura para conversar</span>
          <strong>{emotions.length || themes.length ? 'Hay señales para revisar' : 'No hay señales agregadas'}</strong>
          <small>Validar siempre con el equipo antes de tomar decisiones.</small>
        </article>
      </div>

      <div className="ia-qualitative-charts">
        <article className="ia-mini-chart">
          <h4>Emociones expresadas</h4>
          {emotions.length ? emotions.map((emotion, index) => (
            <div className="ia-bar-row" key={`${emotion.etiqueta}-${index}`}>
              <div className="ia-bar-label"><span>{emotion.etiqueta}</span><span>{Math.round(emotion.intensidad * 100)}%</span></div>
              <div className="ia-bar-track" aria-label={`${emotion.etiqueta}: ${Math.round(emotion.intensidad * 100)}%`}><span className={`ia-bar-fill is-${emotion.direccion}`} style={{ width: `${Math.max(4, Math.round(emotion.intensidad * 100))}%` }} /></div>
            </div>
          )) : <p className="ia-empty-chart">No se detectaron señales suficientes.</p>}
        </article>
        <article className="ia-mini-chart">
          <h4>Temas recurrentes</h4>
          {themes.length ? themes.slice(0, 5).map((theme, index) => (
            <div className="ia-bar-row" key={`${theme.tema}-${index}`}>
              <div className="ia-bar-label"><span>{theme.tema}</span><span>{theme.frecuencia}</span></div>
              <div className="ia-bar-track" aria-label={`${theme.tema}: ${theme.frecuencia} respuestas`}><span className="ia-bar-fill is-theme" style={{ width: `${Math.max(8, Math.round(theme.frecuencia / maxFrequency * 100))}%` }} /></div>
            </div>
          )) : <p className="ia-empty-chart">No se detectaron temas repetidos.</p>}
        </article>
      </div>

      <details className="ia-qualitative-details">
        <summary>Ver detalle cualitativo y evidencias</summary>
        <div className="ia-details-content">
          {!!themes.length && <div><h4>Temas y lectura</h4><ul>{themes.map((theme, index) => <li key={`${theme.tema}-detail-${index}`}><strong>{theme.tema}</strong> · {theme.frecuencia} respuestas · {theme.interpretacion}</li>)}</ul></div>}
          {!!emotions.length && <div><h4>Señales emocionales</h4><ul>{emotions.map((emotion, index) => <li key={`${emotion.etiqueta}-detail-${index}`}><strong>{emotion.etiqueta}</strong> · {emotion.interpretacion} · confianza {Math.round(emotion.confianza * 100)}%</li>)}</ul></div>}
          <p className="ia-footnote">El detalle es agregado y no muestra comentarios individuales ni identifica participantes.</p>
        </div>
      </details>
    </section>
  );
}
