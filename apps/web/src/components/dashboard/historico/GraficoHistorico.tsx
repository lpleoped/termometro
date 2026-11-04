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
        borderColor: '#226069',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: puntos.map((punto) => (punto.instanciaId === instanciaId ? 6 : 4)),
        pointBackgroundColor: '#226069',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
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
        grid: { color: '#e8eeee' },
      },
      x: {
        ticks: { color: '#6c757d' },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="history-chart p-4" style={{ height: '360px' }}>
      <h3 className="h6 mb-3">Evolución del índice <span className="text-muted fw-normal">· escala 0–100</span></h3>
      <div style={{ height: '280px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default GraficoHistorico;
