import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const algorithm = 'aes-256-gcm';

function deriveKey(rawKey: string): Buffer {
  return createHash('sha256').update(rawKey).digest();
}

export interface EncryptedSecret {
  encrypted: Buffer;
  keyId: string;
}

export function encryptSecret(secret: string, rawKey: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, deriveKey(rawKey), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: Buffer.concat([iv, tag, encrypted]),
    keyId: 'default'
  };
}

export function decryptSecret(encryptedSecret: Buffer, rawKey: string): string {
  const iv = encryptedSecret.subarray(0, 12);
  const tag = encryptedSecret.subarray(12, 28);
  const encrypted = encryptedSecret.subarray(28);
  const decipher = createDecipheriv(algorithm, deriveKey(rawKey), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
