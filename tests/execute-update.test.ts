import { expect, it, vi } from 'vitest';
import { createUpdateExecutor } from '@/features/budget-updates/execute-update';
import { ownerId, accountId, rawCommand } from './fixtures/hb-009';
it.each(['UNAUTHORIZED', 'FORBIDDEN'])('HB9-U11 authorizes before repository replay: %s', async message => {
  const commit = vi.fn();
  const execute = createUpdateExecutor({ authorize: async () => { throw new Error(message); }, repository: { commit } });
  expect(await execute(accountId, rawCommand())).toEqual({ ok: false, code: message });
  expect(commit).not.toHaveBeenCalled();
});
it('HB9-U12 executes the same normalized graph even if input mutates during auth', async () => {
  const raw = rawCommand(), payload = raw.payload as { name: string };
  const commit = vi.fn(async (_scope, command) => {
    expect(command.payload).toEqual({ name: 'After' });
    expect(Object.isFrozen(command.payload)).toBe(true);
    expect(command.reason).toBe('Synthetic reviewed update');
    return { ok: true as const, value: { updateId: ownerId, recordedSeq: '1', aggregateRevision: '1' } };
  });
  const execute = createUpdateExecutor({ authorize: async () => {
    payload.name = 'Attacker change'; raw.reason = 'changed';
    return { ownerUserId: ownerId, accountId };
  }, repository: { commit } });
  expect((await execute(accountId, raw)).ok).toBe(true);
  expect(commit).toHaveBeenCalledOnce();
});
it('HB9-U13 invalid command never reaches repository', async () => {
  const commit = vi.fn();
  const execute = createUpdateExecutor({ authorize: async () => ({ ownerUserId: ownerId, accountId }), repository: { commit } });
  expect(await execute(accountId, rawCommand({ actorId: ownerId }))).toEqual({ ok: false, code: 'INVALID_INPUT' });
  expect(commit).not.toHaveBeenCalled();
});
it('HB9-U17 unexpected lazy adapter error cannot disclose infrastructure details', async () => {
  const execute = createUpdateExecutor({ authorize: async () => ({ ownerUserId: ownerId, accountId }),
    repository: { commit: async () => { throw new Error('synthetic secret URL/SQL'); } } });
  expect(await execute(accountId, rawCommand())).toEqual({ ok: false, code: 'STORAGE_ERROR' });
});
