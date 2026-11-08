import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PDFOptions {
  title: string;
  version: string;
  equipo: string;
  fecha: string;
  instanciaId: string;
}

export class PDFService {
  private static async captureElement(element: HTMLElement): Promise<HTMLCanvasElement> {
    // Forzar re-renderizado de gráficos antes de capturar
    const charts = element.querySelectorAll('canvas');
    charts.forEach(canvas => {
      const chart = (canvas as any).chart;
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });

    // Forzar fondo blanco en todos los canvas
    const canvases = element.querySelectorAll('canvas');
    canvases.forEach((canvas: any) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    });

    // Aplicar estilos adicionales para captura
    const originalStyles = new Map();
    const elementsToStyle = element.querySelectorAll('*');
    
    elementsToStyle.forEach(el => {
      const htmlEl = el as HTMLElement;
      originalStyles.set(htmlEl, {
        backgroundColor: htmlEl.style.backgroundColor,
        color: htmlEl.style.color,
        opacity: htmlEl.style.opacity
      });
      
      // Asegurar que no haya transparencias
      if (htmlEl.style.opacity && htmlEl.style.opacity !== '1') {
        htmlEl.style.opacity = '1';
      }
    });

    const canvas = await html2canvas(element, {
      allowTaint: true,
      useCORS: true,
      scale: window.devicePixelRatio * 2,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      foreignObjectRendering: false,
      removeContainer: true,
      onclone: (clonedDoc) => {
        // Asegurar que los estilos de impresión se apliquen en el clon
        const clonedElement = clonedDoc.querySelector('#estado-actual-print') as HTMLElement;
        if (clonedElement) {
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.color = '#000000';
          
          // Aplicar estilos sólidos a todos los elementos del clon
          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            // Asegurar fondos sólidos
            if (htmlEl.style.backgroundColor && (htmlEl.style.backgroundColor.includes('rgba') || htmlEl.style.backgroundColor === 'transparent' || htmlEl.style.backgroundColor === '')) {
              htmlEl.style.backgroundColor = '#ffffff';
            }
            // Asegurar colores sólidos
            if (htmlEl.style.color && htmlEl.style.color.includes('rgba')) {
              htmlEl.style.color = '#000000';
            }
            // Eliminar transparencias
            htmlEl.style.opacity = '1';
            // Asegurar que los gráficos tengan fondo blanco
            if (htmlEl.tagName === 'CANVAS') {
              htmlEl.style.backgroundColor = '#ffffff';
            }
          });
          // Forzar que los elementos ocultos para impresión se oculten
          const hiddenElements = clonedElement.querySelectorAll('.d-print-none');
          hiddenElements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
          // Asegurar que los elementos de impresión se muestren
          const printElements = clonedElement.querySelectorAll('.d-print-block');
          printElements.forEach(el => {
            (el as HTMLElement).style.display = 'block';
          });
        }
      }
    });

    // Restaurar estilos originales
    elementsToStyle.forEach(el => {
      const htmlEl = el as HTMLElement;
      const originalStyle = originalStyles.get(htmlEl);
      if (originalStyle) {
        htmlEl.style.backgroundColor = originalStyle.backgroundColor;
        htmlEl.style.color = originalStyle.color;
        htmlEl.style.opacity = originalStyle.opacity;
      }
    });

    return canvas;
  }

  private static async waitForCharts(): Promise<void> {
    // Esperar a que los gráficos se rendericen completamente
    return new Promise(resolve => {
      // Usar la función global de re-renderizado si está disponible
      if ((window as any).forceChartRerender) {
        (window as any).forceChartRerender();
      }
      // Esperar más tiempo para asegurar que Chart.js termine de renderizar
      setTimeout(() => {
        // Forzar un segundo re-renderizado
        if ((window as any).forceChartRerender) {
          (window as any).forceChartRerender();
        }
        resolve();
      }, 4000);
    });
  }

  static async generateDashboardPDF(
    printRef: React.RefObject<HTMLDivElement | null>,
    options: PDFOptions
  ): Promise<void> {
    if (!printRef.current) {
      console.error('No se encontró el elemento para imprimir');
      return;
    }

    try {
      // Mostrar indicador de carga
      this.showLoadingIndicator();

      // Aplicar clase para modo captura
      const element = printRef.current;
      element.classList.add('pdf-capture-mode');

      // Esperar a que los gráficos se rendericen
      await this.waitForCharts();

      // Capturar el contenido principal
      const canvas = await this.captureElement(element);
      
      // Remover clase de captura
      element.classList.remove('pdf-capture-mode');
      
      // Crear PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Agregar cabecera
      this.addHeader(pdf, options, pageWidth, margin);

      // Calcular dimensiones de la imagen
      const imgWidth = pageWidth - (2 * margin);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Si la imagen es muy alta, dividir en múltiples páginas
      let heightLeft = imgHeight;
      let position = margin + 40; // Espacio para la cabecera

      // Primera página
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        margin,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= (pageHeight - position - margin);

      // Páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          margin,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= (pageHeight - margin);
      }

      // Agregar pie de página
      this.addFooter(pdf, options, pageWidth, pageHeight);

      // Descargar PDF
      const fileName = `Termometro_${options.equipo}_${options.fecha.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

      // Ocultar indicador de carga
      this.hideLoadingIndicator();

    } catch (error) {
      console.error('Error al generar PDF:', error);
      // Asegurar que se remueva la clase en caso de error
      if (printRef.current) {
        printRef.current.classList.remove('pdf-capture-mode');
      }
      this.hideLoadingIndicator();
      this.showError('Error al generar el PDF. Intente nuevamente.');
    }
  }

  private static addHeader(pdf: jsPDF, options: PDFOptions, pageWidth: number, margin: number): void {
    // Logo (si está disponible)
    // pdf.addImage(logoDataUrl, 'PNG', margin, 10, 30, 15);

    // Título principal
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246); // Azul primario
  pdf.text('Termómetro', margin, 20);

    // Información de la evaluación
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(options.title, margin, 30);

    // Detalles
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128); // Gris
    pdf.text(`Versión: ${options.version}`, margin, 37);
    pdf.text(`Equipo: ${options.equipo}`, margin, 42);
    pdf.text(`Fecha: ${options.fecha}`, margin, 47);

    // Línea separadora
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 52, pageWidth - margin, 52);
  }

  private static addFooter(pdf: jsPDF, options: PDFOptions, pageWidth: number, pageHeight: number): void {
    const margin = 15;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(107, 114, 128);
    pdf.text(
  `Informe generado automáticamente por Termómetro | ${options.fecha}`,
      margin,
      pageHeight - 10
    );
  }

  private static showLoadingIndicator(): void {
    // Crear overlay de carga
    const overlay = document.createElement('div');
    overlay.id = 'pdf-loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    spinner.innerHTML = `
      <div class="spinner-border text-primary mb-3" role="status"></div>
      <p class="mb-0">Generando PDF...</p>
      <small class="text-muted">Esto puede tomar unos segundos</small>
    `;

    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
  }

  private static hideLoadingIndicator(): void {
    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  private static showError(message: string): void {
    // Crear notificación de error
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}
