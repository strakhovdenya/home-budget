import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../../../src/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '../../../src/infrastructure/db/local-target';
import { identityRepository } from '../../../src/infrastructure/auth/repository';
import { createBudgetRepository } from '../../../src/infrastructure/db/budget-update-repository';
import { createClosingRepository } from '../../../src/infrastructure/db/closing-repository';
import { prepareCommand } from '../../../src/domain/updates/validation';
import * as schema from '../../../src/infrastructure/db/schema';
import { syntheticOwner } from './session';

function proved<T>(result: { ok: true; value: T } | { ok: false; code: string }): T {
  if (!result.ok) throw new Error('B_SEED_' + result.code);
  return result.value;
}

async function seed() {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw new Error('B_LOCAL_FIXTURE_ONLY');
  const urls = requireLocalDatabaseTargets(process.env);
  const db = createDatabase(urls.DATABASE_URL);
  try {
    const ownerId = await identityRepository(db).bind(syntheticOwner.subject);
    if (!ownerId) throw new Error('B_OWNER_BINDING_REQUIRED');
    const foreignId = '10000000-0000-4000-8000-000000000003';
    // A forbidden, unverified identity, never a second admitted Google owner.
    await db.db.insert(schema.users).values({ id: foreignId, googleSubject: 'hb021-foreign-changed-subject', emailVerified: false });
    const clock = await db.db.execute<{ today: string; past: string }>(sql`SELECT
      (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text today,
      to_char((clock_timestamp() AT TIME ZONE 'Europe/Berlin') - interval '1 month','YYYY-MM') past`);
    const { today, past } = clock.rows[0], current = today.slice(0, 7);
    for (const [ownerUserId, accountId, foreign] of [
      [ownerId, syntheticOwner.accountId, false],
      [foreignId, '10000000-0000-4000-8000-000000000004', true],
    ] as const) {
      const scope = { ownerUserId, accountId };
      await db.db.insert(schema.accounts).values({ id: accountId, ownerUserId,
        displayName: foreign ? 'HB021 FORBIDDEN SENTINEL' : 'HB021 synthetic owner' });
      const repo = createBudgetRepository(db);
      for (const [day, amount, initial] of [[past + '-20', '80000', true], [today, foreign ? '654321' : '100000', false]] as const) {
        const base = proved(await repo.load(scope)) as unknown as { revision: string; knowledgeCut: string; baseCheckpointId: string | null; baseVectorId: string | null };
        const command = proved(prepareCommand({ requestId: randomUUID(), expectedRevision: base.revision,
          effectiveDate: day, reason: 'Synthetic B fixture confirmation', payload: {
            schemaVersion: 1, knowledgeCut: base.knowledgeCut, baseCheckpointId: base.baseCheckpointId, baseVectorId: base.baseVectorId,
            effectiveDate: day, checkpoint: { observedDate: day, observedAt: null, balanceCents: amount,
              allocations: [{ period: current, amountCents: amount }], correction: null, placement: null },
            allocationChange: null, completeVectorConfirmed: true,
            obligations: initial ? [{ action: 'CREATE', identityId: null, expectedRevisionId: null, bankDate: null, payment: null,
              data: { title: foreign ? 'HB021 FORBIDDEN SENTINEL' : 'Synthetic owned reserve', dueDate: null,
                originalCents: '20000', isPossible: false, reserveFull: true, originatingPeriod: current, fundingPeriod: current } }] : [],
            savings: initial ? [{ action: 'CREATE', identityId: null, expectedRevisionId: null,
              data: { title: foreign ? 'HB021 FORBIDDEN SENTINEL' : 'Synthetic owned saving', amountCents: '10000',
                originatingPeriod: current, fundingPeriod: current } }] : [],
          } }));
        proved(await repo.confirm(scope, proved(prepareCommand(proved(await repo.preview(scope, command))))));
        if (initial) {
          const base = proved(await repo.load(scope)) as unknown as { revision: string };
          const close = createClosingRepository(db);
          const candidate = proved(await close.preview(scope, proved(prepareCommand({ requestId: randomUUID(), expectedRevision: base.revision,
            effectiveDate: today, reason: 'Synthetic B immutable close', payload: { schemaVersion: 1, operation: 'INITIAL', period: past,
              expectedHeadId: null, expectedHeadVersion: null } })))) as { command: unknown };
          proved(await close.confirm(scope, proved(prepareCommand(candidate.command))));
        }
      }
      // Provisioned immutable evidence must remain readable after the current update.
      proved(await createClosingRepository(db).load(scope, { period: past, version: 1, offset: 0, digest: null }));
    }
    console.log('B_SYNTHETIC_FIXTURES_PROVISIONED');
  } finally { await db.close(); }
}

seed().catch(error => {
  console.error(error instanceof Error && /^B_[A-Z_]+$/.test(error.message) ? error.message : 'B_PROVISION_FAILED');
  process.exitCode = 1;
});
