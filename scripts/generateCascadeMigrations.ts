// scripts/generateCascadeMigrations.ts
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function main() {
  try {
    const result = await db.execute(sql`
      SELECT conrelid::regclass AS child_table,
             conname AS fk_name,
             pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE contype = 'f'
        AND confrelid = 'public.schools'::regclass
        AND pg_get_constraintdef(oid) NOT ILIKE '%ON DELETE CASCADE%'
      ORDER BY 1;
    `);

    if (result.rows.length === 0) {
      console.log('✅ All foreign keys to schools already cascade.');
      return;
    }

    const stmts = result.rows.map((r: any) => 
      `-- ${r.child_table}.${r.fk_name}\nALTER TABLE ${r.child_table}\n  DROP CONSTRAINT IF EXISTS ${r.fk_name},\n  ADD CONSTRAINT ${r.fk_name}\n  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;\n`
    ).join('\n');

    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const filename = path.join(migrationsDir, `${Date.now()}_add_school_cascades.sql`);
    fs.writeFileSync(filename, stmts);

    console.log('Generated migration statements:');
    console.log(stmts);
    console.log(`💾 Saved to: ${filename}`);
  } catch (error) {
    console.error('Error generating cascade migrations:', error);
    process.exit(1);
  }
}

main().catch(e => { 
  console.error(e); 
  process.exit(1); 
});