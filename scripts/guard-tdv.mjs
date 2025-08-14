import pg from 'pg';
const { Client } = pg;

// Neon connection (same one you shared)
const cs = 'postgresql://neondb_owner:npg_YdwFH9A2eZol@ep-icy-math-ad75crcy.c-2.us-east-1.aws.neon.tech:5432/neondb?sslmode=require';

const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false }});
await c.connect();

// 1) Guard function: coalesce NULL/empty/whitespace to 'general'
await c.query(`
  CREATE OR REPLACE FUNCTION passes_tdv_guard() RETURNS trigger AS $$
  BEGIN
    NEW.tdv := COALESCE(NULLIF(BTRIM(NEW.tdv), ''), 'general');
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`);

// 2) Trigger before INSERT/UPDATE
await c.query(`
  DROP TRIGGER IF EXISTS passes_tdv_guard_trg ON public.passes;
  CREATE TRIGGER passes_tdv_guard_trg
    BEFORE INSERT OR UPDATE ON public.passes
    FOR EACH ROW EXECUTE FUNCTION passes_tdv_guard();
`);

// 3) Show trigger + current null count (sanity check)
const trig = await c.query(`
  SELECT tgname
  FROM pg_trigger
  JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid
  WHERE relname = 'passes' AND tgname LIKE 'passes_tdv_%'
`);
console.log('triggers:', trig.rows);

const cnt = await c.query(`SELECT count(*) FROM public.passes WHERE tdv IS NULL`);
console.log('null tdv rows right now:', cnt.rows[0].count);

await c.end();
