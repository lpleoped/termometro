import { useEffect } from 'react';

const useChartPrintFix = () => {
  useEffect(() => {
    const handleBeforePrint = () => {
      // Forzar re-renderizado de todos los gráficos antes de imprimir
      const charts = document.querySelectorAll('canvas');
      charts.forEach(canvas => {
        const chart = (canvas as any).chart;
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      });
    };

    const handleAfterPrint = () => {
      // Restaurar gráficos después de imprimir
      const charts = document.querySelectorAll('canvas');
      charts.forEach(canvas => {
        const chart = (canvas as any).chart;
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      });
    };

    // Agregar listeners para impresión
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    // Función para forzar re-renderizado de gráficos
    const forceChartRerender = () => {
      const charts = document.querySelectorAll('canvas');
      charts.forEach(canvas => {
        const chart = (canvas as any).chart;
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      });
    };

    // Exponer función globalmente para uso en PDF
    (window as any).forceChartRerender = forceChartRerender;

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      delete (window as any).forceChartRerender;
    };
  }, []);
};

export default useChartPrintFix; 