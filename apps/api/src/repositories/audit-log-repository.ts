import type { ApplicationPool } from '@mysql-monitor/database';
import { newId, uuidToBin } from '../utils/ids.js';

export interface AuditLogInput {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async create(input: AuditLogInput): Promise<void> {
    await this.pool.execute(
      `INSERT INTO audit_logs
       (id, actor_user_id, action, entity_type, entity_id, request_id, ip_address, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [
        uuidToBin(newId()),
        input.actorUserId ? uuidToBin(input.actorUserId) : null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        input.requestId ?? null,
        input.ipAddress ?? null,
        JSON.stringify(input.metadata ?? {})
      ]
    );
  }
}
