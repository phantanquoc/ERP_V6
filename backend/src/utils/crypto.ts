import crypto from 'crypto';
import { env } from '@config/env';

const PREFIX_V1 = 'enc:v1';
const PREFIX_V2 = 'enc:v2';
const IV_LENGTH = 12;

// v1: legacy sha256(secret) — kept for decrypt compat only
function getKeyV1(): Buffer {
  return crypto.createHash('sha256').update(env.FACE_DATA_SECRET).digest();
}

// v2: HKDF with fixed salt/info — stronger KDF than raw hash
function getKeyV2(): Buffer {
  const ikm = env.FACE_DATA_SECRET;
  const salt = 'erp-face-v1';
  const info = '';
  // Node >= 15 has hkdfSync
  const hkdfSync = (crypto as unknown as { hkdfSync?: (...a: unknown[]) => Buffer }).hkdfSync;
  if (typeof hkdfSync === 'function') {
    return hkdfSync('sha256', ikm, salt, info, 32) as Buffer;
  }
  // Fallback for older Node: HMAC(salt, ikm) — not HKDF but stronger than sha256(ikm) alone
  return crypto.createHmac('sha256', salt).update(ikm).digest();
}

export function encryptText(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKeyV2(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX_V2}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptText(value: string): string {
  const isV1 = value.startsWith(`${PREFIX_V1}:`);
  const isV2 = value.startsWith(`${PREFIX_V2}:`);
  if (!isV1 && !isV2) return value;

  const key = isV2 ? getKeyV2() : getKeyV1();
  const [, , ivB64, tagB64, encryptedB64] = value.split(':');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    // Backward compat: data encrypted with v1 but caller tried v2 key (or vice versa
    // during rollout where DB has mixed rows). Try the other key once.
    const fallbackKey = isV2 ? getKeyV1() : getKeyV2();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      fallbackKey,
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
