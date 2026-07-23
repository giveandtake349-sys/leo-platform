import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.AES_KEY;
  if (!hex || hex.length !== 64) {
    // In dev without AES_KEY, use a deterministic fallback
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function hashForLookup(value: string): string {
  const key = getKey();
  return createHmac('sha256', key)
    .update(value.toLowerCase().trim())
    .digest('hex');
}
