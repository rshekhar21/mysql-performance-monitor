import type { RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import type { AppSettingSummary } from '@mysql-monitor/types';

interface SettingRow extends RowDataPacket {
  setting_key: string;
  setting_value: string | Record<string, unknown> | unknown[];
  updated_at: Date;
}

export class SettingsRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async list(): Promise<AppSettingSummary[]> {
    const [rows] = await this.pool.execute<SettingRow[]>(
      `SELECT setting_key, setting_value, updated_at
       FROM app_settings
       ORDER BY setting_key ASC`
    );

    return rows.map((row) => ({
      key: row.setting_key,
      value: parseJsonValue(row.setting_value),
      updatedAt: row.updated_at.toISOString()
    }));
  }
}

function parseJsonValue(value: SettingRow['setting_value']): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
