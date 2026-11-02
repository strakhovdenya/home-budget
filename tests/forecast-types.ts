import type { CompleteSnapshot, AccountEstimate } from '@/domain/forecast/contracts';
import type { Wire } from '@/domain/forecast/serialization';
export function readonlyTypeProof(s: CompleteSnapshot, r: AccountEstimate, wire: Wire<AccountEstimate>) {
  // @ts-expect-error immutable source collections
  s.allocations.push({period:'2026-11',amount:1n});
  // @ts-expect-error readonly nested provenance
  r.provenance.obligationSources[0].outstanding=0n;
  // @ts-expect-error wire money is decimal string
  const cents: bigint=wire.bank.balance;
  void cents;
}
