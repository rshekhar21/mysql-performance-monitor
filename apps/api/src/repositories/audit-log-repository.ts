import type { ApplicationPool } from '@mysql-monitor/database';
import type { RowDataPacket } from 'mysql2';
import type { AuditLogSummary } from '@mysql-monitor/types';
import { binToUuid, newId, uuidToBin } from '../utils/ids.js';

interface AuditLogRow extends RowDataPacket {
  id: Buffer;
  actor_user_id: Buffer | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  request_id: string | null;
  ip_address: string | null;
  created_at: Date;
}

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

  async list(limit = 100): Promise<AuditLogSummary[]> {
    const [rows] = await this.pool.execute<AuditLogRow[]>(
      `SELECT a.id, a.actor_user_id, u.email AS actor_email, a.action, a.entity_type,
              a.entity_id, a.request_id, a.ip_address, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map((row) => ({
      id: binToUuid(row.id),
      actorUserId: row.actor_user_id ? binToUuid(row.actor_user_id) : null,
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      requestId: row.request_id,
      ipAddress: row.ip_address,
      createdAt: row.created_at.toISOString()
    }));
  }

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
