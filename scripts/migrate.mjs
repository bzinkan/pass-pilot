import 'dotenv/config';
import fs from 'node:fs';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const conn = process.env.DATABASE_URL_MIGRATE || process.env.DATABASE_URL;
if (!conn) {
  console.error('Missing DATABASE_URL_MIGRATE or DATABASE_URL');
  process.exit(1);
}

// Try common places Drizzle puts .sql files
const candidates = [
  './drizzle',
  './drizzle/migrations',
  './server/drizzle',
  './db/drizzle'
].filter(p => fs.existsSync(p));

if (candidates.length === 0) {
  console.error('Could not find your Drizzle migrations folder. Look for .sql files and update this script.');
  process.exit(1);
}

const migrationsFolder = candidates[0];
console.log('Using migrations folder:', migrationsFolder);

const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  await client.query('SELECT pg_advisory_lock(748392)');
  try {
    const db = drizzle(client, { logger: true });
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations complete');
  } finally {
    await client.query('SELECT pg_advisory_unlock(748392)');
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Migration failed:', e?.message || e);
  process.exit(1);
});
