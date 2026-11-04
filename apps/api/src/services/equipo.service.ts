import { Equipo } from '../models/Equipo';

export const crearEquipoService = async ({
  nombre,
  descripcion,
  creadoPor,
}: {
  nombre: string;
  descripcion?: string;
  creadoPor: string;
}) => {
  const nuevoEquipo = new Equipo({ nombre, descripcion, creadoPor });
  await nuevoEquipo.save();
  return nuevoEquipo;
};

export const listarEquiposPorUsuarioService = async (usuarioId: string) => {
  return Equipo.find({ creadoPor: usuarioId });
};
