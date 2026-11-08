import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';
import { userRepository } from '../repositories/user.repository';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET no está configurado de forma segura');
  return secret;
};
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

const validatePassword = (password: string) => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new Error('La contraseña es demasiado larga');
  }
};

export const registrarUsuarioService = async ({
  nombre,
  email,
  password,
}: {
  nombre: string;
  email: string;
  password: string;
}) => {
  validatePassword(password);
  
  const repository = userRepository();
  const normalizedEmail = email.trim().toLowerCase();
  const existente = await repository.findByEmail(normalizedEmail);
  if (existente) {
    throw new Error('No se pudo completar el registro');
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const nuevoUsuario = await repository.insert({ nombre, email: normalizedEmail, password: hash });

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
  const usuario = await userRepository().findByEmail(email);
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
  const usuario = await userRepository().findById(userId);
  if (!usuario) throw new Error('Usuario no encontrado');
  const { password: _password, ...perfil } = usuario;
  return perfil;
};
