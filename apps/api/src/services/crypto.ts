// apps/api/src/services/crypto.ts
// AES-256-GCM token encryption/decryption
// Tokens are ONLY decrypted inside workers — never in the API request handler
// Key format: 32-byte base64 string (from ENCRYPTION_KEY env var)
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit nonce (NIST recommended for GCM)
const TAG_LENGTH = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const key = process.env['ENCRYPTION_KEY'];
  if (!key) throw new Error('ENCRYPTION_KEY is not set');
  const buf = Buffer.from(key, 'base64');
  if (buf.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes; got ${buf.length}`);
  }
  return buf;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a base64 string: iv(12) + tag(16) + ciphertext, all concatenated.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Envelope: iv | tag | ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a base64 AES-256-GCM envelope produced by encrypt().
 * Throws on authentication failure (tampered ciphertext).
 */
export function decrypt(cipher: string): string {
  const key = getKey();
  const buf = Buffer.from(cipher, 'base64');

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
