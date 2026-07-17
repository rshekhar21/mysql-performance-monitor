import { randomUUID } from 'node:crypto';

export function newId(): string {
  return randomUUID();
}

export function uuidToBin(id: string): Buffer {
  return Buffer.from(id.replaceAll('-', ''), 'hex');
}

export function binToUuid(value: Buffer): string {
  const hex = value.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join('-');
}
