import { parseBerlinDate, type BerlinDate } from '@/shared/pure/calendar';
import { parsePeriod } from '@/domain/periods/period';
import { validUuid } from '@/domain/updates/validation';
import { validState as validObligation } from '@/domain/obligations/lifecycle';
import { validState as validSaving } from '@/domain/savings/lifecycle';
import { validateCents, sumCents } from '@/domain/money/money';
import { berlinDateOfInstant, parseInstant } from '@/shared/pure/instant';
import type { Result } from '@/shared/pure/result';
import { LIMITS, type Snapshot, type ForecastError, type Source } from './contracts';

export class ForecastFailure extends Error {
  constructor(readonly code: ForecastError) { super(code); }
}
export function refuse(code: ForecastError): never { throw new ForecastFailure(code); }
export function checked<T>(r: Result<T, string>): T {
  if (!r.ok) return refuse(r.code === 'INVALID_MONEY' || r.code === 'MONEY_SIGN' || r.code === 'INVALID_DIVISOR' ? 'INVALID_STATE_SHAPE' : r.code as ForecastError);
  return r.value;
}
export function attempt<T>(f: () => T): Result<T, ForecastError> {
  try { return { ok: true, value: f() }; }
  catch (e) { return { ok: false, code: e instanceof ForecastFailure ? e.code : 'INVALID_STATE_SHAPE' }; }
}

/** Bounded descriptor-only copy. Never invokes getters; never freezes caller-owned objects. */
export function capture<T>(input: T): T {
  let nodes = 0, size = 0;
  const ancestors = new Set<object>();
  function visit(v: unknown, depth: number): unknown {
    if (++nodes > 100000 || depth > 32) return refuse('PROJECTION_LIMIT_EXCEEDED');
    if (v === null || typeof v === 'boolean' || typeof v === 'bigint') return v;
    if (typeof v === 'number') { if (!Number.isSafeInteger(v)) return refuse('INVALID_STATE_SHAPE'); return v; }
    if (typeof v === 'string') { size += v.length; if (size > LIMITS.storageBytes) return refuse('PROJECTION_LIMIT_EXCEEDED'); return v; }
    if (!v || typeof v !== 'object' || ancestors.has(v)) return refuse('INVALID_STATE_SHAPE');
    const array = Array.isArray(v), prototype = Object.getPrototypeOf(v);
    if (prototype !== (array ? Array.prototype : Object.prototype)) return refuse('INVALID_STATE_SHAPE');
    const keys = Reflect.ownKeys(v);
    if (keys.length > 20001 || keys.some(k => typeof k !== 'string')) return refuse('PROJECTION_LIMIT_EXCEEDED');
    ancestors.add(v);
    if (array) {
      if (keys.length !== v.length + 1) return refuse('INVALID_STATE_SHAPE');
      const out = [];
      for (let i = 0; i < v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, String(i));
        if (!d || !('value' in d) || !d.enumerable) return refuse('INVALID_STATE_SHAPE');
        out.push(visit(d.value, depth + 1));
      }
      ancestors.delete(v); return Object.freeze(out);
    }
    const out: Record<string, unknown> = {};
    for (const key of keys as string[]) {
      size += key.length;
      if (size > LIMITS.storageBytes) return refuse('PROJECTION_LIMIT_EXCEEDED');
      const d = Object.getOwnPropertyDescriptor(v, key);
      if (!d || !('value' in d) || !d.enumerable) return refuse('INVALID_STATE_SHAPE');
      Object.defineProperty(out, key, { value: visit(d.value, depth + 1), enumerable: true });
    }
    ancestors.delete(v); return Object.freeze(out);
  }
  return visit(input, 0) as T;
}
function shape(v: object, fields: readonly string[]) {
  if (Object.keys(v).length !== fields.length || fields.some(k => !Object.hasOwn(v, k))) refuse('INVALID_STATE_SHAPE');
}
function date(v: unknown, asOf: BerlinDate): BerlinDate {
  const d = checked(parseBerlinDate(v));
  if (d > asOf) return refuse('STATE_AFTER_AS_OF');
  return d;
}
function source(s: Source, account: string, asOf: BerlinDate) {
  if (!validUuid(s.identityId) || !validUuid(s.revisionId) || !validUuid(s.positionId)
    || (s.transitionDecisionId !== null && !validUuid(s.transitionDecisionId))) refuse('INVALID_STATE_SHAPE');
  if (s.accountId !== account) refuse('SCOPE_MISMATCH');
  checked(parsePeriod(s.originPeriod)); checked(parsePeriod(s.fundingPeriod)); date(s.effectiveDate, asOf);
}
export function validateSnapshot(raw: unknown, rawDate: unknown): Readonly<{ state: Snapshot; asOf: BerlinDate }> {
  const asOf = checked(parseBerlinDate(rawDate)), s = capture(raw) as Snapshot;
  if (!s || typeof s !== 'object' || !validUuid(s.accountId) || !s.provenance) return refuse('INVALID_STATE_SHAPE');
  const p = s.provenance;
  shape(p, ['selectionVersion', 'knowledgeCut', 'capturedAggregateRevision', 'historicalThroughDate', 'orderingRevisionIds']);
  if (p.selectionVersion !== 1 || checked(validateCents(p.knowledgeCut)) < 0n || checked(validateCents(p.capturedAggregateRevision)) < 0n
    || !Array.isArray(p.orderingRevisionIds) || !p.orderingRevisionIds.every(validUuid)
    || new Set(p.orderingRevisionIds).size !== p.orderingRevisionIds.length) return refuse('INVALID_STATE_SHAPE');
  if (checked(parseBerlinDate(p.historicalThroughDate)) !== asOf) return refuse('STATE_AFTER_AS_OF');
  const common = ['kind', 'accountId', 'provenance'];
  if (s.kind === 'INCOMPLETE_STATE') {
    shape(s, [...common, 'missing']);
    if (!Array.isArray(s.missing) || !s.missing.length || new Set(s.missing).size !== s.missing.length
      || s.missing.some(x => !['BANK', 'ALLOCATIONS', 'OBLIGATIONS', 'SAVINGS'].includes(x))) refuse('INVALID_STATE_SHAPE');
    return { state: s, asOf };
  }
  if (s.kind !== 'NO_OBSERVATION') {
    const c = s.checkpoint;
    if (!c) return refuse('INVALID_STATE_SHAPE');
    shape(c, ['revisionId', 'observedDate', 'observedAt', 'balance']);
    if (!validUuid(c.revisionId)) refuse('INVALID_STATE_SHAPE');
    date(c.observedDate, asOf); checked(validateCents(c.balance));
    if (c.observedAt !== null) {
      const instant = checked(parseInstant(c.observedAt));
      if (checked(berlinDateOfInstant(instant)) !== c.observedDate) refuse('INVALID_DATE');
    }
    if (s.kind === 'NEGATIVE_BANK_OBSERVATION') {
      if (c.balance >= 0n) refuse('INVALID_OBSERVATION_KIND');
      shape(s, [...common, 'checkpoint']); return { state: s, asOf };
    }
    if (s.kind !== 'ACTIVE_COMPLETE') return refuse('INVALID_STATE_SHAPE');
    if (c.balance < 0n) refuse('INVALID_OBSERVATION_KIND');
    shape(s, [...common, 'checkpoint', 'allocationRevisionId', 'anchorCheckpointRevisionId', 'allocationEffectiveDate', 'allocations', 'obligations', 'savings']);
    if (!validUuid(s.allocationRevisionId) || s.anchorCheckpointRevisionId !== c.revisionId) refuse('ANCHOR_MISMATCH');
    if (date(s.allocationEffectiveDate, asOf) < c.observedDate) refuse('INVALID_DATE');
    if (!Array.isArray(s.allocations) || s.allocations.length > LIMITS.periods) refuse('PROJECTION_LIMIT_EXCEEDED');
    const seen = new Set<string>();
    for (const a of s.allocations) {
      shape(a, ['period', 'amount']); checked(parsePeriod(a.period)); checked(validateCents(a.amount));
      if (a.amount < 0n) refuse('NEGATIVE_CASH_ALLOCATION');
      if (seen.has(a.period)) refuse('DUPLICATE_ID_OR_PERIOD'); seen.add(a.period);
    }
    if (checked(sumCents(s.allocations.map(a => a.amount))) !== c.balance) refuse('SUM_MISMATCH');
  } else shape(s, [...common, 'knownObligations', 'knownSavings']);
  const obligations = s.kind === 'ACTIVE_COMPLETE' ? s.obligations : s.knownObligations;
  const savings = s.kind === 'ACTIVE_COMPLETE' ? s.savings : s.knownSavings;
  if (!Array.isArray(obligations) || !Array.isArray(savings)) return refuse('INVALID_STATE_SHAPE');
  if (obligations.length + savings.length > LIMITS.identities) refuse('PROJECTION_LIMIT_EXCEEDED');
  const sourceFields = ['identityId', 'revisionId', 'accountId', 'originPeriod', 'fundingPeriod', 'effectiveDate', 'positionId', 'transitionDecisionId'];
  for (const list of [obligations, savings]) {
    const seen = new Set<string>();
    for (const e of list) {
      source(e, s.accountId, asOf);
      const identity = e.identityId.toLowerCase();
      if (seen.has(identity)) refuse('DUPLICATE_ID_OR_PERIOD'); seen.add(identity);
    }
  }
  for (const e of obligations) {
    shape(e, [...sourceFields, 'title', 'dueDate', 'original', 'outstanding', 'status', 'isPossible', 'reserveFull']);
    checked(validateCents(e.original)); checked(validateCents(e.outstanding));
    if (typeof e.title !== 'string' || e.title.length > 400) refuse('INVALID_EARMARK');
    if (!validObligation({ ...e, originatingPeriodId: e.originPeriod, fundingPeriodId: e.fundingPeriod, originalCents: e.original, outstandingCents: e.outstanding })) refuse('INVALID_EARMARK');
  }
  for (const e of savings) {
    shape(e, [...sourceFields, 'title', 'amount', 'status']); checked(validateCents(e.amount));
    if (typeof e.title !== 'string' || e.title.length > 400) refuse('INVALID_EARMARK');
    if (!validSaving({ ...e, originatingPeriodId: e.originPeriod, fundingPeriodId: e.fundingPeriod, amountCents: e.amount })) refuse('INVALID_EARMARK');
  }
  return { state: s, asOf };
}
