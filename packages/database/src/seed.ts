import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2';
import { createApplicationPool } from './pool.js';

const databaseUrl = process.env.APP_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('APP_DATABASE_URL is required to run seeds');
}

function uuidToBin(id: string): Buffer {
  return Buffer.from(id.replaceAll('-', ''), 'hex');
}

const roles = [
  ['super_admin', 'Complete access'],
  ['administrator', 'Manage monitored servers, collectors, alerts, and users'],
  ['operator', 'Operate alerts and inspect running queries'],
  ['viewer', 'Read dashboards and reports']
] as const;

const pool = createApplicationPool(databaseUrl);

interface CountRow extends RowDataPacket {
  count: number;
}

try {
  for (const [name, description] of roles) {
    await pool.execute(`INSERT IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)`, [
      uuidToBin(randomUUID()),
      name,
      description
    ]);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const [adminRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS count
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE r.name = 'super_admin'`
    );

    if ((adminRows[0]?.count ?? 0) > 0) {
      console.log('Super admin already exists; skipping admin seed');
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      await pool.execute(
        `INSERT IGNORE INTO users (id, email, display_name, password_hash)
         VALUES (?, ?, ?, ?)`,
        [uuidToBin(randomUUID()), adminEmail, 'Initial Administrator', passwordHash]
      );

      await pool.execute(
        `INSERT IGNORE INTO user_roles (user_id, role_id)
         SELECT u.id, r.id
         FROM users u
         INNER JOIN roles r ON r.name = 'super_admin'
         WHERE u.email = ?`,
        [adminEmail]
      );
    }
  }

  console.log('Seed completed');
} finally {
  await pool.end();
}
