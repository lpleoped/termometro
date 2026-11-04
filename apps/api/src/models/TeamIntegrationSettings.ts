import { Schema, model, Document } from 'mongoose';

export interface ITeamIntegrationSettings extends Document {
  userId: string;
  equipoId: string;
  slackConnectionId?: string;
  mondayConnectionId?: string;
  mondayBoardId?: string;
}

const schema = new Schema<ITeamIntegrationSettings>({
  userId: { type: String, required: true, index: true }, equipoId: { type: String, required: true, index: true },
  slackConnectionId: String, mondayConnectionId: String, mondayBoardId: String,
}, { timestamps: true });
schema.index({ userId: 1, equipoId: 1 }, { unique: true });
export const TeamIntegrationSettings = model<ITeamIntegrationSettings>('TeamIntegrationSettings', schema);
