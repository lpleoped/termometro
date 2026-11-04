import { Request, Response } from 'express';
import {
  registrarUsuarioService,
  loginUsuarioService,
  obtenerPerfilService,
} from '../services/auth.service';
import type { AuthRequest } from '../middleware/auth.middleware';

export const registrarUsuario = async (req: Request, res: Response): Promise<Response> => {
  try {
    const usuario = await registrarUsuarioService(req.body);
    return res.status(201).json(usuario);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const loginUsuario = async (req: Request, res: Response): Promise<Response> => {
  try {
    const token = await loginUsuarioService(req.body);
    return res.status(200).json({ token });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
};

export const obtenerPerfil = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const perfil = await obtenerPerfilService(req);
    return res.status(200).json(perfil);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
