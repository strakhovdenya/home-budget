import { expect, it, vi } from 'vitest';
import { id } from './fixtures/checkpoints';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), open: vi.fn(), read: vi.fn(), choices: vi.fn() }));
vi.mock('../src/app/dashboard-account-boundary', () => ({ resolveDashboardAccount: mocks.resolve }));
vi.mock('../src/app/analytics/boundary', () => ({ analytics: { open: mocks.open, read: mocks.read, choices: mocks.choices } }));
import { analyticsChoices, openAnalytics, readAnalytics } from '../src/app/analytics/actions';

it('private actions validate/copy before async discovery and reject authority injected into input', async () => {
  vi.clearAllMocks();
  const input = { schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: null } };
  expect(await openAnalytics({ ...input, ownerUserId: id() })).toEqual({ ok: false, code: 'INVALID_INPUT' });
  expect(await readAnalytics({ schemaVersion: 1, accountId: id() })).toEqual({ ok: false, code: 'INVALID_INPUT' });
  expect(await analyticsChoices({ schemaVersion: 1, ownerUserId: id() })).toEqual({ ok: false, code: 'INVALID_INPUT' });
  expect(mocks.resolve).not.toHaveBeenCalled();
  let release!: (value: unknown) => void;
  mocks.resolve.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  mocks.open.mockResolvedValue({ ok: false, code: 'HISTORY_SOURCE_INVALID' });
  const pending = openAnalytics(input);
  (input.selection as { dayH: string | null }).dayH = '2020-01-01';
  const accountId = id(); release({ kind: 'ACCOUNT', accountId });
  await pending;
  expect(mocks.open).toHaveBeenCalledWith(accountId, { schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: null } });
  mocks.resolve.mockResolvedValue({ kind: 'NO_ACCOUNT' }); mocks.open.mockClear();
  expect(await openAnalytics({ schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: null } })).toEqual({ ok: false, code: 'FORBIDDEN' });
  expect(mocks.open).not.toHaveBeenCalled();
});
