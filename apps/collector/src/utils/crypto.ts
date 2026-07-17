import { createDecipheriv, createHash } from 'node:crypto';

const algorithm = 'aes-256-gcm';

function deriveKey(rawKey: string): Buffer {
  return createHash('sha256').update(rawKey).digest();
}

export function decryptSecret(encryptedSecret: Buffer, rawKey: string): string {
  const iv = encryptedSecret.subarray(0, 12);
  const tag = encryptedSecret.subarray(12, 28);
  const encrypted = encryptedSecret.subarray(28);
  const decipher = createDecipheriv(algorithm, deriveKey(rawKey), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
