import type { Allocation, CheckpointInput } from '@/domain/checkpoints/contracts';
import type { MicrosecondInstant } from '@/shared/pure/instant';
import type { Result } from '@/shared/pure/result';
import type { CommitReceipt, UpdateErrorCode } from '@/domain/updates/contracts';

declare const allocation: Allocation;
declare const input: CheckpointInput;
declare const result: Result<CommitReceipt, UpdateErrorCode>;
// @ts-expect-error cents never accept number, including integer number
const floating: Allocation = { ...allocation, amountCents: 1 };
// @ts-expect-error caller cannot mutate a validated vector
input.allocations.push(allocation);
// @ts-expect-error raw timestamp must pass its runtime constructor
const unvalidated: MicrosecondInstant = '2026-10-25T02:30:00';
if (!result.ok) {
  const code: UpdateErrorCode = result.code;
  void code;
  // @ts-expect-error failures never expose an unchecked receipt
  void result.value;
}
void floating; void unvalidated;
