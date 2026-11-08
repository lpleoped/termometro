import { useEffect, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import type { IndicadorResultado, SeccionResultado } from '@termometro/shared';
import type { Evaluacion } from '../../../services/evaluacionService';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export interface IndicadorClima {
  id: string;
  texto: string;
  valor: number;
  direccion?: 'positiva' | 'negativa';
  n: number;
  calidad?: IndicadorResultado['calidad'];
}

export interface SeccionClima {
  titulo: string;
  valor: number;
  indicadores: IndicadorClima[];
  n: number;
  calidad?: SeccionResultado['calidad'];
}

export function agruparIndicadores(
  secciones: SeccionResultado[],
  indicadores: IndicadorResultado[],
  evaluacion: Evaluacion,
): SeccionClima[] {
  const porId = new Map(indicadores.map((indicador) => [indicador.id, indicador]));
  const porTitulo = new Map(secciones.map((seccion) => [seccion.titulo, seccion]));

  return evaluacion.secciones.filter(seccion => seccion.indicadores.some(indicador => indicador.tipo === 'cuantitativo')).map((seccion) => {
    const resultado = porTitulo.get(seccion.titulo);
    return {
      titulo: seccion.titulo,
      valor: resultado?.valor ?? 0,
      n: resultado?.n ?? 0,
      calidad: resultado?.calidad,
    indicadores: (seccion.indicadores ?? []).filter((indicador) => indicador.tipo !== 'cualitativo').map((indicador) => {
        const calculado = porId.get(indicador.id);
        return {
          id: indicador.id,
          texto: calculado?.texto || indicador.texto,
          valor: calculado?.valorPonderado ?? 0,
          direccion: calculado?.direccion,
          n: calculado?.n ?? 0,
          calidad: calculado?.calidad,
        };
      }),
    };
  });
}

function colorDe(valor: number): string {
  if (valor >= 80) return '#10b981';
  if (valor >= 60) return '#3b82f6';
  if (valor >= 40) return '#f59e0b';
  return '#ef4444';
}

function indiceMenor(secciones: SeccionClima[]): number {
  return secciones.reduce(
    (menor, seccion, index) => (seccion.valor < secciones[menor].valor ? index : menor),
    0,
  );
}

function Arana({
  nombres,
  valores,
  alElegir,
  altura,
}: {
  nombres: string[];
  valores: number[];
  alElegir?: (index: number) => void;
  altura: number;
}) {
  const etiquetasCortas = nombres.map((nombre, index) => {
    const limpio = nombre.trim();
    if (limpio.length <= 24) return `${index + 1}. ${limpio}`;
    return `${index + 1}. ${limpio.slice(0, 21)}…`;
  });
  const data = {
    labels: etiquetasCortas,
    datasets: [
      {
        label: 'Valores',
        data: valores,
        backgroundColor: 'rgba(34, 96, 105, 0.12)',
        borderColor: '#226069',
        borderWidth: 2,
        pointBackgroundColor: '#226069',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_evento, elementos) => {
      const index = elementos[0]?.index;
      if (index !== undefined) alElegir?.(index);
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
          color: '#66777a',
          callback: (value) => String(value),
        },
        pointLabels: {
          font: { size: 12, weight: 600 },
          color: '#1f2937',
          padding: 8,
        },
        grid: { color: '#e3eaeb' },
        angleLines: { color: '#e3eaeb' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<'radar'>[]) => nombres[items[0]?.dataIndex ?? 0] ?? '',
          label: (item: TooltipItem<'radar'>) => `${item.raw} / 100`,
        },
      },
    },
  };

  return (
      <div className="climate-chart" style={{ height: altura }}>
      <Radar data={data} options={options} />
    </div>
  );
}

function BarrasIndicadores({ filas, muestraHeterogenea }: { filas: IndicadorClima[]; muestraHeterogenea: boolean }) {
  return (
    <div className="climate-indicator-bars" aria-label="Resultados por indicador">
      {filas.map((fila, index) => (
        <div className="climate-indicator-bar" key={`${index}-${fila.id}`}>
          <div className="d-flex justify-content-between gap-3 mb-1">
            <span className="climate-indicator-bar-label"><strong>{index + 1}.</strong> {fila.texto}</span>
            <span className="text-nowrap fw-semibold">{fila.valor} / 100</span>
          </div>
          <div className="climate-score-track" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(100, fila.valor))}%`, backgroundColor: colorDe(fila.valor) }} />
          </div>
          {muestraHeterogenea && (
            <small className="climate-indicator-sample text-muted">
              {fila.n} {fila.n === 1 ? 'respuesta válida' : 'respuestas válidas'}
            </small>
          )}
          <small className="text-muted">n={fila.n}{fila.calidad?.techoPiso ? ` · ${fila.calidad.techoPiso}` : ''}</small>
        </div>
      ))}
    </div>
  );
}

interface Props {
  secciones: SeccionClima[];
  hayRespuestas: boolean;
}

const FormaDelClima = ({ secciones, hayRespuestas }: Props) => {
  const firma = secciones.map((seccion) => `${seccion.titulo}:${seccion.valor}`).join('|');
  const [elegida, setElegida] = useState(() => (secciones.length ? indiceMenor(secciones) : 0));

  useEffect(() => {
    if (secciones.length === 0) return;
    setElegida(indiceMenor(secciones));
  }, [firma, secciones]);

  if (!hayRespuestas) {
    return (
      <section className="climate-distribution" aria-label="Cómo se reparte el clima">
        <h3 className="h5 fw-bold mb-3">Cómo se reparte el clima</h3>
        <p className="mb-0">Cuando respondan, vas a ver cómo se reparte el clima.</p>
      </section>
    );
  }

  if (secciones.length === 0) return null;

  const indice = elegida >= 0 && elegida < secciones.length ? elegida : 0;
  const seccion = secciones[indice];
  const mostrarAranaSecciones = secciones.length >= 3;
  const muestraHeterogenea = new Set(seccion.indicadores.map((item) => item.n)).size > 1;

  return (
    <section className="climate-distribution" aria-label="Cómo se reparte el clima">
      <h3 className="h5 fw-bold mb-3">Cómo se reparte el clima</h3>
      <p className="climate-intro">Elegí una sección para ver el detalle. El puntaje expresa una condición favorable: más cerca de 100 es mejor y más cerca de 0 requiere atención. Las preguntas abiertas se analizan por separado.</p>
      <div className="row g-4 align-items-center">
        {mostrarAranaSecciones && (
          <div className="col-lg-6">
            <Arana
              nombres={secciones.map((item) => item.titulo)}
              valores={secciones.map((item) => item.valor)}
              alElegir={setElegida}
              altura={360}
            />
          </div>
        )}
        <div className={mostrarAranaSecciones ? 'col-lg-6' : 'col-12'}>
          <div className="d-flex flex-column gap-2">
            {secciones.map((item, index) => {
              const activa = index === indice;
              return (
                <button
                  key={`${index}-${item.titulo}`}
                  type="button"
                  className={`climate-section-choice btn text-start d-flex gap-3 align-items-start p-2 ${activa ? 'is-selected' : ''}`}
                  aria-pressed={activa}
                  onClick={() => setElegida(index)}
                >
                  <span className="fw-bold climate-number" style={{ color: colorDe(item.valor) }}>
                    {index + 1}
                  </span>
                  <span className="flex-grow-1 climate-label">
                    {item.titulo}<small className="d-block text-muted">n={item.n}{item.calidad?.techoPiso ? ` · ${item.calidad.techoPiso}` : ''}</small>
                    <span className="climate-score-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, item.valor))}%` }} /></span>
                  </span>
                  <span className="fw-semibold text-nowrap">{item.valor} / 100</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="climate-detail mt-4">
        <h4 className="h6 fw-bold mb-3">Preguntas de {seccion.titulo}</h4>
        <BarrasIndicadores filas={seccion.indicadores} muestraHeterogenea={muestraHeterogenea} />
      </div>
    </section>
  );
};

export default FormaDelClima;
