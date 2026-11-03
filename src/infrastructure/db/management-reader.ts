import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AuthorizedScope, CanonicalValue } from '@/domain/updates/contracts';
import type { ManagementReader, HistoryQuery, HistoryEntry } from '@/domain/management/contracts';
import { projectAccount } from '@/domain/forecast/budget';
import { LIMITS } from '@/domain/forecast/contracts';
import { ForecastFailure } from '@/domain/forecast/validation';
import { snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { snapshot as savingSnapshot } from '@/domain/savings/lifecycle';
import { selectSavingState } from '@/domain/savings/history';
import { proposeSavingRelease } from '@/domain/savings/proposal';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { indexHistory } from '@/domain/checkpoints/history';
import { readProjectionContext } from './projection-reader';
import { databaseToday } from './transition-state';
import { rejectBatch, BatchFailure, type Transaction } from './commit';
import type { createDatabase } from './client';
import * as s from './schema';

// Immutable process key, no per-user module state. Restart invalidates read cursors safely.
const cursorKey = randomBytes(32);
type Cursor = { owner: string; account: string; kind: string; identity: string; cut: string; through: string; offset: number; order: string };
function sign(body: string) { return createHmac('sha256', cursorKey).update(body).digest('hex'); }
function encode(c: Cursor) { const body = Buffer.from(JSON.stringify(c)).toString('base64url'); return body + '.' + sign(body); }
function decode(token: string, scope: AuthorizedScope, q: HistoryQuery): Cursor {
  try {
    const [body, signature, extra] = token.split('.');
    if (extra !== undefined || !signature || !/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(sign(body)))) return rejectBatch('INVALID_INPUT');
    const c: Cursor = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (c.owner !== scope.ownerUserId || c.account !== scope.accountId || c.kind !== q.kind || c.identity !== q.identityId
      || !/^(0|[1-9][0-9]{0,18})$/.test(c.cut) || !parseBerlinDate(c.through).ok || !Number.isSafeInteger(c.offset) || c.offset < 1) return rejectBatch('INVALID_INPUT');
    return c;
  } catch { return rejectBatch('INVALID_INPUT'); }
}
function wire<T>(data: T): import('@/domain/forecast/serialization').Wire<T> {
  const body = JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v);
  if (Buffer.byteLength(body, 'utf8') > LIMITS.wireBytes) return rejectBatch('STORAGE_ERROR');
  return JSON.parse(body);
}
export function createManagementReader(database: ReturnType<typeof createDatabase>): ManagementReader {
  async function read<T>(scope: AuthorizedScope, operation: (tx: Transaction, account: typeof s.accounts.$inferSelect, today: string) => Promise<T>) {
    try {
      const value = await database.db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL statement_timeout = '10000ms'`);
        const [account] = await tx.select().from(s.accounts).where(and(eq(s.accounts.id, scope.accountId), eq(s.accounts.ownerUserId, scope.ownerUserId)));
        if (!account) return rejectBatch('FORBIDDEN');
        const clock = await databaseToday(tx);
        return operation(tx, account, clock.today);
      }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
      return { ok: true as const, value };
    } catch (e) { return { ok: false as const, code: e instanceof BatchFailure || e instanceof ForecastFailure ? e.code : 'STORAGE_ERROR' as const }; }
  }
  return {
    list: scope => read(scope, async (tx, account, today) => {
      const day = parseBerlinDate(today); if (!day.ok) return rejectBatch('INVALID_INPUT');
      const c = await readProjectionContext(tx, scope, account, day.value, account.recordedSeq);
      const p = projectAccount(c.snapshot, day.value); if (!p.ok) return rejectBatch('HISTORICAL_STATE_CONFLICT');
      const sources = c.snapshot.kind === 'ACTIVE_COMPLETE' ? { obligations: c.snapshot.obligations, savings: c.snapshot.savings }
        : c.snapshot.kind === 'NO_OBSERVATION' ? { obligations: c.snapshot.knownObligations, savings: c.snapshot.knownSavings } : null;
      if (!sources) return rejectBatch('HISTORICAL_STATE_CONFLICT');
      return wire({ scopeKey: scope.ownerUserId + ':' + scope.accountId, revision: account.aggregateRevision.toString(), knowledgeCut: account.recordedSeq.toString(),
        today, ...sources, projection: p.value });
    }),
    history: (scope, q) => read(scope, async (tx, account, today) => {
      const cursor = q.cursor ? decode(q.cursor, scope, q) : null;
      const cut = cursor ? BigInt(cursor.cut) : account.recordedSeq;
      const day = parseBerlinDate(cursor?.through ?? today);
      if (!day.ok || day.value > today || cut > account.recordedSeq) return rejectBatch('INVALID_INPUT');
      const c = await readProjectionContext(tx, scope, account, day.value, cut);
      if(c.snapshot.kind !== 'ACTIVE_COMPLETE' && c.snapshot.kind !== 'NO_OBSERVATION') return rejectBatch('HISTORICAL_STATE_CONFLICT');
      // Assembly performs full identity, lifecycle, correction, funding and audit validation before paging.
      const p = projectAccount(c.snapshot, day.value); if (!p.ok) return rejectBatch('HISTORICAL_STATE_CONFLICT');
      const events = q.kind === 'OBLIGATION' ? c.obligationHistory.events.filter(e => e.obligationId === q.identityId)
        : c.savingHistory.savings.filter(e => e.savingsId === q.identityId);
      if (!events.length) return rejectBatch('FORBIDDEN');
      const ordering=indexHistory(c.history);if(!ordering.ok)return rejectBatch(ordering.code);
      events.sort((a, b) => a.recordedSeq === b.recordedSeq ? ordering.value.compare(b.positionId,a.positionId) || a.id.localeCompare(b.id) : a.recordedSeq > b.recordedSeq ? -1 : 1);
      const order = sign(events.map(e => e.id).join(':'));
      if (cursor && (cursor.order !== order || cursor.offset >= events.length)) return rejectBatch('INVALID_INPUT');
      const batches = await tx.select({id:s.budgetUpdates.id,actorId:s.budgetUpdates.actorId,
        recordedAt:sql<string>`to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`})
        .from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId, scope.ownerUserId), eq(s.budgetUpdates.accountId, scope.accountId), inArray(s.budgetUpdates.id, events.map(e=>e.budgetUpdateId!))));
      const batchTimes = new Map(batches.map(b => [b.id, b.recordedAt]));
      const byBatch = new Map(batches.map(b=>[b.id,b]));
      const periods = new Map(c.periods.map(v => [v.id, v.period]));
      const offset = cursor?.offset ?? 0;
      const entries: HistoryEntry[] = events.slice(offset, offset + 50).map(e => {
        const recordedAt = batchTimes.get(e.budgetUpdateId ?? ''); if (!recordedAt) return rejectBatch('STORAGE_ERROR');
        const batch=byBatch.get(e.budgetUpdateId!)!;
        const evidence=c.audits.find(a=>{const doc=a.beforeAfter as {entity?:{id?:unknown;type?:unknown}}|null;return doc?.entity?.id===e.id&&doc.entity.type===('obligationId'in e?'OBLIGATION_STATE':'SAVINGS_STATE');});
        if(!evidence)return rejectBatch('STORAGE_ERROR');
        return wire({ id: e.id, action: e.action, previousRevisionId: e.previousRevisionId, supersedesId: e.supersedesId,
          supersededBy: events.find(next => next.supersedesId === e.id)?.id ?? null, effectiveDate: e.effectiveDate, recordedAt,
          recordedSeq: e.recordedSeq.toString(), positionId: e.positionId, confirmedAt: e.confirmedAt,
          originPeriod: periods.get(e.originatingPeriodId)!, fundingPeriod: periods.get(e.fundingPeriodId)!, before: e.beforeState,
          after: 'obligationId' in e ? obligationSnapshot(e) : savingSnapshot(e),
          actorId:batch.actorId,reason:evidence.reason,beforeFundingPeriod:e.beforeState&&typeof e.beforeState==='object'&&'fundingPeriodId'in e.beforeState?periods.get(String(e.beforeState.fundingPeriodId))??null:null,
          payment: 'payment' in e ? e.payment as unknown as CanonicalValue : null,
          increase: 'confirmedIncreaseAmount' in e ? e.confirmedIncreaseAmount?.toString() ?? null : null,
          released: 'confirmedReleasedAmount' in e ? e.confirmedReleasedAmount?.toString() ?? null : null,
          bankDate: 'bankDate' in e ? e.bankDate : null, fundingProof: e.fundingProof as unknown as CanonicalValue ?? null });
      });
      return wire({ entries, knowledgeCut: cut.toString(), through: day.value, hasNewData: cut !== account.recordedSeq,
        cursor: offset + 50 < events.length ? encode({ owner: scope.ownerUserId, account: scope.accountId, kind: q.kind, identity: q.identityId,
          cut: cut.toString(), through: day.value, offset: offset + 50, order }) : null });
    }),
    proposeRelease: (scope, identityId) => read(scope, async (tx, account, today) => {
      const day = parseBerlinDate(today); if (!day.ok) return rejectBatch('INVALID_INPUT');
      const c = await readProjectionContext(tx, scope, account, day.value, account.recordedSeq);
      const p = projectAccount(c.snapshot, day.value); if (!p.ok || p.value.kind !== 'ACCOUNT_ESTIMATE') return rejectBatch('HISTORICAL_STATE_CONFLICT');
      const selected = selectSavingState(c.savingHistory, day.value); if (!selected.ok) return rejectBatch(selected.code);
      const saving = selected.value.states.find(e => e.savingsId === identityId); if (!saving) return rejectBatch('FORBIDDEN');
      const period = c.periods.find(v => v.id === saving.fundingPeriodId)?.period;
      const budget = p.value.periods.find(v => v.period === period); if (!budget) return rejectBatch('INVALID_SAVING');
      const proposal = proposeSavingRelease(saving, saving.fundingPeriodId, budget.free, account.recordedSeq, account.aggregateRevision);
      if (!proposal.ok) return rejectBatch(proposal.code);
      return { identityId, revisionId: saving.id, knowledgeCut: account.recordedSeq.toString(), revision: account.aggregateRevision.toString(), amount: proposal.value.suggestedRelease.toString() };
    }),
  };
}
