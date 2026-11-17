import { addCents } from '@/domain/money/money';
import type { Obligation } from '@/domain/forecast/contracts';
import type { Filters, Group, Identity } from './contracts';

function addCheckedCents(left: bigint, right: bigint): bigint {
  const result = addCents(left, right);
  if (!result.ok) {
    throw new Error('HISTORY_SOURCE_INVALID');
  }

  return result.value;
}

/** Presentation grouping only: expected reserves come from the existing validated projection. */
export function groupFunding(
  obligations: readonly Obligation[],
  reserves: ReadonlyMap<string, bigint>,
  filters: Filters
) {
  const seen = new Set<string>();
  const selected: Identity[] = [];
  const full = new Map<string, bigint>();

  for (const item of obligations) {
    if (seen.has(item.identityId.toLowerCase())) {
      throw new Error('HISTORY_SOURCE_INVALID');
    }

    seen.add(item.identityId.toLowerCase());
    if (
      item.status !== 'UNPAID'
      || !item.reserveFull
    ) {
      continue;
    }

    full.set(item.fundingPeriod, addCheckedCents(full.get(item.fundingPeriod) ?? 0n, item.outstanding));
    selected.push({
      id: item.identityId,
      revisionId: item.revisionId,
      title: item.title,
      origin: item.originPeriod,
      funding: item.fundingPeriod,
      original: item.original.toString(),
      outstanding: item.outstanding.toString(),
      status: 'UNPAID',
      reserveFull: true,
      isPossible: item.isPossible
    });
  }
  for (const period of new Set([...full.keys(), ...reserves.keys()])) {
    if ((full.get(period) ?? 0n) !== (reserves.get(period) ?? 0n)) {
      throw new Error('HISTORY_SOURCE_INVALID');
    }
  }
  let total = 0n;

  for (const amount of full.values()) {
    total = addCheckedCents(total, amount);
  }
  const filtered = selected.filter(item => item.funding >= filters.from.slice(0, 7)
    && item.funding <= filters.to.slice(0, 7)
    && (filters.origin === null
      || item.origin === filters.origin)
    && (filters.funding === null
      || item.funding === filters.funding));
  filtered.sort((left, right) => left.id.localeCompare(right.id));
  const groups = new Map<string, {
    origin: string;
    funding: string;
    amount: bigint;
    count: number;
  }>();
  let subtotal = 0n;

  for (const item of filtered) {
    const key = `${item.origin}/${item.funding}`;
    const group = groups.get(key) ?? {
      origin: item.origin,
      funding: item.funding,
      amount: 0n,
      count: 0
    };
    const amount = BigInt(item.outstanding);
    groups.set(key, {
      ...group,
      amount: addCheckedCents(group.amount, amount),
      count: group.count + 1
    });
    subtotal = addCheckedCents(subtotal, amount);
  }
  const rows: Group[] = [...groups.values()]
    .sort((left, right) => (
      `${left.origin}/${left.funding}`.localeCompare(`${right.origin}/${right.funding}`)
    ))
    .map(group => ({
      ...group,
      amount: group.amount.toString()
    }));

  return {
    identities: filtered,
    groups: rows,
    total: total.toString(),
    totalCount: selected.length,
    subtotal: subtotal.toString(),
    subtotalCount: filtered.length
  };
}
