import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Indicador {
  id: string;
  texto: string;
  valorPonderado: number;
}

interface Props {
  indicadores: Indicador[];
}

const IndicadoresBarChart = ({ indicadores }: Props) => {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Función para truncar texto largo
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Función para obtener color basado en el puntaje
  const getColorByScore = (score: number) => {
    if (score >= 80) return '#10b981'; // Verde - Excelente
    if (score >= 60) return '#3b82f6'; // Azul - Bueno
    if (score >= 40) return '#f59e0b'; // Amarillo - Regular
    return '#ef4444'; // Rojo - Crítico
  };

  // Determinar cuántos indicadores mostrar
  const visibleIndicadores = showAll ? indicadores : indicadores.slice(0, 8);
  const hasMore = indicadores.length > 8;

  const labels = visibleIndicadores.map(i => truncateText(i.texto, 25));
  const data = visibleIndicadores.map(i => i.valorPonderado);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Valor (%)',
        data,
        backgroundColor: visibleIndicadores.map(i => getColorByScore(i.valorPonderado)),
        borderColor: visibleIndicadores.map(i => getColorByScore(i.valorPonderado)),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  };

  const options: any = {
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          color: '#374151',
          font: {
            size: 11,
            weight: '600'
          }
        },
        grid: {
          color: '#d1d5db',
          drawBorder: false,
          lineWidth: 1
        }
      },
      y: {
        ticks: {
          color: '#1f2937',
          font: {
            size: 12,
            weight: '600'
          },
          callback: function(value: string | number) {
            const index = typeof value === 'number' ? value : parseInt(value as string, 10);
            const label = labels[index] || '';
            return truncateText(label, 20);
          }
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: { 
        display: false 
      },
      tooltip: {
        backgroundColor: '#374151',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#6b7280',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (ctx: any) => {
            const index = ctx[0].dataIndex;
            return visibleIndicadores[index].texto;
          },
          label: (ctx: any) => `Valor: ${ctx.raw}% (normalizado)`
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 10
      }
    }
  };

  return (
    <div className="indicadores-chart card border-0 shadow-sm" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
        <div>
          <h6 className="mb-0 fw-semibold text-primary d-flex align-items-center gap-2 section-title-print">
            Indicadores evaluados
          </h6>
          <small className="text-muted">
            {indicadores.length} indicadores analizados
          </small>
        </div>
        {hasMore && (
          <button
            className="btn btn-sm btn-outline-primary d-print-none"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Mostrar menos' : 'Ver todos'}
          </button>
        )}
      </div>
      <div className="card-body p-3">
        <div 
          className="chart-container" 
          style={{ 
            height: showAll ? '600px' : '400px', 
            position: 'relative',
            transition: 'height 0.3s ease',
            breakInside: 'avoid',
            pageBreakInside: 'avoid'
          }}
        >
          <Bar data={chartData} options={options} />
        </div>
        {/* Leyenda de indicadores expandible */}
        <div className="indicadores-leyenda mt-3" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0 fw-semibold text-muted section-title-print">Leyenda de indicadores</h6>
            {indicadores.length > 6 && (
              <button
                className="btn btn-sm btn-link text-primary p-0 d-print-none"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Ocultar' : 'Expandir'}
              </button>
            )}
          </div>
          <div className={`indicadores-grid ${expanded ? 'expanded' : ''}`}
            style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="row g-2">
              {indicadores.slice(0, expanded ? indicadores.length : 6).map((indicador, index) => (
                <div key={indicador.id} className="col-6 col-md-4">
                  <div className="d-flex align-items-center gap-2 p-2 rounded bg-light hover-lift" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                    <div 
                      className="indicador-color rounded-circle"
                      style={{ 
                        width: '8px', 
                        height: '8px',
                        backgroundColor: getColorByScore(indicador.valorPonderado)
                      }}
                    ></div>
                    <span className="small text-truncate" title={indicador.texto} style={{ maxWidth: 120, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {truncateText(indicador.texto, 20)}
                    </span>
                    <span className="badge bg-primary bg-opacity-10 text-primary small">
                      {indicador.valorPonderado}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!expanded && indicadores.length > 6 && (
            <div className="text-center mt-2">
              <small className="text-muted">
                +{indicadores.length - 6} indicadores más
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndicadoresBarChart;

