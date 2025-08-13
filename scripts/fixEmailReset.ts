// scripts/fixEmailReset.ts
// Usage:
//   npx tsx scripts/fixEmailReset.ts zinkan.brian@gmail.com        # dry-run
//   npx tsx scripts/fixEmailReset.ts zinkan.brian@gmail.com --apply # actually mutate

import { eq } from 'drizzle-orm';
import { db } from '../server/db';
import { users, schools } from '../shared/schema';

function normalize(email: string) { 
  return email.trim().toLowerCase(); 
}

async function main() {
  const rawEmail = process.argv[2];
  const apply = process.argv.includes('--apply');
  
  if (!rawEmail) {
    console.error('Provide an email to reset.');
    console.error('Usage: npx tsx scripts/fixEmailReset.ts email@example.com [--apply]');
    process.exit(1);
  }
  
  const email = normalize(rawEmail);
  console.log(`\n[fixEmailReset] Target email: ${email}`);
  console.log(`[fixEmailReset] Mode: ${apply ? 'APPLY (will change data)' : 'DRY-RUN (no changes)'}\n`);

  try {
    // 1) Find all users matching email
    const foundUsers = await db.select().from(users).where(eq(users.email, email));
    
    if (foundUsers.length === 0) {
      console.log('✅ No users found for that email.');
    } else {
      console.log(`🔍 Found ${foundUsers.length} user(s):`);
      foundUsers.forEach(u => console.log(`   - user.id=${u.id} schoolId=${u.schoolId} isAdmin=${u.isAdmin}`));

      if (apply) {
        // Delete users (CASCADE will handle sessions and other child records)
        for (const user of foundUsers) {
          await db.delete(users).where(eq(users.id, user.id));
          console.log(`   ✅ Deleted user ${user.id}`);
        }
      }
    }

    // 2) Find schools tied to this email as adminEmail
    const foundSchools = await db.select().from(schools).where(eq(schools.adminEmail, email));
    
    if (foundSchools.length === 0) {
      console.log('✅ No schools found with that admin email.');
    } else {
      console.log(`🔍 Found ${foundSchools.length} school(s) with admin email:`);
      foundSchools.forEach(s => console.log(`   - school.id=${s.id} name="${s.name}" plan=${s.plan}`));
      foundSchools.forEach(s => console.log(`     stripeCustomerId=${s.stripeCustomerId || 'null'}`));
      foundSchools.forEach(s => console.log(`     stripeSubscriptionId=${s.stripeSubscriptionId || 'null'}`));

      if (apply) {
        // Clear Stripe data and optionally delete schools
        for (const school of foundSchools) {
          // Option 1: Clear Stripe data but keep school (safer)
          await db.update(schools)
            .set({ 
              stripeCustomerId: null, 
              stripeSubscriptionId: null,
              plan: 'TRIAL', // Reset to trial
              status: 'TRIAL' // Reset status
            })
            .where(eq(schools.id, school.id));
          console.log(`   ✅ Cleared Stripe data for school ${school.id}`);
          
          // Option 2: Uncomment to delete school entirely
          // await db.delete(schools).where(eq(schools.id, school.id));
          // console.log(`   ✅ Deleted school ${school.id}`);
        }
      }
    }

    console.log('\n🎯 Summary:');
    console.log(`   - Users found: ${foundUsers.length}`);
    console.log(`   - Schools found: ${foundSchools.length}`);
    
    if (!apply) {
      console.log('\n💡 This was a DRY-RUN. Add --apply to actually make changes.');
      console.log('   Example: npx tsx scripts/fixEmailReset.ts zinkan.brian@gmail.com --apply');
    } else {
      console.log('\n✅ Email reset completed! You can now register with this email again.');
    }

  } catch (error) {
    console.error('❌ Error during email reset:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});