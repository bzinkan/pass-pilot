import pg from 'pg';
const { Client } = pg;

// Build connection from env vars (Neon)
const cs = `postgresql://${process.env.PROD_PGUSER}:${encodeURIComponent(process.env.PROD_PGPASSWORD)}@${process.env.PROD_PGHOST}:${process.env.PROD_PGPORT}/${process.env.PROD_PGDATABASE}`;
const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false }});

async function main() {
  await client.connect();

  // 1) Ensure column exists
  await client.query(`ALTER TABLE IF EXISTS passes ADD COLUMN IF NOT EXISTS tdv text`);

  // 2) Backfill any null/empty to 'general'
  await client.query(`UPDATE passes SET tdv='general' WHERE tdv IS NULL OR btrim(tdv)=''`);

  // 3) Default + NOT NULL
  await client.query(`ALTER TABLE passes ALTER COLUMN tdv SET DEFAULT 'general'`);
  await client.query(`ALTER TABLE passes ALTER COLUMN tdv SET NOT NULL`);

  // 4) Optional: guard against empty strings
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='passes_tdv_nonempty') THEN
        ALTER TABLE passes ADD CONSTRAINT passes_tdv_nonempty CHECK (length(btrim(tdv)) > 0);
      END IF;
    END $$;
  `);

  // 5) Verify
  const r = await client.query(`
    SELECT column_default, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_name='passes' AND column_name='tdv'
  `);
  console.log('tdv column:', r.rows[0]);

  const r2 = await client.query(`SELECT count(*) FROM passes WHERE tdv IS NULL OR btrim(tdv)=''`);
  console.log('null_or_empty count:', r2.rows[0].count);

  await client.end();
  console.log('✓ tdv default + NOT NULL + non-empty constraint installed.');
}

main().catch(e => { console.error(e); process.exit(1); });
