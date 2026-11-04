interface Props {
    secciones: { titulo: string; valor: number }[];
    indiceGlobal: number;
  }
  
  const DetalleTabla = ({ secciones, indiceGlobal }: Props) => {
    // Función para truncar texto largo
    const truncateText = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };
  
    // Función para obtener el color según el valor
    const getColorByValue = (valor: number) => {
      if (valor >= 80) return 'text-success'; // Verde - Excelente
      if (valor >= 60) return 'text-primary'; // Azul - Bueno
      if (valor >= 40) return 'text-warning'; // Amarillo - Regular
      return 'text-danger'; // Rojo - Crítico
    };
  
    // Función para obtener el color de fondo del indicador
    const getIndicatorColor = (valor: number) => {
      if (valor >= 80) return '#10b981'; // Verde
      if (valor >= 60) return '#3b82f6'; // Azul
      if (valor >= 40) return '#f59e0b'; // Amarillo
      return '#ef4444'; // Rojo
    };
  
    return (
      <div className="detalle-tabla card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <h6 className="mb-0 fw-semibold text-primary d-flex align-items-center gap-2">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
            </svg>
            Detalles por sección
          </h6>
        </div>
        
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="border-0 px-3 py-3 fw-semibold text-muted">
                    Sección
                  </th>
                  <th className="border-0 px-3 py-3 fw-semibold text-muted text-end">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {secciones.map((seccion, index) => (
                  <tr key={seccion.titulo} className="border-bottom">
                    <td className="px-3 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div 
                          className="seccion-indicator rounded-circle"
                          style={{ 
                            width: '8px', 
                            height: '8px',
                            backgroundColor: getIndicatorColor(seccion.valor)
                          }}
                        ></div>
                        <span 
                          className="fw-medium text-truncate"
                          title={seccion.titulo}
                          style={{ maxWidth: '200px' }}
                        >
                          {truncateText(seccion.titulo, 30)}
                        </span>
                      </div>
                    </td>
                    <td className={`px-3 py-3 text-end fw-bold ${getColorByValue(seccion.valor)}`}>
                      {seccion.valor} / 100
                    </td>
                  </tr>
                ))}
                
                {/* Fila del índice global */}
                <tr className="table-primary border-0">
                  <td className="px-3 py-3">
                    <div className="d-flex align-items-center gap-2">
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                      </svg>
                      <span className="fw-bold">Índice Global</span>
                    </div>
                  </td>
                  <td className={`px-3 py-3 text-end fw-bold ${getColorByValue(indiceGlobal)}`}>
                    {indiceGlobal} / 100
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  export default DetalleTabla;
  