import { Schema, model } from 'mongoose';

const schema = new Schema({
  userId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  defaultProviderId: { type: String, default: null },
}, { timestamps: true });

export const AISettingsModel = model('AISettings', schema);
