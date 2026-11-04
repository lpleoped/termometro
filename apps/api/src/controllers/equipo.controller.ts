import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { agregarMiembroService, actualizarEquipoService, archivarEquipoService, crearEquipoService, listarEquiposPorUsuarioService, obtenerEquipoPorUsuarioService, quitarMiembroService } from '../services/equipo.service';

export const crearEquipo = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 100) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    }

    const equipo = await crearEquipoService({
      nombre: nombre.trim(),
      descripcion,
      creadoPor: req.user.id,
    });

    return res.status(201).json(equipo);
  } catch (error) {
    console.error('[crearEquipo]', error);
    return res.status(500).json({ error: 'No se pudo crear el equipo' });
  }
};

export const obtenerEquipo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });
    const equipo = await obtenerEquipoPorUsuarioService(String(req.params.equipoId), userId);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    return res.status(200).json(equipo);
  } catch (error) {
    return res.status(400).json({ error: 'Identificador de equipo inválido' });
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

export const actualizarEquipo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });
    if (nombre.length < 2 || nombre.length > 100) return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    const equipo = await actualizarEquipoService(String(req.params.equipoId), userId, { nombre, descripcion: req.body?.descripcion });
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    return res.status(200).json(equipo);
  } catch (error) {
    return res.status(400).json({ error: 'No se pudo actualizar el equipo' });
  }
};

export const archivarEquipo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });
    const equipo = await archivarEquipoService(String(req.params.equipoId), userId);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: 'No se pudo archivar el equipo' });
  }
};

const emailValido = (email: unknown): email is string => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const agregarMiembro = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });
    if (!emailValido(email)) return res.status(400).json({ error: 'Ingresá un email válido' });
    const equipo = await agregarMiembroService(String(req.params.equipoId), userId, email);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado o el miembro ya existe' });
    return res.status(200).json(equipo);
  } catch { return res.status(400).json({ error: 'No se pudo agregar el miembro' }); }
};

export const quitarMiembro = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const email = decodeURIComponent(String(req.params.email)).trim().toLowerCase();
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });
    const equipo = await quitarMiembroService(String(req.params.equipoId), userId, email);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    return res.status(200).json(equipo);
  } catch { return res.status(400).json({ error: 'No se pudo quitar el miembro' }); }
};
