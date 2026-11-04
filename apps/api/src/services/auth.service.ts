import { Usuario } from '../models/Usuario';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET no está configurado de forma segura');
  return secret;
};
const SALT_ROUNDS = 10;

export const registrarUsuarioService = async ({
  nombre,
  email,
  password,
}: {
  nombre: string;
  email: string;
  password: string;
}) => {
  const existente = await Usuario.findOne({ email });
  if (existente) {
    throw new Error('El correo ya está registrado.');
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const nuevoUsuario = new Usuario({ nombre, email, password: hash });
  await nuevoUsuario.save();

  const token = jwt.sign({ id: nuevoUsuario._id }, getJwtSecret(), { expiresIn: '7d' });

  return {
    token,
    usuario: {
      id: nuevoUsuario._id,
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
    },
  };
};

export const loginUsuarioService = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const usuario = await Usuario.findOne({ email });
  if (!usuario) {
    throw new Error('Credenciales inválidas.');
  }

  const valid = await bcrypt.compare(password, usuario.password);
  if (!valid) {
    throw new Error('Credenciales inválidas.');
  }

  return jwt.sign({ id: usuario._id }, getJwtSecret(), { expiresIn: '7d' });
};

export const obtenerPerfilService = async (req: AuthRequest) => {
  const userId = req.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  const usuario = await Usuario.findById(userId).select('-password');
  if (!usuario) throw new Error('Usuario no encontrado');

  return usuario;
};
