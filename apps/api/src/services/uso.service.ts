import type { MotivoUso, ResumenUso } from '@termometro/shared';
import { featureRepository } from '../repositories/feature.repository';
import { newFeature } from '../domain/feature-validation';
import { usoDe } from './ai-completion';

const MOTIVOS: MotivoUso[] = ['prueba', 'cuestionario', 'lectura', 'tono'];

export function periodoDe(valor: string | undefined, ahora = new Date()) {
  const pedido = valor && /^\d{4}-\d{2}$/.test(valor) ? valor : '';
  const year = pedido ? Number(pedido.slice(0, 4)) : ahora.getUTCFullYear();
  const month = pedido ? Number(pedido.slice(5, 7)) : ahora.getUTCMonth() + 1;
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || month < 1 || month > 12) throw new Error('Período inválido');
  const desde = new Date(Date.UTC(year, month - 1, 1));
  const hasta = new Date(Date.UTC(year, month, 1));
  return { desde, hasta, clave: `${year}-${String(month).padStart(2, '0')}` };
}

export async function anotarUso(userId: string, motivo: MotivoUso, modelo: string, valor: unknown) {
  const uso = usoDe(valor);
  await featureRepository('aiUsages').insert(newFeature('aiUsages', {
    userId,
    motivo,
    modelo: modelo.slice(0, 200),
    tokensEntrada: uso?.tokensEntrada ?? null,
    tokensSalida: uso?.tokensSalida ?? null,
    costoEstimado: uso?.costoEstimado ?? null,
    fecha: new Date(),
  }));
}

const suma = (valores: Array<number | null>) => valores.reduce<number>((total, valor) => total + (valor ?? 0), 0);

export async function resumirUso(userId: string, periodo?: string, ahora = new Date()): Promise<ResumenUso> {
  const ventana = periodoDe(periodo, ahora);
  const filas = await featureRepository('aiUsages').list({ userId }, { fecha: -1 });
  const delPeriodo = filas.filter((fila) => {
    const fecha = new Date(fila.fecha);
    return fecha >= ventana.desde && fecha < ventana.hasta;
  });
  const costos = delPeriodo.map((fila) => fila.costoEstimado).filter((valor): valor is number => typeof valor === 'number');
  const consultas = delPeriodo.map((fila) => ({
    id: fila._id,
    fecha: new Date(fila.fecha).toISOString(),
    motivo: fila.motivo,
    modelo: fila.modelo,
    tokensEntrada: fila.tokensEntrada,
    tokensSalida: fila.tokensSalida,
    costoEstimado: fila.costoEstimado,
  }));
  return {
    periodo: { desde: ventana.desde.toISOString(), hasta: ventana.hasta.toISOString() },
    totales: {
      consultas: consultas.length,
      tokensEntrada: suma(consultas.map((fila) => fila.tokensEntrada)),
      tokensSalida: suma(consultas.map((fila) => fila.tokensSalida)),
      costoEstimado: costos.length ? suma(costos) : null,
      consultasSinTokens: consultas.filter((fila) => fila.tokensEntrada == null && fila.tokensSalida == null).length,
    },
    porMotivo: MOTIVOS.map((motivo) => {
      const grupo = consultas.filter((fila) => fila.motivo === motivo);
      return { motivo, consultas: grupo.length, tokensEntrada: suma(grupo.map((fila) => fila.tokensEntrada)), tokensSalida: suma(grupo.map((fila) => fila.tokensSalida)) };
    }),
    consultas,
    nuncaConsulto: filas.length === 0,
  };
}
