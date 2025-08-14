import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();

  // 1) Ensure column exists
  await client.query(`ALTER TABLE IF EXISTS passes ADD COLUMN IF NOT EXISTS tdv text`);

  // 2) Set default for new rows
  await client.query(`ALTER TABLE passes ALTER COLUMN tdv SET DEFAULT 'general'`);

  // 3) Backfill existing NULL/empty
  await client.query(`UPDATE passes SET tdv='general' WHERE tdv IS NULL OR tdv=''`);

  // 4) Trigger to guard future inserts
  await client.query(`
    CREATE OR REPLACE FUNCTION passes_tdv_default() RETURNS trigger AS $$
    BEGIN
      IF NEW.tdv IS NULL OR NEW.tdv='' THEN NEW.tdv := 'general'; END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await client.query(`DROP TRIGGER IF EXISTS passes_tdv_default_trg ON passes`);
  await client.query(`
    CREATE TRIGGER passes_tdv_default_trg
    BEFORE INSERT ON passes
    FOR EACH ROW
    EXECUTE FUNCTION passes_tdv_default();
  `);

  // 5) Verify
  const col = await client.query(`
    SELECT column_default, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_name='passes' AND column_name='tdv'
  `);
  const cnt = await client.query(`SELECT count(*) FROM passes WHERE tdv IS NULL OR tdv=''`);
  console.log('tdv column:', col.rows[0] ?? 'NOT FOUND');
  console.log('null_or_empty count:', cnt.rows[0].count);

  await client.end();
}
run().then(()=>console.log('✓ tdv fixed & guarded.')).catch(e=>{ console.error(e); process.exit(1); });
