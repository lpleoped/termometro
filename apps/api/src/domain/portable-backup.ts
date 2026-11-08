import crypto from 'node:crypto';
export const checksum = (value: unknown) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
