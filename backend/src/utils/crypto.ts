import crypto from 'crypto';
import { env } from '@config/env';

const ENCRYPTED_PREFIX = 'enc:v1';
const IV_LENGTH = 12;

function getKey(): Buffer {
  return crypto.createHash('sha256').update(env.FACE_DATA_SECRET).digest();
}

export function encryptText(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptText(value: string): string {
  if (!value.startsWith(`${ENCRYPTED_PREFIX}:`)) {
    return value;
  }

  const [, , ivB64, tagB64, encryptedB64] = value.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
