import { serializeCents } from '@/domain/money/money-codec';
import { LIMITS, type AccountProjection, type PeriodProjection, type Obligation, type Saving, type Provenance,
  type Bank, type PeriodBudget, type Liquidity, type AccountEstimate, type Unavailable } from './contracts';
import { attempt, capture, checked, refuse } from './validation';

export type Wire<T> = T extends bigint ? string : T extends readonly (infer E)[] ? readonly Wire<E>[]
  : T extends object ? { readonly [K in keyof T]: Wire<T[K]> } : T;
const money = (v: bigint) => checked(serializeCents(v));
function provenance(p: Provenance): Wire<Provenance> {
  if (p.knowledgeCut < 0n || p.capturedAggregateRevision < 0n) refuse('INVALID_STATE_SHAPE');
  return { ...p, knowledgeCut: money(p.knowledgeCut), capturedAggregateRevision: money(p.capturedAggregateRevision) };
}
function bank(b: Bank): Wire<Bank> { return { ...b, balance: money(b.balance) }; }
function obligation(o: Obligation): Wire<Obligation> { return { ...o, original: money(o.original), outstanding: money(o.outstanding) }; }
function saving(s: Saving): Wire<Saving> { return { ...s, amount: money(s.amount) }; }
function fullProvenance(p: AccountEstimate['provenance']): Wire<AccountEstimate['provenance']> {
  return { ...p, ...provenance(p), obligationSources: p.obligationSources.map(obligation), savingSources: p.savingSources.map(saving) };
}
function period(p: PeriodBudget): Wire<PeriodBudget> {
  return { ...p, allocated: money(p.allocated), reserved: money(p.reserved), savings: money(p.savings), earmarked: money(p.earmarked),
    free: money(p.free), deficit: money(p.deficit), ordinary: p.ordinary.kind === 'UNAVAILABLE' ? p.ordinary : { ...p.ordinary,
      eligible: money(p.ordinary.eligible), ordinaryGuideline: money(p.ordinary.ordinaryGuideline), roundingRemainder: money(p.ordinary.roundingRemainder) } };
}
function liquidity(l: Liquidity): Wire<Liquidity> {
  return { ...l, budgetFree: money(l.budgetFree), budgetDeficit: money(l.budgetDeficit), budgetGuideline: money(l.budgetGuideline),
    totalReserved: money(l.totalReserved), totalSavings: money(l.totalSavings), protectedTotal: money(l.protectedTotal),
    otherPeriodProtection: money(l.otherPeriodProtection), liquidityFreeSigned: money(l.liquidityFreeSigned), safeAvailable: money(l.safeAvailable),
    safeDailyLimit: money(l.safeDailyLimit), safeRemainder: money(l.safeRemainder), obligationShortfall: money(l.obligationShortfall),
    earmarkShortfall: money(l.earmarkShortfall), protectionShortfall: money(l.protectionShortfall), budgetSafeGap: money(l.budgetSafeGap),
    protectionByPeriod: l.protectionByPeriod.map(p => ({ ...p, allocated: money(p.allocated), reserved: money(p.reserved), savings: money(p.savings), protectedAmount: money(p.protectedAmount) })),
    coverageGroups: l.coverageGroups.map(g => ({ ...g, amount: money(g.amount) })) };
}
function unavailable(u: Unavailable): Wire<Unavailable> {
  if (u.reason === 'NO_OBSERVATION') return { ...u, provenance: provenance(u.provenance), knownEarmarks: { completeness: 'COMPLETE',
    obligations: u.knownEarmarks.obligations.map(obligation), savings: u.knownEarmarks.savings.map(saving) } };
  if (u.reason === 'OVERDRAFT_POLICY_REQUIRED') return { ...u, provenance: provenance(u.provenance), bank: bank(u.bank) };
  return { ...u, provenance: provenance(u.provenance) };
}
/** Exact UTF-8 bytes, also counts non-ASCII titles. No truncation and no generic bigint replacer. */
export function enforceWireSize(json: string, maximum = LIMITS.wireBytes): void {
  if (new TextEncoder().encode(json).byteLength > maximum) refuse('PROJECTION_LIMIT_EXCEEDED');
}
export function encodeProjection(input: AccountProjection | PeriodProjection) {
  return attempt<Wire<AccountProjection | PeriodProjection>>(() => {
    let encoded: Wire<AccountProjection | PeriodProjection>;
    if (input.kind === 'UNAVAILABLE') encoded = unavailable(input);
    else if (input.kind === 'PERIOD_ESTIMATE') encoded = { ...input, budget: period(input.budget), bank: bank(input.bank),
      provenance: fullProvenance(input.provenance), liquidity: input.liquidity.kind === 'SAFE_ESTIMATE' ? liquidity(input.liquidity) : input.liquidity };
    else encoded = { ...input, bank: bank(input.bank), provenance: fullProvenance(input.provenance), periods: input.periods.map(period),
      totals: { allocated: money(input.totals.allocated), reserved: money(input.totals.reserved), savings: money(input.totals.savings),
        earmarked: money(input.totals.earmarked), freeSigned: money(input.totals.freeSigned) }, currentLiquidity: liquidity(input.currentLiquidity) };
    enforceWireSize(JSON.stringify(encoded));
    return capture(encoded);
  });
}
