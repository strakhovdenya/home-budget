import type { CoverageMeaning, Warning, Warnings } from './contracts';

export function groupWarnings(obligation: bigint, earmark: bigint, protection: bigint, gap: bigint): Warnings {
  const warnings: Warning[] = [], groups = new Map<bigint, CoverageMeaning[]>();
  for (const [code, amount] of [['OBLIGATIONS_UNDERFUNDED', obligation], ['EARMARKS_UNDERFUNDED', earmark], ['PROTECTION_UNDERFUNDED', protection]] as const) {
    if (amount <= 0n) continue;
    warnings.push(code); const meanings = groups.get(amount) ?? []; meanings.push(code); groups.set(amount, meanings);
  }
  if (gap > 0n) warnings.push('BUDGET_EXCEEDS_SAFE');
  return { warnings, coverageGroups: [...groups].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([amount, meanings]) => ({ amount, meanings })),
    comparisonsAreNonAdditive: true, budgetExplanation: gap > 0n ? 'BUDGET_EXCEEDS_SAFE' : null };
}
