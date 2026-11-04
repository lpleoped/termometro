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
  return Equipo.find({ creadoPor: usuarioId, activo: { $ne: false } });
};

export const obtenerEquipoPorUsuarioService = async (equipoId: string, usuarioId: string) => {
  return Equipo.findOne({ _id: equipoId, creadoPor: usuarioId });
};

export const actualizarEquipoService = async (equipoId: string, usuarioId: string, cambios: { nombre?: string; descripcion?: string }) => {
  return Equipo.findOneAndUpdate({ _id: equipoId, creadoPor: usuarioId, activo: { $ne: false } }, cambios, { new: true, runValidators: true });
};

export const archivarEquipoService = async (equipoId: string, usuarioId: string) => {
  return Equipo.findOneAndUpdate({ _id: equipoId, creadoPor: usuarioId, activo: { $ne: false } }, { activo: false }, { new: true });
};

export const agregarMiembroService = async (equipoId: string, usuarioId: string, email: string) => {
  return Equipo.findOneAndUpdate(
    { _id: equipoId, creadoPor: usuarioId, activo: { $ne: false }, miembros: { $ne: email } },
    { $push: { miembros: email } },
    { new: true },
  );
};

export const quitarMiembroService = async (equipoId: string, usuarioId: string, email: string) => {
  return Equipo.findOneAndUpdate(
    { _id: equipoId, creadoPor: usuarioId, activo: { $ne: false } },
    { $pull: { miembros: email } },
    { new: true },
  );
};
