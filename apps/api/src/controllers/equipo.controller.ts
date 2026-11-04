import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { crearEquipoService, listarEquiposPorUsuarioService } from '../services/equipo.service';

export const crearEquipo = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const equipo = await crearEquipoService({
      nombre,
      descripcion,
      creadoPor: req.user.id,
    });

    return res.status(201).json(equipo);
  } catch (error) {
    console.error('[crearEquipo]', error);
    return res.status(500).json({ error: 'No se pudo crear el equipo' });
  }
};

export const listarEquipos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const equipos = await listarEquiposPorUsuarioService(userId);
    return res.status(200).json(equipos);
  } catch (error) {
    console.error('[listarEquipos]', error);
    return res.status(500).json({ error: 'No se pudieron obtener los equipos' });
  }
};
