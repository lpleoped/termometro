import { Document, Schema, model, Types } from 'mongoose';

export type TeamContextType = 'stable_fact' | 'team_role' | 'client_context' | 'priority' | 'constraint' | 'external_actor' | 'decision' | 'hypothesis' | 'learning';
export type TeamContextStatus = 'active' | 'review' | 'obsolete';
export type TeamContextScope = 'team' | 'project' | 'analysis';
export type TeamContextImportance = 'informative' | 'relevant' | 'critical';
export type TeamContextSensitivity = 'normal' | 'sensitive' | 'highly_sensitive';
export type TeamContextInfluence = 'interpretation' | 'risk' | 'action' | 'precondition' | 'group_action' | 'do_not_act_directly' | 'interpretation_and_action';

export interface ITeamContextItem extends Document {
  teamId: Types.ObjectId; type: TeamContextType; title: string; content: string; source?: string;
  scope: TeamContextScope; status: TeamContextStatus; confidence: number; importance: TeamContextImportance; sensitivity: TeamContextSensitivity; influence: TeamContextInfluence; validFrom?: Date; validUntil?: Date;
  createdBy: string; updatedBy: string; version: number; createdAt: Date; updatedAt: Date;
}

const schema = new Schema<ITeamContextItem>({
  teamId: { type: Schema.Types.ObjectId, ref: 'Equipo', required: true, index: true },
  type: { type: String, enum: ['stable_fact', 'team_role', 'client_context', 'priority', 'constraint', 'external_actor', 'decision', 'hypothesis', 'learning'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, required: true, trim: true, maxlength: 8000 },
  source: { type: String, trim: true, maxlength: 500 },
  scope: { type: String, enum: ['team', 'project', 'analysis'], default: 'team' },
  status: { type: String, enum: ['active', 'review', 'obsolete'], default: 'active' },
  confidence: { type: Number, min: 0, max: 1, default: 1 }, validFrom: Date, validUntil: Date,
  importance: { type: String, enum: ['informative', 'relevant', 'critical'], default: 'relevant' },
  sensitivity: { type: String, enum: ['normal', 'sensitive', 'highly_sensitive'], default: 'normal' },
  influence: { type: String, enum: ['interpretation', 'risk', 'action', 'precondition', 'group_action', 'do_not_act_directly', 'interpretation_and_action'], default: 'interpretation_and_action' },
  createdBy: { type: String, required: true }, updatedBy: { type: String, required: true }, version: { type: Number, default: 1, min: 1 },
}, { timestamps: true });

schema.index({ teamId: 1, status: 1, type: 1 });
export const TeamContextItem = model<ITeamContextItem>('TeamContextItem', schema);
