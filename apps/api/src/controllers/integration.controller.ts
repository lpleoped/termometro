import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createConnection, deleteConnection, getTeamIntegrationSettings, listConnections, publishAction, saveTeamIntegrationSettings, testConnection } from '../services/integration.service';

const uid = (req: AuthRequest) => req.user?.id || '';
export const getConnections = async (req: AuthRequest, res: Response) => res.json(await listConnections(uid(req)));
export const postConnection = async (req: AuthRequest, res: Response) => { try { res.status(201).json(await createConnection(uid(req), req.body)); } catch (e: any) { res.status(400).json({ error: e.message }); } };
export const removeConnection = async (req: AuthRequest, res: Response) => { try { await deleteConnection(uid(req), String(req.params.id)); res.status(204).send(); } catch (e: any) { res.status(404).json({ error: e.message }); } };
export const checkConnection = async (req: AuthRequest, res: Response) => { try { res.json(await testConnection(uid(req), String(req.params.id))); } catch (e: any) { res.status(400).json({ error: e.message }); } };
export const postActionPublication = async (req: AuthRequest, res: Response) => { try { res.json(await publishAction(uid(req), String(req.params.actionId), String(req.body.connectionId))); } catch (e: any) { res.status(400).json({ error: e.message }); } };
export const getTeamSettings = async (req: AuthRequest, res: Response) => { try { res.json(await getTeamIntegrationSettings(uid(req), String(req.params.equipoId))); } catch (e: any) { res.status(404).json({ error: e.message }); } };
export const putTeamSettings = async (req: AuthRequest, res: Response) => { try { res.json(await saveTeamIntegrationSettings(uid(req), String(req.params.equipoId), req.body)); } catch (e: any) { res.status(400).json({ error: e.message }); } };
