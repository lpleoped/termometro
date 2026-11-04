import { Schema, model, Document } from 'mongoose';

export type IntegrationProvider = 'slack' | 'monday';

export interface IIntegrationConnection extends Document {
  userId: string;
  provider: IntegrationProvider;
  name: string;
  status: 'active' | 'invalid';
  secret: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IIntegrationConnection>({
  userId: { type: String, required: true, index: true },
  provider: { type: String, enum: ['slack', 'monday'], required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  status: { type: String, enum: ['active', 'invalid'], default: 'active' },
  // MVP: encrypted at rest when INTEGRATION_ENCRYPTION_KEY is configured.
  secret: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

schema.index({ userId: 1, provider: 1 });
export const IntegrationConnection = model<IIntegrationConnection>('IntegrationConnection', schema);
