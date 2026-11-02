import type { AuthorizedScope, CommitReceipt, UpdateErrorCode, UpdateRepository } from '@/domain/updates/contracts';
import { prepareCommand } from '@/domain/updates/validation';
import type { Result } from '@/shared/pure/result';
export function createUpdateExecutor(dependencies: Readonly<{
  authorize: (selector: unknown) => Promise<AuthorizedScope>;
  repository: UpdateRepository;
}>) {
  return async function executeUpdate(selector: unknown, input: unknown): Promise<Result<CommitReceipt, UpdateErrorCode>> {
    const prepared = prepareCommand(input);
    const accountSelector = typeof selector === 'string' ? selector : null;
    let scope: AuthorizedScope;
    try { scope = await dependencies.authorize(accountSelector); }
    catch (error) { return { ok: false, code: error instanceof Error && error.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'FORBIDDEN' }; }
    if (!prepared.ok) return prepared;
    try { return await dependencies.repository.commit(scope, prepared.value); }
    catch { return { ok: false, code: 'STORAGE_ERROR' }; }
  };
}
