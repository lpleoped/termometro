import type { TonoAgregado, TramoTono } from '@termometro/shared';
import InfoAyuda from '../../InfoAyuda';

const TRAMO: Record<TramoTono, { nombre: string; color: string }> = {
  alivio: { nombre: 'Alivio', color: '#2f7d4a' },
  mezcla: { nombre: 'Mezcla', color: '#b58105' },
  tension: { nombre: 'Tensión', color: '#a33b3b' },
};
const MARCA: Record<string, string> = { positiva: '#2f7d4a', negativa: '#a33b3b', mixta: '#b58105' };
const ETIQUETA: Record<string, string> = {
  confianza: 'confianza', pertenencia: 'pertenencia', energia: 'energía', seguridad: 'seguridad',
  frustracion: 'frustración', reconocimiento: 'reconocimiento', incertidumbre: 'incertidumbre', tension: 'tensión',
};

function Figura({ tono }: { tono: TonoAgregado }) {
  const tramos = (['alivio', 'mezcla', 'tension'] as const).map((clave) => ({ clave, ...TRAMO[clave], valor: tono.proporcion[clave] }));
  return (
    <section aria-labelledby="tono-escrito">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h3 id="tono-escrito" className="h5 mb-0">Tono de lo escrito</h3>
        <InfoAyuda tema="lo-escrito" />
      </div>
      <p className="small text-muted mb-3">Señal agregada de lo escrito. No diagnostica emociones.</p>
      <p className="mb-3">{tono.oracion}</p>
      <div className="d-flex rounded overflow-hidden" style={{ height: 18 }} role="img" aria-label={tramos.map((tramo) => `${tramo.nombre} ${Math.round(tramo.valor * 100)} por ciento`).join(', ')}>
        {tramos.map((tramo) => <span key={tramo.clave} style={{ width: `${tramo.valor * 100}%`, background: tramo.color }} />)}
      </div>
      <ul className="list-unstyled d-flex flex-wrap gap-3 small mt-2 mb-3">
        {tramos.map((tramo) => <li key={tramo.clave}><span aria-hidden="true" style={{ color: tramo.color }}>●</span> {tramo.nombre} {Math.round(tramo.valor * 100)}%</li>)}
      </ul>
      {tono.marcas.length > 0 && (
        <ul className="list-unstyled d-flex flex-wrap align-items-end gap-3 mb-3" aria-label="Marcas del conjunto">
          {tono.marcas.map((marca) => (
            <li key={marca.etiqueta} style={{ color: MARCA[marca.direccion], fontSize: `${0.85 + marca.intensidad * 0.9}rem`, fontWeight: 600 }}>
              {ETIQUETA[marca.etiqueta] || marca.etiqueta}
            </li>
          ))}
        </ul>
      )}
      <p className="small text-muted mb-2" aria-label={`${tono.frases.length} frases, sin el texto`}>
        <span aria-hidden="true">{tono.frases.map((frase) => <span key={frase.evidenciaId} style={{ color: TRAMO[frase.direccion].color, marginRight: 4 }}>●</span>)}</span>
        {tono.frases.length} frases, sin citas.
      </p>
      <details>
        <summary>Temas para conversar</summary>
        {tono.temas.length === 0 ? <p className="small mt-2 mb-0">No hay un tema distinto del enunciado.</p> : (
          <ul className="mt-2 mb-0">{tono.temas.map((tema) => <li key={tema.tema}><strong>{tema.tema}.</strong> {tema.interpretacion}</li>)}</ul>
        )}
      </details>
    </section>
  );
}

export default function TonoEscrito({ textos, tono }: { textos: number; tono?: TonoAgregado | null }) {
  if (textos < 3) return <p className="mt-4 mb-0">Todavía no hay suficiente texto para leer un tono.</p>;
  if (!tono) return <p className="mt-4 mb-0">El tono se ve cuando la lectura de esta ronda está lista.</p>;
  return <div className="mt-4 rounded border p-4"><Figura tono={tono} /></div>;
}
