import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

interface Punto {
  instanciaId: string;
  activadoEn: string;
  indiceGlobal: number;
}

interface Props {
  puntos: Punto[];
  instanciaId: string;
}

function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

const GraficoHistorico = ({ puntos, instanciaId }: Props) => {
  const chartData = {
    labels: puntos.map((punto) => fechaCorta(punto.activadoEn)),
    datasets: [
      {
        label: 'Índice',
        data: puntos.map((punto) => punto.indiceGlobal),
        fill: false,
        borderColor: '#0d6efd',
        tension: 0.3,
        pointRadius: puntos.map((punto) => (punto.instanciaId === instanciaId ? 7 : 4)),
        pointBackgroundColor: '#0d6efd',
        clip: 0 as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} / 100`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          color: '#6c757d',
          callback: (value: string | number) => `${value}`,
        },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: {
        ticks: { color: '#6c757d' },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };

  return (
    <div className="bg-white rounded-4 shadow-sm p-4" style={{ height: '360px' }}>
      <h3 className="h6 mb-3 text-muted">Índice de cada ronda</h3>
      <div style={{ height: '280px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default GraficoHistorico;
