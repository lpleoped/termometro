import { teamRepository } from '../repositories/team.repository';

export const crearEquipoService = async ({
  nombre,
  descripcion,
  creadoPor,
}: {
  nombre: string;
  descripcion?: string;
  creadoPor: string;
}) => {
  return teamRepository().insert({ nombre, descripcion, creadoPor });
};

export const listarEquiposPorUsuarioService = async (usuarioId: string) => {
  return teamRepository().listActiveByOwner(usuarioId);
};

export const obtenerEquipoPorUsuarioService = async (equipoId: string, usuarioId: string) => {
  return teamRepository().findOwned(equipoId, usuarioId);
};

export const actualizarEquipoService = async (equipoId: string, usuarioId: string, cambios: { nombre?: string; descripcion?: string }) => {
  return teamRepository().updateOwnedActive(equipoId, usuarioId, cambios);
};

export const archivarEquipoService = async (equipoId: string, usuarioId: string) => {
  return teamRepository().archiveOwnedActive(equipoId, usuarioId);
};

export const agregarMiembroService = async (equipoId: string, usuarioId: string, email: string) => {
  return teamRepository().addMemberOwnedActive(equipoId, usuarioId, email);
};

export const quitarMiembroService = async (equipoId: string, usuarioId: string, email: string) => {
  return teamRepository().removeMemberOwnedActive(equipoId, usuarioId, email);
};
