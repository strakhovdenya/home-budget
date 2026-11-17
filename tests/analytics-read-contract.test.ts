import { describe, expect, it, vi } from 'vitest';
import { groupFunding } from '@/domain/analytics/grouping';
import { parseOpen, parseQuery } from '@/domain/analytics/validation';
import { createAnalytics } from '@/features/analytics/read-analytics';
import type { Obligation } from '@/domain/forecast/contracts';
import type { AnalyticsReader, Basis, Query } from '@/domain/analytics/contracts';
import { date, id } from './fixtures/checkpoints';
import { value } from './fixtures/checkpoints';
import { parsePeriod } from '@/domain/periods/period';

const basis: Basis = { schemaVersion: 1, accountId: id(), indexAnchor: id(), indexCut: '2', stateAnchor: id(), stateCut: '1',
  dayH: '2026-11-16', today: '2026-11-16', capturedAt: '2026-11-16T12:00:00.000000Z', report: null };
function query(): Query {
  return { schemaVersion: 1, basis, view: 'FUNDING', filters: { from: '2026-11-01', to: '2026-12-31', origin: null, funding: null }, cursor: null, compare: null };
}
function obligations(): Obligation[] {
  const rows: Obligation[] = [];
  for (const [origin, funding, amount] of [['2026-10', '2026-11', 10000n], ['2026-10', '2026-12', 20000n], ['2026-11', '2026-11', 30000n], ['2026-11', '2026-12', 40000n]] as const) {
    for (let index = 0; index < 6; index++) rows.push({ identityId: id(), revisionId: id(), accountId: basis.accountId,
      originPeriod: value(parsePeriod(origin)), fundingPeriod: value(parsePeriod(funding)), effectiveDate: date('2026-11-01'), positionId: id(), transitionDecisionId: null,
      title: 'Synthetic obligation', dueDate: null, original: index === 0 ? amount : 1n, outstanding: index === 0 ? amount : 1n,
      status: 'UNPAID', reserveFull: true, isPossible: false });
  }
  return rows;
}
describe('analytics read-only contract', () => {
  it('HB22-17 sums full identities before filtering and paging', () => {
    const rows = obligations(), reserves = new Map([['2026-11', 40010n], ['2026-12', 60010n]]);
    const all = groupFunding(rows, reserves, query().filters);
    expect(all).toMatchObject({ total: '100020', totalCount: 24, subtotal: '100020', subtotalCount: 24 });
    expect(all.groups.map(group => group.amount)).toEqual(['10005', '20005', '30005', '40005']);
    expect(all.identities.slice(0, 20)).toHaveLength(20);
    expect(all.identities.slice(20)).toHaveLength(4);
    expect(groupFunding(rows, reserves, { ...query().filters, origin: '2026-10' })).toMatchObject({ subtotal: '30010', subtotalCount: 12 });
    expect(groupFunding(rows, reserves, { ...query().filters, funding: '2026-12' })).toMatchObject({ subtotal: '60010', subtotalCount: 12 });
    expect(groupFunding(rows, reserves, { ...query().filters, origin: '2026-10', funding: '2026-12' })).toMatchObject({ subtotal: '20005', subtotalCount: 6 });
    expect(groupFunding(rows, reserves, { ...query().filters, origin: '2025-01' })).toMatchObject({ subtotal: '0', subtotalCount: 0, total: '100020' });
    expect(() => groupFunding(rows, new Map([['2026-11', 40009n], ['2026-12', 60010n]]), query().filters)).toThrow('HISTORY_SOURCE_INVALID');
    expect(() => groupFunding([...rows, rows[0]], reserves, query().filters)).toThrow('HISTORY_SOURCE_INVALID');
  });
  it('excludes unselected possible/paid/cancelled and retains full partial-payment remainder', () => {
    const rows = obligations();
    const base = rows[0];
    const selected = [{ ...base, original: 30000n, outstanding: 20000n },
      { ...base, identityId: id(), isPossible: true, reserveFull: false },
      { ...base, identityId: id(), status: 'PAID' as const, outstanding: 0n, reserveFull: false },
      { ...base, identityId: id(), status: 'CANCELLED' as const, reserveFull: false }];
    expect(groupFunding(selected, new Map([['2026-11', 20000n]]), query().filters)).toMatchObject({ total: '20000', totalCount: 1 });
    expect(() => groupFunding([{ ...base, outstanding: 9223372036854775807n }, { ...base, identityId: id(), outstanding: 1n }], new Map(), query().filters)).toThrow();
  });
  it('validates exact shape/window/dates and refuses the removed listing view', () => {
    expect(parseOpen({ schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: null } })).toBeDefined();
    expect(parseQuery(query())).toEqual(query());
    for (const invalid of [
      { ...query(), ownerUserId: id() }, { ...query(), view: 'TRANSFERS' },
      { ...query(), filters: { ...query().filters, from: '2024-02-29', to: '2025-02-28' } },
      { ...query(), filters: { ...query().filters, from: '2025-02-29' } },
      { ...query(), basis: { ...basis, stateCut: '3' } },
      { ...query(), basis: { ...basis, dayH: '2026-11-17' } },
      { ...query(), compare: [id(), 'not-an-id'] },
    ]) expect(() => parseQuery(invalid)).toThrow();
    expect(parseQuery({ ...query(), filters: { ...query().filters, from: '2024-02-29', to: '2024-03-31' } })).toBeDefined();
  });
  it('copies/validates before async ownership and never calls a reader for invalid or anonymous input', async () => {
    let release!: () => void;
    const authorize = vi.fn(async () => { await new Promise<void>(resolve => { release = resolve; }); return { ownerUserId: id(), accountId: basis.accountId }; });
    const read = vi.fn<AnalyticsReader['read']>().mockResolvedValue({ ok: false, code: 'HISTORY_SOURCE_INVALID' });
    const open = vi.fn<AnalyticsReader['open']>();
    const choices = vi.fn<AnalyticsReader['choices']>();
    const service = createAnalytics(authorize, { read, open, choices });
    expect(await service.read(null, { ...query(), injected: true })).toEqual({ ok: false, code: 'INVALID_INPUT' });
    expect(authorize).not.toHaveBeenCalled();
    const input = structuredClone(query());
    const promise = service.read(null, input);
    (input.filters as { origin: string | null }).origin = '2020-01';
    release(); await promise;
    expect(read.mock.calls[0][1].filters.origin).toBeNull();
    const denied = createAnalytics(async () => { throw new Error('no session'); }, { read, open, choices });
    read.mockClear();
    expect(await denied.read(null, query())).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(read).not.toHaveBeenCalled();
  });
});
