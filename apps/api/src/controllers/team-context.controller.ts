import { Response } from 'express';
import { validRecordId } from '../domain/feature-records';
import { AuthRequest } from '../middleware/auth.middleware';
import { createTeamContext, deleteTeamContext, listTeamContext, updateTeamContext } from '../services/team-context.service';

const userId = (req: AuthRequest) => req.user?.id || '';
const types = ['stable_fact', 'team_role', 'client_context', 'priority', 'constraint', 'external_actor', 'decision', 'hypothesis', 'learning'];
const statuses = ['active', 'review', 'obsolete']; const scopes = ['team', 'project', 'analysis'];
const importances = ['informative', 'relevant', 'critical']; const sensitivities = ['normal', 'sensitive', 'highly_sensitive'];
const influences = ['interpretation', 'risk', 'action', 'precondition', 'group_action', 'do_not_act_directly', 'interpretation_and_action'];
const validate = (body: any, partial = false) => {
  if (!partial && (!types.includes(body.type) || typeof body.title !== 'string' || typeof body.content !== 'string')) return 'type, title y content son obligatorios';
  if (body.type !== undefined && !types.includes(body.type)) return 'Tipo de contexto inválido';
  if (body.status !== undefined && !statuses.includes(body.status)) return 'Estado de contexto inválido';
  if (body.scope !== undefined && !scopes.includes(body.scope)) return 'Alcance de contexto inválido';
  if (body.importance !== undefined && !importances.includes(body.importance)) return 'Importancia de contexto inválida';
  if (body.sensitivity !== undefined && !sensitivities.includes(body.sensitivity)) return 'Sensibilidad de contexto inválida';
  if (body.influence !== undefined && !influences.includes(body.influence)) return 'Influencia de contexto inválida';
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.length > 160)) return 'El título debe tener entre 2 y 160 caracteres';
  if (body.content !== undefined && (typeof body.content !== 'string' || body.content.trim().length < 2 || body.content.length > 8000)) return 'El contenido debe tener entre 2 y 8000 caracteres';
  if (body.confidence !== undefined && (typeof body.confidence !== 'number' || body.confidence < 0 || body.confidence > 1)) return 'La confianza debe estar entre 0 y 1';
  for (const field of ['validFrom', 'validUntil']) if (body[field] !== undefined && (typeof body[field] !== 'string' || Number.isNaN(Date.parse(body[field])))) return `${field} debe ser una fecha válida`;
  if (body.validFrom && body.validUntil && new Date(body.validFrom) > new Date(body.validUntil)) return 'validFrom no puede ser posterior a validUntil';
  return null;
};
const dto = (row: any) => ({ ...row, id: String(row._id), teamId: String(row.teamId) });
const validId = (value: string) => validRecordId(value);

const invalidPath = (req: AuthRequest) => !validId(String(req.params.equipoId)) || (req.params.itemId !== undefined && !validId(String(req.params.itemId)));
export const getTeamContext = async (req: AuthRequest, res: Response) => { if (invalidPath(req)) return res.status(400).json({ error: 'Identificador inválido' }); const result = await listTeamContext(String(req.params.equipoId), userId(req)); if (!result) return res.status(404).json({ error: 'Equipo no encontrado' }); return res.json(result.map(dto)); };
export const postTeamContext = async (req: AuthRequest, res: Response) => { if (invalidPath(req)) return res.status(400).json({ error: 'Identificador inválido' }); const error = validate(req.body); if (error) return res.status(400).json({ error }); const result = await createTeamContext(String(req.params.equipoId), userId(req), req.body); if (!result) return res.status(404).json({ error: 'Equipo no encontrado' }); return res.status(201).json(dto(result)); };
export const patchTeamContext = async (req: AuthRequest, res: Response) => { if (invalidPath(req)) return res.status(400).json({ error: 'Identificador inválido' }); const error = validate(req.body, true); if (error) return res.status(400).json({ error }); const result = await updateTeamContext(String(req.params.equipoId), String(req.params.itemId), userId(req), req.body); if (!result) return res.status(404).json({ error: 'Contexto no encontrado' }); return res.json(dto(result)); };
export const removeTeamContext = async (req: AuthRequest, res: Response) => { if (invalidPath(req)) return res.status(400).json({ error: 'Identificador inválido' }); const result = await deleteTeamContext(String(req.params.equipoId), String(req.params.itemId), userId(req)); if (!result) return res.status(404).json({ error: 'Contexto no encontrado' }); return res.json(dto(result)); };
