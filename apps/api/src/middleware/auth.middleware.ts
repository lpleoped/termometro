import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET no está configurado de forma segura');
  return secret;
};

export interface AuthRequest extends Request {
  user?: { id: string; nombre?: string; rol?: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No se proporcionó token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string;
      nombre?: string;
      rol?: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Token inválido o expirado' });
  }
};
