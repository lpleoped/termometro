interface Punto {
  instanciaId: string;
  activadoEn: string;
  indiceGlobal: number;
  participacion: {
    esperada: number;
    recibida: number;
  };
}

interface Props {
  puntos: Punto[];
  instanciaId: string;
}

function fechaDe(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TablaHistorico = ({ puntos, instanciaId }: Props) => {
  return (
    <div className="bg-white rounded-4 shadow-sm p-4">
      <h3 className="h6 text-muted mb-3">Rondas de este cuestionario</h3>
      <div className="table-responsive">
        <table className="table table-bordered align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Fecha</th>
              <th>Índice</th>
              <th>Respondieron</th>
            </tr>
          </thead>
          <tbody>
            {puntos.map((punto) => {
              const esEsta = punto.instanciaId === instanciaId;
              return (
                <tr key={punto.instanciaId} className={esEsta ? 'table-primary' : undefined}>
                  <td>
                    {fechaDe(punto.activadoEn)}
                    {esEsta && <span className="ms-2 fw-semibold"> · Esta ronda</span>}
                  </td>
                  <td className="fw-bold">{punto.indiceGlobal} / 100</td>
                  <td>
                    {punto.participacion.recibida} de {punto.participacion.esperada}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaHistorico;
