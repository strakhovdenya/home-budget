import 'server-only';
import type { UpdateRepository } from '@/domain/updates/contracts';
import type { createDatabase } from './client';
import { BatchFailure, commitBatch, type BatchWriter } from './commit';
export function createUpdateRepository(database: ReturnType<typeof createDatabase>, kind: string, writer: BatchWriter): UpdateRepository {
  return { async commit(scope, command) {
    try { return { ok: true, value: await commitBatch(database.db, { scope, command, kind }, writer) }; }
    catch (error) { return { ok: false, code: error instanceof BatchFailure ? error.code : 'STORAGE_ERROR' }; }
  } };
}
