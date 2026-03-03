import { db } from '../server/infra/db/db';
import { formulas, users } from '../shared/schema';
import { desc } from 'drizzle-orm';

(async () => {
  // Check all formulas
  const allFormulas = await db.select({
    id: formulas.id,
    userId: formulas.userId,
    name: formulas.name,
    version: formulas.version,
    totalMg: formulas.totalMg,
    archivedAt: formulas.archivedAt,
    createdAt: formulas.createdAt,
  }).from(formulas).orderBy(desc(formulas.createdAt));
  
  console.log(`Total formulas in DB: ${allFormulas.length}`);
  for (const f of allFormulas) {
    console.log(JSON.stringify(f));
  }

  // Check users
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
  }).from(users);
  
  console.log(`\nTotal users: ${allUsers.length}`);
  for (const u of allUsers) {
    console.log(JSON.stringify(u));
  }

  process.exit(0);
})();
