import { Request, Response } from 'express';
import { crearRespuestaService } from '../services/respuesta.service';

export const crearRespuesta = async (req: Request, res: Response): Promise<Response> => {
  try {
    const resultado = await crearRespuestaService(req.body);
    return res.status(201).json(resultado);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error al crear respuesta' });
  }
};
