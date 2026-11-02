import { normalizeValue } from '@/domain/updates/canonical-value';
import { validUuid } from '@/domain/updates/validation';
import { exactKeys, parseCheckpoint } from '@/domain/checkpoints/validation';
import { parseCentsString } from '@/domain/money/money-codec';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parsePeriod } from '@/domain/periods/period';
import type { CanonicalValue } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
import type { Change, SavingErrorCode } from './contracts';
export function parseSavingBatch(input: unknown): Result<readonly Change[], SavingErrorCode | 'MONEY_RANGE'> {
  const bad = { ok: false, code: 'INVALID_SAVING' } as const;
  let v: unknown; try { v = normalizeValue(input); } catch { return bad; }
  if (!exactKeys(v, ['changes']) || !Array.isArray(v.changes) || v.changes.length < 1 || v.changes.length > 7) return bad;
  const changes: Change[] = [], keys = new Set<string>();
  for (const x of v.changes) {
    if (!exactKeys(x, ['key','action','savingsId','expectedStateRevisionId','correctionId','previousChangeKey','effectiveDate','data','placement','bankCheck'])
      || typeof x.key !== 'string' || !/^[a-z][a-z0-9_]{0,31}$/.test(x.key) || keys.has(x.key)
      || !['CREATE','AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE'].includes(String(x.action))) return bad;
    for (const k of ['savingsId','expectedStateRevisionId','correctionId']) if (x[k] !== null && !validUuid(x[k])) return bad;
    if (x.previousChangeKey !== null && (typeof x.previousChangeKey !== 'string' || !keys.has(x.previousChangeKey) || x.expectedStateRevisionId !== null)) return bad;
    const date = parseBerlinDate(x.effectiveDate);
    if (!date.ok || !x.data || typeof x.data !== 'object' || Array.isArray(x.data)) return bad;
    const data = { ...x.data } as Record<string, CanonicalValue>;
    const allowed = x.action === 'CREATE' ? ['title','amountCents','originatingPeriod','fundingPeriod'] : x.action === 'AMEND' ? ['title'] : ['amountCents'];
    if (!exactKeys(data, allowed)) return bad;
    if (x.action === 'CREATE' ? x.expectedStateRevisionId !== null || x.previousChangeKey !== null || (x.correctionId === null ? x.savingsId !== null : x.savingsId === null) : x.savingsId === null) return bad;
    if ('title' in data) {
      if (typeof data.title !== 'string') return bad;
      data.title = data.title.trim();
      if (![...data.title].length || [...data.title].length > 200) return bad;
    }
    if ('amountCents' in data) {
      const cents = parseCentsString(data.amountCents);
      if (!cents.ok) return cents.code === 'MONEY_RANGE' ? { ok: false, code: 'MONEY_RANGE' } : bad;
      if (cents.value <= 0n) return bad;
      data.amountCents = cents.value;
    }
    for (const k of ['originatingPeriod','fundingPeriod']) if (k in data && !parsePeriod(data[k]).ok) return bad;
    const cp = x.bankCheck === null ? null : parseCheckpoint(x.bankCheck);
    if (cp && (!cp.ok || cp.value.correction !== null || cp.value.observedDate !== date.value || x.correctionId !== null)) return bad;
    let placement: Change['placement'] = null;
    if (x.placement !== null) {
      const p = x.placement;
      if (!exactKeys(p, ['expectedOrderingRevisionId','afterPositionId','beforePositionId'])) return bad;
      for (const k of Object.keys(p)) if (p[k] !== null && !validUuid(p[k])) return bad;
      placement = { expectedOrderingRevisionId: typeof p.expectedOrderingRevisionId === 'string' ? p.expectedOrderingRevisionId.toLowerCase() : null,
        afterPositionId: typeof p.afterPositionId === 'string' ? p.afterPositionId.toLowerCase() : null,
        beforePositionId: typeof p.beforePositionId === 'string' ? p.beforePositionId.toLowerCase() : null };
    }
    if ((cp && placement !== null) || (x.correctionId !== null && placement !== null)) return bad;
    changes.push({ key: x.key, action: x.action as Change['action'], savingsId: typeof x.savingsId === 'string' ? x.savingsId.toLowerCase() : null,
      expectedStateRevisionId: typeof x.expectedStateRevisionId === 'string' ? x.expectedStateRevisionId.toLowerCase() : null,
      correctionId: typeof x.correctionId === 'string' ? x.correctionId.toLowerCase() : null, previousChangeKey: x.previousChangeKey as string | null,
      effectiveDate: date.value, data, placement, bankCheck: cp?.ok ? cp.value : null });
    keys.add(x.key);
  }
  return { ok: true, value: changes };
}
