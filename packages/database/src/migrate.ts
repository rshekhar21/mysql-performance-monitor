import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplicationPool } from './pool.js';

const databaseUrl = process.env.APP_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('APP_DATABASE_URL is required to run migrations');
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const distMigrationPath = join(currentDir, 'migrations', '001_initial_schema.sql');
const sourceMigrationPath = join(currentDir, '..', 'src', 'migrations', '001_initial_schema.sql');
const migrationPath = await fileExists(distMigrationPath).then((exists) =>
  exists ? distMigrationPath : sourceMigrationPath
);
const sql = await readFile(migrationPath, 'utf8');
const pool = createApplicationPool(databaseUrl);

try {
  for (const statement of sql
    .split(/;\s*$/gm)
    .map((item) => item.trim())
    .filter(Boolean)) {
    await pool.query(statement);
  }

  console.log('Migrations completed');
} finally {
  await pool.end();
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
