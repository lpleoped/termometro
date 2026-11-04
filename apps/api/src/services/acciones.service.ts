import { AccionPlan } from '../models/AccionPlan';
import { generateAnalysis } from './ai-analysis.service';

export const agregarAccionPlan = async (instanciaId: string, descripcion: string, autor?: string) =>
  new AccionPlan({ instanciaEvaluacion: instanciaId, descripcion, autor }).save();

export const listarAccionesPorInstancia = async (instanciaId: string) =>
  AccionPlan.find({ instanciaEvaluacion: instanciaId }).sort({ creadaEn: -1 });

// Legacy callers also respect the central switch and default connection.
export const sugerirAccionesConIA = async (userId: string, instanciaId: string) => {
  const analysis = await generateAnalysis(userId, { instanciaId, includeHistorico: true });
  return analysis.recomendaciones.join('\n');
};
