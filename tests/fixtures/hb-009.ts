import { prepareCommand } from '@/domain/updates/validation';
export const ownerId = '11111111-1111-1111-1111-111111111111';
export const accountId = '22222222-2222-2222-2222-222222222222';
export function rawCommand(overrides: Record<string, unknown> = {}) {
  return { requestId: '33333333-3333-3333-3333-333333333333', expectedRevision: '0',
    effectiveDate: '2020-11-20', reason: 'Synthetic reviewed update', payload: { name: 'After' }, ...overrides };
}
export function prepared(overrides: Record<string, unknown> = {}) {
  const result = prepareCommand(rawCommand(overrides));
  if (!result.ok) throw new Error(result.code);
  return result.value;
}
