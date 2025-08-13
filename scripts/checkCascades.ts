// scripts/checkCascades.ts
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

(async () => {
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
      console.log('✅ All foreign keys to schools already have CASCADE constraints.');
    } else {
      console.log('⚠️ Foreign keys missing CASCADE constraints:');
      console.table(result.rows);
    }
  } catch (error) {
    console.error('Error checking cascade constraints:', error);
  }
  
  process.exit(0);
})();