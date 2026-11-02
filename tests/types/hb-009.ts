import type { PreparedCommand, UpdateRepository } from '@/domain/updates/contracts';
export function checkUpdateTypes(command: PreparedCommand, repository: UpdateRepository): void {
  // @ts-expect-error Prepared commands are immutable.
  command.reason = 'mutate';
  // @ts-expect-error A money/sequence bigint cannot be implicitly a number.
  const revision: bigint = 1;
  // @ts-expect-error Authorized server scope is mandatory.
  repository.commit({ accountId: 'untrusted' }, command);
  void revision;
}
