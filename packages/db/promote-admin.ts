#!/usr/bin/env npx tsx
/**
 * promote-admin.ts
 *
 * Standalone CLI script to promote (or demote) a user's role directly in the
 * database — no running server needed.
 *
 * Usage:
 *   npx tsx packages/db/promote-admin.ts promote user@example.com
 *   npx tsx packages/db/promote-admin.ts demote  user@example.com
 *
 * Prerequisites:
 *   - DATABASE_URL must be set in the environment (or in a .env file at the
 *     repo root / packages/db directory).
 *   - The user must already exist (register via the app first).
 */

import { prisma } from '@repo/db';


async function main() {
  const [, , action, email] = process.argv;

  if (!action || !email || !['promote', 'demote'].includes(action)) {
    console.error('Usage: npx tsx packages/db/promote-admin.ts <promote|demote> <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, role: true },
  });

  if (!user) {
    console.error(`❌  No user found with email: ${email}`);
    console.error('    Register via the app first, then run this script.');
    process.exit(1);
  }

  const targetRole = action === 'promote' ? 'ADMIN' : 'USER';

  if (user.role === targetRole) {
    console.log(`ℹ️  ${email} already has role ${targetRole} — nothing changed.`);
    return;
  }

  await prisma.user.update({ where: { email }, data: { role: targetRole } });

  console.log(`✅  ${email} (${user.username}) → role updated to ${targetRole}`);
  console.log('    NOTE: If the auth-service is running, restart it (or wait for');
  console.log('    the user cache to expire) for the change to take effect immediately.');
}

main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
