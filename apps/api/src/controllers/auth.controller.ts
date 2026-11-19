import { Request, Response } from 'express';
import {
  registrarUsuarioService,
  loginUsuarioService,
  obtenerPerfilService,
} from '../services/auth.service';
import type { AuthRequest } from '../middleware/auth.middleware';
import { registrarError } from '../observability/errores';
import { log } from '../observability/logger';

export const registrarUsuario = async (req: Request, res: Response): Promise<Response> => {
  try {
    const usuario = await registrarUsuarioService(req.body);
    log.info('autenticacion', 'Registro aceptado.', { contexto: { userId: String(usuario.usuario.id) } });
    return res.status(201).json(usuario);
  } catch (error: any) {
    registrarError('autenticacion', error, { accion: 'registro' });
    return res.status(400).json({ error: error.message });
  }
};

export const loginUsuario = async (req: Request, res: Response): Promise<Response> => {
  try {
    const token = await loginUsuarioService(req.body);
    log.info('autenticacion', 'Inicio de sesión aceptado.');
    return res.status(200).json({ token });
  } catch (error: any) {
    registrarError('autenticacion', error, { accion: 'login' });
    return res.status(401).json({ error: error.message });
  }
};

export const obtenerPerfil = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const perfil = await obtenerPerfilService(req);
    return res.status(200).json(perfil);
  } catch (error: any) {
    registrarError('autenticacion', error, { accion: 'perfil' });
    return res.status(400).json({ error: error.message });
  }
};
