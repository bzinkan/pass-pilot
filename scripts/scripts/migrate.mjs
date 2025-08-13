// scripts/migrate.mjs
import 'dotenv/config';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const conn = process.env.DATABASE_URL_MIGRATE || process.env.DATABASE_URL;
if (!conn) {
  console.error('Missing DATABASE_URL_MIGRATE/DATABASE_URL');
  process.exit(1);
}

const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  // serialize migrations so only one runs at a time
  await client.query('SELECT pg_advisory_lock(748392)');
  try {
    const db = drizzle(client, { logger: true });
    // If your migrations live in a different folder, change "./drizzle"
    await migrate(db, { migrationsFolder: './drizzle' });
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
