import type { InstallationStatusResponse } from '@termometro/shared';
import { installationRepository } from '../repositories/installation.repository';
import { userRepository } from '../repositories/user.repository';
import { checksum } from '../domain/portable-backup';
import type { PortableSnapshot } from '../storage/storage';

export async function installationStatusService(): Promise<InstallationStatusResponse> {
  const repository = installationRepository();
  return { firstRun: repository.local && !await repository.hasData(), storage: repository.local ? 'json' : 'mongo' };
}

/** Backups are account-scoped and never contain portable API credentials. */
export async function exportBackupService(userId: string): Promise<PortableSnapshot> {
  if (!await userRepository().findById(userId)) throw new Error('Usuario no encontrado.');
  const snapshot = await installationRepository().exportOwned(userId);
  const rows = (name: keyof PortableSnapshot['collections']) => snapshot.collections[name].records as any[];
  const users = rows('usuarios').filter(row => String(row._id) === userId);
  const teams = rows('equipos').filter(row => String(row.creadoPor) === userId);
  const evaluations = rows('evaluaciones').filter(row => String(row.creadoPor) === userId);
  const teamIds = new Set(teams.map(row => String(row._id)));
  const evaluationIds = new Set(evaluations.map(row => String(row._id)));
  const rounds = rows('instancias').filter(row => evaluationIds.has(String(row.evaluacion)) && (!row.equipo || teamIds.has(String(row.equipo))));
  const roundIds = new Set(rounds.map(row => String(row._id)));
  const selected: Record<string, any[]> = {
    usuarios: users, equipos: teams, evaluaciones: evaluations, instancias: rounds,
    respuestas: rows('respuestas').filter(row => roundIds.has(String(row.instanciaEvaluacion))),
    accionesPlan: rows('accionesPlan').filter(row => roundIds.has(String(row.instanciaEvaluacion))),
    teamContextItems: rows('teamContextItems').filter(row => teamIds.has(String(row.teamId))),
    aiAnalyses: rows('aiAnalyses').filter(row => row.userId === userId && roundIds.has(String(row.instanciaId))),
    aiProviders: rows('aiProviders').filter(row => row.userId === userId).map(({ encryptedApiKey, ...row }) => ({ ...row, status: 'unverified', checkVersion: undefined })),
    aiSettings: rows('aiSettings').filter(row => row.userId === userId).map(row => ({ ...row, enabled: false })),
    integrationConnections: rows('integrationConnections').filter(row => row.userId === userId).map(row => ({ ...row, secret: '', status: 'invalid' })),
    teamIntegrationSettings: rows('teamIntegrationSettings').filter(row => row.userId === userId && teamIds.has(String(row.equipoId))),
  };
  for (const [name, collection] of Object.entries(snapshot.collections)) {
    collection.records = JSON.parse(JSON.stringify(selected[name]));
    snapshot.checksums[name as keyof PortableSnapshot['checksums']] = checksum(collection.records);
  }
  return snapshot;
}

export async function restoreBackupService(snapshot: unknown, userId?: string) {
  const repository = installationRepository();
  if (!repository.local) throw new Error('Restaurá el respaldo en la aplicación instalada. La web no se reemplaza desde aquí.');
  const hasData = await repository.hasData();
  if (hasData && (!userId || !await userRepository().findById(userId))) throw new Error('Iniciá sesión antes de restaurar.');
  if (hasData && await userRepository().count() > 1) throw new Error('Esta instalación contiene varias cuentas. Restaurá en una instalación vacía para no reemplazar datos de otras personas.');
  const preview = repository.preview(snapshot);
  if (preview.collections.usuarios < 1) throw new Error('El respaldo debe contener al menos una cuenta.');
  repository.restore(snapshot);
  return { restored: true, preview };
}
