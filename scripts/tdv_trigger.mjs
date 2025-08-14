import pg from 'pg';
const { Client } = pg;
const cs = `postgresql://${process.env.PROD_PGUSER}:${encodeURIComponent(process.env.PROD_PGPASSWORD)}@${process.env.PROD_PGHOST}:${process.env.PROD_PGPORT}/${process.env.PROD_PGDATABASE}`;
const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false }});

(async () => {
  await c.connect();
  await c.query(`
    CREATE OR REPLACE FUNCTION passes_tdv_fix() RETURNS trigger AS $$
    BEGIN
      IF NEW.tdv IS NULL OR btrim(NEW.tdv)='' THEN NEW.tdv := 'general'; END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS passes_tdv_fix_trg ON passes;
    CREATE TRIGGER passes_tdv_fix_trg
      BEFORE INSERT OR UPDATE ON passes
      FOR EACH ROW EXECUTE FUNCTION passes_tdv_fix();
  `);
  const r = await c.query(`
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'passes'::regclass AND NOT tgisinternal
  `);
  console.log('non-internal triggers on passes:', r.rows);
  await c.end();
  console.log('✓ tdv trigger installed.');
})().catch(e => { console.error(e); process.exit(1); });
