import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { databaseFromEnvironment, type createDatabase } from '../db/client';
import { accounts, users } from '../db/schema';
import { validId, validSubject } from './policy';

export function identityRepository(database: ReturnType<typeof createDatabase>) {
  return {
    async bind(subject: string): Promise<string | null> {
      if (!validSubject(subject)) return null;
      return database.db.transaction(async (tx) => {
        // Serialize first sign-ins, including different subjects. No reassignment of existing rows.
        await tx.execute(sql`LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`);
        const existing = await tx.select().from(users);
        if (existing.length) {
          return existing.length === 1 && existing[0].googleSubject === subject && existing[0].emailVerified ? existing[0].id : null;
        }
        const id = randomUUID();
        await tx.insert(users).values({ id, googleSubject: subject, emailVerified: true });
        return id;
      });
    },
    async matches(id: string, subject: string) {
      if (!validId(id) || !validSubject(subject)) return false;
      const rows = await database.db.select({ id: users.id }).from(users).where(and(eq(users.id, id), eq(users.googleSubject, subject), eq(users.emailVerified, true)));
      return rows.length === 1;
    },
    async ownsAccount(ownerId: string, accountId: string) {
      if (!validId(ownerId) || !validId(accountId)) return false;
      const rows = await database.db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.ownerUserId, ownerId)));
      return rows.length === 1;
    },
  };
}

// Database remains lazy: a secret-free build or anonymous visit never connects.
export const ownerRepository = {
  bind: (subject: string) => identityRepository(databaseFromEnvironment()).bind(subject),
  matches: (id: string, subject: string) => identityRepository(databaseFromEnvironment()).matches(id, subject),
  ownsAccount: (owner: string, account: string) => identityRepository(databaseFromEnvironment()).ownsAccount(owner, account),
};
