import { Document, Schema, model } from 'mongoose';

export type AIProviderKind = 'openai-compatible' | 'azure-openai' | 'ollama';

export interface IAIProvider extends Document {
  userId: string;
  name: string;
  kind: AIProviderKind;
  endpoint: string;
  modelName: string;
  encryptedApiKey?: string;
  status: 'active' | 'invalid' | 'unverified';
  checkVersion?: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

const AIProviderSchema = new Schema<IAIProvider>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  kind: { type: String, enum: ['openai-compatible', 'azure-openai', 'ollama'], required: true },
  endpoint: { type: String, required: true, trim: true },
  modelName: { type: String, required: true, trim: true },
  encryptedApiKey: { type: String },
  status: { type: String, enum: ['active', 'invalid', 'unverified'], default: 'unverified' },
  checkVersion: { type: Number },
}, { timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } });

export const AIProvider = model<IAIProvider>('AIProvider', AIProviderSchema);
